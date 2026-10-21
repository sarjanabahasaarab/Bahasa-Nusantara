# Referensi Pengguna: Standard Library Bahasa NUSANTARA (Phase 17)

Dokumen ini merupakan panduan referensi resmi pengguna untuk kumpulan pustaka standar (**Standard Library / stdlib**) pada bahasa pemrograman **NUSANTARA**.

Target Milestone: `v0.17.0`  
Status: **[DITETAPKAN untuk Phase 17]**

---

## 1. Filosofi & Prinsip Desain

Standard Library NUSANTARA dirancang dengan prinsip:
1. **Bahasa Indonesia sebagai Bahasa Utama**: Seluruh nama fungsi, konstanta, dan pesan kesalahan menggunakan Bahasa Indonesia yang konsisten dengan Konstitusi NUSANTARA.
2. **Modular & Ringan**: Modul standar terpisah secara bersih dan hanya dimuat saat diimpor oleh program, menjaga inti bahasa tetap ramping.
3. **Lintas Platform**: Bekerja seragam di lingkungan desktop (Node.js/CLI) maupun di peramban web (in-memory simulator).
4. **Aman & Terisolasi**: Modul I/O berkas dipagari oleh sistem Sandbox untuk mencegah akses tak berizin atau eskalasi direktori (*path traversal*).
5. **Dukungan Sistem Tipe Statis**: Seluruh simbol ekspor terdaftar secara formal dalam pemeriksaan tipe (Phase 9 & 15).

---

## 2. Cara Menggunakan Modul Standar

Modul standar dapat diakses menggunakan kata kunci `gunakan` (namespace) atau `impor` (destrukturisasi):

### Menggunakan Namespace Penuh
```nusantara
program HitungLingkaran
gunakan "matematika" sebagai mtk

mulai
    radius : desimal = 7.0
    luas : desimal = mtk.PI * mtk.pangkat(radius, 2)
    tampilkan("Luas Lingkaran:", luas)
selesai
```

### Menggunakan Destrukturisasi Simbol
```nusantara
program ManipulasiTeks
impor { kapital, potong } dari "teks"

mulai
    judul : teks = "bahasa nusantara"
    singkatan : teks = potong(kapital(judul), 0, 6)
    tampilkan("Hasil:", singkatan)
selesai
```

### Format Referensi Modul yang Didukung:
- Nama langsung: `"teks"`, `"matematika"`
- Prefix standar: `"std:waktu"`, `"stdlib:acak"`, `"nusantara:koleksi"`

---

## 3. Daftar 8 Modul Standar Resmi

### A. Modul `teks`
Menyediakan fungsi manipulasi string dasar dan stabil.

| Fungsi / Simbol | Tipe Parameter | Tipe Kembalian | Deskripsi |
|---|---|---|---|
| `panjang(s)` | `s: teks` | `bilangan` | Menghitung jumlah karakter dalam teks |
| `gabung(daftarTeks, pemisah)` | `daftar, teks` | `teks` | Menggabungkan daftar string dengan pemisah |
| `potong(s, mulai, akhir?)` | `teks, bilangan, bilangan?` | `teks` | Mengambil substring dari indeks awal hingga akhir |
| `cari(s, target)` | `teks, teks` | `bilangan` | Mencari indeks kemunculan pertama target (-1 jika nihil) |
| `kapital(s)` | `s: teks` | `teks` | Mengubah seluruh karakter menjadi huruf kapital |
| `kecil(s)` | `s: teks` | `teks` | Mengubah seluruh karakter menjadi huruf kecil |
| `pangkas(s)` | `s: teks` | `teks` | Menghapus spasi putih di awal dan akhir teks |
| `berisi(s, target)` | `teks, teks` | `logika` | Memeriksa apakah teks mengandung substring target |
| `ganti(s, target, pengganti)` | `teks, teks, teks` | `teks` | Mengganti seluruh kemunculan target dengan pengganti |

---

### B. Modul `matematika`
Menyediakan kalkulasi numerik dan konstanta matematika.

| Simbol / Fungsi | Tipe Parameter | Tipe Kembalian | Deskripsi |
|---|---|---|---|
| `PI` | Konstanta | `desimal` | Nilai rasio pi (3.141592653589793) |
| `E` | Konstanta | `desimal` | Nilai basis logaritma alami Euler (2.718281828459045) |
| `absolut(x)` | `bilangan / desimal` | `bilangan / desimal` | Nilai absolut (non-negatif) dari angka |
| `bulat(x)` | `bilangan / desimal` | `bilangan` | Pembulatan angka ke bilangan bulat terdekat |
| `lantai(x)` | `bilangan / desimal` | `bilangan` | Pembulatan angka ke bawah (floor) |
| `plafon(x)` | `bilangan / desimal` | `bilangan` | Pembulatan angka ke atas (ceil) |
| `pangkat(basis, eksponen)` | `numerik, numerik` | `numerik` | Menghitung hasil eksponensial basis^eksponen |
| `akar(x)` | `bilangan / desimal` | `desimal` | Akar kuadrat dari bilangan non-negatif |
| `minimum(a, b)` | `numerik, numerik` | `numerik` | Mengembalikan nilai terkecil di antara dua nilai |
| `maksimum(a, b)` | `numerik, numerik` | `numerik` | Mengembalikan nilai terbesar di antara dua nilai |

---

### C. Modul `konversi`
Menyediakan konversi tipe data eksplisit, aman, dan tanpa konversi diam-diam (*implicit coercion*).

| Fungsi | Tipe Parameter | Tipe Kembalian | Deskripsi |
|---|---|---|---|
| `keTeks(nilai)` | `apapun` | `teks` | Mengubah nilai tipe apapun menjadi representasi string |
| `keBilangan(s)` | `teks` | `bilangan` | Mengonversi teks angka bulat menjadi tipe bilangan |
| `keDesimal(s)` | `apapun` | `desimal` | Mengonversi teks atau bilangan menjadi tipe desimal |
| `keBulat(x)` | `desimal / bilangan` | `bilangan` | Memotong bagian pecahan desimal menjadi bilangan bulat |
| `keLogika(nilai)` | `apapun` | `logika` | Mengonversi teks ("benar"/"salah") atau angka menjadi logika |

---

### D. Modul `waktu`
Menyediakan akses waktu host, tanggal sekarang, timestamp, dan pemformatan.

| Fungsi | Tipe Parameter | Tipe Kembalian | Deskripsi |
|---|---|---|---|
| `sekarang()` | *tanpa argumen* | `teks` | Format string tanggal & waktu lokal (`YYYY-MM-DD HH:mm:ss`) |
| `tanggal()` | *tanpa argumen* | `teks` | Format string tanggal lokal saat ini (`YYYY-MM-DD`) |
| `jam()` | *tanpa argumen* | `bilangan` | Jam saat ini (0..23) |
| `menit()` | *tanpa argumen* | `bilangan` | Menit saat ini (0..59) |
| `detik()` | *tanpa argumen* | `bilangan` | Detik saat ini (0..59) |
| `timestamp()` | *tanpa argumen* | `bilangan` | Waktu saat ini dalam milidetik sejak UNIX epoch |
| `format(ts, pola)` | `bilangan, teks` | `teks` | Memformat timestamp menjadi teks |

---

### E. Modul `acak`
Pembangkit bilangan acak pseudorandom.

| Fungsi | Tipe Parameter | Tipe Kembalian | Deskripsi |
|---|---|---|---|
| `desimal()` | *tanpa argumen* | `desimal` | Menghasilkan angka desimal acak dalam rentang `[0.0, 1.0)` |
| `bilangan(min, maks)`| `bilangan, bilangan`| `bilangan` | Menghasilkan bilangan bulat acak di antara min dan maks |
| `pilih(daftar)` | `daftar` | `apapun` | Memilih satu elemen acak dari daftar yang diberikan |

---

### F. Modul `koleksi`
Operasi pemrosesan tingkat lanjut pada struktur data daftar dan peta.

| Fungsi | Tipe Parameter | Tipe Kembalian | Deskripsi |
|---|---|---|---|
| `panjang(koleksi)` | `daftar / peta / teks` | `bilangan` | Mengembalikan jumlah elemen koleksi |
| `kosong(koleksi)` | `daftar / peta / teks` | `logika` | Memeriksa apakah koleksi tidak memiliki elemen |
| `berisi(daftar, item)`| `daftar, apapun` | `logika` | Memeriksa keberadaan elemen di dalam daftar |
| `cari(daftar, item)` | `daftar, apapun` | `bilangan` | Menemukan indeks pertama elemen (-1 jika tidak ada) |
| `balik(daftar)` | `daftar` | `daftar` | Menghasilkan daftar baru dengan urutan elemen terbalik |
| `urutkan(daftar)` | `daftar` | `daftar` | Menghasilkan daftar baru terurut naik |
| `gabung(d1, d2)` | `daftar, daftar` | `daftar` | Menggabungkan dua daftar menjadi satu daftar baru |
| `iris(daftar, mulai, akhir?)` | `daftar, bilangan, bilangan?` | `daftar` | Mengambil potongan sebagian elemen daftar |

---

### G. Modul `berkas` & Sandbox Filesystem
Operasi berkas teks terlindungi dengan keamanan Sandbox.

| Fungsi | Tipe Parameter | Tipe Kembalian | Deskripsi |
|---|---|---|---|
| `ada(jalur)` | `teks` | `logika` | Memeriksa keberadaan berkas pada jalur relatif |
| `baca(jalur)` | `teks` | `teks` | Membaca seluruh konten berkas teks |
| `tulis(jalur, isi)` | `teks, teks` | `logika` | Menulis/membuat berkas teks baru dengan isi yang diberikan |
| `tambah(jalur, isi)` | `teks, teks` | `logika` | Menambahkan teks ke akhir berkas yang sudah ada |
| `ukuran(jalur)` | `teks` | `bilangan` | Menghitung ukuran berkas dalam byte |
| `buatDirektori(jalur)`| `teks` | `logika` | Membuat direktori baru |
| `daftarDirektori(jalur?)`| `teks?` | `daftar` | Mengembalikan daftar nama berkas/subdirektori |
| `dapatkanJalurBasis()` | *tanpa argumen* | `teks` | Jalur direktori basis kerja sandbox proyek |

#### Kebijakan Keamanan Sandbox Filesystem:
1. **Pencegahan Path Traversal**: Upaya traversal melampaui batas proyek (misal `../../../../etc/passwd`) akan digagalkan oleh mesin runtime.
2. **Proteksi Berkas Kritis**: Akses ke berkas konfigurasi sistem (`/etc/shadow`, direktori Windows, berkas kredensial `.env`) diblokir otomatis.

---

### H. Modul `sistem`
Informasi lingkungan host dan runtime NUSANTARA.

| Simbol / Fungsi | Tipe Parameter | Tipe Kembalian | Deskripsi |
|---|---|---|---|
| `VERSI` | Konstanta | `teks` | Versi resmi NUSANTARA (`"0.17.0"`) |
| `versi()` | *tanpa argumen* | `teks` | Mengembalikan string versi resmi bahasa |
| `platform()` | *tanpa argumen* | `teks` | Nama sistem operasi (`"linux"`, `"darwin"`, `"win32"`, `"peramban"`) |
| `arsitektur()`| *tanpa argumen* | `teks` | Arsitektur prosesor (`"x64"`, `"arm64"`, `"web"`) |
| `argumen()` | *tanpa argumen* | `daftar` | Daftar argumen baris perintah CLI |
| `ambilEnv(kunci)` | `teks` | `teks / kosong` | Membaca nilai variabel lingkungan sistem host |
| `waktuOperasi()` | *tanpa argumen* | `bilangan` | Waktu kerja proses (uptime) dalam detik |
| `keluar(kode)` | `bilangan?` | `kosong` | Menghentikan eksekusi proses dengan kode status |
