# Referensi Tata Bahasa Formal EBNF (ISO/IEC 14977)

Notasi formal tata bahasa bebas konteks resmi bahasa **NUSANTARA** yang menjadi acuan pembuatan Lexer (Phase 6) dan Parser (Phase 7).

---

```ebnf
(* Unit Kompilasi Utama *)
berkas_nusantara = { baris_kosong | komentar }, [ program_utama ], { deklarasi_fungsi } ;

program_utama = "program", spasi, pengidentifikasi, pemisah_baris,
                blok_utama ;

blok_utama = "mulai", pemisah_baris,
             daftar_pernyataan,
             "selesai", [ pemisah_baris ] ;

daftar_pernyataan = { pernyataan, pemisah_baris } ;

pernyataan = deklarasi_variabel
           | deklarasi_tetap
           | penugasan
           | pemanggilan_fungsi
           | percabangan_jika
           | perulangan_untuk
           | perulangan_selama
           | instruksi_kendali
           | instruksi_kembalikan ;

deklarasi_variabel = [ "variabel", spasi ], pengidentifikasi, spasi, ":", spasi,
                     nama_tipe, spasi, "=", spasi, ekspresi ;

deklarasi_tetap = "tetap", spasi, pengidentifikasi, spasi, ":", spasi,
                  nama_tipe, spasi, "=", spasi, ekspresi ;

penugasan = pengidentifikasi, spasi, "=", spasi, ekspresi ;

percabangan_jika = "jika", spasi, ekspresi, spasi, "maka", pemisah_baris,
                   daftar_pernyataan,
                   [ "selain", pemisah_baris, daftar_pernyataan ],
                   "akhir" ;

perulangan_untuk = "untuk", spasi, pengidentifikasi, spasi,
                   "dari", spasi, ekspresi, spasi,
                   "sampai", spasi, ekspresi, spasi,
                   "lakukan", pemisah_baris,
                   daftar_pernyataan,
                   "akhir" ;

perulangan_selama = "selama", spasi, ekspresi, spasi,
                    "lakukan", pemisah_baris,
                    daftar_pernyataan,
                    "akhir" ;

deklarasi_fungsi = "fungsi", spasi, pengidentifikasi,
                   "(", [ daftar_parameter ], ")",
                   [ spasi, ":", spasi, nama_tipe ], pemisah_baris,
                   blok_utama ;

pemanggilan_fungsi = pengidentifikasi, "(", [ daftar_argumen ], ")" ;
```

*(Dokumen acuan EBNF lengkap dapat dilihat pada [dokumentasi/GRAMMAR-EBNF.md](../../dokumentasi/GRAMMAR-EBNF.md)).*
