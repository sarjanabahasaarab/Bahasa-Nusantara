# Rangkaian Pengujian Parser & AST NUSANTARA

Direktori ini memuat seluruh pengujian unit dan integrasi untuk modul **Penganalisis Sintaksis (Parser) & AST (Phase 7 — Target: `v0.7.0`)** bahasa pemrograman **NUSANTARA**.

---

## Cakupan Pengujian:
1. **Program Dasar & Root Node:** Konstruksi `NodeProgram` dengan header dan penutup resmi.
2. **Literal & Nilai Terurai:** Parsing literal bilangan bulat, desimal, teks kutip ganda, karakter, logika, dan kosong.
3. **Presedensi Operator & Pengelompokan Kurung:** Memvalidasi pemetaan pohon ekspresi biner berdasarkan urutan evaluasi prioritas dan kurung `()`.
4. **Deklarasi Variabel & Tetap:** Deklarasi eksplisit `nama : tipe = nilai` dan konstanta `tetap`.
5. **Percabangan Jika-Maka-Selain:** Pemetaan struktur percabangan kondisional lengkap.
6. **Perulangan Untuk & Selama:** Parsing loop rentang `untuk` dan loop berbasis kondisi `selama`.
7. **Fungsi Modular & Parameter:** Penguraian tanda tangan fungsi berparameter dan berorientasi nilai kembali `->`.
8. **Visualisasi AST Printer:** Pembuatan representasi teks pohon sintaksis terindentasi rapi.
9. **Penanganan Galat Sintaksis Diagnostik:** Pengujian terhadap sintaks yang tidak lengkap atau rusak dengan pelaporan posisi baris/kolom akurat.
10. **Integrasi Program Contoh Resmi:** Pengujian terhadap berkas contoh nyata (`contoh/`).

---

## Menjalankan Pengujian:
```bash
npx tsx pengujian/parser/uji_parser.ts
```
atau melalui suite pengujian terpadu:
```bash
npm test
```
