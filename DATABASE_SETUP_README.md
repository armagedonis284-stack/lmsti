# Database Setup untuk LMS Project

File-file SQL ini dibuat untuk setup database LMS yang lengkap di Supabase. Jalankan file-file ini secara berurutan di Supabase SQL Editor.

## Urutan Eksekusi

### 1. 01_create_tables.sql
**Jalankan terlebih dahulu**
- Membuat semua tabel yang diperlukan
- Membuat indexes untuk performa
- Drop tabel yang sudah ada (untuk fresh start)

### 2. 02_create_functions.sql
**Jalankan setelah 01_create_tables.sql**
- Membuat fungsi helper (generate email, ID siswa, dll)
- Membuat fungsi submit_assignment untuk bypass RLS
- Membuat trigger untuk auto-update timestamp
- Membuat trigger untuk auto-create user record

### 3. 03_enable_rls.sql
**Jalankan setelah 02_create_functions.sql**
- Mengaktifkan Row Level Security (RLS) untuk semua tabel

### 4. 04_create_policies.sql
**Jalankan setelah 03_enable_rls.sql**
- Membuat semua RLS policies untuk keamanan
- Policies untuk guru (authenticated role)
- Policies untuk siswa (anon role)
- Policies untuk public access

### 5. 05_grant_permissions.sql
**Jalankan setelah 04_create_policies.sql**
- Memberikan permissions yang diperlukan
- Permissions untuk authenticated role (guru)
- Permissions untuk anon role (siswa)
- Permissions untuk service_role (system)

### 6. 06_create_storage.sql
**Jalankan setelah 05_grant_permissions.sql**
- Membuat storage buckets untuk file uploads
- Membuat storage policies untuk keamanan

### 7. 07_create_existing_users.sql
**Jalankan setelah 06_create_storage.sql**
- Membuat record di users table untuk user yang sudah ada di auth.users
- Menampilkan summary setup

### 8. 08_fix_login_issues.sql
**Jalankan terakhir (jika ada masalah login)**
- Memperbaiki error HTTP 406 pada tabel users dan students
- Memperbaiki masalah login yang tidak masuk ke dashboard
- Menambahkan public read access untuk semua tabel
- Update grant permissions untuk anon role

## Arsitektur Database

### Pembedaan User
- **GURU**: Terdaftar di Supabase Auth (auth.users) dan tabel users
- **SISWA**: Hanya di tabel students (tidak pakai Supabase Auth)

### Tabel Utama
1. **users** - Data guru
2. **students** - Data siswa
3. **classes** - Kelas
4. **students_classes** - Enrollment siswa ke kelas
5. **materials** - Materi pembelajaran
6. **assignments** - Tugas
7. **submissions** - Pengumpulan tugas
8. **scores** - Nilai
9. **attendance_sessions** - Sesi absensi
10. **attendance_records** - Catatan absensi
11. **assignment_comments** - Komentar tugas

### Keamanan
- Row Level Security (RLS) aktif untuk semua tabel
- Policies yang berbeda untuk guru dan siswa
- Storage policies untuk file uploads
- Function dengan SECURITY DEFINER untuk bypass RLS

## Cara Kerja

1. **Guru signup** via Supabase Auth → Auto masuk ke tabel users (trigger)
2. **Guru buat akun siswa** di tabel students
3. **Siswa login** dengan email + password (tanpa Supabase Auth)
4. **Sistem cek email** di tabel students untuk autentikasi

## Password Default Siswa
- Format: Tanggal lahir DDMMYYYY
- Contoh: 15 Januari 2010 → 15012010

## Troubleshooting

### Jika ada error saat menjalankan:
1. Pastikan menjalankan file secara berurutan
2. Cek apakah ada tabel yang sudah ada sebelumnya
3. Pastikan RLS sudah diaktifkan sebelum membuat policies
4. Cek permissions untuk setiap role

### Jika ada masalah dengan RLS:
1. Pastikan policies sudah dibuat dengan benar
2. Cek apakah user sudah terdaftar di auth.users
3. Pastikan anon role memiliki permissions yang cukup

## Verifikasi Setup

Setelah menjalankan semua file, cek:
1. Semua tabel sudah dibuat
2. RLS aktif untuk semua tabel
3. Policies sudah dibuat
4. Permissions sudah diberikan
5. Storage buckets sudah dibuat
6. Existing users sudah dibuat

Database siap digunakan untuk aplikasi LMS!

## Cara Menjalankan

1. Drop project database di Supabase
2. Buat project database baru
3. Jalankan file SQL secara berurutan di SQL Editor:
   - `01_create_tables.sql`
   - `02_create_functions.sql`
   - `03_enable_rls.sql`
   - `04_create_policies.sql`
   - `05_grant_permissions.sql`
   - `06_create_storage.sql`
   - `07_create_existing_users.sql`
   - `08_fix_login_issues.sql` (jika ada masalah login)

## Troubleshooting Login Issues

### Jika ada error HTTP 406:
1. Jalankan `08_fix_login_issues.sql`
2. Cek apakah policies sudah dibuat dengan benar
3. Pastikan anon role memiliki permissions yang cukup

### Jika login tidak masuk ke dashboard:
1. Pastikan user sudah terdaftar di auth.users
2. Cek apakah record sudah dibuat di users table
3. Jalankan `08_fix_login_issues.sql` untuk memperbaiki access
