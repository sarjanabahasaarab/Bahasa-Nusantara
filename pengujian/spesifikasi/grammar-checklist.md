# Daftar Periksa Keutuhan Tata Bahasa EBNF (Grammar Checklist)

Daftar periksa ini digunakan untuk memvalidasi kelengkapan produksi formal tata bahasa NUSANTARA sebelum implementasi generator parser pada Phase 7.

---

## 1. Unit Program & Blok
- [x] Produksi `program_utama` mendefinisikan kata kunci `program` dan nama pengidentifikasi.
- [x] Produksi `blok_utama` mewajibkan pembukaan dengan `mulai` dan penutupan dengan `selesai`.
- [x] Pemisah instruksi menggunakan `pemisah_baris` (baris baru alami / newline).
- [x] Seluruh pernyataan di dalam blok dipetakan ke produksi `pernyataan`.

## 2. Deklarasi & Nilai
- [x] Mendukung bentuk deklarasi ringkas `nama : tipe = nilai`.
- [x] Mendukung bentuk deklarasi eksplisit `variabel nama : tipe = nilai`.
- [x] Mendukung konstanta `tetap nama : tipe = nilai`.
- [x] Penugasan ulang `nama = ekspresi` terpisah dari inisialisasi bertipe.

## 3. Struktur Kendali Aliran
- [x] Percabangan `jika` mewajibkan `maka` dan ditutup dengan `akhir`.
- [x] Bagian `selain` bersifat opsional.
- [x] Perulangan `untuk` mendefinisikan `dari` dan `sampai` (inklusif) serta `lakukan`.
- [x] Perulangan `selama` mendefinisikan kondisi dan `lakukan`.
- [x] Keduanya ditutup dengan kata kunci `akhir`.
- [x] Mendukung instruksi kendali `hentikan` dan `lanjutkan`.

## 4. Fungsi & Parameter
- [x] Mendukung definisi fungsi dengan atau tanpa nilai kembali (`: tipe`).
- [x] Mendukung parameter beranotasi tipe `(a : tipe, b : tipe)`.
- [x] Mendukung pemanggilan fungsi dengan daftar argumen ekspresi.
- [x] Mendukung instruksi `kembalikan ekspresi`.

## 5. Ekspresi & Presedensi Operator
- [x] Tata bahasa ekspresi bertingkat bebas dari ambiguitas parsing (8 tingkat presedensi).
- [x] Operator perkalian, pembagian, dan modulo mendahului penjumlahan dan pengurangan.
- [x] Operator relasional (`<`, `>`, `<=`, `>=`) mendahului kesetaraan (`==`, `!=`).
- [x] Konjungsi `dan` mendahului disjungsi `atau`.
- [x] Operator unari (`tidak`, `-`) mendahului operator biner.
- [x] Tanda kurung `( )` memiliki prioritas tertinggi.
