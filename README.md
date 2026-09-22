# ABSENSIQU

Sistem absensi sekolah berbasis QR dengan dashboard, data siswa, rekap, export CSV, dark mode, dan sinkronisasi Google Sheets melalui Google Apps Script.

## Fitur

- Dashboard kehadiran hari ini
- Scan QR siswa melalui kamera
- QR siswa otomatis dibuat dari NIS
- Anti-duplikasi per **tanggal + mata pelajaran + siswa**
- Status Hadir, Terlambat, Izin, Sakit, Alpha
- Data master siswa
- Rekap kehadiran dengan filter
- Export CSV
- Dark mode
- Sinkronisasi ke Google Sheets
- Backend Apps Script dengan validasi dan locking untuk mencegah race condition

## Menjalankan

Buka `index.html` menggunakan Live Server atau host HTTPS agar akses kamera browser dapat digunakan.

## Google Sheets

Ikuti panduan lengkap di `google-apps-script/SETUP.md`.

> Jangan masukkan secret/service-account key ke frontend.
