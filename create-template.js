const XLSX = require('xlsx');

// Buat workbook baru
const wb = XLSX.utils.book_new();

// Data header
const headers = [
    'NIS',
    'NISN',
    'Nama',
    'Kelas',
    'Jenis Kelamin'
];

// Contoh data
const exampleData = [
    ['1234', '1234567890', 'Nama Siswa', '1', 'L']
];

// Gabung header dan contoh data
const data = [headers, ...exampleData];

// Buat worksheet
const ws = XLSX.utils.aoa_to_sheet(data);

// Atur lebar kolom
const colWidths = [
    { wch: 10 },  // NIS
    { wch: 12 },  // NISN
    { wch: 30 },  // Nama
    { wch: 8 },   // Kelas
    { wch: 15 }   // Jenis Kelamin
];
ws['!cols'] = colWidths;

// Tambahkan worksheet ke workbook
XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');

// Tulis file
XLSX.writeFile(wb, 'templates/template-siswa.xlsx'); 