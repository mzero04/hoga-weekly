# HOGA B – Weekly Line Monitoring System (Vercel + Supabase)

Struktur proyek:

```
hoga-b-monitoring/
├── public/index.html        # Aplikasi (tampilan sama + login + tab Users)
├── api/config.js            # Mengirim URL & anon key Supabase ke browser
├── api/users.js             # Tambah / list / hapus user (khusus admin)
└── supabase/schema.sql      # Tabel, RLS, trigger profile
```

## 1. Siapkan Supabase
1. Buat project di https://supabase.com.
2. Buka **SQL Editor** → paste isi `supabase/schema.sql` → **Run**.
3. Buka **Authentication → Users → Add user → Create new user**, isi email & password, centang **Auto Confirm User**. Ini akun admin pertama.
4. Jalankan di SQL Editor (ganti emailnya):
   ```sql
   update public.profiles set role = 'admin' where email = 'email-anda@perusahaan.com';
   ```
5. (Disarankan) **Authentication → Providers → Email** → matikan *Allow new users to sign up* agar hanya admin yang bisa menambah user.
6. Catat dari **Project Settings → API**:
   - `Project URL`
   - `anon public` key
   - `service_role` key (RAHASIA, jangan dibagikan / jangan dimasukkan ke index.html)

## 2. Deploy ke Vercel
1. Upload folder ini ke GitHub (atau pakai `vercel` CLI dari folder ini).
2. Di Vercel: **Add New → Project** → pilih repo. Framework Preset: **Other**. Tidak perlu build command.
3. Tambahkan **Environment Variables**:

   | Nama | Isi |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

4. Klik **Deploy**. Buka URL Vercel, login dengan akun admin.

## 3. Menambah user
Login sebagai admin → menu **Users** → isi nama, email, password, role → **Tambah User**.
User bisa langsung login. Admin juga bisa mengubah role atau menghapus user.

## Catatan
- Data kini tersimpan di Supabase (bukan localStorage) dan dipakai bersama semua user.
- Tombol **Reset Demo** hanya tampil untuk admin dan akan menghapus semua data lalu mengisi data sampel.
- Data lama di localStorage tidak otomatis pindah; gunakan Export JSON dari versi lama lalu Import JSON di versi baru.
