# Sistem Absensi Siswa

Aplikasi web untuk mengelola absensi siswa di sekolah.

## Fitur

- Login untuk guru dan admin
- Manajemen data siswa
- Pencatatan absensi harian
- Laporan absensi (export ke Excel)
- Dashboard statistik kehadiran
- Manajemen guru (khusus admin)

## Teknologi

- Node.js
- Express.js
- MySQL
- EJS Template Engine
- Bootstrap 5

## Setup Database

1. Buat database MySQL baru
2. Import struktur database dari file `db_absensi.sql`
3. Sesuaikan konfigurasi database di file `.env`

## Instalasi

1. Clone repository ini
```bash
git clone https://github.com/Galang0304/ABSEN-SISWA.git
cd ABSEN-SISWA
```

2. Install dependencies
```bash
npm install
```

3. Setup file .env
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=db_absensi
JWT_SECRET=rahasia123
PORT=3001
```

4. Jalankan aplikasi
```bash
npm start
```

## Akses Aplikasi

- Buka browser dan akses `http://localhost:3001`
- Login dengan akun default:
  - Username: admin
  - Password: admin123

## Deployment

Aplikasi ini dapat di-deploy menggunakan layanan hosting seperti:
- Railway
- Render
- Heroku
- DigitalOcean

Pastikan untuk mengatur environment variables yang diperlukan di platform hosting yang digunakan.
