-- StudyMate — RLS policies for local / independent operation (Supabase Auth).
--
-- The tables were originally provisioned with RLS enabled but NO policies,
-- so only the service-role key (used by the Base44 backend functions, which
-- always filter by user_id) could reach the data. Direct browser access
-- requires per-user policies tied to Supabase Auth (auth.uid()).
--
-- Run this ONCE in the Supabase SQL editor (or `psql`) for local mode.
-- The service-role key bypasses RLS, so the existing Base44-hosted backend
-- keeps working unchanged after these policies exist.
--
-- IMPORTANT (known mismatch, do not skip): existing rows store the BASE44
-- user id in user_id (a text column). Supabase Auth users have different ids,
-- so your existing data will NOT be visible to locally-authenticated users
-- until user_id values are migrated. After creating a matching Supabase Auth
-- account with the same email, you can re-link rows per table with:
--
--   UPDATE public.profiles
--     SET user_id = au.id::text
--     FROM auth.users au
--     WHERE au.email = profiles.email;
--
--   (repeat for subjects, timetable, assignments, exams, attendance,
--    attendance_checkins, notes, study_tasks, reminders, notifications,
--    chat_history — replacing the table/column names the same way)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP POLICY IF EXISTS "own_rows" ON public.profiles;
CREATE POLICY "own_rows" ON public.profiles
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.subjects;
CREATE POLICY "own_rows" ON public.subjects
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.timetable;
CREATE POLICY "own_rows" ON public.timetable
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.assignments;
CREATE POLICY "own_rows" ON public.assignments
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.exams;
CREATE POLICY "own_rows" ON public.exams
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.attendance;
CREATE POLICY "own_rows" ON public.attendance
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.attendance_checkins;
CREATE POLICY "own_rows" ON public.attendance_checkins
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.notes;
CREATE POLICY "own_rows" ON public.notes
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.study_tasks;
CREATE POLICY "own_rows" ON public.study_tasks
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.reminders;
CREATE POLICY "own_rows" ON public.reminders
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.notifications;
CREATE POLICY "own_rows" ON public.notifications
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "own_rows" ON public.chat_history;
CREATE POLICY "own_rows" ON public.chat_history
  FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);