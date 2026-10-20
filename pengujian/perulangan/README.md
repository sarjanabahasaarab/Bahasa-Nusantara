# Rangkaian Pengujian Sistem Perulangan NUSANTARA

Direktori ini memuat seluruh pengujian unit dan integrasi untuk modul **Sistem Perulangan (Phase 12 — Target: `v0.12.0`)** bahasa pemrograman **NUSANTARA**.

---

## Cakupan Pengujian:
1. **Perulangan Bersyarat (`selama`):** Evaluasi kondisi logika sebelum setiap iterasi, perulangan berhenti normal, dan pelewatan bersih saat kondisi salah sejak awal.
2. **Perulangan Rentang Berpenghitung (`untuk`):** Batas rentang inklusif (`dari` ... `sampai`), perulangan batas tunggal, dan penanganan rentang kosong (*empty range* saat `awal > akhir`).
3. **Kendali Aliran `hentikan` (*break*):** Penghentian segera perulangan terdekat dan kelanjutan eksekusi instruksi di luar blok `akhir`.
4. **Kendali Aliran `lanjutkan` (*continue*):** Melompati sisa instruksi iterasi saat ini, melanjutkan *increment* variabel penghitung pada `untuk`, dan memeriksa ulang kondisi pada `selama`.
5. **Kombinasi Perulangan dan Percabangan:** Menjalankan `jika ... maka ... selain ... akhir` di dalam perulangan dan sebaliknya, dengan pasangan pembatas `akhir` yang deterministik.
6. **Perulangan Bertingkat (*Nested Loops*):** Matriks iterasi multi-dimensi (baris dan kolom), isolasi state loop, serta pemutusan `hentikan` pada perulangan terdalam.
7. **Struktur AST Perulangan:** Membangun `NodePerulanganSelama` dan `NodePerulanganUntuk` secara akurat dengan koordinat posisi sumber.
8. **Validasi Type System:** Penolakan tipe kondisi non-logika pada `selama`, penolakan batas rentang non-bilangan pada `untuk`, deteksi variabel rentang tak terdefinisi, serta penolakan `hentikan` dan `lanjutkan` di luar konteks loop.
9. **Diagnostik Sintaksis Parser:** Penolakan kondisi kosong, batas rentang kosong, loop tidak ditutup `akhir`, dan kata kunci `lakukan`, `dari`, `sampai` yang nyasar.
10. **Perlindungan Infinite Loop:** Mekanisme pembatas iterasi runtime (`maksimalIterasiPerulangan`) yang melempar `GalatRuntime.BATAS_ITERASI_TERLAMPAUI` untuk mencegah penguncian sistem.

---

## Menjalankan Pengujian:
```bash
npx tsx pengujian/perulangan/uji_perulangan.ts
```
atau melalui suite pengujian terpadu:
```bash
npm test
```
