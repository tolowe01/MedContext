-- Fix infinite recursion in RLS policies.
-- Problem: policies that subquery `profiles` from inside a `profiles` policy
-- (and patient/log policies that subquery profiles) cause Postgres to recurse.
-- Solution: SECURITY DEFINER helper functions read profiles WITHOUT re-triggering RLS.

create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.current_pharmacy_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select pharmacy_id from profiles where id = auth.uid()
$$;

grant execute on function public.current_user_role() to authenticated, anon;
grant execute on function public.current_pharmacy_id() to authenticated, anon;

-- profiles
drop policy if exists "users_own_profile" on profiles;
drop policy if exists "pharmacists_see_patient_profiles" on profiles;
create policy "users_own_profile" on profiles
  for all using (id = auth.uid());
create policy "pharmacists_see_patient_profiles" on profiles
  for select using (
    public.current_user_role() = 'pharmacist'
    and role = 'patient'
    and pharmacy_id = public.current_pharmacy_id()
  );

-- patients
drop policy if exists "patients_own_record" on patients;
drop policy if exists "pharmacist_pharmacy_patients" on patients;
create policy "patients_own_record" on patients
  for select using (profile_id = auth.uid());
create policy "pharmacist_pharmacy_patients" on patients
  for select using (
    public.current_user_role() = 'pharmacist'
    and pharmacy_id = public.current_pharmacy_id()
  );

-- daily_logs
drop policy if exists "patients_own_logs" on daily_logs;
drop policy if exists "pharmacist_pharmacy_logs" on daily_logs;
create policy "patients_own_logs" on daily_logs
  for all using (
    patient_id in (select id from patients where profile_id = auth.uid())
  );
create policy "pharmacist_pharmacy_logs" on daily_logs
  for select using (
    public.current_user_role() = 'pharmacist'
    and patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
  );

-- weekly_submissions
drop policy if exists "patients_own_submissions" on weekly_submissions;
drop policy if exists "pharmacist_pharmacy_submissions" on weekly_submissions;
create policy "patients_own_submissions" on weekly_submissions
  for all using (
    patient_id in (select id from patients where profile_id = auth.uid())
  );
create policy "pharmacist_pharmacy_submissions" on weekly_submissions
  for all using (
    public.current_user_role() = 'pharmacist'
    and patient_id in (select id from patients where pharmacy_id = public.current_pharmacy_id())
  );

-- interventions (pharmacist policy joined profiles -> replace with function)
drop policy if exists "pharmacists_manage_interventions" on interventions;
create policy "pharmacists_manage_interventions" on interventions
  for all using (
    public.current_user_role() = 'pharmacist'
    and submission_id in (
      select ws.id from weekly_submissions ws
      join patients p on p.id = ws.patient_id
      where p.pharmacy_id = public.current_pharmacy_id()
    )
  );
