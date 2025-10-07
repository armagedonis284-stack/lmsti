-- =============================================
-- 02. CREATE FUNCTIONS - Helper Functions
-- =============================================
-- Jalankan file ini setelah 01_create_tables.sql
-- File ini berisi semua fungsi helper yang diperlukan

-- =============================================
-- 1. AUTO-UPDATE UPDATED_AT FUNCTION
-- =============================================
-- Fungsi untuk auto-update kolom updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. GENERATE STUDENT EMAIL FUNCTION
-- =============================================
-- Fungsi untuk generate email unik untuk siswa
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

-- =============================================
-- 3. GENERATE STUDENT ID FUNCTION
-- =============================================
-- Fungsi untuk generate ID siswa unik
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
-- 4. SUBMIT ASSIGNMENT FUNCTION
-- =============================================
-- Fungsi untuk submit tugas (bypass RLS issues)
CREATE OR REPLACE FUNCTION submit_assignment(
  p_assignment_id uuid,
  p_student_id uuid,
  p_content text,
  p_file_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Insert or update submission
  INSERT INTO submissions (assignment_id, student_id, content, file_url, submitted_at)
  VALUES (p_assignment_id, p_student_id, p_content, p_file_url, now())
  ON CONFLICT (assignment_id, student_id)
  DO UPDATE SET
    content = EXCLUDED.content,
    file_url = EXCLUDED.file_url,
    submitted_at = now();

  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'Assignment submitted successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

-- =============================================
-- 5. AUTO-CREATE USER RECORD FUNCTION
-- =============================================
-- Fungsi untuk auto-create record di users table saat signup guru
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

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Auto-update triggers untuk updated_at
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

CREATE TRIGGER update_assignment_comments_updated_at
  BEFORE UPDATE ON assignment_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user record trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- GRANT PERMISSIONS FOR FUNCTIONS
-- =============================================

-- Grant execute permission untuk submit_assignment function
GRANT EXECUTE ON FUNCTION submit_assignment TO anon;
GRANT EXECUTE ON FUNCTION submit_assignment TO authenticated;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FUNGSI HELPER BERHASIL DIBUAT!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fungsi yang dibuat:';
  RAISE NOTICE '✓ update_updated_at_column() - Auto update timestamp';
  RAISE NOTICE '✓ generate_student_email() - Generate email siswa';
  RAISE NOTICE '✓ generate_student_id() - Generate ID siswa';
  RAISE NOTICE '✓ submit_assignment() - Submit tugas siswa';
  RAISE NOTICE '✓ handle_new_user() - Auto create user record';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger yang dibuat:';
  RAISE NOTICE '✓ Auto-update triggers untuk semua tabel';
  RAISE NOTICE '✓ Auto-create user record trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'Langkah selanjutnya:';
  RAISE NOTICE '→ Jalankan 03_enable_rls.sql';
  RAISE NOTICE '========================================';
END $$;
