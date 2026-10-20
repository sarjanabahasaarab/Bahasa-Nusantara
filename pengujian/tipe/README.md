# Rangkaian Pengujian Sistem Tipe Data NUSANTARA

Direktori ini memuat seluruh pengujian kepatuhan semantik dan sistem tipe data (**Type System & Type Checker**) bahasa **NUSANTARA** (Phase 9).

---

## Cakupan Pengujian:
1. **Tipe Primitif Valid**: Deklarasi dan inisialisasi `teks`, `bilangan`, `desimal`, `logika`, `karakter`, dan `kosong`.
2. **Penolakan Ketidakcocokan Tipe**: Menolak inisialisasi yang tidak sesuai tipe harapan.
3. **Validasi Penugasan (Assignment)**: Memastikan pembaruan nilai variabel sesuai dengan tipe deklarasi.
4. **Perlindungan Konstanta Tetap**: Menolak perubahan nilai pada pengidentifikasi `tetap`.
5. **Deteksi Deklarasi Ganda**: Mencegah deklarasi ulang variabel berulang dalam lingkup yang sama.
6. **Lingkup & Shadowing**: Memverifikasi isolasi variabel lingkup blok dan shadowing aman pada lingkup anak.
7. **Validasi Fungsi**: Pemeriksaan kesesuaian tipe argumen dan tipe nilai kembali fungsi.
8. **Validasi Operator**: Menolak operasi biner dan relasional antar tipe yang tidak kompatibel.

---

## Cara Menjalankan:
```bash
npm run test:tipe
```
atau seluruh rangkaian pengujian repositori:
```bash
npm test
```
