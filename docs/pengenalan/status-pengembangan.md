# Status Pengembangan: Konteks Milestone Phase 5

Dokumen ini merekam konteks historis tonggak dokumentasi awal **Milestone v0.5.0**. Ini bukan laporan status repositori terkini; status aktual Phase 1–50 dipelihara di [ROADMAP.md](../../ROADMAP.md).

Repositori kemudian berkembang hingga Phase 50, mencakup fondasi NusantaraOS dan pengujian user mode. Rincian implementasi dan batas verifikasi setiap fase tersedia pada roadmap; halaman ini tetap menjadi catatan konteks historis Phase 5.

---

## 1. Ringkasan Status

| Aspek Proyek | Status Saat Ini | Keterangan |
|---|---|---|
| **Spesifikasi Identitas & Nama** | **Selesai (v0.1.0)** | Ekstensi `.nusantara`, filosofi dasar, proposal NIP-0001. |
| **Konstitusi Bahasa** | **Selesai (v0.2.0)** | 10 Prinsip Konstitusi, 32 kata kunci, tipe data dasar, proposal NIP-0002. |
| **Lisensi & Tata Kelola** | **Selesai (v0.3.0)** | Apache License 2.0, tata kelola 5 peran, alur NIP 7 tahap, template GitHub, kebijakan keamanan. |
| **Spesifikasi Sintaks EBNF** | **Selesai (v0.4.0)** | Tata bahasa formal ISO/IEC 14977, presedensi 8 tingkat operator, 15 kasus uji negatif. |
| **Dokumentasi Awal & Buku Panduan** | **Selesai (v0.5.0)** | Fondasi panduan pemula, referensi terstruktur, panduan pengembang, dan glosarium. |
| **Lexer, Parser, Interpreter** | **Diimplementasikan pada fase berikutnya** | Implementasi dan pengujian tercatat pada Phase 6–8 di roadmap. |
| **Toolchain dan kompilasi native** | **Berkembang pada fase berikutnya** | Cakupan dan batas platform mengikuti bukti pengujian fase terkait. |

---

## 2. Perbedaan Antara Rancangan & Implementasi

Untuk menghindari kesalahpahaman:

- **Rancangan Bahasa (*Language Design*):** Aturan tata bahasa, kata kunci, tipe data, dan contoh kode yang telah disahkan secara formal dalam dokumen spesifikasi.
- **Implementasi Kompilator (*Compiler Implementation*):** Program komputer nyata yang memindai teks kode sumber, membangun pohon sintaksis (AST), dan menerjemahkannya menjadi kode mesin yang dapat dijalankan sistem operasi.

Pada saat milestone Phase 5 disusun, dokumen menjadi acuan awal sebelum implementasi kompilator diperluas. Repositori saat ini sudah memiliki komponen implementasi pada fase-fase selanjutnya; keberhasilan tiap fitur tetap mengikuti bukti pengujian fase terkait.

---

## 3. Tonggak Berikutnya Setelah Milestone Phase 5

Dalam urutan roadmap, pekerjaan setelah dokumentasi awal berlanjut ke **Phase 6: Lexer (Penganalisis Leksikal)**, yang bertugas:
1. Membaca aliran karakter dari berkas sumber `.nusantara`.
2. Mengubah karakter teks menjadi token leksikal (Kata Kunci, Pengidentifikasi, Literal, Operator, Pemisah).
3. Melacak nomor baris dan kolom untuk pelaporan kesalahan presisi.
4. Mengabaikan spasi kosong dan komentar satu baris `//`.
