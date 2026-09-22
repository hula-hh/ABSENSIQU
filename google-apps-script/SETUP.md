# Google Sheets Setup

## 1. Buat Spreadsheet

Buat satu Google Spreadsheet, lalu buat **dua sheet** dengan nama persis:

### Students

Header baris pertama:

`id | nis | name | class | active`

### Attendance

Header baris pertama:

`id | date | time | studentId | nis | name | class | subject | status | note`

> **Penting:** kolom `subject` wajib ada karena anti-duplikasi ABSENSIQU menggunakan kombinasi **tanggal + mapel + studentId**.

## 2. Pasang Apps Script

Buka **Extensions → Apps Script**, lalu paste isi file `Code.gs` dari repository ini.

Code.gs menggunakan `LockService` supaya dua scan yang terjadi hampir bersamaan tidak sama-sama lolos sebagai absensi baru.

## 3. Deploy sebagai Web App

Pilih **Deploy → New deployment → Web app**.

Gunakan:
- **Execute as:** Me
- **Who has access:** Anyone

Lalu salin URL yang berakhiran `/exec`.

Google Apps Script Web Apps menjalankan `doGet` untuk GET dan `doPost` untuk POST request.

## 4. Hubungkan ke ABSENSIQU

Buka ABSENSIQU → **Pengaturan**, tempel URL Web App, lalu simpan.

## 5. Tes

Buka URL `/exec` di browser. Jika benar, akan muncul JSON seperti:

`{"ok":true,"service":"ABSENSIQU API","version":"2.0"}`

Setelah itu coba:
1. Tambahkan siswa di ABSENSIQU.
2. Pastikan siswa masuk ke sheet **Students**.
3. Tampilkan QR siswa.
4. Scan QR dari halaman **Absensi**.
5. Pastikan data masuk ke sheet **Attendance**.
6. Coba scan siswa yang sama lagi pada tanggal dan mapel yang sama. Sistem harus menolaknya.

## Catatan keamanan

Jangan menaruh service-account key, password, atau secret Google di frontend.

Jika Web App dijalankan sebagai pemilik script, request dapat menggunakan otorisasi pemilik script sesuai konfigurasi deployment. Karena itu, batasi URL Web App dan akses spreadsheet dengan hati-hati.
