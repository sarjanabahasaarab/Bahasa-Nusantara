# Katalog Kasus Uji Program Tidak Valid (Spesifikasi Konstitusi Phase 2)

Dokumen ini mencatat kumpulan contoh kode sumber `.nusantara` yang **melanggar Konstitusi Bahasa** dan harus dideteksi sebagai kesalahan oleh kompilator dan linter di masa depan.

---

## 1. Kasus: Program Tanpa Kata Kunci `mulai`

### Kode Sumber Bermasalah:
```nusantara
program TanpaMulai

tampilkan("Halo!")
selesai
```

### Analisis Pelanggaran:
Konstitusi Bab 3 Bagian A mewajibkan pembukaan blok utama program dengan kata kunci `mulai`. Instruksi di luar blok `mulai` ... `selesai` melanggar tata bahasa dasar.

### Ekspektasi Diagnostik Galat:
`Kesalahan Sintaks: Ditemukan pernyataan instruksi sebelum blok 'mulai' dibuka.`

---

## 2. Kasus: Program Tanpa Kata Kunci `selesai`

### Kode Sumber Bermasalah:
```nusantara
program TanpaSelesai

mulai
    tampilkan("Proses berjalan...")
```

### Analisis Pelanggaran:
Blok utama program yang telah dibuka dengan `mulai` wajib ditutup secara eksplisit dengan kata kunci `selesai`.

### Ekspektasi Diagnostik Galat:
`Kesalahan Sintaks: Blok program 'mulai' pada baris 3 belum ditutup hingga akhir berkas. Diharapkan kata 'selesai'.`

---

## 3. Kasus: Nama Program Tidak Valid

### Kode Sumber Bermasalah:
```nusantara
program 123ProgramUtama

mulai
    tampilkan("Uji")
selesai
```

### Analisis Pelanggaran:
Berdasarkan [ATURAN-PENAMAAN.md](../../dokumentasi/ATURAN-PENAMAAN.md), pengidentifikasi dilarang keras diawali oleh angka (`0`-`9`).

### Ekspektasi Diagnostik Galat:
`Kesalahan Nama: Pengidentifikasi nama program '123ProgramUtama' tidak sah. Nama program tidak boleh diawali dengan angka.`

---

## 4. Kasus: Nama Variabel Menggunakan Kata Kunci (Keyword)

### Kode Sumber Bermasalah:
```nusantara
program VariabelIlegal

mulai
    jika : bilangan = 10
    selesai : teks = "tutup"
selesai
```

### Analisis Pelanggaran:
Kata `jika` dan `selesai` adalah kata kunci resmi yang dicadangkan oleh bahasa dan dilarang digunakan sebagai nama variabel.

### Ekspektasi Diagnostik Galat:
`Kesalahan Sintaks: Kata 'jika' adalah kata kunci yang dicadangkan dan tidak dapat digunakan sebagai nama pengidentifikasi variabel.`

---

## 5. Kasus: Deklarasi Tipe Data Tidak Lengkap

### Kode Sumber Bermasalah:
```nusantara
program TipeTakLengkap

mulai
    skor : = 100
selesai
```

### Analisis Pelanggaran:
Notasi deklarasi bertipe `pengidentifikasi : tipe = nilai` mewajibkan tipe data yang sah di antara tanda titik dua (`:`) dan tanda sama dengan (`=`).

### Ekspektasi Diagnostik Galat:
`Kesalahan Sintaks: Ditemukan tanda '=' segera setelah ':'. Diharapkan nama tipe data yang sah (misal: bilangan, teks, desimal).`

---

## 6. Kasus: Blok Kondisi `jika` Tidak Ditutup

### Kode Sumber Bermasalah:
```nusantara
program KondisiTerbuka

mulai
    nilai : bilangan = 80

    jika nilai >= 75 maka
        tampilkan("Lulus")
    selain
        tampilkan("Remedial")

selesai
```

### Analisis Pelanggaran:
Blok percabangan `jika` ... `maka` ... `selain` wajib ditutup dengan kata kunci penutup `akhir` sebelum blok utama program ditutup dengan `selesai`.

### Ekspektasi Diagnostik Galat:
`Kesalahan Sintaks: Blok percabangan 'jika' pada baris 6 belum ditutup dengan kata kunci 'akhir'.`
