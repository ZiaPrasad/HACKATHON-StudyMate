import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getSupabaseContext, sbRunSql } from '../../shared/supabase.ts';

// One-time (idempotent) provisioning of the StudyMate schema in Supabase.
// Admin-only: the app builder provisions the database for the app.
// RLS is enabled on every table with no public policies, so only the
// service-role key (used by the app's backend functions, which always
// filter by the calling user's id) can reach the data.

const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  name text,
  email text,
  institution text,
  college text,
  course text,
  branch text,
  academic_year text,
  semester text,
  avatar_url text,
  attendance_threshold numeric DEFAULT 75,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  code text,
  faculty_name text,
  credits int,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid,
  subject_name text NOT NULL,
  day_of_week text NOT NULL,
  start_time text,
  end_time text,
  room_number text,
  faculty_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid,
  subject_name text,
  title text NOT NULL,
  description text,
  due_date date,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid,
  subject_name text,
  title text NOT NULL,
  exam_date date NOT NULL,
  start_time text,
  end_time text,
  location text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid,
  subject_name text NOT NULL,
  classes_held int DEFAULT 0,
  classes_attended int DEFAULT 0,
  percentage numeric DEFAULT 0,
  alert_threshold numeric DEFAULT 75,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid,
  subject_name text,
  timetable_id uuid,
  date date,
  status text DEFAULT 'present',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid,
  subject_name text,
  title text NOT NULL,
  content text,
  file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.study_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject_id uuid,
  subject_name text,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  due_date date,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  description text,
  reminder_time timestamptz,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'system',
  is_read boolean DEFAULT false,
  link text,
  scheduled_for timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_user ON public.timetable(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON public.assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_user ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checkins_user ON public.attendance_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_user ON public.study_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON public.chat_history(user_id);

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_subjects_updated ON public.subjects;
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_timetable_updated ON public.timetable;
CREATE TRIGGER trg_timetable_updated BEFORE UPDATE ON public.timetable FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_assignments_updated ON public.assignments;
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_exams_updated ON public.exams;
CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_attendance_updated ON public.attendance;
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_notes_updated ON public.notes;
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_study_tasks_updated ON public.study_tasks;
CREATE TRIGGER trg_study_tasks_updated BEFORE UPDATE ON public.study_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_reminders_updated ON public.reminders;
CREATE TRIGGER trg_reminders_updated BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const ctx = await getSupabaseContext(base44);
    await sbRunSql(ctx, DDL);
    const tables = await sbRunSql(ctx, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");

    return Response.json({ ok: true, tables });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}