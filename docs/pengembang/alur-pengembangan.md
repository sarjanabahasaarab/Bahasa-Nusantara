# Alur Pengembangan & Pembacaan Roadmap

Pengembangan bahasa pemrograman NUSANTARA dijalankan dengan metode bertahap dan disiplin rekayasa piranti lunak (*engineering discipline*).

---

## 1. Membaca Dokumen ROADMAP.md

Dokumen [ROADMAP.md](../../ROADMAP.md) membagi rencana kerja menjadi 6 blok besar yang terdiri atas 36 fase:

- **Blok A (Phase 1–5):** Fondasi & Spesifikasi *(Phase 1, 2, 3, 4, 5)*.
- **Blok B (Phase 6–13):** Mesin Inti Kompilator *(Lexer, Parser, AST, Interpreter, Semantik)*.
- **Blok C (Phase 14–20):** Fitur Bahasa Lanjutan *(Koleksi, OOP, Modul, Eksepsi, Asinkron)*.
- **Blok D (Phase 21–25):** Kompilasi Native *(IR, LLVM Backend, Executable, Optimasi)*.
- **Blok E (Phase 26–32):** Ekosistem & Perkakas *(CLI, Package Manager, Registry, LSP, IDE)*.
- **Blok F (Phase 33–36):** Domain Khusus & Sistem Operasi *(Web, GUI, Game, NusantaraOS)*.

---

## 2. Prinsip Siklus Setiap Fase

Setiap fase wajib melalui siklus:
1. **Audit & Analisis Kebutuhan:** Membaca dokumen dari fase-fase sebelumnya agar tidak ada kontradiksi.
2. **Perumusan Spesifikasi Teknis / Kode:** Menyusun dokumen atau modul kode baru secara rapi.
3. **Audit Kepatuhan Berkas:** Menjalankan skrip validasi repositori (`node skrip/periksa_fondasi.js`).
4. **Pencatatan Perubahan:** Menambahkan catatan pada [PERUBAHAN.md](../../PERUBAHAN.md) dan memperbarui [ROADMAP.md](../../ROADMAP.md).
5. **Komit & Tinjauan:** Melakukan komit dengan pesan terstandar tanpa membuat tag/release otomatis sebelum disetujui.
