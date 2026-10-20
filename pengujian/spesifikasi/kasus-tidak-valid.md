# Kasus Uji Sintaksis Tidak Valid (Minimal 15 Kasus)

Dokumen ini memuat katalog 15 kasus kode sumber `.nusantara` yang **melanggar tata bahasa formal EBNF** Phase 4.

> ⚠️ **Catatan Status:** Pesan kesalahan yang dicantumkan merupakan spesifikasi format diagnostik acuan, bukan klaim bahwa kompiler telah berjalan saat ini.

---

### Kasus 1: Program Tanpa Kata Kunci Pembuka `mulai`
- **Kode:**
  ```nusantara
  program TanpaMulai
      tampilkan("Halo")
  selesai
  ```
- **Alasan:** Pernyataan ditulis tanpa membuka blok utama dengan kata `mulai`.
- **Aturan Grammar Dilanggar:** `blok_utama = "mulai", pemisah_baris, daftar_pernyataan, "selesai" ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Diharapkan kata kunci 'mulai' setelah deklarasi nama program.`

---

### Kasus 2: Program Tanpa Kata Kunci Penutup `selesai`
- **Kode:**
  ```nusantara
  program TanpaSelesai
  mulai
      tampilkan("Jalan")
  ```
- **Alasan:** Berkas berakhir tanpa menutup blok program utama.
- **Aturan Grammar Dilanggar:** `blok_utama = "mulai", pemisah_baris, daftar_pernyataan, "selesai" ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Blok program 'mulai' pada baris 2 belum ditutup hingga akhir berkas. Diharapkan 'selesai'.`

---

### Kasus 3: Nama Program Diawali Angka
- **Kode:**
  ```nusantara
  program 1Aplikasi
  mulai
  selesai
  ```
- **Alasan:** Pengidentifikasi dilarang diawali oleh angka.
- **Aturan Grammar Dilanggar:** `pengidentifikasi = ( huruf | "_" ), { huruf | digit | "_" } ;`
- **Pesan Galat Diharapkan:** `Kesalahan Leksikal: Nama program '1Aplikasi' tidak valid. Pengidentifikasi tidak boleh diawali angka.`

---

### Kasus 4: Nama Variabel Menggunakan Kata Kunci Cadangan
- **Kode:**
  ```nusantara
  program VariabelKunci
  mulai
      jika : bilangan = 10
  selesai
  ```
- **Alasan:** Kata kunci `jika` tidak boleh digunakan sebagai nama variabel.
- **Aturan Grammar Dilanggar:** `pengidentifikasi` tidak boleh cocok dengan himpunan `KATA_KUNCI`.
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Kata 'jika' adalah kata kunci cadangan bahasa dan tidak dapat digunakan sebagai nama pengidentifikasi.`

---

### Kasus 5: Deklarasi Tipe Tanpa Menyebutkan Tipe Data
- **Kode:**
  ```nusantara
  program TipeBuntung
  mulai
      skor : = 100
  selesai
  ```
- **Alasan:** Tidak terdapat nama tipe data yang sah di antara tanda titik dua (`:`) dan tanda sama dengan (`=`).
- **Aturan Grammar Dilanggar:** `deklarasi_variabel = [ "variabel", spasi ], pengidentifikasi, spasi, ":", spasi, nama_tipe, ... ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Ditemukan '=' segera setelah ':'. Diharapkan nama tipe data yang sah (misal: bilangan, teks).`

---

### Kasus 6: Blok Percabangan `jika` Tanpa Kata Kunci `maka`
- **Kode:**
  ```nusantara
  program TanpaMaka
  mulai
      jika nilai >= 75
          tampilkan("Lulus")
      akhir
  selesai
  ```
- **Alasan:** Kondisi pada `jika` wajib diikuti oleh kata kunci `maka`.
- **Aturan Grammar Dilanggar:** `percabangan_jika = "jika", spasi, ekspresi, spasi, "maka", ... ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Diharapkan kata kunci 'maka' setelah kondisi percabangan.`

---

### Kasus 7: Blok Percabangan `jika` Tanpa Penutup `akhir`
- **Kode:**
  ```nusantara
  program TanpaAkhir
  mulai
      jika nilai >= 75 maka
          tampilkan("Lulus")
  selesai
  ```
- **Alasan:** Blok percabangan tidak ditutup dengan kata kunci `akhir` sebelum blok program ditutup dengan `selesai`.
- **Aturan Grammar Dilanggar:** `percabangan_jika = "jika", ..., "akhir" ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Blok percabangan 'jika' pada baris 3 belum ditutup. Diharapkan kata kunci 'akhir' sebelum 'selesai'.`

---

### Kasus 8: Perulangan `untuk` Tanpa Kata Kunci `dari`
- **Kode:**
  ```nusantara
  program UntukTanpaDari
  mulai
      untuk i 1 sampai 10 lakukan
          tampilkan(i)
      akhir
  selesai
  ```
- **Alasan:** Variabel penghitung wajib diikuti kata kunci batas awal `dari`.
- **Aturan Grammar Dilanggar:** `perulangan_untuk = "untuk", spasi, pengidentifikasi, spasi, "dari", ... ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Diharapkan kata kunci 'dari' setelah variabel perulangan 'i'.`

---

### Kasus 9: Perulangan `untuk` Tanpa Kata Kunci `sampai`
- **Kode:**
  ```nusantara
  program UntukTanpaSampai
  mulai
      untuk i dari 1 10 lakukan
          tampilkan(i)
      akhir
  selesai
  ```
- **Alasan:** Batas rentang perulangan wajib memuat kata kunci batas akhir `sampai`.
- **Aturan Grammar Dilanggar:** `perulangan_untuk = ..., "dari", spasi, ekspresi, spasi, "sampai", ... ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Diharapkan kata kunci 'sampai' setelah batas awal rentang.`

---

### Kasus 10: Perulangan `selama` Tanpa Kata Kunci `lakukan`
- **Kode:**
  ```nusantara
  program SelamaTanpaLakukan
  mulai
      selama aktif
          tampilkan("Jalan")
      akhir
  selesai
  ```
- **Alasan:** Kondisi perulangan `selama` wajib diikuti kata kunci pembuka blok `lakukan`.
- **Aturan Grammar Dilanggar:** `perulangan_selama = "selama", spasi, ekspresi, spasi, "lakukan", ... ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Diharapkan kata kunci 'lakukan' setelah kondisi perulangan.`

---

### Kasus 11: Literal Teks dengan Tanda Kutip Tidak Ditutup
- **Kode:**
  ```nusantara
  program TeksTerbuka
  mulai
      nama : teks = "Nusantara
  selesai
  ```
- **Alasan:** Literal teks tidak ditutup tanda kutip ganda sebelum baris berganti.
- **Aturan Grammar Dilanggar:** `literal_teks = '"', { karakter_teks | urutan_lolos }, '"' ;`
- **Pesan Galat Diharapkan:** `Kesalahan Leksikal: Literal teks tidak ditutup tanda kutip ganda sebelum akhir baris.`

---

### Kasus 12: Penugasan Ulang Nilai pada Konstanta `tetap`
- **Kode:**
  ```nusantara
  program MutasiTetap
  mulai
      tetap BATAS : bilangan = 100
      BATAS = 200
  selesai
  ```
- **Alasan:** Pengidentifikasi yang dideklarasikan dengan `tetap` bersifat *immutable* dan dilarang ditugaskan ulang.
- **Aturan Grammar Dilanggar:** Semantik aturan immutability konstanta tetap.
- **Pesan Galat Diharapkan:** `Kesalahan Penugasan: Pengidentifikasi 'BATAS' berstatus 'tetap' dan tidak dapat diubah nilainya.`

---

### Kasus 13: Deklarasi Fungsi Tanpa Menyertakan Blok `mulai` dan `selesai`
- **Kode:**
  ```nusantara
  fungsi kali(a : bilangan, b : bilangan) : bilangan
      kembalikan a * b

  program Uji
  mulai
  selesai
  ```
- **Alasan:** Badan fungsi wajib dibungkus oleh blok pembuka `mulai` dan penutup `selesai`.
- **Aturan Grammar Dilanggar:** `deklarasi_fungsi = "fungsi", ..., blok_utama ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Badan fungsi 'kali' harus dibuka dengan kata 'mulai' dan ditutup dengan 'selesai'.`

---

### Kasus 14: Pemanggilan Fungsi dengan Tanda Kurung Tidak Lengkap
- **Kode:**
  ```nusantara
  program KurungBuntung
  mulai
      tampilkan("Halo"
  selesai
  ```
- **Alasan:** Tanda kurung buka `(` pada pemanggilan fungsi tidak ditutup oleh `)`.
- **Aturan Grammar Dilanggar:** `pemanggilan_fungsi = pengidentifikasi, "(", [ daftar_argumen ], ")" ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Diharapkan tanda kurung tutup ')' setelah daftar argumen fungsi.`

---

### Kasus 15: Dua Operator Biner Berurutan Tanpa Operan
- **Kode:**
  ```nusantara
  program OperatorGanda
  mulai
      skor : bilangan = 10 + * 5
  selesai
  ```
- **Alasan:** Operator penjumlahan `+` segera diikuti operator perkalian `*` tanpa operan perantara yang sah.
- **Aturan Grammar Dilanggar:** `ekspresi_aditif = ekspresi_multiplikatif, { spasi, operator_aditif, spasi, ekspresi_multiplikatif } ;`
- **Pesan Galat Diharapkan:** `Kesalahan Sintaks: Ditemukan operator '*' yang tidak terduga setelah operator '+'. Diharapkan ekspresi atau nilai.`
