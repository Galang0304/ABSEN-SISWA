CREATE DATABASE IF NOT EXISTS db_absensi;
USE db_absensi;

CREATE TABLE IF NOT EXISTS guru (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'guru') NOT NULL DEFAULT 'guru',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kelas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nama_kelas VARCHAR(50) NOT NULL,
    wali_kelas_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wali_kelas_id) REFERENCES guru(id)
);

-- Insert data kelas
INSERT INTO kelas (nama_kelas) VALUES 
('Kelas 1'),
('Kelas 2'),
('Kelas 3'),
('Kelas 4'),
('Kelas 5'),
('Kelas 6');

CREATE TABLE siswa (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nis VARCHAR(20) NOT NULL,
    nisn VARCHAR(10) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    kelas_id INT NOT NULL,
    jenis_kelamin ENUM('L', 'P') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_nis (nis),
    UNIQUE KEY unique_nisn (nisn),
    FOREIGN KEY (kelas_id) REFERENCES kelas(id)
);

CREATE TABLE IF NOT EXISTS absensi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    siswa_id INT NOT NULL,
    tanggal DATE NOT NULL,
    status ENUM('hadir', 'izin', 'sakit', 'alpha') NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE,
    UNIQUE KEY unique_absensi (siswa_id, tanggal)
);

-- Insert sample guru data (password: admin123)
INSERT INTO guru (nama, username, password, role) VALUES 
('Admin Guru', 'admin', '$2a$10$8DqVP6.UBBKcgU9j5JMIWOqiGwWjs3vx.U1FP5gK5LWvHEfB5Ruji', 'superadmin'); 