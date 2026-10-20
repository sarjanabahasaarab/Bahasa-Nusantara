# Sistem Pengujian Bahasa Pemrograman NUSANTARA

Folder ini dirancang untuk menampung seluruh kerangka pengujian komparatif, leksikal, sintaksis, semantik, integrasi, dan uji regresi ekosistem NUSANTARA.

---

## 1. Strategi Pengujian Bertahap

Pengujian bahasa NUSANTARA dibagi menjadi beberapa lapisan:

1. **Uji Fondasi (Phase 1):**
   - Verifikasi kelengkapan berkas dokumentasi, lisensi, tata kelola, dan contoh kode melalui skrip otomatis `skrip/periksa_fondasi.js`.
2. **Uji Leksikal / Tokenizer (Phase 6):**
   - Memastikan seluruh aliran karakter `.nusantara` diurai menjadi token yang sah.
   - Menguji batasan karakter tak sah, nomor baris, dan penanganan literal Unicode.
3. **Uji Sintaksis / Parser (Phase 7):**
   - Menguji apakah kumpulan token membentuk Pohon Sintaksis Abstrak (AST) yang valid.
   - Memastikan pesan kesalahan sintaksis dapat dipulihkan (*error recovery*) tanpa menyebabkan *crash*.
4. **Uji Semantik & Tipe Data (Phase 9 & 10):**
   - Validasi ketat inferensi tipe data, aturan immutability `tetap`, dan cakupan variabel.
5. **Uji Evaluasi Interpreter (Phase 8):**
   - Memastikan keluaran logis program kecil sesuai dengan spesifikasi perilaku yang diharapkan (*golden tests*).
6. **Uji Integrasi Kompiler Native (Phase 23):**
   - Mengompilasi kode sumber menjadi biner mesin dan menguji kode keluar (*exit code*) serta keluaran stdout/stderr.
7. **Uji Regresi (Berkelanjutan):**
   - Setiap galat yang dilaporkan melalui GitHub Issue dan diperbaiki wajib disertai berkas uji kasus regresi di folder ini.

---

## 2. Cara Menjalankan Uji Phase 1

Untuk memverifikasi kesiapan repositori pada Phase 1, jalankan perintah berikut dari direktori utama:

```bash
node skrip/periksa_fondasi.js
```

Seluruh pemeriksaan integritas harus lulus sebelum rilis atau pengajuan *Pull Request*.
