-- =============================================
-- 05. GRANT PERMISSIONS
-- =============================================
-- Jalankan file ini setelah 04_create_policies.sql
-- File ini memberikan permissions yang diperlukan untuk semua role

-- =============================================
-- GRANT SCHEMA PERMISSIONS
-- =============================================

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- =============================================
-- GRANT TABLE PERMISSIONS
-- =============================================

-- Grant all permissions to authenticated and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- =============================================
-- GRANT SPECIFIC PERMISSIONS FOR ANON ROLE
-- =============================================
-- Anon role (siswa) perlu akses khusus untuk login dan operasi dasar

-- Students table - anon needs full access for student operations
GRANT SELECT, INSERT, UPDATE ON students TO anon;

-- Users table - anon needs read access for authentication
GRANT SELECT ON users TO anon;

-- Classes table - anon needs read access
GRANT SELECT ON classes TO anon;

-- Students-Classes table - anon needs read access
GRANT SELECT ON students_classes TO anon;

-- Materials table - anon needs read access
GRANT SELECT ON materials TO anon;

-- Assignments table - anon needs read access
GRANT SELECT ON assignments TO anon;

-- Submissions table - anon needs full access for student submissions
GRANT ALL ON submissions TO anon;

-- Scores table - anon needs read access
GRANT SELECT ON scores TO anon;

-- Attendance sessions table - anon needs read access
GRANT SELECT ON attendance_sessions TO anon;

-- Attendance records table - anon needs full access for student attendance
GRANT ALL ON attendance_records TO anon;

-- Assignment comments table - anon needs full access for comments
GRANT ALL ON assignment_comments TO anon;

-- =============================================
-- GRANT SEQUENCE PERMISSIONS
-- =============================================

-- Grant sequence permissions to anon for auto-incrementing IDs
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PERMISSIONS BERHASIL DIBERIKAN!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Permissions yang diberikan:';
  RAISE NOTICE '✓ Schema permissions untuk semua role';
  RAISE NOTICE '✓ Table permissions untuk authenticated/service_role';
  RAISE NOTICE '✓ Specific permissions untuk anon role (siswa)';
  RAISE NOTICE '✓ Sequence permissions untuk anon';
  RAISE NOTICE '';
  RAISE NOTICE 'Role permissions:';
  RAISE NOTICE '→ authenticated: Full access (guru)';
  RAISE NOTICE '→ anon: Limited access (siswa)';
  RAISE NOTICE '→ service_role: Full access (system)';
  RAISE NOTICE '';
  RAISE NOTICE 'Langkah selanjutnya:';
  RAISE NOTICE '→ Jalankan 06_create_storage.sql';
  RAISE NOTICE '========================================';
END $$;
