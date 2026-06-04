-- Enums
create type user_role as enum ('patient', 'pharmacist');
create type submission_status as enum ('submitted', 'reviewed', 'follow_up');
create type intervention_kind as enum ('approval', 'phone_call', 'in_person', 'clinical_note');

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  pharmacy_id uuid,
  first_name text not null,
  last_name text not null,
  created_at timestamptz default now()
);

-- Patients (clinical record)
create table patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade unique,
  pharmacy_id uuid not null,
  date_of_birth date not null,
  access_code text not null,
  diagnosis text default 'Hypertension',
  baseline_questionnaire jsonb,
  questionnaire_schema_version text not null default 'v1.0',
  created_at timestamptz default now()
);

-- Law 25 consent records
create table consent_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  consented_at timestamptz default now(),
  consent_version text not null default 'v1.0',
  purposes text[] not null,
  pdf_url text,
  ip_address text
);

-- Daily blood pressure and adherence logs
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  log_date date not null,
  systolic int not null,
  diastolic int not null,
  heart_rate int,
  adherence_taken boolean not null,
  symptom_note text,
  entered_via text not null default 'text',
  created_at timestamptz default now(),
  unique (patient_id, log_date)
);

-- Pharmacist in-store verified readings
create table pharmacist_verified_readings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  pharmacist_id uuid references profiles(id),
  reading_date date not null,
  systolic int not null,
  diastolic int not null,
  recorded_at timestamptz default now()
);

-- Weekly submissions (triggers pharmacist review)
create table weekly_submissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  week_start date not null,
  ai_synthesis_text text,
  ai_synthesis_edited_text text,
  status submission_status default 'submitted',
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

-- Pharmacist interventions (result of review)
create table interventions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references weekly_submissions(id) on delete cascade,
  kind intervention_kind not null,
  payload jsonb,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table patients enable row level security;
alter table consent_records enable row level security;
alter table daily_logs enable row level security;
alter table pharmacist_verified_readings enable row level security;
alter table weekly_submissions enable row level security;
alter table interventions enable row level security;

-- RLS: profiles
create policy "users_own_profile" on profiles
  for all using (id = auth.uid());
create policy "pharmacists_see_patient_profiles" on profiles
  for select using (
    role = 'patient' AND pharmacy_id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid() AND role = 'pharmacist'
    )
  );

-- RLS: patients
create policy "patients_own_record" on patients
  for select using (profile_id = auth.uid());
create policy "pharmacist_pharmacy_patients" on patients
  for select using (
    pharmacy_id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid() AND role = 'pharmacist'
    )
  );

-- RLS: consent_records
create policy "patients_own_consent" on consent_records
  for all using (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
  );

-- RLS: daily_logs
create policy "patients_own_logs" on daily_logs
  for all using (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
  );
create policy "pharmacist_pharmacy_logs" on daily_logs
  for select using (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN profiles pr ON pr.id = auth.uid() AND pr.role = 'pharmacist'
      WHERE p.pharmacy_id = pr.pharmacy_id
    )
  );

-- RLS: pharmacist_verified_readings
create policy "pharmacist_own_readings" on pharmacist_verified_readings
  for all using (pharmacist_id = auth.uid());
create policy "patients_see_verified_readings" on pharmacist_verified_readings
  for select using (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
  );

-- RLS: weekly_submissions
create policy "patients_own_submissions" on weekly_submissions
  for all using (
    patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())
  );
create policy "pharmacist_pharmacy_submissions" on weekly_submissions
  for all using (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN profiles pr ON pr.id = auth.uid() AND pr.role = 'pharmacist'
      WHERE p.pharmacy_id = pr.pharmacy_id
    )
  );

-- RLS: interventions
create policy "patients_see_interventions" on interventions
  for select using (
    submission_id IN (
      SELECT ws.id FROM weekly_submissions ws
      JOIN patients p ON p.id = ws.patient_id
      WHERE p.profile_id = auth.uid()
    )
  );
create policy "pharmacists_manage_interventions" on interventions
  for all using (
    submission_id IN (
      SELECT ws.id FROM weekly_submissions ws
      JOIN patients p ON p.id = ws.patient_id
      JOIN profiles pr ON pr.id = auth.uid() AND pr.role = 'pharmacist'
      WHERE p.pharmacy_id = pr.pharmacy_id
    )
  );

-- Realtime publications
alter publication supabase_realtime add table weekly_submissions;
alter publication supabase_realtime add table interventions;
alter publication supabase_realtime add table daily_logs;
