# Keamanan Phase 40 — Mobile Application Distribution

## 1. Mekanisme Keamanan yang Diterapkan
- **Anti-Zip-Slip & Integritas CRC-32 (`ZipBuilder`)**:
  - Setiap entri arsip APK/AAB wajib berupa jalur relatif bersih tanpa `..`, `\`, prefix drive (`C:`), awalan `/`, karakter NUL, maupun duplikat.
  - Pembacaan internal memverifikasi offset EOCD/CD/LH serta CRC-32 per entri untuk mendeteksi korup maupun injeksi struktur PKZIP.
- **Verifikasi Kriptografis SHA-256 & `SHA256SUMS` (`BuildValidator`)**:
  - Memverifikasi hash SHA-256 aktual seluruh berkas artefak di disk sehingga perubahan byte sekecil apa pun segera ditolak.
  - `verifikasiSha256Sums()` juga menolak jalur tidak aman (`..`, `\`, awalan `/`) dan memastikan seluruh target berkas tetap berada di dalam direktori artefak.
- **Sanitasi XML Manifes & Plist**:
  - Nilai aplikasi yang diisikan ke `AndroidManifest.xml` dan `Info.plist` di-*escape* terhadap `&`, `<`, `>`, `"`, dan `'` guna mencegah XML injection.
- **Audit Kredensial Tanpa Plaintext Secret (`SigningValidator`, `ReleaseValidator`)**:
  - Mendeteksi kata sandi hardcoded, `storePassword`, `keyPassword`, `keystorePassword`, `apiSecret`, dan blok kunci privat PEM (`RSA`, `PKCS8`, `EC`, `OPENSSH`), sembari menganjurkan penyimpanan rahasia melalui variabel lingkungan (`*Env`).
