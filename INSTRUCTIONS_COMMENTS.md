# Cara Mengaktifkan Fitur Komentar

## Masalah
Tugas tambahan sudah muncul, tapi fitur komentar tidak bisa digunakan karena tabel `assignment_comments` belum ada di database.

## Solusi
Jalankan SQL script berikut di Supabase Dashboard:

### Langkah-langkah:
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Pergi ke **SQL Editor**
4. Copy dan paste seluruh isi file `create_comments_table.sql`
5. Klik **Run** untuk menjalankan script

### File yang perlu dijalankan:
- `create_comments_table.sql` - Script untuk membuat tabel dan policies

### Setelah SQL dijalankan:
- Tabel `assignment_comments` akan dibuat
- RLS policies akan diaktifkan
- Fitur komentar akan berfungsi penuh
- Siswa dan guru bisa menambah, edit, dan hapus komentar

### Testing:
1. Refresh halaman Additional Assignments
2. Klik tombol "Komentar" pada tugas
3. Coba tambah komentar baru
4. Coba edit dan hapus komentar

## Catatan:
- Pastikan Anda sudah login sebagai admin di Supabase Dashboard
- Script ini aman untuk dijalankan (menggunakan DROP IF EXISTS)
- Tidak akan merusak data yang sudah ada