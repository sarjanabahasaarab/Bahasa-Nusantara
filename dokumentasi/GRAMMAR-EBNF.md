# Tata Bahasa Formal EBNF Bahasa NUSANTARA

Dokumen ini mendefinisikan tata bahasa bebas konteks (*context-free grammar*) resmi bahasa **NUSANTARA** menggunakan notasi **EBNF (Extended Backus-Naur Form)** standar ISO/IEC 14977.

---

## 1. Konvensi Notasi EBNF yang Digunakan

| Simbol | Arti Simbol |
|---|---|
| `=` | Mendefinisikan aturan produksi |
| `,` | Perangkaian (*concatenation*) berurutan |
| `\|` | Pilihan alternatif (*choice / OR*) |
| `[ ... ]` | Konstruksi opsional (0 atau 1 kali) |
| `{ ... }` | Pengulangan 0 atau lebih kali (*repetition*) |
| `( ... )` | Pengelompokan urutan produksi |
| `"..."` | Literal terminal (token teks pasti) |
| `;` | Penutup aturan produksi |
| `(* ... *)` | Komentar penjelas EBNF |

---

## 2. Tata Bahasa Program & Blok Eksekusi

```ebnf
(* Unit Kompilasi Utama *)
berkas_nusantara = { baris_kosong | komentar }, [ program_utama ], { deklarasi_fungsi } ;

program_utama = "program", spasi, pengidentifikasi, pemisah_baris,
                blok_utama ;

blok_utama = "mulai", pemisah_baris,
             daftar_pernyataan,
             "selesai", [ pemisah_baris ] ;

daftar_pernyataan = { pernyataan, pemisah_baris } ;
```

---

## 3. Klasifikasi Pernyataan (*Statements*)

```ebnf
pernyataan = deklarasi_variabel
           | deklarasi_tetap
           | penugasan
           | pemanggilan_fungsi
           | percabangan_jika
           | perulangan_untuk
           | perulangan_selama
           | instruksi_kendali
           | instruksi_kembalikan ;

instruksi_kendali = "hentikan" | "lanjutkan" ;

instruksi_kembalikan = "kembalikan", [ spasi, ekspresi ] ;
```

---

## 4. Deklarasi Nilai & Penugasan

```ebnf
(* Deklarasi Variabel (Mutable) *)
deklarasi_variabel = [ "variabel", spasi ], pengidentifikasi, spasi, ":", spasi,
                     nama_tipe, spasi, "=", spasi, ekspresi ;

(* Deklarasi Konstanta (Immutable) *)
deklarasi_tetap = "tetap", spasi, pengidentifikasi, spasi, ":", spasi,
                  nama_tipe, spasi, "=", spasi, ekspresi ;

(* Penugasan Ulang Nilai *)
penugasan = pengidentifikasi, spasi, "=", spasi, ekspresi ;

(* Nama Tipe Data Pokok *)
nama_tipe = "teks"
          | "bilangan"
          | "desimal"
          | "logika"
          | "karakter"
          | "daftar"
          | "peta"
          | "kosong" ;
```

---

## 5. Percabangan Kondisional (`jika`)

```ebnf
percabangan_jika = "jika", spasi, ekspresi, spasi, "maka", pemisah_baris,
                   daftar_pernyataan,
                   [ "selain", pemisah_baris, daftar_pernyataan ],
                   "akhir" ;
```

---

## 6. Perulangan (`untuk` & `selama`)

```ebnf
(* Perulangan Rentang Berpenghitung *)
perulangan_untuk = "untuk", spasi, pengidentifikasi, spasi,
                   "dari", spasi, ekspresi, spasi,
                   "sampai", spasi, ekspresi, spasi,
                   "lakukan", pemisah_baris,
                   daftar_pernyataan,
                   "akhir" ;

(* Perulangan Bersyarat Kondisi *)
perulangan_selama = "selama", spasi, ekspresi, spasi,
                    "lakukan", pemisah_baris,
                    daftar_pernyataan,
                    "akhir" ;
```

---

## 7. Definisi & Pemanggilan Fungsi

```ebnf
deklarasi_fungsi = "fungsi", spasi, pengidentifikasi,
                   "(", [ daftar_parameter ], ")",
                   [ spasi, ":", spasi, nama_tipe ], pemisah_baris,
                   blok_utama ;

daftar_parameter = parameter_tunggal, { ",", spasi, parameter_tunggal } ;

parameter_tunggal = pengidentifikasi, spasi, ":", spasi, nama_tipe ;

pemanggilan_fungsi = pengidentifikasi, "(", [ daftar_argumen ], ")" ;

daftar_argumen = ekspresi, { ",", spasi, ekspresi } ;
```

---

## 8. Tata Bahasa Ekspresi & Presedensi Operator

Tata bahasa ekspresi distrukturkan bertingkat untuk mengeliminasi ambiguitas parsing leksikal:

```ebnf
ekspresi = ekspresi_logika_atau ;

ekspresi_logika_atau = ekspresi_logika_dan, { spasi, "atau", spasi, ekspresi_logika_dan } ;

ekspresi_logika_dan = ekspresi_kesetaraan, { spasi, "dan", spasi, ekspresi_kesetaraan } ;

ekspresi_kesetaraan = ekspresi_relasional, [ spasi, operator_kesetaraan, spasi, ekspresi_relasional ] ;
operator_kesetaraan = "==" | "!=" ;

ekspresi_relasional = ekspresi_aditif, [ spasi, operator_relasional, spasi, ekspresi_aditif ] ;
operator_relasional = "<" | "<=" | ">" | ">=" ;

ekspresi_aditif = ekspresi_multiplikatif, { spasi, operator_aditif, spasi, ekspresi_multiplikatif } ;
operator_aditif = "+" | "-" ;

ekspresi_multiplikatif = ekspresi_unari, { spasi, operator_multiplikatif, spasi, ekspresi_unari } ;
operator_multiplikatif = "*" | "/" | "%" ;

ekspresi_unari = [ operator_unari, spasi ], ekspresi_dasar ;
operator_unari = "tidak" | "-" ;

ekspresi_dasar = literal
               | pemanggilan_fungsi
               | pengidentifikasi
               | "(", ekspresi, ")" ;
```

---

## 9. Literal Data

```ebnf
literal = literal_teks
        | literal_bilangan
        | literal_desimal
        | literal_logika
        | literal_kosong ;

literal_logika = "benar" | "salah" ;
literal_kosong = "kosong" ;

literal_teks = '"', { karakter_teks | urutan_lolos }, '"' ;
literal_bilangan = digit, { digit } ;
literal_desimal = digit, { digit }, ".", digit, { digit } ;

digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
```

---

## 10. Komentar & Leksikal Dasar

```ebnf
komentar = "//", { bukan_baris_baru }, pemisah_baris ;
spasi = { " " | "\t" } ;
pemisah_baris = "\n" | "\r\n" ;
baris_kosong = [ spasi ], pemisah_baris ;
```
