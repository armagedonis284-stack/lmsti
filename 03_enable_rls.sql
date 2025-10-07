-- =============================================
-- 03. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================
-- Jalankan file ini setelah 02_create_functions.sql
-- File ini mengaktifkan RLS untuk semua tabel

-- =============================================
-- ENABLE RLS FOR ALL TABLES
-- =============================================

-- Enable RLS untuk semua tabel
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
ALTER TABLE assignment_comments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ROW LEVEL SECURITY BERHASIL DIAKTIFKAN!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS diaktifkan untuk tabel:';
  RAISE NOTICE '✓ users';
  RAISE NOTICE '✓ students';
  RAISE NOTICE '✓ classes';
  RAISE NOTICE '✓ students_classes';
  RAISE NOTICE '✓ materials';
  RAISE NOTICE '✓ assignments';
  RAISE NOTICE '✓ submissions';
  RAISE NOTICE '✓ scores';
  RAISE NOTICE '✓ attendance_sessions';
  RAISE NOTICE '✓ attendance_records';
  RAISE NOTICE '✓ assignment_comments';
  RAISE NOTICE '';
  RAISE NOTICE 'Langkah selanjutnya:';
  RAISE NOTICE '→ Jalankan 04_create_policies.sql';
  RAISE NOTICE '========================================';
END $$;
