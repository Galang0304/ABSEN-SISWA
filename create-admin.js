const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createAdmin() {
    try {
        // Konfigurasi database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Data admin baru
        const adminData = {
            nama: 'Administrator',
            username: 'admin',
            password: 'admin123', // password akan di-hash
            role: 'superadmin'
        };

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

        // Hapus admin yang lama (jika ada)
        await connection.execute('DELETE FROM guru WHERE username = ?', [adminData.username]);

        // Masukkan admin baru
        const [result] = await connection.execute(
            'INSERT INTO guru (nama, username, password, role) VALUES (?, ?, ?, ?)',
            [adminData.nama, adminData.username, hashedPassword, adminData.role]
        );

        console.log('Admin berhasil dibuat!');
        console.log('Username:', adminData.username);
        console.log('Password:', adminData.password);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

createAdmin(); 