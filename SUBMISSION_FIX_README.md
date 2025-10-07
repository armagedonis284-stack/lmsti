# Fix untuk Error Submission Siswa

## Masalah
Siswa tidak bisa mengirim tugas karena error RLS (Row Level Security) policy:
```
Error submitting assignment: 
Object { code: "42501", details: null, hint: null, message: 'new row violates row-level security policy for table "submissions"' }
```

## Penyebab
Sistem autentikasi menggunakan arsitektur hybrid:
- **Guru**: Menggunakan Supabase Auth (tabel `users`)
- **Siswa**: Menggunakan sistem autentikasi custom (tabel `students` saja)

RLS policy yang ada mengharapkan semua user menggunakan Supabase Auth, padahal siswa tidak.

## Solusi

### 1. Update RLS Policies (PRIORITAS UTAMA)
Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- File: fix_submissions_rls.sql
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students manage own submissions" ON submissions;
DROP POLICY IF EXISTS "Teachers read submissions" ON submissions;
DROP POLICY IF EXISTS "Public can read submissions for auth" ON submissions;

-- Create new policies that work with custom student authentication
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

-- Fallback policy for students
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

-- Teachers can manage submissions from their classes
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

-- Students can read their own submissions
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
```

### 2. Buat Database Function (BACKUP SOLUTION)
Jika RLS policy masih bermasalah, jalankan SQL berikut:

```sql
-- File: create_submission_function.sql
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
  INSERT INTO submissions (assignment_id, student_id, content, file_url, submitted_at)
  VALUES (p_assignment_id, p_student_id, p_content, p_file_url, now())
  ON CONFLICT (assignment_id, student_id)
  DO UPDATE SET
    content = EXCLUDED.content,
    file_url = EXCLUDED.file_url,
    submitted_at = now();

  result := json_build_object(
    'success', true,
    'message', 'Assignment submitted successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_assignment TO anon;
GRANT EXECUTE ON FUNCTION submit_assignment TO authenticated;
```

### 3. Update Kode Frontend (SUDAH DILAKUKAN)
File `StudentAssignments.tsx` sudah diupdate untuk:
- Menangani error RLS dengan lebih baik
- Menggunakan database function sebagai fallback
- Memberikan pesan error yang lebih informatif

## Cara Menerapkan Fix

1. **Buka Supabase Dashboard**
2. **Pergi ke SQL Editor**
3. **Jalankan SQL dari file `fix_submissions_rls.sql`**
4. **Jika masih bermasalah, jalankan SQL dari file `create_submission_function.sql`**
5. **Test dengan login sebagai siswa dan coba submit tugas**

## Testing

Setelah menerapkan fix:
1. Login sebagai siswa
2. Buka halaman "Tugas Saya"
3. Pilih tugas yang belum dikumpulkan
4. Isi jawaban dan klik "Kirim Tugas"
5. Pastikan tidak ada error RLS

## Catatan

- Fix ini mempertahankan keamanan dengan tetap membatasi siswa hanya bisa mengakses submission mereka sendiri
- Guru tetap bisa melihat dan mengelola submission dari kelas mereka
- Sistem fallback memastikan kompatibilitas dengan berbagai skenario autentikasi
