# Referensi Sintaks: Sistem Fungsi Bahasa NUSANTARA (Phase 13)

Dokumen ini merupakan panduan referensi resmi untuk pendefinisian, parameter, pemanggilan, dan semantik pengembalian nilai fungsi pada bahasa **NUSANTARA**.

---

## 1. Tata Bahasa Formal Fungsi (EBNF)

Berdasarkan spesifikasi tata bahasa baku ISO/IEC 14977 (`dokumentasi/GRAMMAR-EBNF.md`):

```ebnf
deklarasi_fungsi = "fungsi", spasi, pengidentifikasi,
                   "(", [ daftar_parameter ], ")",
                   [ spasi, ":", spasi, nama_tipe ], pemisah_baris,
                   blok_utama ;

daftar_parameter = parameter_tunggal, { ",", spasi, parameter_tunggal } ;

parameter_tunggal = pengidentifikasi, spasi, ":", spasi, nama_tipe ;

pemanggilan_fungsi = pengidentifikasi, "(", [ daftar_argumen ], ")" ;

daftar_argumen = ekspresi, { ",", spasi, ekspresi } ;

instruksi_kembalikan = "kembalikan", [ spasi, ekspresi ] ;
```

---

## 2. Deklarasi Fungsi

Fungsi dideklarasikan di tingkat teratas program menggunakan kata kunci `fungsi`, diikuti nama fungsi, daftar parameter dalam tanda kurung `()`, anotasi tipe hasil opsional, serta blok tubuh yang diawali `mulai` dan diakhiri `selesai`.

### A. Fungsi dengan Nilai Kembali
Fungsi yang menghasilkan nilai wajib mencantumkan anotasi tipe kembalian `: <tipe>`:

```nusantara
fungsi tambah(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a + b
selesai
```

### B. Prosedur (Fungsi Tanpa Nilai Kembali)
Fungsi yang hanya melakukan tindakan tanpa mengembalikan nilai (prosedur) tidak mencantumkan anotasi tipe kembalian atau menggunakan tipe `kosong`:

```nusantara
fungsi sambutPengguna(nama : teks)
mulai
    tampilkan("Selamat datang di bahasa NUSANTARA, " + nama + "!")
selesai
```

### C. Fungsi Tanpa Parameter
Fungsi yang tidak memerlukan argumen masukan ditulis dengan tanda kurung kosong `()`:

```nusantara
fungsi dapatkanVersi() : teks
mulai
    kembalikan "v0.13.0"
selesai
```

---

## 3. Parameter dan Argumen

1. **Evaluasi Berurutan:** Argumen dievaluasi dari kiri ke kanan sebelum masuk ke dalam tubuh fungsi.
2. **Kesesuaian Tipe:** Type System memeriksa bahwa setiap tipe argumen kompatibel dengan tipe parameter yang ditentukan.
3. **Jumlah Argumen Pas:** Jumlah argumen pemanggilan harus tepat sama dengan jumlah parameter yang dideklarasikan.
4. **Keunikan Nama Parameter:** Setiap parameter dalam satu fungsi harus memiliki nama yang unik. Deklarasi nama parameter ganda akan ditolak sebagai kesalahan `DEKLARASI_GANDA`.

---

## 4. Instruksi `kembalikan`

- Kata kunci `kembalikan` menghentikan eksekusi tubuh fungsi saat itu juga dan meneruskan nilai ekspresi kepada pemanggil (*caller*).
- **Pengembalian Awal (*Early Return*):** `kembalikan` dapat digunakan di dalam percabangan `jika` untuk mengakhiri fungsi lebih awal.
- **Kesesuaian Tipe Hasil:** Nilai ekspresi yang dikembalikan wajib kompatibel dengan tipe kembalian fungsi.
- **Wajib Mengembalikan Nilai:** Fungsi yang dideklarasikan dengan tipe kembalian (selain `kosong`) tidak boleh selesai tanpa mengembalikan nilai.

---

## 5. Cakupan Leksikal (*Lexical Scope*)

- Parameter dan variabel yang dideklarasikan di dalam tubuh fungsi bersifat **lokal**.
- Variabel lokal dibersihkan dari memori saat fungsi selesai dan tidak dapat diakses dari luar (*no leaking*).
- Fungsi dapat membaca dan memanggil fungsi global lain yang telah didefinisikan.
- **Pembayangan (*Shadowing*):** Variabel lokal dengan nama yang sama dengan variabel luar akan menaungi variabel luar selama eksekusi fungsi tanpa mengubah nilai variabel luar.

---

## 6. Pemanggilan Bersarang & Rekursi

- Fungsi dapat memanggil fungsi lain secara bebas.
- **Rekursi:** Fungsi dapat memanggil dirinya sendiri. Setiap pemanggilan rekursif memiliki bingkai tumpukan (*stack frame*) dan variabel lokal yang terisolasi.
- **Batas Keamanan:** Interpreter membatasi kedalaman tumpukan pemanggilan rekursif hingga 500 tingkat untuk mencegah kesalahan fatal kehabisan memori (*stack overflow*).

---

## 7. Contoh Program Lengkap

```nusantara
program ProgramMatematika

fungsi faktorial(n : bilangan) : bilangan
mulai
    jika n <= 1 maka
        kembalikan 1
    akhir
    kembalikan n * faktorial(n - 1)
selesai

mulai
    angka : bilangan = 5
    hasil : bilangan = faktorial(angka)
    tampilkan("Faktorial dari " + angka + " adalah " + hasil)
selesai
```
