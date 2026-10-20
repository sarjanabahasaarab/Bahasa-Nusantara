# Rangkaian Pengujian Interpreter NUSANTARA

Direktori ini memuat seluruh pengujian unit dan integrasi untuk modul **Penerjemah Eksekusi (Interpreter)** bahasa **NUSANTARA**.

---

## Cakupan Pengujian:
1. **Program Pertama**: Eksekusi program "Halo Dunia!" dan fungsi bawaan `tampilkan(...)`.
2. **Evaluasi Literal**: Pencetakan tipe data `teks`, `bilangan`, `desimal`, `logika`, dan `kosong`.
3. **Aritmatika & Presedensi**: Evaluasi operator `+`, `-`, `*`, `/`, `%` dan pengelompokan tanda kurung `( )`.
4. **Logika**: Evaluasi operator `dan`, `atau`, `tidak` dengan evaluasi hubung singkat (*short-circuit*).
5. **Variabel & Penugasan**: Deklarasi dan pembaruan nilai variabel.
6. **Perlindungan Konstanta Tetap**: Menolak penulisan ulang pada variabel bertipe `tetap`.
7. **Percabangan Jika**: Eksekusi cabang `jika ... maka` dan `selain`.
8. **Perulangan**: Eksekusi `untuk` dan `selama` beserta instruksi `hentikan`.
9. **Fungsi**: Deklarasi fungsi modular, argumen parameter, dan instruksi `kembalikan`.
10. **Rekursi**: Eksekusi fungsi rekursif faktorial mandiri.
11. **Penanganan Kesalahan Runtime**: Deteksi pembagian dengan nol dan variabel tak ditemukan.

---

## Cara Menjalankan:
```bash
npm run test:interpreter
```
atau seluruh pengujian:
```bash
npm test
```
