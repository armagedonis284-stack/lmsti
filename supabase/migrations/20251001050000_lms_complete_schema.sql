/*
  # Complete LMS Schema - Simplified Architecture

  PEMBEDAAN SEDERHANA:
  - GURU: Terdaftar di Supabase Auth (auth.users) dan tabel users
  - SISWA: Hanya di tabel students (tidak pakai Supabase Auth)

  Tidak ada kolom 'role' - pembedaan berdasarkan tabel mana mereka ada.

  CARA KERJA:
  1. Guru signup via Supabase Auth → Auto masuk ke tabel users (trigger)
  2. Guru buat akun siswa di tabel students
  3. Siswa login dengan email + password (tanpa Supabase Auth)
  4. Sistem cek email di tabel students untuk autentikasi
 */

-- =============================================
-- 1. DROP EXISTING TABLES
-- =============================================

DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS students_classes CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS student_auth CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS generate_student_email(text) CASCADE;
DROP FUNCTION IF EXISTS generate_student_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- =============================================
-- 2. CREATE BASE TABLES
-- =============================================

-- Users table (HANYA UNTUK GURU - extends auth.users)
-- Jika ada di sini = GURU
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Students table (HANYA UNTUK SISWA - standalone, no auth)
-- Jika ada di sini = SISWA
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

-- Classes table (dibuat oleh guru)
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL,
  class_name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(grade, class_name, teacher_id)
);

-- Students-Classes junction (many-to-many)
CREATE TABLE students_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- Materials table
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

-- Assignments table
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

-- Submissions table
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content text,
  file_url text,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Scores table
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

-- Attendance sessions table
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

-- Attendance records table
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
-- 3. CREATE INDEXES
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_created_by ON students(created_by);
CREATE INDEX idx_students_is_active ON students(is_active);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_students_classes_student_id ON students_classes(student_id);
CREATE INDEX idx_students_classes_class_id ON students_classes(class_id);
CREATE INDEX idx_materials_class_id ON materials(class_id);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_scores_assignment_id ON scores(assignment_id);
CREATE INDEX idx_scores_student_id ON scores(student_id);
CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student_id ON attendance_records(student_id);

-- =============================================
-- 4. CREATE HELPER FUNCTIONS
-- =============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate email untuk siswa
CREATE OR REPLACE FUNCTION generate_student_email(student_name text)
RETURNS text AS $$
DECLARE
  base_name text;
  random_suffix text;
  final_email text;
  counter integer := 0;
BEGIN
  base_name := lower(regexp_replace(student_name, '[^a-zA-Z0-9]', '', 'g'));
  
  IF length(base_name) = 0 THEN
    base_name := 'student';
  END IF;
  
  random_suffix := substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
  final_email := base_name || '.' || random_suffix || '@student.lms.local';
  
  WHILE EXISTS(SELECT 1 FROM students WHERE email = final_email) AND counter < 10 LOOP
    random_suffix := substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
    final_email := base_name || '.' || random_suffix || '@student.lms.local';
    counter := counter + 1;
  END LOOP;
  
  RETURN final_email;
END;
$$ LANGUAGE plpgsql;

-- Generate student ID
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS text AS $$
DECLARE
  new_id text;
  counter integer := 0;
BEGIN
  LOOP
    new_id := 'Siswa' || LPAD((floor(random() * 999) + 1)::text, 3, '0');
    EXIT WHEN NOT EXISTS(SELECT 1 FROM students WHERE student_id = new_id) AND counter < 100;
    counter := counter + 1;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. CREATE TRIGGERS
-- =============================================

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. ENABLE RLS
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. CREATE RLS POLICIES
-- =============================================

-- USERS TABLE (Guru saja)
-- Guru bisa baca data sendiri
CREATE POLICY "Teachers can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Guru bisa update data sendiri
CREATE POLICY "Teachers can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- STUDENTS TABLE (Siswa saja)
-- Guru bisa manage semua siswa
CREATE POLICY "Teachers can manage all students" ON students
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- Izin public untuk membaca students (untuk login siswa)
CREATE POLICY "Public can read students for auth" ON students
  FOR SELECT TO anon
  USING (true);

-- Izin untuk siswa akses data mereka sendiri setelah login
CREATE POLICY "Students can access own data" ON students
  FOR SELECT TO authenticated
  USING (
    -- Cek apakah email di students table match dengan email di users table
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email = students.email
    )
  );

-- CLASSES TABLE
-- Guru manage kelas mereka sendiri
CREATE POLICY "Teachers manage their classes" ON classes
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid());

-- Public bisa baca kelas (untuk siswa login)
CREATE POLICY "Public can read classes" ON classes
  FOR SELECT TO anon
  USING (true);

-- STUDENTS_CLASSES TABLE
-- Guru manage enrollment di kelas mereka
CREATE POLICY "Teachers manage enrollments" ON students_classes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = students_classes.class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Siswa bisa baca enrollment mereka sendiri
CREATE POLICY "Students can read own enrollments" ON students_classes
  FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN users u ON s.email = u.email
      WHERE u.id = auth.uid()
    )
  );

-- Public bisa baca enrollments
CREATE POLICY "Public can read enrollments" ON students_classes
  FOR SELECT TO anon
  USING (true);

-- MATERIALS TABLE
-- Guru manage materials di kelas mereka
CREATE POLICY "Teachers manage materials" ON materials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = materials.class_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Public bisa baca materials
CREATE POLICY "Public can read materials" ON materials
  FOR SELECT TO anon
  USING (true);

-- ASSIGNMENTS TABLE
-- Guru manage assignments di kelas mereka
CREATE POLICY "Teachers manage assignments" ON assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = assignments.class_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Public bisa baca assignments
CREATE POLICY "Public can read assignments" ON assignments
  FOR SELECT TO anon
  USING (true);

-- SUBMISSIONS TABLE
-- Guru bisa baca submissions di kelas mereka
CREATE POLICY "Teachers read submissions" ON submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = submissions.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Siswa bisa manage submissions mereka sendiri
CREATE POLICY "Students manage own submissions" ON submissions
  FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN users u ON s.email = u.email
      WHERE u.id = auth.uid()
    )
  );

-- Public bisa baca submissions untuk auth
CREATE POLICY "Public can read submissions for auth" ON submissions
  FOR SELECT TO anon
  USING (true);

-- SCORES TABLE
-- Guru manage scores di kelas mereka
CREATE POLICY "Teachers manage scores" ON scores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = scores.assignment_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Public bisa baca scores
CREATE POLICY "Public can read scores" ON scores
  FOR SELECT TO anon
  USING (true);

-- ATTENDANCE SESSIONS TABLE
-- Guru manage attendance di kelas mereka
CREATE POLICY "Teachers manage attendance sessions" ON attendance_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = attendance_sessions.class_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Public bisa baca attendance sessions
CREATE POLICY "Public can read attendance sessions" ON attendance_sessions
  FOR SELECT TO anon
  USING (true);

-- ATTENDANCE RECORDS TABLE
-- Guru manage attendance records di kelas mereka
CREATE POLICY "Teachers manage attendance records" ON attendance_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions ats
      JOIN classes c ON ats.class_id = c.id
      WHERE ats.id = attendance_records.session_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Siswa bisa manage attendance records mereka sendiri
CREATE POLICY "Students manage own attendance" ON attendance_records
  FOR ALL TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN users u ON s.email = u.email
      WHERE u.id = auth.uid()
    )
  );

-- Public bisa baca attendance records untuk auth
CREATE POLICY "Public can read attendance records for auth" ON attendance_records
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Anon perlu akses untuk login siswa
GRANT SELECT, INSERT, UPDATE ON students TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON classes TO anon;
GRANT SELECT ON students_classes TO anon;
GRANT SELECT ON materials TO anon;
GRANT SELECT ON assignments TO anon;
GRANT ALL ON submissions TO anon;
GRANT SELECT ON scores TO anon;
GRANT SELECT ON attendance_sessions TO anon;
GRANT ALL ON attendance_records TO anon;

-- =============================================
-- 9. AUTO-CREATE USER RECORD ON AUTH SIGNUP
-- =============================================

-- Trigger untuk auto-create record di users table saat signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger jika sudah ada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Buat trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 10. CREATE EXISTING AUTH USERS
-- =============================================

-- Insert semua user yang sudah ada di auth.users ke tabel users
INSERT INTO users (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- =============================================
-- 11. COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LMS DATABASE SETUP SELESAI!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'ARSITEKTUR SEDERHANA:';
  RAISE NOTICE '✓ GURU = Ada di auth.users + tabel users';
  RAISE NOTICE '✓ SISWA = Hanya di tabel students (no auth)';
  RAISE NOTICE '✓ Tidak ada kolom role!';
  RAISE NOTICE '';
  RAISE NOTICE 'CARA KERJA:';
  RAISE NOTICE '1. Guru signup via Supabase Auth';
  RAISE NOTICE '2. Auto masuk ke tabel users (via trigger)';
  RAISE NOTICE '3. Guru buat akun siswa di tabel students';
  RAISE NOTICE '4. Siswa login pakai email + password';
  RAISE NOTICE '';
  RAISE NOTICE 'PASSWORD SISWA DEFAULT:';
  RAISE NOTICE '→ Tanggal lahir format DDMMYYYY';
  RAISE NOTICE '========================================';
END $$;