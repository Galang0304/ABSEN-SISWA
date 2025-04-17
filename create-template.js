const XLSX = require('xlsx');

// Data template
const data = [
    ['NIS', 'NISN', 'Nama', 'Kelas', 'Jenis Kelamin'],
    ['2024001', '1234567890', 'Ahmad Fauzi', '1', 'L'],
    ['2024002', '1234567891', 'Siti Nurhaliza', '1', 'P'],
    ['2024003', '1234567892', 'Muhammad Rizki', '2', 'L'],
    ['2024004', '1234567893', 'Putri Rahayu', '2', 'P'],
    ['2024005', '1234567894', 'Budi Santoso', '3', 'L']
];

// Buat workbook baru
const wb = XLSX.utils.book_new();

// Buat worksheet dari data
const ws = XLSX.utils.aoa_to_sheet(data);

// Atur lebar kolom
const wscols = [
    {wch: 10}, // NIS
    {wch: 12}, // NISN
    {wch: 30}, // Nama
    {wch: 8},  // Kelas
    {wch: 15}  // Jenis Kelamin
];
ws['!cols'] = wscols;

// Tambahkan worksheet ke workbook
XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");

// Tulis file
XLSX.writeFile(wb, 'templates/template-siswa.xlsx'); 