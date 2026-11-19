# Kebijakan Keamanan Proyek NUSANTARA

Keamanan piranti lunak, perlindungan data pengembang, dan keandalan sistem komputasi adalah prioritas tertinggi dalam pengembangan bahasa pemrograman **NUSANTARA**.

---

## 1. Pelaporan Kerentanan Secara Bertanggung Jawab (*Responsible Disclosure*)

Jika Anda menemukan potensi kerentanan keamanan (*vulnerability*) pada kompilator, spesifikasi, atau pustaka standar NUSANTARA, kami meminta Anda untuk **melaporkannya secara bertanggung jawab dan privat**:

- **Kanal Pelaporan Keamanan Privat:** Gunakan **GitHub Private Vulnerability Reporting** pada tab *Security* jika fitur tersebut tersedia dan aktif. Status pengaktifannya belum dapat diverifikasi pada audit ini. Jika fitur belum tersedia, jangan mengirim rincian eksploitasi melalui Issue publik; ajukan permintaan non-sensitif agar maintainer menyediakan kanal privat terlebih dahulu.
- **Etika Pelaporan:** **JANGAN** membuat GitHub Issue publik, mencuit di media sosial, atau memublikasikan rincian eksploitasi sebelum tim maintainer mengonfirmasi dan menyiapkan perbaikan terkoordinasi (*coordinated disclosure*).
- **Target Respon:** Tim maintainer menargetkan respon awal dalam 48 jam. Ini adalah sasaran layanan, bukan jaminan waktu respon.

---

## 2. Larangan Penyertaan Kredensial & Rahasia (*No Secrets in Code*)

1. **Larangan Keras:** Dilarang keras melakukan komit atau mengirimkan Pull Request yang memuat:
   - Kata sandi (*passwords*)
   - Token otentikasi (GitHub Personal Access Tokens, API keys)
   - Kunci privat (*Private Keys*, sertifikat SSL/TLS pribadi)
   - Kredensial basis data atau rahasia server
2. **Tindakan Pencegahan:**
   - Gunakan berkas `.env.example` untuk variabel lingkungan umum dan pastikan berkas rahasia lokal terdaftar di `.gitignore`.
   - **Secret scanning** dapat membuat peringatan ketika pola rahasia yang didukung terdeteksi. Penolakan push hanya terjadi jika fitur **push protection** diaktifkan dan pola rahasia tersebut didukung. Status secret scanning dan push protection repositori belum dapat diverifikasi pada audit ini; jangan mengklaim bahwa setiap komit yang mengandung rahasia pasti ditolak.

---

## 3. Peninjauan & Audit Dependensi (*Dependency Audits*)

1. Setiap dependensi pihak ketiga wajib melalui proses audit otomatis dan peninjauan manual sebelum digabungkan.
2. Maintainer secara rutin memeriksa basis dependensi terhadap *Common Vulnerabilities and Exposures* (CVE) yang diketahui.
3. Ketergantungan yang memiliki kerentanan kritis yang belum diperbaiki oleh pembuat aslinya wajib diganti atau diisolasi.

---

## 4. Rilis Perbaikan Keamanan

1. Setiap tambalan keamanan (*security patch*) akan diuji secara menyeluruh untuk memastikan tidak ada celah baru atau kerusakan kompatibilitas.
2. Perbaikan akan dirilis sebagai versi patch khusus (misal: `v0.2.1`).
3. Pengumuman keamanan (*Security Advisory*) akan diterbitkan bersamaan dengan rilis resmi perbaikan, mencantumkan kredit kepada pelapor yang bertindak secara bertanggung jawab.

---

## 5. Konfigurasi Fitur Keamanan GitHub

Maintainer harus mengaktifkan dan memverifikasi **Private Vulnerability Reporting**, **Dependabot alerts**, **secret scanning**, dan bila tersedia **push protection** pada tab **Security**. Status aktual fitur-fitur tersebut belum dapat diverifikasi melalui akses audit ini; dokumen kebijakan tidak boleh dianggap sebagai bukti bahwa fitur telah aktif.
