# Sistem Absensi Siswa

Aplikasi web untuk manajemen absensi siswa menggunakan Node.js dan MySQL.

## 📋 Fitur Utama

- ✅ Manajemen data guru dan admin
- 📚 Manajemen data siswa per kelas
- 📅 Pencatatan absensi harian (hadir/izin/sakit/alpha)
- 👥 Multi-role user (superadmin/guru)
- 📸 Upload foto siswa
- 📊 Export data absensi ke Excel

## 🛠️ Teknologi

- Backend: Node.js + Express.js
- Database: MySQL
- View Engine: EJS
- Authentication: JWT + Bcrypt
- File Upload: Multer
- Excel Processing: XLSX

## 📦 Struktur Database

1. Tabel `guru`
   - Data guru dan admin
   - Role: superadmin/guru
   - Autentikasi dengan username/password

2. Tabel `kelas`
   - Informasi kelas
   - Relasi dengan wali kelas

3. Tabel `siswa`
   - Data lengkap siswa
   - Foto profil
   - Relasi dengan kelas

4. Tabel `absensi`
   - Record absensi harian
   - Status: hadir/izin/sakit/alpha
   - Keterangan tambahan

## 🚀 Instalasi

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup database:
   ```bash
   mysql -u root -p < database.sql
   ```

3. Konfigurasi environment:
   - Copy `.env.example` ke `.env`
   - Sesuaikan pengaturan database

4. Jalankan aplikasi:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 👤 Akses Default

- Username: admin
- Password: admin123

## 📁 Struktur Folder

- `views/` - Template EJS
- `public/` - Asset statis
- `uploads/` - Storage foto siswa
- `server.js` - Entry point aplikasi
- `database.sql` - Schema database
- `create-admin.js` - Script create admin

## 💻 Development

Gunakan mode development untuk fitur hot-reload:
```bash
npm run dev
```

## 📝 Lisensi

MIT License
