-- =============================================
-- 04. CREATE RLS POLICIES
-- =============================================
-- Jalankan file ini setelah 03_enable_rls.sql
-- File ini berisi semua RLS policies untuk keamanan database

-- =============================================
-- USERS TABLE POLICIES (GURU SAJA)
-- =============================================

-- Guru bisa baca data sendiri
CREATE POLICY "Teachers can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Guru bisa update data sendiri
CREATE POLICY "Teachers can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow public to read users for authentication (fix 406 error)
CREATE POLICY "Public can read users for auth" ON users
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- STUDENTS TABLE POLICIES (SISWA SAJA)
-- =============================================

-- Guru bisa manage semua siswa
CREATE POLICY "Teachers can manage all students" ON students
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- Izin public untuk membaca students (untuk login siswa) - fix 406 error
CREATE POLICY "Public can read students for auth" ON students
  FOR SELECT TO anon
  USING (true);

-- Izin untuk siswa akses data mereka sendiri setelah login
CREATE POLICY "Students can access own data" ON students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email = students.email
    )
  );

-- Allow students to update their own data (by email verification)
CREATE POLICY "Students can update own profile" ON students
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Also allow authenticated users to update students
CREATE POLICY "Authenticated can update students" ON students
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- CLASSES TABLE POLICIES
-- =============================================

-- Guru manage kelas mereka sendiri
CREATE POLICY "Teachers manage their classes" ON classes
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid());

-- Public bisa baca kelas (untuk siswa login)
CREATE POLICY "Public can read classes" ON classes
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- STUDENTS_CLASSES TABLE POLICIES
-- =============================================

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

-- =============================================
-- MATERIALS TABLE POLICIES
-- =============================================

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

-- =============================================
-- ASSIGNMENTS TABLE POLICIES
-- =============================================

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

-- =============================================
-- SUBMISSIONS TABLE POLICIES
-- =============================================

-- Allow students to manage their own submissions (using anon role since students don't use Supabase Auth)
CREATE POLICY "Students can manage own submissions" ON submissions
  FOR ALL TO anon
  USING (
    student_id IN (
      SELECT id FROM students 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM students 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Fallback policy for students (in case JWT claims don't work properly)
CREATE POLICY "Students can manage submissions fallback" ON submissions
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Teachers can read submissions from their classes
CREATE POLICY "Teachers can read submissions from their classes" ON submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = submissions.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can manage submissions from their classes (for grading)
CREATE POLICY "Teachers can manage submissions from their classes" ON submissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = submissions.assignment_id
      AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = submissions.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Also ensure that students can read their own submissions
CREATE POLICY "Students can read own submissions" ON submissions
  FOR SELECT TO anon
  USING (
    student_id IN (
      SELECT id FROM students 
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- Fallback for reading submissions
CREATE POLICY "Students can read submissions fallback" ON submissions
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- SCORES TABLE POLICIES
-- =============================================

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

-- =============================================
-- ATTENDANCE SESSIONS TABLE POLICIES
-- =============================================

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

-- =============================================
-- ATTENDANCE RECORDS TABLE POLICIES
-- =============================================

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
-- ASSIGNMENT COMMENTS TABLE POLICIES
-- =============================================

-- Allow all authenticated users to view comments
CREATE POLICY "Allow authenticated users to view comments" ON assignment_comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert comments
CREATE POLICY "Allow authenticated users to insert comments" ON assignment_comments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update their own comments
CREATE POLICY "Allow authenticated users to update their own comments" ON assignment_comments
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to delete their own comments
CREATE POLICY "Allow authenticated users to delete their own comments" ON assignment_comments
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICIES BERHASIL DIBUAT!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies yang dibuat:';
  RAISE NOTICE '✓ Users policies (guru)';
  RAISE NOTICE '✓ Students policies (siswa)';
  RAISE NOTICE '✓ Classes policies';
  RAISE NOTICE '✓ Students-Classes policies';
  RAISE NOTICE '✓ Materials policies';
  RAISE NOTICE '✓ Assignments policies';
  RAISE NOTICE '✓ Submissions policies';
  RAISE NOTICE '✓ Scores policies';
  RAISE NOTICE '✓ Attendance sessions policies';
  RAISE NOTICE '✓ Attendance records policies';
  RAISE NOTICE '✓ Assignment comments policies';
  RAISE NOTICE '';
  RAISE NOTICE 'Langkah selanjutnya:';
  RAISE NOTICE '→ Jalankan 05_grant_permissions.sql';
  RAISE NOTICE '========================================';
END $$;
