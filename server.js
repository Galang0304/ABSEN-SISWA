require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const flash = require('connect-flash');
const XLSX = require('xlsx');

// Konfigurasi multer untuk menerima file Excel
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
            cb(null, true);
        } else {
            cb(new Error('Hanya file Excel (.xlsx) yang diperbolehkan!'), false);
        }
    }
});

// Inisialisasi Express
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/images', express.static('public/images'));
app.set('view engine', 'ejs');

// Konfigurasi session
app.use(session({
    secret: process.env.JWT_SECRET || 'rahasia123',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // set true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 jam
    }
}));

// Inisialisasi Flash Messages
app.use(flash());

// Konfigurasi database
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'db_absensi'
};

// Buat koneksi database
const db = mysql.createPool(dbConfig);

// Test koneksi database
async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to MySQL database');
        connection.release();
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
}

// Jalankan test koneksi
testConnection();

// Middleware untuk autentikasi
function checkLogin(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Middleware untuk memeriksa role superadmin
const checkSuperAdmin = (req, res, next) => {
    if (!req.session.guru || req.session.guru.role !== 'superadmin') {
        return res.redirect('/dashboard');
    }
    next();
};

// Route untuk halaman manajemen guru (hanya superadmin)
app.get('/manajemen-guru', checkSuperAdmin, async (req, res) => {
    try {
        const [daftarGuru] = await db.query('SELECT id, nama, username, role, created_at FROM guru ORDER BY created_at DESC');
        res.render('manajemen-guru', { 
            guru: req.session.guru,
            daftarGuru,
            path: '/manajemen-guru',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Terjadi kesalahan saat memuat data guru');
        res.redirect('/dashboard');
    }
});

// Route untuk menambah guru baru
app.post('/guru/add', checkSuperAdmin, async (req, res) => {
    const { nama, username, password, konfirmasi_password } = req.body;

    try {
        // Validasi input
        if (!nama || !username || !password || !konfirmasi_password) {
            req.flash('error', 'Semua field harus diisi');
            return res.redirect('/manajemen-guru');
        }

        if (password !== konfirmasi_password) {
            req.flash('error', 'Password dan konfirmasi password tidak cocok');
            return res.redirect('/manajemen-guru');
        }

        // Cek username sudah digunakan atau belum
        const [existingUser] = await db.query('SELECT id FROM guru WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            req.flash('error', 'Username sudah digunakan');
            return res.redirect('/manajemen-guru');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Simpan guru baru
        await db.query(
            'INSERT INTO guru (nama, username, password, role) VALUES (?, ?, ?, ?)',
            [nama, username, hashedPassword, 'guru']
        );

        req.flash('success', 'Guru berhasil ditambahkan');
        res.redirect('/manajemen-guru');
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Terjadi kesalahan saat menambah guru');
        res.redirect('/manajemen-guru');
    }
});

// Route untuk menghapus guru
app.post('/guru/delete/:id', checkSuperAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // Cek apakah guru yang akan dihapus bukan superadmin
        const [guru] = await db.query('SELECT role FROM guru WHERE id = ?', [id]);
        if (guru.length === 0) {
            req.flash('error', 'Guru tidak ditemukan');
            return res.redirect('/manajemen-guru');
        }

        if (guru[0].role === 'superadmin') {
            req.flash('error', 'Tidak dapat menghapus akun superadmin');
            return res.redirect('/manajemen-guru');
        }

        // Hapus guru
        await db.query('DELETE FROM guru WHERE id = ?', [id]);

        req.flash('success', 'Guru berhasil dihapus');
        res.redirect('/manajemen-guru');
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Terjadi kesalahan saat menghapus guru');
        res.redirect('/manajemen-guru');
    }
});

// Route untuk halaman home
app.get('/', async (req, res) => {
    try {
        const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
        const selectedClass = req.query.class_id || '';

        // Ambil daftar kelas
        const [classes] = await db.query('SELECT id, nama_kelas FROM kelas ORDER BY nama_kelas');
        
        // Query untuk mengambil data absensi
        let attendanceQuery = `
            SELECT 
                s.id as siswa_id,
                s.nis,
                s.nama as nama_siswa,
                k.nama_kelas,
                k.id as kelas_id,
                COALESCE(a.status, 'Belum Absen') as status
            FROM siswa s
            LEFT JOIN kelas k ON s.kelas_id = k.id
            LEFT JOIN absensi a ON s.id = a.siswa_id 
                AND DATE(a.tanggal) = ?
        `;

        const queryParams = [selectedDate];

        if (selectedClass) {
            attendanceQuery += ` WHERE k.id = ?`;
            queryParams.push(selectedClass);
        }

        attendanceQuery += ` ORDER BY k.nama_kelas, s.nama`;
        
        // Eksekusi query
        const [attendanceData] = await db.query(attendanceQuery, queryParams);

        res.render('home', {
            attendanceData,
            classes,
            selectedClass,
            selectedDate
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan dalam mengambil data');
    }
});

// Login page route
app.get('/login', (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [guru] = await db.query('SELECT * FROM guru WHERE username = ?', [username]);
        
        if (guru.length === 0) {
            return res.render('login', { error: 'Username atau password salah' });
        }
        
        const validPassword = await bcrypt.compare(password, guru[0].password);
        if (!validPassword) {
            return res.render('login', { error: 'Username atau password salah' });
        }

        // Set session data
        req.session.loggedIn = true;
        req.session.guru = guru[0];
        req.session.guruId = guru[0].id;
        req.session.nama = guru[0].nama;
        
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error:', err);
        res.render('login', { error: 'Terjadi kesalahan server' });
    }
});

// Dashboard route
app.get('/dashboard', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    try {
        const selectedDate = req.query.tanggal || new Date().toISOString().split('T')[0];
        console.log('Tanggal yang dipilih:', selectedDate);

        // Ambil statistik untuk tanggal yang dipilih
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM siswa) as total_siswa,
                (SELECT COUNT(*) FROM guru) as total_guru,
                COUNT(CASE WHEN a.status = 'hadir' AND DATE(a.tanggal) = ? THEN 1 END) as total_hadir,
                COUNT(CASE WHEN (a.status = 'izin' OR a.status = 'sakit') AND DATE(a.tanggal) = ? THEN 1 END) as total_izin_sakit,
                COUNT(CASE WHEN a.status = 'alpha' AND DATE(a.tanggal) = ? THEN 1 END) as total_alpha,
                ROUND(
                    (COUNT(CASE WHEN a.status = 'hadir' AND DATE(a.tanggal) = ? THEN 1 END) * 100.0) / 
                    NULLIF((SELECT COUNT(*) FROM siswa), 0)
                ) as persentase_kehadiran
            FROM siswa s
            LEFT JOIN absensi a ON s.id = a.siswa_id AND DATE(a.tanggal) = ?
        `, [selectedDate, selectedDate, selectedDate, selectedDate, selectedDate]);

        // Query untuk mendapatkan statistik per kelas
        const kelasStatsQuery = `
            SELECT 
                k.nama_kelas as kelas,
                COUNT(DISTINCT s.id) as total_siswa,
                COUNT(CASE WHEN a.status = 'hadir' AND DATE(a.tanggal) = ? THEN 1 END) as hadir,
                ROUND(
                    COUNT(CASE WHEN a.status = 'hadir' AND DATE(a.tanggal) = ? THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(DISTINCT s.id), 0)
                ) as percentage
            FROM siswa s
            INNER JOIN kelas k ON s.kelas_id = k.id
            LEFT JOIN absensi a ON s.id = a.siswa_id AND DATE(a.tanggal) = ?
            GROUP BY k.id, k.nama_kelas
            ORDER BY k.nama_kelas
        `;

        const [kelasStats] = await db.query(kelasStatsQuery, [selectedDate, selectedDate, selectedDate]);

        // Query untuk mendapatkan daftar siswa dengan status kehadiran hari ini
        const siswaQuery = `
            SELECT 
                s.id,
                s.nis,
                s.nama,
                k.nama_kelas as kelas,
                COALESCE(a.status, 'BELUM ABSEN') as status
            FROM siswa s
            INNER JOIN kelas k ON s.kelas_id = k.id
            LEFT JOIN absensi a ON s.id = a.siswa_id AND DATE(a.tanggal) = ?
            ORDER BY k.nama_kelas, s.nama
        `;
    
        const [siswaList] = await db.query(siswaQuery, [selectedDate]);

        console.log('Statistik Dashboard:', stats[0]);
        console.log('Statistik per Kelas:', kelasStats);

        res.render('dashboard', { 
            guru: req.session.guru,
            stats: stats[0],
            kelasStats: kelasStats,
            selectedDate: selectedDate,
            siswaList: siswaList,
            path: '/dashboard'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan saat memuat data');
    }
});

// Parent login route
app.post('/parent/login', async (req, res) => {
    const { username, password } = req.body;
    
    const query = 'SELECT * FROM orang_tua WHERE username = ?';
    const [results] = await db.query(query, [username]);

        if (results.length > 0) {
            try {
                const match = await bcrypt.compare(password, results[0].password);
                if (match) {
                    req.session.loggedIn = true;
                    req.session.orangTua = results[0];
                    return res.redirect('/parent/dashboard');
                } else {
                    return res.render('parent-login', { error: 'Password salah' });
                }
            } catch (error) {
                console.error('Bcrypt error:', error);
                return res.render('parent-login', { error: 'Terjadi kesalahan sistem' });
            }
        } else {
            return res.render('parent-login', { error: 'Username tidak ditemukan' });
        }
});

// Parent dashboard route
app.get('/parent-dashboard', async (req, res) => {
    if (!req.session.orangTua) {
        return res.redirect('/login-ortu');
    }
    
    const orangTuaId = req.session.orangTua.id;
    
    try {
    // Get student data
    const queryStudent = 'SELECT * FROM siswa WHERE orang_tua_id = ?';
        const [siswaResults] = await db.query(queryStudent, [orangTuaId]);
        
        if (siswaResults.length === 0) {
            return res.render('parent-dashboard', { 
                orangTua: req.session.orangTua,
                siswa: null,
                absensi: [],
                error: 'Data siswa tidak ditemukan'
            });
        }

        const siswa = siswaResults[0];
        
        // Get attendance history
        const queryAbsensi = `
            SELECT * FROM absensi 
            WHERE siswa_id = ? 
            ORDER BY tanggal DESC, created_at DESC 
            LIMIT 30
        `;
        
        const [absensiResults] = await db.query(queryAbsensi, [siswa.id]);
            
            res.render('parent-dashboard', {
                orangTua: req.session.orangTua,
                siswa: siswa,
                absensi: absensiResults
            });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan server');
    }
});

// Route untuk menambah siswa
app.post('/siswa/add', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    try {
        const { nis, nisn, nama, kelas, jenis_kelamin } = req.body;
        
        // Validasi input
        if (!nis || !nisn || !nama || !kelas || !jenis_kelamin) {
            return res.redirect('/siswa?error=Semua field harus diisi');
        }

        // Validasi NISN (10 digit)
        if (nisn.length !== 10 || !/^\d{10}$/.test(nisn)) {
            return res.redirect('/siswa?error=NISN harus 10 digit angka');
        }

        // Validasi kelas (1-6)
        const kelasNum = parseInt(kelas);
        if (isNaN(kelasNum) || kelasNum < 1 || kelasNum > 6) {
            return res.redirect('/siswa?error=Kelas harus berupa angka 1-6');
        }

        // Dapatkan kelas_id dari tabel kelas
        const [kelasRows] = await db.query('SELECT id FROM kelas WHERE nama_kelas = ?', [`Kelas ${kelasNum}`]);
        if (kelasRows.length === 0) {
            return res.redirect('/siswa?error=' + encodeURIComponent('Kelas tidak valid'));
        }
        const kelas_id = kelasRows[0].id;
        
        // Insert data siswa
        const query = 'INSERT INTO siswa (nis, nisn, nama, kelas_id, jenis_kelamin) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.query(query, [nis, nisn, nama, kelas_id, jenis_kelamin]);

    if (result.affectedRows > 0) {
        res.redirect('/siswa?success=Siswa berhasil ditambahkan');
    } else {
        res.redirect('/siswa?error=Gagal menambah siswa');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('unique_nis')) {
                res.redirect('/siswa?error=NIS sudah digunakan');
            } else if (error.message.includes('unique_nisn')) {
                res.redirect('/siswa?error=NISN sudah digunakan');
            } else {
                res.redirect('/siswa?error=Data sudah ada dalam sistem');
            }
        } else {
            res.redirect('/siswa?error=' + encodeURIComponent(error.message));
        }
    }
});

// Route untuk update siswa
app.post('/siswa/update/:id', checkLogin, async (req, res) => {
    try {
        const { nis, nisn, nama, kelas, jenis_kelamin } = req.body;
        const id = req.params.id;

        // Validasi input
        if (!nis || !nisn || !nama || !kelas || !jenis_kelamin) {
            return res.redirect('/siswa?error=' + encodeURIComponent('Semua field harus diisi'));
        }

        // Validasi NISN harus 10 digit
        if (!/^\d{10}$/.test(nisn)) {
            return res.redirect('/siswa?error=' + encodeURIComponent('NISN harus 10 digit angka'));
        }

        // Validasi kelas harus angka 1-6
        const kelasNum = parseInt(kelas);
        if (isNaN(kelasNum) || kelasNum < 1 || kelasNum > 6) {
            return res.redirect('/siswa?error=' + encodeURIComponent('Kelas harus antara 1-6'));
        }

        // Validasi jenis kelamin harus L atau P
        if (!['L', 'P'].includes(jenis_kelamin)) {
            return res.redirect('/siswa?error=' + encodeURIComponent('Jenis kelamin harus L atau P'));
        }

        // Dapatkan kelas_id dari tabel kelas
        const [kelasRows] = await db.query('SELECT id FROM kelas WHERE nama_kelas = ?', [`Kelas ${kelasNum}`]);
        if (kelasRows.length === 0) {
            return res.redirect('/siswa?error=' + encodeURIComponent('Kelas tidak valid'));
        }
        const kelas_id = kelasRows[0].id;

        // Cek apakah NIS atau NISN sudah digunakan oleh siswa lain
        const [existingRows] = await db.query(
            'SELECT id FROM siswa WHERE (nis = ? OR nisn = ?) AND id != ?',
            [nis, nisn, id]
        );

        if (existingRows.length > 0) {
            return res.redirect('/siswa?error=' + encodeURIComponent('NIS atau NISN sudah digunakan'));
        }

        // Update data siswa
        const [result] = await db.query(
            'UPDATE siswa SET nis = ?, nisn = ?, nama = ?, kelas_id = ?, jenis_kelamin = ? WHERE id = ?',
            [nis, nisn, nama, kelas_id, jenis_kelamin, id]
        );

        if (result.affectedRows === 0) {
            return res.redirect('/siswa?error=' + encodeURIComponent('Gagal mengupdate data siswa'));
        }

        res.redirect('/siswa?success=' + encodeURIComponent('Data siswa berhasil diupdate'));
    } catch (error) {
        console.error('Error updating student:', error);
        res.redirect('/siswa?error=' + encodeURIComponent('Terjadi kesalahan saat mengupdate data'));
    }
});

// Route untuk absensi
app.get('/absensi', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    try {
        const selectedDate = req.query.tanggal || new Date().toISOString().split('T')[0];
        const selectedKelasId = req.query.kelas_id || '';
        
        // Query untuk mendapatkan daftar kelas
        const [kelasList] = await db.query('SELECT id, nama_kelas FROM kelas ORDER BY nama_kelas');
        
        // Query untuk mendapatkan daftar siswa dengan status absensi
        let siswaQuery = `
            SELECT 
                s.id,
                s.nis,
                s.nisn,
                s.nama,
                k.nama_kelas,
                k.id as kelas_id,
                COALESCE(a.status, 'BELUM ABSEN') as status
            FROM siswa s
            INNER JOIN kelas k ON s.kelas_id = k.id
            LEFT JOIN absensi a ON s.id = a.siswa_id AND DATE(a.tanggal) = ?
        `;
        
        const queryParams = [selectedDate];
        
        if (selectedKelasId) {
            siswaQuery += ' WHERE s.kelas_id = ?';
            queryParams.push(selectedKelasId);
        }
        
        siswaQuery += ' ORDER BY k.nama_kelas, s.nama';
        
        const [siswaList] = await db.query(siswaQuery, queryParams);
        
        res.render('absensi', { 
            guru: req.session.guru,
            nama: req.session.guru.nama,
            siswaList: siswaList,
            kelasList: kelasList,
            selectedDate: selectedDate,
            selectedKelasId: selectedKelasId,
            path: '/absensi'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan saat memuat data');
    }
});

// Route untuk update absensi
app.post('/absensi/update', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { siswa_id, status, tanggal } = req.body;

    try {
        // Cek apakah sudah ada absensi untuk siswa pada tanggal tersebut
        const [existing] = await db.query(
            'SELECT id FROM absensi WHERE siswa_id = ? AND DATE(tanggal) = ?',
            [siswa_id, tanggal]
        );

        if (existing.length > 0) {
            // Update absensi yang sudah ada
            await db.query(
                'UPDATE absensi SET status = ? WHERE siswa_id = ? AND DATE(tanggal) = ?',
                [status, siswa_id, tanggal]
            );
        } else {
            // Insert absensi baru
            await db.query(
                'INSERT INTO absensi (siswa_id, tanggal, status) VALUES (?, ?, ?)',
                [siswa_id, tanggal, status]
            );
        }

        res.json({ 
            success: true, 
            message: 'Absensi berhasil diupdate'
        });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Get daily statistics
app.get('/api/statistics', async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const query = `
        SELECT 
            COUNT(CASE WHEN status = 'Hadir' THEN 1 END) as hadir,
            COUNT(CASE WHEN status = 'Izin' THEN 1 END) as izin,
            COUNT(CASE WHEN status = 'Sakit' THEN 1 END) as sakit,
            COUNT(CASE WHEN status = 'Alpha' THEN 1 END) as alpha
        FROM absensi 
        WHERE tanggal = ?
    `;
    
    const [results] = await db.query(query, [today]);
        res.json(results[0]);
});

// Parent notification settings
app.post('/parent/notifications/settings', async (req, res) => {
    if (!req.session.loggedIn || !req.session.orangTua) {
        return res.redirect('/parent/login');
    }

    const { email_notification, sms_notification } = req.body;
    const [statsResults] = await db.execute(statsQuery, [selectedDate, selectedDate, selectedDate]);

    // Pastikan stats memiliki nilai default
    const stats = statsResults[0] || {
        total_siswa: 0,
        total_hadir: 0,
        total_izin_sakit: 0,
        total_alpha: 0
    };

    const query = `
        UPDATE orang_tua 
        SET email_notification = ?, sms_notification = ?
        WHERE id = ?
    `;

    const [result] = await db.query(query, [
        email_notification === 'on', 
        sms_notification === 'on',
        req.session.orangTua.id
    ]);

    if (result.affectedRows > 0) {
        res.redirect('/parent/profile?success=Pengaturan berhasil diupdate');
    } else {
        console.error('Error updating notifications:', result);
        res.redirect('/parent/profile?error=Gagal mengupdate pengaturan');
    }
});

// Route untuk data siswa
app.get('/siswa', checkLogin, checkSuperAdmin, async (req, res) => {
    try {
        const query = `
            SELECT s.*, k.nama_kelas,
                   COUNT(CASE WHEN a.status = 'hadir' THEN 1 END) as total_hadir,
                   COUNT(CASE WHEN a.status = 'izin' THEN 1 END) as total_izin,
                   COUNT(CASE WHEN a.status = 'sakit' THEN 1 END) as total_sakit,
                   COUNT(CASE WHEN a.status = 'alpha' THEN 1 END) as total_alpha
            FROM siswa s
            INNER JOIN kelas k ON s.kelas_id = k.id
            LEFT JOIN absensi a ON s.id = a.siswa_id
            GROUP BY s.id, k.nama_kelas
            ORDER BY k.nama_kelas, s.nama
        `;

        const [results] = await db.query(query);
        res.render('data-siswa', {
            guru: req.session.guru,
            siswa: results,
            error: req.query.error,
            success: req.query.success,
            path: '/siswa'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan saat memuat data');
    }
});

// Route untuk laporan
app.get('/laporan', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }

    try {
        const { bulan, tahun, kelas_id } = req.query;
        let query = `
            SELECT 
                s.nis, 
                s.nisn, 
                s.nama, 
                k.nama_kelas,
                a.tanggal,
                a.status
            FROM siswa s
            INNER JOIN kelas k ON s.kelas_id = k.id
            LEFT JOIN absensi a ON s.id = a.siswa_id
        `;

        const queryParams = [];
        const whereClauses = [];

        if (bulan && tahun) {
            whereClauses.push("DATE_FORMAT(a.tanggal, '%Y-%m') = ?");
            queryParams.push(`${tahun}-${bulan.padStart(2, '0')}`);
        }

        if (kelas_id) {
            whereClauses.push("s.kelas_id = ?");
            queryParams.push(kelas_id);
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ` ORDER BY k.nama_kelas, s.nama, a.tanggal`;

        // Get kelas list for dropdown
        const [kelasList] = await db.query('SELECT id, nama_kelas FROM kelas ORDER BY nama_kelas');
        const [data] = await db.query(query, queryParams);

        res.render('laporan', {
            guru: req.session.guru,
            data: data,
            kelasList: kelasList,
            filter: {
                bulan: bulan || '',
                tahun: tahun || '',
                kelas_id: kelas_id || ''
            },
            path: '/laporan'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan saat memuat data laporan');
    }
});

// Export Laporan to Excel
app.get('/laporan/export', async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/');
    }

    const { bulan, tahun, kelas } = req.query;
    let query = `
        SELECT s.nis, s.nisn, s.nama, s.kelas,
               COUNT(CASE WHEN a.status = 'Hadir' THEN 1 END) as total_hadir,
               COUNT(CASE WHEN a.status = 'Izin' THEN 1 END) as total_izin,
               COUNT(CASE WHEN a.status = 'Sakit' THEN 1 END) as total_sakit,
               COUNT(CASE WHEN a.status = 'Alpha' THEN 1 END) as total_alpha
        FROM siswa s
        LEFT JOIN absensi a ON s.id = a.siswa_id
    `;

    const queryParams = [];
    const whereClauses = [];

    if (bulan && tahun) {
        whereClauses.push("DATE_FORMAT(a.tanggal, '%Y-%m') = ?");
        queryParams.push(`${tahun}-${bulan.padStart(2, '0')}`);
    }

    if (kelas) {
        whereClauses.push("s.kelas = ?");
        queryParams.push(kelas);
    }

    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` GROUP BY s.id ORDER BY s.kelas, s.nama`;

    try {
        const [results] = await db.query(query, queryParams);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=laporan_absensi_${tahun}_${bulan}.xlsx`);
        res.json(results);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengekspor data' });
    }
});

// Route untuk download template siswa
app.get('/siswa/download-template', checkLogin, (req, res) => {
    const templatePath = path.join(__dirname, 'templates', 'template-siswa.xlsx');
    res.download(templatePath, 'template-siswa.xlsx', (err) => {
        if (err) {
            console.error('Error downloading template:', err);
            res.status(500).send('Error downloading template');
        }
    });
});

// Import data siswa
app.post('/siswa/import', checkLogin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.redirect('/siswa?error=' + encodeURIComponent('File tidak ditemukan'));
        }

        const workbook = XLSX.read(req.file.buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Skip header row
        const rows = data.slice(1);
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
            // Skip empty rows
            if (!row || row.length === 0) continue;

            const [nis, nisn, nama, kelas, jenis_kelamin] = row;

            // Skip if any required field is missing
            if (!nis || !nisn || !nama || !kelas || !jenis_kelamin) {
                console.log('Data tidak lengkap:', row);
                errorCount++;
                continue;
            }

            try {
                // Validasi NISN (10 digit)
                if (nisn.toString().length !== 10) {
                    console.log('NISN tidak valid:', nisn);
                    errorCount++;
                    continue;
                }

                // Validasi kelas (1-6)
                const kelasNum = parseInt(kelas);
                if (isNaN(kelasNum) || kelasNum < 1 || kelasNum > 6) {
                    console.log('Kelas tidak valid:', kelas);
                    errorCount++;
                    continue;
                }

                // Validasi jenis kelamin (L/P)
                if (!['L', 'P'].includes(jenis_kelamin)) {
                    console.log('Jenis kelamin tidak valid:', jenis_kelamin);
                    errorCount++;
                    continue;
                }

                // Dapatkan kelas_id
                const [kelasRows] = await db.query('SELECT id FROM kelas WHERE nama_kelas = ?', [`Kelas ${kelasNum}`]);
                if (kelasRows.length === 0) {
                    console.log('Kelas tidak ditemukan:', kelasNum);
                    errorCount++;
                    continue;
                }
                const kelas_id = kelasRows[0].id;

                // Cek duplikat NIS/NISN
                const [existingRows] = await db.query(
                    'SELECT id FROM siswa WHERE nis = ? OR nisn = ?',
                    [nis, nisn]
                );

                if (existingRows.length > 0) {
                    console.log('NIS/NISN sudah ada:', nis, nisn);
                    errorCount++;
                    continue;
                }

                // Insert data siswa
                await db.query(
                    'INSERT INTO siswa (nis, nisn, nama, kelas_id, jenis_kelamin) VALUES (?, ?, ?, ?, ?)',
                    [nis, nisn, nama, kelas_id, jenis_kelamin]
                );
                successCount++;
            } catch (error) {
                console.error('Error saat import data:', error);
                errorCount++;
            }
        }

        const message = `Berhasil import ${successCount} data siswa. ${errorCount} data gagal diimport.`;
        res.redirect('/siswa?success=' + encodeURIComponent(message));
    } catch (error) {
        console.error('Error importing data:', error);
        res.redirect('/siswa?error=' + encodeURIComponent('Terjadi kesalahan saat import data'));
    }
});

// Route untuk hapus siswa
app.get('/siswa/delete/:id', checkLogin, checkSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Hapus data absensi siswa terlebih dahulu
        await db.query('DELETE FROM absensi WHERE siswa_id = ?', [id]);
        
        // Hapus data siswa
        const [result] = await db.query('DELETE FROM siswa WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.redirect('/siswa?error=' + encodeURIComponent('Siswa tidak ditemukan'));
        }

        res.redirect('/siswa?success=' + encodeURIComponent('Siswa berhasil dihapus'));
    } catch (error) {
        console.error('Error deleting student:', error);
        res.redirect('/siswa?error=' + encodeURIComponent('Terjadi kesalahan saat menghapus siswa'));
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
}); 