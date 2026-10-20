# Referensi Sintaks: Sistem Modul Bahasa NUSANTARA (Phase 15)

Dokumen ini merupakan panduan referensi resmi pengguna untuk pengorganisasian kode program ke dalam modul-modul independen pada bahasa **NUSANTARA**.

Target Milestone: `v0.15.0`  
Status: **[DITETAPKAN untuk Phase 15]**

---

## 1. Filosofi Sistem Modul NUSANTARA

Sistem modul NUSANTARA dirancang agar pengembang dapat menyusun aplikasi berskala besar secara terstruktur, modular, dan terpelihara tanpa harus menduplikasi kode program atau menggabungkan seluruh instruksi ke dalam satu berkas tunggal.

Prinsip utama:
1. **Satu Berkas, Satu Modul**: Setiap berkas berekstensi `.nusantara` dapat berfungsi sebagai modul mandiri.
2. **Kemandirian & Enkapsulasi**: Variabel dan simbol internal modul terisolasi dalam lingkup modul dan tidak bocor ke lingkup global.
3. **Ekspor Terkendali**: Modul menentukan secara eksplisit fungsi atau data mana yang diekspos ke modul lain.
4. **Keamanan Eksekusi**: Akses berkas dibatasi pada direktori proyek resmi untuk mencegah eksploitasi jalur direktori (*path traversal*).
5. **Pemuatan Tunggal & Cache**: Modul hanya diproses dan dievaluasi satu kali; pemanggilan berikutnya menggunakan representasi cache terkompilasi.
6. **Deteksi Siklus**: Ketergantungan melingkar (*circular dependency*) dideteksi secara proaktif untuk mencegah rekursi tak terbatas.

---

## 2. Struktur & Deklarasi Modul

Sebuah berkas modul dapat mendeklarasikan identitas namanya secara eksplisit menggunakan kata kunci `modul`, atau mengandalkan nama berkas fisik tanpa ekstensi `.nusantara`.

### Format Deklarasi:
```nusantara
modul matematika
```

Contoh berkas `matematika.nusantara`:
```nusantara
modul matematika

ekspor fungsi tambah(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a + b
selesai

ekspor fungsi kali(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a * b
selesai

// Fungsi internal (tidak diekspor)
fungsi logaritmaInternal(x : bilangan) : bilangan
mulai
    kembalikan x
selesai
```

---

## 3. Mekanisme Ekspor Anggota Modul

Untuk membagikan fungsi, konstanta, atau variabel kepada program atau modul lain, gunakan kata kunci `ekspor`:

### A. Ekspor Deklarasi Fungsi
```nusantara
ekspor fungsi sapa(nama : teks) : teks
mulai
    kembalikan "Halo, " + nama
selesai
```

### B. Ekspor Deklarasi Variabel & Tetap
```nusantara
ekspor tetap PI : desimal = 3.14159
ekspor variabel versiModul : teks = "1.0.0"
```

### C. Enkapsulasi Simbol Internal
Simbol atau fungsi yang dideklarasikan tanpa awalan `ekspor` (atau tidak terdaftar dalam daftar ekspor) bersifat internal bagi modul tersebut:
```nusantara
kunciRahasia : teks = "rahasia123" // Tidak dapat diakses dari luar modul
```
Percobaan mengakses simbol internal dari modul lain akan memicu galat sistem tipe dan kesalahan runtime `ANGGOTA_INTERNAL_TERLINDUNGI`.

---

## 4. Mekanisme Penggunaan & Impor Modul

Program utama atau modul lain dapat mengimpor modul menggunakan kata kunci resmi `gunakan` atau `impor`:

### A. Penggunaan Berbasis Namespace Modul
```nusantara
program ProgramUtama

gunakan matematika

mulai
    hasil : bilangan = matematika.tambah(10, 20)
    tampilkan("Hasil:", hasil)
selesai
```

### B. Impor dengan Alias Namespace (`sebagai`)
Untuk menghindari bentrok nama modul atau memperpendek penulisan:
```nusantara
gunakan matematika sebagai mtk

mulai
    tampilkan(mtk.kali(5, 6))
selesai
```

### C. Impor Selektif / Destrukturisasi (`dari`)
```nusantara
impor { tambah, kali } dari matematika

mulai
    tampilkan(tambah(10, 20))
    tampilkan(kali(4, 5))
selesai
```

---

## 5. Resolusi Berkas & Direktori Aman

Resolver modul Bahasa NUSANTARA mencari berkas modul berdasarkan aturan bertingkat:
1. Direktori berkas pemanggil (*caller relative path*)
2. Direktori akar proyek (*project root*)
3. Direktori modul tambahan / pustaka yang telah dikonfigurasi

### Perlindungan Keamanan (Anti-Path Traversal)
Akses relatif seperti `../../etc/passwd` dicegah secara ketat. Upaya mengakses berkas di luar batas direktori proyek yang diizinkan akan langsung dibatalkan dengan galat keamanan:
```
Kesalahan modul:
Pelanggaran keamanan jalur direktori (path traversal) terdeteksi pada '../rahasia.nusantara'. Akses berkas di luar batas proyek tidak diizinkan demi keamanan eksekusi.
```

---

## 6. Penanganan Kesalahan Modul (Bahasa Indonesia)

Sistem modul menyajikan pesan kesalahan deskriptif dan ramah pengembang dalam Bahasa Indonesia:

### A. Modul Tidak Ditemukan
```
Kesalahan modul:
modul 'utilitas' tidak ditemukan.
Lokasi pencarian yang diperiksa:
  - /proyek/utilitas.nusantara
  - /proyek/utilitas
  - /proyek/utilitas/modul.nusantara
```

### B. Ketergantungan Melingkar (Circular Dependency)
Jika modul A menggunakan modul B dan modul B menggunakan modul A:
```
Kesalahan modul:
terdeteksi ketergantungan melingkar:
utama
→ modul_a
→ modul_b
→ modul_a
```

### C. Konteks Kesalahan Runtime dalam Modul
Jika terjadi kesalahan komputasi saat mengeksekusi instruksi di dalam modul:
```
Kesalahan runtime:

Modul: matematika.nusantara
Baris: 8
Kolom: 15

pembagian dengan nol tidak diperbolehkan
```
