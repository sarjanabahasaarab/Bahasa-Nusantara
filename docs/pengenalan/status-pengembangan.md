# Status Pengembangan Saat Ini (Phase 5)

Dokumen ini menjelaskan status teknis repositori bahasa NUSANTARA pada tonggak rilis **Milestone v0.5.0**.

---

## 1. Ringkasan Status

| Aspek Proyek | Status Saat Ini | Keterangan |
|---|---|---|
| **Spesifikasi Identitas & Nama** | **Selesai (v0.1.0)** | Ekstensi `.nusantara`, filosofi dasar, proposal NIP-0001. |
| **Konstitusi Bahasa** | **Selesai (v0.2.0)** | 10 Prinsip Konstitusi, 32 kata kunci, tipe data dasar, proposal NIP-0002. |
| **Lisensi & Tata Kelola** | **Selesai (v0.3.0)** | Apache License 2.0, tata kelola 5 peran, alur NIP 7 tahap, template GitHub, kebijakan keamanan. |
| **Spesifikasi Sintaks EBNF** | **Selesai (v0.4.0)** | Tata bahasa formal ISO/IEC 14977, presedensi 8 tingkat operator, 15 kasus uji negatif. |
| **Dokumentasi Awal & Buku Panduan** | **Selesai (v0.5.0 — Fase Saat Ini)** | Buku panduan pemula, referensi terstruktur, panduan pengembang, glosarium teknis. |
| **Kompilator Biner / Lexer / Parser** | **Belum Tersedia** | Dijadwalkan mulai Phase 6 (Lexer) dan Phase 7 (Parser). |
| **Eksekusi Kode Nyata** | **Belum Tersedia** | Kode `.nusantara` saat ini berstatus rancangan acuan spesifikasi. |

---

## 2. Perbedaan Antara Rancangan & Implementasi

Untuk menghindari kesalahpahaman:

- **Rancangan Bahasa (*Language Design*):** Aturan tata bahasa, kata kunci, tipe data, dan contoh kode yang telah disahkan secara formal dalam dokumen spesifikasi.
- **Implementasi Kompilator (*Compiler Implementation*):** Program komputer nyata yang memindai teks kode sumber, membangun pohon sintaksis (AST), dan menerjemahkannya menjadi kode mesin yang dapat dijalankan sistem operasi.

Pada Phase 5, seluruh rancangan bahasa telah kokoh dan terverifikasi. Tahapan implementasi teknis akan dimulai secara murni pada fase berikutnya.

---

## 3. Langkah Berikutnya: Phase 6 (Lexer)

Fase berikutnya adalah **Phase 6: Lexer (Penganalisis Leksikal)**, yang akan bertugas:
1. Membaca aliran karakter dari berkas sumber `.nusantara`.
2. Mengubah karakter teks menjadi token leksikal (Kata Kunci, Pengidentifikasi, Literal, Operator, Pemisah).
3. Melacak nomor baris dan kolom untuk pelaporan kesalahan presisi.
4. Mengabaikan spasi kosong dan komentar satu baris `//`.
