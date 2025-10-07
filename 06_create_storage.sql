-- =============================================
-- 06. CREATE STORAGE BUCKETS
-- =============================================
-- Jalankan file ini setelah 05_grant_permissions.sql
-- File ini membuat storage buckets untuk file uploads

-- =============================================
-- CREATE STORAGE BUCKETS
-- =============================================

-- Create assignments bucket for student submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- =============================================
-- CREATE STORAGE POLICIES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can upload assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view assignment files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can manage assignment files" ON storage.objects;

-- Students can upload assignment files
CREATE POLICY "Students can upload assignment files" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'assignments');

-- Students can view assignment files
CREATE POLICY "Students can view assignment files" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'assignments');

-- Teachers can manage assignment files
CREATE POLICY "Teachers can manage assignment files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'assignments');

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STORAGE BUCKETS BERHASIL DIBUAT!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Storage yang dibuat:';
  RAISE NOTICE '✓ assignments bucket (untuk file tugas)';
  RAISE NOTICE '';
  RAISE NOTICE 'Storage policies:';
  RAISE NOTICE '✓ Students can upload assignment files';
  RAISE NOTICE '✓ Students can view assignment files';
  RAISE NOTICE '✓ Teachers can manage assignment files';
  RAISE NOTICE '';
  RAISE NOTICE 'Langkah selanjutnya:';
  RAISE NOTICE '→ Jalankan 07_create_existing_users.sql';
  RAISE NOTICE '========================================';
END $$;
