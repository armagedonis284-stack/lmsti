-- =============================================
-- 01. CREATE TABLES - LMS Database Schema
-- =============================================
-- Jalankan file ini terlebih dahulu di Supabase SQL Editor
-- File ini berisi semua tabel yang diperlukan untuk LMS

-- Drop existing tables if they exist (untuk fresh start)
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignment_comments CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS students_classes CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS generate_student_email(text) CASCADE;
DROP FUNCTION IF EXISTS generate_student_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS submit_assignment(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- =============================================
-- 1. USERS TABLE (HANYA UNTUK GURU)
-- =============================================
-- Guru terdaftar di Supabase Auth (auth.users) dan tabel users
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 2. STUDENTS TABLE (HANYA UNTUK SISWA)
-- =============================================
-- Siswa hanya di tabel students (tidak pakai Supabase Auth)
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL, -- ID display seperti "Siswa001"
  email text UNIQUE NOT NULL, -- Email unik untuk login
  password text NOT NULL, -- Password hash (default: tanggal lahir DDMMYYYY)
  full_name text NOT NULL,
  birth_date date NOT NULL,
  phone text,
  address text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Guru yang membuat
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. CLASSES TABLE
-- =============================================
-- Kelas dibuat oleh guru
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL,
  class_name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(grade, class_name, teacher_id)
);

-- =============================================
-- 4. STUDENTS_CLASSES JUNCTION TABLE
-- =============================================
-- Many-to-many relationship antara siswa dan kelas
CREATE TABLE students_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- =============================================
-- 5. MATERIALS TABLE
-- =============================================
-- Materi pembelajaran untuk setiap kelas
CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text,
  file_url text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 6. ASSIGNMENTS TABLE
-- =============================================
-- Tugas untuk setiap kelas
CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('mandatory', 'additional')) DEFAULT 'mandatory',
  due_date timestamptz,
  max_score integer DEFAULT 100,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 7. SUBMISSIONS TABLE
-- =============================================
-- Pengumpulan tugas oleh siswa
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content text,
  file_url text,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- =============================================
-- 8. SCORES TABLE
-- =============================================
-- Nilai tugas yang diberikan guru
CREATE TABLE scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0),
  max_score integer NOT NULL CHECK (max_score > 0),
  feedback text,
  graded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  graded_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- =============================================
-- 9. ATTENDANCE SESSIONS TABLE
-- =============================================
-- Sesi absensi untuk setiap kelas
CREATE TABLE attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  unique_code text UNIQUE,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 10. ATTENDANCE RECORDS TABLE
-- =============================================
-- Catatan absensi siswa
CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'absent',
  marked_at timestamptz DEFAULT now(),
  marked_by uuid REFERENCES users(id),
  UNIQUE(session_id, student_id)
);

-- =============================================
-- 11. ASSIGNMENT COMMENTS TABLE
-- =============================================
-- Komentar pada tugas (komunikasi siswa-guru)
CREATE TABLE assignment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure either student_id or teacher_id is provided, but not both
  CHECK (
    (student_id IS NOT NULL AND teacher_id IS NULL) OR 
    (student_id IS NULL AND teacher_id IS NOT NULL)
  )
);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);

-- Students indexes
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_created_by ON students(created_by);
CREATE INDEX idx_students_is_active ON students(is_active);

-- Classes indexes
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);

-- Students-Classes indexes
CREATE INDEX idx_students_classes_student_id ON students_classes(student_id);
CREATE INDEX idx_students_classes_class_id ON students_classes(class_id);

-- Materials indexes
CREATE INDEX idx_materials_class_id ON materials(class_id);

-- Assignments indexes
CREATE INDEX idx_assignments_class_id ON assignments(class_id);

-- Submissions indexes
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);

-- Scores indexes
CREATE INDEX idx_scores_assignment_id ON scores(assignment_id);
CREATE INDEX idx_scores_student_id ON scores(student_id);

-- Attendance indexes
CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);

-- Assignment comments indexes
CREATE INDEX idx_assignment_comments_assignment_id ON assignment_comments(assignment_id);
CREATE INDEX idx_assignment_comments_student_id ON assignment_comments(student_id);
CREATE INDEX idx_assignment_comments_teacher_id ON assignment_comments(teacher_id);
CREATE INDEX idx_assignment_comments_created_at ON assignment_comments(created_at);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TABEL DATABASE LMS BERHASIL DIBUAT!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabel yang dibuat:';
  RAISE NOTICE '✓ users (untuk guru)';
  RAISE NOTICE '✓ students (untuk siswa)';
  RAISE NOTICE '✓ classes (kelas)';
  RAISE NOTICE '✓ students_classes (enrollment)';
  RAISE NOTICE '✓ materials (materi pembelajaran)';
  RAISE NOTICE '✓ assignments (tugas)';
  RAISE NOTICE '✓ submissions (pengumpulan tugas)';
  RAISE NOTICE '✓ scores (nilai)';
  RAISE NOTICE '✓ attendance_sessions (sesi absensi)';
  RAISE NOTICE '✓ attendance_records (catatan absensi)';
  RAISE NOTICE '✓ assignment_comments (komentar tugas)';
  RAISE NOTICE '';
  RAISE NOTICE 'Langkah selanjutnya:';
  RAISE NOTICE '→ Jalankan 02_create_functions.sql';
  RAISE NOTICE '========================================';
END $$;
