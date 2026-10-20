# Rangkaian Pengujian Sistem Operator NUSANTARA

Direktori ini memuat seluruh pengujian unit dan integrasi untuk modul **Sistem Operator (Phase 10 — Target: `v0.10.0`)** bahasa pemrograman **NUSANTARA**.

---

## Cakupan Pengujian:
1. **Operator Aritmatika**: Pengujian `+`, `-`, `*`, `/`, `%` untuk bilangan bulat, desimal, dan penggabungan teks (*string concatenation*).
2. **Operator Perbandingan**: Pengujian `==`, `!=`, `<`, `>`, `<=`, `>=` menghasilkan nilai `logika` (`benar` / `salah`).
3. **Operator Logika**: Pengujian konjungsi `dan`, disjungsi `atau`, dan negasi `tidak`.
4. **Operator Unari**: Pengujian negasi tanda angka `-` dan negasi logika `tidak`.
5. **Evaluasi Presedensi**: Pengujian 8 tingkat hierarki presedensi resmi (misal: perkalian didahulukan daripada penjumlahan).
6. **Asosiativitas Operator**: Pengujian evaluasi dari kiri ke kanan untuk operator biner dan kanan ke kiri untuk operator unari.
7. **Tanda Kurung Pengelompokan**: Pengujian `( )` untuk mengubah urutan evaluasi standar.
8. **Validasi Tipe Data (Type Checking)**: Pengujian penolakan operan yang tidak kompatibel dengan pesan kesalahan diagnostik berbahasa Indonesia.
9. **Evaluasi Hubung Singkat (Short-circuit Evaluation)**: Memverifikasi bahwa cabang sisi kanan sama sekali tidak dievaluasi saat sisi kiri telah menentukan hasil kebenaran (`salah dan fn()`, `benar atau fn()`).
10. **Proteksi Pembagian & Modulo dengan Nol**: Memverifikasi pembagian dan modulo dengan nol membangkitkan `GalatRuntime.PEMBAGIAN_NOL` tanpa membuat aplikasi crash.
11. **Penolakan Operator Ilegal**: Memverifikasi simbol ilegal ditolak sejak pemindaian leksikal dan parsing.
12. **Presisi Informasi Lokasi Galat**: Memverifikasi laporan baris dan kolom yang akurat saat runtime error terjadi.
13. **Program Integrasi Pipeline Penuh**: Eksekusi program kasir lengkap melalui seluruh saluran pipa (*Lexer -> Parser -> AST -> Type System -> Interpreter*).

---

## Cara Menjalankan Uji:

```bash
# Menjalankan rangkaian uji operator secara spesifik:
npm run test:operator

# Atau menggunakan tsx langsung:
npx tsx pengujian/operator/uji_operator.ts

# Menjalankan seluruh pengujian repositori (audit berkas, lexer, parser, interpreter, tipe, operator):
npm test
```
