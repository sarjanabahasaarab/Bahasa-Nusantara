# Rangkaian Pengujian Percabangan NUSANTARA

Direktori ini memuat seluruh pengujian unit dan integrasi untuk modul **Percabangan (Phase 11 — Target: `v0.11.0`)** bahasa pemrograman **NUSANTARA**.

---

## Cakupan Pengujian:
1. **Percabangan Jika Tanpa Selain:** Eksekusi cabang `jika ... maka` saat kondisi bernilai `benar` dan pelewatan bersih saat `salah`.
2. **Percabangan Jika dengan Selain:** Evaluasi cabang alternatif `selain` saat kondisi bernilai `salah`.
3. **Percabangan Bertingkat (Nested Branching):** Penguraian percabangan bertingkat di dalam `maka` maupun `selain` dengan pembatas `akhir` yang berpasangan presisi.
4. **Struktur AST Percabangan:** Pembuatan `NodePercabanganJika` dengan properti `kondisi`, `cabangMaka`, dan `cabangSelain`.
5. **Kondisi Operator Kompleks:** Evaluasi kondisi gabungan dengan operator aritmatika, perbandingan, logika (`dan`, `atau`, `tidak`), dan hubung singkat (*short-circuit*).
6. **Integritas Lingkup (Scoping):** Isolasi variabel lokal blok percabangan dan dukungan mutasi variabel luar melalui penugasan (*re-assignment*).
7. **Validasi Type System:** Penolakan tipe kondisi non-logika (`bilangan`, `teks`, dsb.) dan deteksi variabel tak terdefinisi pada kondisi percabangan.
8. **Diagnostik Sintaksis Parser:** Penolakan kondisi kosong, kata kunci `maka` yang hilang, blok tidak ditutup dengan `akhir`, serta peletakan `selain` atau `akhir` di luar konteks.
9. **Integrasi Program Contoh Nyata:** Pengujian menyeluruh pipeline nyata untuk program acuan spesifikasi resmi (`Kelulusan`, `Kondisi`, `Seleksi`).

---

## Menjalankan Pengujian:
```bash
npx tsx pengujian/percabangan/uji_percabangan.ts
```
atau melalui suite pengujian terpadu:
```bash
npm test
```
