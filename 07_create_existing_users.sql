-- =============================================
-- 07. CREATE EXISTING AUTH USERS
-- =============================================
-- Jalankan file ini setelah 06_create_storage.sql
-- File ini membuat record di users table untuk user yang sudah ada di auth.users

-- =============================================
-- INSERT EXISTING AUTH USERS
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
-- COMPLETION MESSAGE
-- =============================================

DO $$
DECLARE
  user_count integer;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM users;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'EXISTING USERS BERHASIL DIBUAT!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total users yang dibuat: %', user_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Setup database LMS selesai!';
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
  RAISE NOTICE '';
  RAISE NOTICE 'Database siap digunakan!';
  RAISE NOTICE '========================================';
END $$;
