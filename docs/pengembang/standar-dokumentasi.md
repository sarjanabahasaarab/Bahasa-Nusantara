# Standar Penulisan Dokumentasi NUSANTARA

Dokumen ini mendefinisikan aturan gaya bahasa, format Markdown, dan konvensi penulisan seluruh dokumen resmi **NUSANTARA**.

---

## 1. Bahasa & Ejaan

1. **Bahasa Indonesia sebagai Bahasa Utama:** Seluruh penjelasan konsep, contoh, dan pesan diagnostik ditulis dalam Bahasa Indonesia baku yang komunikatif dan mudah dipahami.
2. **Istilah Teknis Bahasa Asing:**
   - Gunakan padanan istilah Bahasa Indonesia jika tersedia (misal: *unduh* untuk *download*, *percabangan* untuk *branching*, *pewarisan* untuk *inheritance*).
   - Jika istilah asing tetap diperlukan untuk kejelasan teknis internasional, cetak miring (*italics*) istilah tersebut dan sertakan penjelasannya:
     - Contoh: "Pohon sintaksis abstrak (*Abstract Syntax Tree / AST*)".

---

## 2. Format Penulisan Markdown

1. **Heading Hirarkis:** Gunakan satu judul tingkat 1 (`#`) untuk setiap dokumen. Judul sub-bab menggunakan `##`, `###`, dst. secara berjenjang.
2. **Blok Kode:** Beri penanda bahasa pada blok kode pagar ganda:
   - Gunakan ```` ```nusantara ```` untuk kode sumber NUSANTARA.
   - Gunakan ```` ```ebnf ```` untuk tata bahasa EBNF.
   - Gunakan ```` ```bash ```` untuk perintah baris perintah.
3. **Catatan Kesiapan:** Setiap contoh kode `.nusantara` yang dicantumkan dalam tutorial wajib menyertakan keterangan penafian (*disclaimer*) bahwa contoh tersebut merupakan rancangan sintaksis acuan dan belum dapat dieksekusi sebelum modul kompilator tersedia.
