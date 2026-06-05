-- Pharmacist-initiated flow: medication lists, monitoring periods, structured
-- side effects, consultations, physician escalations, and real-time critical
-- BP alerting. Follows the RLS helper convention from 0002 (current_user_role /
-- current_pharmacy_id) and adds physician escalation-scoped read helpers.

-- =====================================================================
-- Enums
-- =====================================================================
create type monitoring_status as enum (
  'invited',
  'active',
  'submitted',
  'critical_alert',
  'approved',
  'consultation_scheduled',
  'consultation_completed',
  'monitor_extended',
  'escalated'
);

create type consultation_outcome as enum ('monitor_extended', 'escalated_to_physician');

-- =====================================================================
-- Tables (ordered for FK dependencies)
-- =====================================================================

-- Medication list (one upload = one list), source of the confirmed medications.
create table medication_lists (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  uploaded_by uuid references profiles(id),       -- pharmacist who uploaded
  source_filename text not null,
  source_storage_path text not null,              -- Storage path to original PDF
  extraction_raw_text text,                       -- Claude's raw extraction for debug
  status text not null default 'extracted',       -- 'extracted' | 'confirmed'
  created_at timestamptz default now()
);

-- Monitoring period: the 7-day episode a pharmacist opens for a patient.
create table monitoring_periods (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  pharmacist_id uuid references profiles(id),
  medication_list_id uuid references medication_lists(id),
  preferred_log_time time not null default '19:00',
  start_date date not null,
  expected_end_date date not null,                -- start_date + 7 days
  status monitoring_status not null default 'invited',
  ai_synthesis_text text,
  ai_synthesis_edited_text text,
  pharmacist_decision_at timestamptz,
  created_at timestamptz default now()
);

-- Individual medications confirmed from a list.
create table medications (
  id uuid primary key default gen_random_uuid(),
  medication_list_id uuid references medication_lists(id) on delete cascade,
  name text not null,
  dose text not null,
  frequency text not null,
  prescribing_physician_id uuid references profiles(id),  -- nullable
  prescribing_physician_name text,                        -- text fallback
  is_new boolean default false,                           -- not in any prior list
  notes text,
  created_at timestamptz default now()
);
create index idx_medications_list on medications(medication_list_id);

-- Extend daily_logs (heart_rate/systolic/diastolic already exist in 0001).
alter table daily_logs add column monitoring_period_id uuid references monitoring_periods(id);
alter table daily_logs add column logged_at_local time;
alter table daily_logs add column adherence_skip_reason text;
alter table daily_logs add column is_critical boolean not null default false;

-- Structured side effects (one row per reported effect). patient_id and
-- monitoring_period_id are denormalized so RLS resolves without joins.
create table side_effects (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid references daily_logs(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  monitoring_period_id uuid references monitoring_periods(id) on delete set null,
  effect_code text not null,                      -- 'dizziness', 'ankle_swelling', ...
  effect_text text,                               -- free text for 'other'
  severity text check (severity in ('mild', 'moderate', 'severe')),
  created_at timestamptz default now()
);
create index idx_side_effects_log on side_effects(daily_log_id);

-- Consultation calls scheduled by a pharmacist. patient_id denormalized for RLS.
create table consultations (
  id uuid primary key default gen_random_uuid(),
  monitoring_period_id uuid references monitoring_periods(id) on delete cascade,
  pharmacist_id uuid references profiles(id),
  patient_id uuid references patients(id) on delete cascade,
  scheduled_for timestamptz not null,
  completed_at timestamptz,
  outcome consultation_outcome,
  notes text,
  created_at timestamptz default now()
);

-- Physician escalations grant scoped read access via this linkage.
create table physician_escalations (
  id uuid primary key default gen_random_uuid(),
  monitoring_period_id uuid references monitoring_periods(id) on delete cascade,
  pharmacist_id uuid references profiles(id),
  physician_id uuid references profiles(id),
  patient_id uuid references patients(id),        -- denormalized for RLS speed
  reason text,
  created_at timestamptz default now()
);
create index idx_physician_escalations_physician on physician_escalations(physician_id);

-- Critical alerts for fast pharmacist paging. patient_name denormalized so the
-- Realtime INSERT payload (which carries no joins) is enough to render a banner.
create table critical_alerts (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid references daily_logs(id) on delete cascade unique,
  monitoring_period_id uuid references monitoring_periods(id),
  pharmacist_id uuid references profiles(id),
  patient_id uuid references patients(id),
  patient_name text,
  systolic int not null,
  diastolic int not null,
  acknowledged_at timestamptz,
  acknowledged_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index idx_critical_alerts_pharmacist_unack
  on critical_alerts(pharmacist_id, created_at)
  where acknowledged_at is null;

-- patients.access_code must be unique for pharmacist-side collision handling.
create unique index if not exists idx_patients_access_code on patients(access_code);

-- =====================================================================
-- Physician escalation-scoped read helpers (SECURITY DEFINER, like 0002)
-- =====================================================================
create or replace function public.physician_patient_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select pe.patient_id from physician_escalations pe
  where pe.physician_id = auth.uid()
$$;

create or replace function public.physician_monitoring_period_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select pe.monitoring_period_id from physician_escalations pe
  where pe.physician_id = auth.uid()
$$;

grant execute on function public.physician_patient_ids() to authenticated, anon;
grant execute on function public.physician_monitoring_period_ids() to authenticated, anon;

-- =====================================================================
-- Critical BP detection
-- Two triggers: BEFORE sets the flag on NEW; AFTER creates the alert row and
-- flips status. The alert insert MUST be AFTER because critical_alerts.daily_log_id
-- references daily_logs(id), which does not exist during a BEFORE INSERT.
-- =====================================================================
create or replace function public.set_critical_flag()
returns trigger
language plpgsql
as $$
begin
  NEW.is_critical := (NEW.systolic > 180 or NEW.diastolic > 120);
  return NEW;
end;
$$;

create trigger trg_set_critical_flag
  before insert or update on daily_logs
  for each row execute function public.set_critical_flag();

create or replace function public.create_critical_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pharmacist_id uuid;
  v_patient_name text;
begin
  if NEW.is_critical and not exists (
    select 1 from critical_alerts where daily_log_id = NEW.id
  ) then
    select mp.pharmacist_id into v_pharmacist_id
    from monitoring_periods mp where mp.id = NEW.monitoring_period_id;

    select pr.first_name || ' ' || pr.last_name into v_patient_name
    from patients p join profiles pr on pr.id = p.profile_id
    where p.id = NEW.patient_id;

    insert into critical_alerts (
      daily_log_id, monitoring_period_id, pharmacist_id,
      patient_id, patient_name, systolic, diastolic
    ) values (
      NEW.id, NEW.monitoring_period_id, v_pharmacist_id,
      NEW.patient_id, v_patient_name, NEW.systolic, NEW.diastolic
    );

    update monitoring_periods
    set status = 'critical_alert'
    where id = NEW.monitoring_period_id and status = 'active';
  end if;
  return NEW;
end;
$$;

create trigger trg_create_critical_alert
  after insert or update on daily_logs
  for each row execute function public.create_critical_alert();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table medication_lists enable row level security;
alter table medications enable row level security;
alter table monitoring_periods enable row level security;
alter table side_effects enable row level security;
alter table consultations enable row level security;
alter table physician_escalations enable row level security;
alter table critical_alerts enable row level security;

-- medication_lists
create policy "patients_own_medication_lists" on medication_lists
  for select using (
    patient_id in (select id from patients where profile_id = auth.uid())
  );
create policy "pharmacist_pharmacy_medication_lists" on medication_lists
  for all using (
    public.current_user_role() = 'pharmacist'
    and patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
  );
create policy "physician_escalated_medication_lists" on medication_lists
  for select using (
    public.current_user_role() = 'physician'
    and patient_id in (select public.physician_patient_ids())
  );

-- medications (scoped through parent list)
create policy "patients_own_medications" on medications
  for select using (
    medication_list_id in (
      select id from medication_lists
      where patient_id in (select id from patients where profile_id = auth.uid())
    )
  );
create policy "pharmacist_pharmacy_medications" on medications
  for all using (
    public.current_user_role() = 'pharmacist'
    and medication_list_id in (
      select id from medication_lists
      where patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
    )
  );
create policy "physician_escalated_medications" on medications
  for select using (
    public.current_user_role() = 'physician'
    and medication_list_id in (
      select id from medication_lists
      where patient_id in (select public.physician_patient_ids())
    )
  );

-- monitoring_periods (patient may accept: invited -> active only)
create policy "patients_select_monitoring_periods" on monitoring_periods
  for select using (
    patient_id in (select id from patients where profile_id = auth.uid())
  );
create policy "patients_accept_monitoring_periods" on monitoring_periods
  for update using (
    patient_id in (select id from patients where profile_id = auth.uid())
    and status = 'invited'
  ) with check (
    patient_id in (select id from patients where profile_id = auth.uid())
    and status = 'active'
  );
create policy "pharmacist_pharmacy_monitoring_periods" on monitoring_periods
  for all using (
    public.current_user_role() = 'pharmacist'
    and patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
  );
create policy "physician_escalated_monitoring_periods" on monitoring_periods
  for select using (
    public.current_user_role() = 'physician'
    and id in (select public.physician_monitoring_period_ids())
  );

-- side_effects
create policy "patients_own_side_effects" on side_effects
  for all using (
    patient_id in (select id from patients where profile_id = auth.uid())
  );
create policy "pharmacist_pharmacy_side_effects" on side_effects
  for select using (
    public.current_user_role() = 'pharmacist'
    and patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
  );
create policy "physician_escalated_side_effects" on side_effects
  for select using (
    public.current_user_role() = 'physician'
    and monitoring_period_id in (select public.physician_monitoring_period_ids())
  );

-- consultations
create policy "patients_own_consultations" on consultations
  for select using (
    patient_id in (select id from patients where profile_id = auth.uid())
  );
create policy "pharmacist_pharmacy_consultations" on consultations
  for all using (
    public.current_user_role() = 'pharmacist'
    and patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
  );
create policy "physician_escalated_consultations" on consultations
  for select using (
    public.current_user_role() = 'physician'
    and patient_id in (select public.physician_patient_ids())
  );

-- physician_escalations
create policy "pharmacist_manage_escalations" on physician_escalations
  for all using (
    public.current_user_role() = 'pharmacist'
    and patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
  );
create policy "physician_own_escalations" on physician_escalations
  for select using (
    public.current_user_role() = 'physician'
    and physician_id = auth.uid()
  );

-- critical_alerts (rows are written by the SECURITY DEFINER trigger; these
-- policies govern read + the pharmacist acknowledge update)
create policy "patients_own_critical_alerts" on critical_alerts
  for select using (
    patient_id in (select id from patients where profile_id = auth.uid())
  );
create policy "pharmacist_pharmacy_critical_alerts" on critical_alerts
  for all using (
    public.current_user_role() = 'pharmacist'
    and patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
  );
create policy "physician_escalated_critical_alerts" on critical_alerts
  for select using (
    public.current_user_role() = 'physician'
    and monitoring_period_id in (select public.physician_monitoring_period_ids())
  );

-- Physician read access on pre-existing tables (escalation-scoped)
create policy "physician_escalated_daily_logs" on daily_logs
  for select using (
    public.current_user_role() = 'physician'
    and monitoring_period_id in (select public.physician_monitoring_period_ids())
  );
create policy "physician_escalated_patients" on patients
  for select using (
    public.current_user_role() = 'physician'
    and id in (select public.physician_patient_ids())
  );

-- =====================================================================
-- Realtime publications
-- =====================================================================
alter publication supabase_realtime add table monitoring_periods;
alter publication supabase_realtime add table critical_alerts;
alter publication supabase_realtime add table consultations;
alter publication supabase_realtime add table physician_escalations;

-- =====================================================================
-- Privileges for Supabase API roles. The dashboard/CLI grant these via
-- default privileges automatically; a raw psql apply (as the postgres role)
-- does not, so grant explicitly. RLS still gates anon/authenticated;
-- service_role bypasses RLS and needs table access for the seed + admin paths.
-- =====================================================================
grant all on table
  public.monitoring_periods,
  public.medication_lists,
  public.medications,
  public.side_effects,
  public.consultations,
  public.physician_escalations,
  public.critical_alerts
to anon, authenticated, service_role;

grant execute on function public.physician_patient_ids() to service_role;
grant execute on function public.physician_monitoring_period_ids() to service_role;
