# Dokumentasi Resmi Bahasa Pemrograman NUSANTARA

Selamat datang di pusat dokumentasi resmi **NUSANTARA**. Folder ini memuat seluruh spesifikasi sintaks formal EBNF, konstitusi, kebijakan lisensi, tata kelola versi, dan arsip usulan perbaikan bahasa (*NIP*).

---

## Indeks Dokumen Repositori

### 1. Spesifikasi Sintaks Formal (Phase 4):
- **[Spesifikasi Sintaks Induk](SPESIFIKASI-SINTAKS.md)**: Ikhtisar tata bahasa resmi dan harmonisasi audit spesifikasi sebelumnya.
- **[Tata Bahasa Formal EBNF](GRAMMAR-EBNF.md)**: Aturan produksi formal lengkap ISO/IEC 14977.
- **[Spesifikasi Token Leksikal](TOKEN.md)**: Taksonomi 10 kategori token, pemisah baris baru, dan urutan karakter lolos string.
- **[Kaidah Pengidentifikasi](IDENTIFIER.md)**: Aturan pembentukan nama variabel, fungsi, konstanta, dan program.
- **[Bentuk Literal](LITERAL.md)**: Sintaksis literal teks, bilangan bulat, desimal, logika, dan kosong.
- **[Tata Bahasa Ekspresi](EKSPRESI.md)**: Evaluasi ekspresi bertingkat bebas ambiguitas parsing.
- **[Tabel Prioritas Operator Resmi](PRIORITAS-OPERATOR.md)**: 8 tingkat presedensi dan arah asosiasi operator.
- **[Aturan Blok & Struktur Kontrol](ATURAN-BLOK.md)**: Pembatasan leksikal blok, percabangan, perulangan, dan subrutin.
- **[Katalog Contoh Sintaks](CONTOH-SINTAKS.md)**: 10 contoh program acuan dengan label status kepatuhan spesifikasi.
- **[Katalog Keputusan Terbuka](KEPUTUSAN-TERBUKA.md)**: Catatan fitur yang ditangguhkan pembahasannya ke fase berikutnya.

### 2. Tata Kelola & Kebijakan Lisensi (Phase 3):
- **[Panduan Lisensi Apache 2.0](LISENSI.md)**: Penjelasan hak pengguna, pengembang, hibah paten, dan atribusi.
- **[Kebijakan Lisensi Komponen](KEBIJAKAN-LISENSI.md)**: Ketentuan lisensi dependensi pihak ketiga dan aset media.
- **[Kebijakan Versi & Rilis](KEBIJAKAN-RILIS.md)**: Skema SemVer dan panduan kenaikan angka versi.
- **[Templat Publikasi Rilis](TEMPLATE-RELEASE.md)**: Format catatan rilis GitHub Release resmi.
- **[Panduan Pengaturan GitHub](PENGATURAN-GITHUB.md)**: Panduan manual konfigurasi branch protection dan keamanan di GitHub.
- **[Tata Kelola Proyek](../TATA-KELOLA.md)**: Struktur 5 peran komunitas dan pembagian tanggung jawab.
- **[Kebijakan Keamanan](../KEAMANAN.md)**: Prosedur pelaporan kerentanan privat secara bertanggung jawab.
- **[Panduan Kontribusi](../KONTRIBUSI.md)**: 10 langkah kontribusi dan standar nama cabang kerja.

### 3. Sistem Nusantara Improvement Proposal (NIP):
- **[Proses & Alur NIP](NIP/PROSES-NIP.md)**: Alur 7 tahapan usulan peningkatan bahasa.
- **[Templat NIP](NIP/TEMPLATE-NIP.md)**: Format baku penulisan dokumen NIP.
- **[NIP-0001: Identitas dan Prinsip Dasar Bahasa NUSANTARA](nip/NIP-0001.md)**
- **[NIP-0002: Konstitusi Bahasa NUSANTARA](nip/NIP-0002.md)**

### 4. Konstitusi Bahasa (Phase 2):
- **[Konstitusi Bahasa NUSANTARA](KONSTITUSI-BAHASA.md)**: 10 Prinsip Konstitusi Bahasa NUSANTARA.
- **[Tabel Kata Kunci Resmi](KEYWORD.md)**: 32 kata kunci (21 ditetapkan, 11 rancangan).
- **[Spesifikasi Tipe Data](TIPE-DATA.md)**: Taksonomi tipe data dasar dan mutabilitas.
- **[Klasifikasi Operator](OPERATOR.md)**: Operator aritmetika, perbandingan, logika Bahasa Indonesia, dan presedensi.
- **[Aturan Penamaan & Komentar](ATURAN-PENAMAAN.md)**: Kaidah pengidentifikasi dan komentar `//`.
- **[Standar Pesan Kesalahan](PESAN-KESALAHAN.md)**: Format pesan diagnostik berbahasa Indonesia.
- **[Kebijakan Kompatibilitas Versi](KOMPATIBILITAS.md)**: Stabilitas kode sah dan komitmen backward compatibility.

### 5. Fondasi & Arsitektur (Phase 1):
- **[Prinsip Desain & Filosofi Bahasa](prinsip-desain.md)**: 12 Prinsip Desain Kedaulatan Komputasi.
- **[Arsitektur Kompilator](arsitektur-kompilator.md)**: Saluran pipa kompilasi 7 tahap menuju biner native.
- **[Panduan Operasional GitHub Awal](panduan-github.md)**: Langkah inisialisasi awal Git.
