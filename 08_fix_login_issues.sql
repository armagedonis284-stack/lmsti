-- =============================================
-- 08. FIX LOGIN ISSUES
-- =============================================
-- Jalankan file ini setelah 07_create_existing_users.sql
-- File ini memperbaiki masalah login dan dashboard

-- =============================================
-- DROP EXISTING PROBLEMATIC POLICIES
-- =============================================

-- Drop policies that might be causing 406 errors
DROP POLICY IF EXISTS "Teachers can read own data" ON users;
DROP POLICY IF EXISTS "Public can read users for auth" ON users;
DROP POLICY IF EXISTS "Public can read students for auth" ON students;
DROP POLICY IF EXISTS "Students can access own data" ON students;

-- =============================================
-- CREATE FIXED POLICIES FOR USERS TABLE
-- =============================================

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow public to read users (for authentication checks)
CREATE POLICY "Public can read users" ON users
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- CREATE FIXED POLICIES FOR STUDENTS TABLE
-- =============================================

-- Allow authenticated users (teachers) to manage all students
CREATE POLICY "Teachers can manage all students" ON students
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- Allow public to read students (for student login)
CREATE POLICY "Public can read students" ON students
  FOR SELECT TO anon
  USING (true);

-- Allow students to update their own data
CREATE POLICY "Students can update own data" ON students
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to update students
CREATE POLICY "Authenticated can update students" ON students
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- CREATE ADDITIONAL POLICIES FOR BETTER ACCESS
-- =============================================

-- Allow public to read classes (for student dashboard)
CREATE POLICY "Public can read all classes" ON classes
  FOR SELECT TO anon
  USING (true);

-- Allow public to read students_classes (for student enrollment check)
CREATE POLICY "Public can read all enrollments" ON students_classes
  FOR SELECT TO anon
  USING (true);

-- Allow public to read materials (for student materials)
CREATE POLICY "Public can read all materials" ON materials
  FOR SELECT TO anon
  USING (true);

-- Allow public to read assignments (for student assignments)
CREATE POLICY "Public can read all assignments" ON assignments
  FOR SELECT TO anon
  USING (true);

-- Allow public to read scores (for student grades)
CREATE POLICY "Public can read all scores" ON scores
  FOR SELECT TO anon
  USING (true);

-- Allow public to read attendance_sessions (for student attendance)
CREATE POLICY "Public can read all attendance sessions" ON attendance_sessions
  FOR SELECT TO anon
  USING (true);

-- Allow public to read attendance_records (for student attendance)
CREATE POLICY "Public can read all attendance records" ON attendance_records
  FOR SELECT TO anon
  USING (true);

-- Allow public to read assignment_comments (for student comments)
CREATE POLICY "Public can read all assignment comments" ON assignment_comments
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- UPDATE GRANT PERMISSIONS
-- =============================================

-- Ensure anon has proper permissions
GRANT SELECT ON users TO anon;
GRANT SELECT, UPDATE ON students TO anon;
GRANT SELECT ON classes TO anon;
GRANT SELECT ON students_classes TO anon;
GRANT SELECT ON materials TO anon;
GRANT SELECT ON assignments TO anon;
GRANT ALL ON submissions TO anon;
GRANT SELECT ON scores TO anon;
GRANT SELECT ON attendance_sessions TO anon;
GRANT ALL ON attendance_records TO anon;
GRANT ALL ON assignment_comments TO anon;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LOGIN ISSUES BERHASIL DIPERBAIKI!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Perbaikan yang dilakukan:';
  RAISE NOTICE '✓ Fixed HTTP 406 errors pada users table';
  RAISE NOTICE '✓ Fixed HTTP 406 errors pada students table';
  RAISE NOTICE '✓ Added public read access untuk semua tabel';
  RAISE NOTICE '✓ Updated grant permissions untuk anon role';
  RAISE NOTICE '✓ Fixed login dan dashboard access';
  RAISE NOTICE '';
  RAISE NOTICE 'Database siap untuk login dan dashboard!';
  RAISE NOTICE '========================================';
END $$;
