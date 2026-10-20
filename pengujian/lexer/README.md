# Rangkaian Pengujian Lexer NUSANTARA

Direktori ini memuat seluruh pengujian unit, integrasi, dan kasus batas untuk modul **Penganalisis Leksikal (Lexer)** bahasa **NUSANTARA**.

---

## Berkas Pengujian:
- **`uji_lexer.ts`**: Pengujian komprehensif 12 kelompok uji yang mencakup:
  1. Pengujian 21 kata kunci ditetapkan
  2. Pengujian 11 kata kunci rancangan
  3. Pengujian pengidentifikasi
  4. Pengujian literal angka (bilangan bulat & desimal)
  5. Pengujian literal teks & urutan karakter lolos (*escape sequences*)
  6. Pengujian operator & pencocokan terpanjang (*longest match*)
  7. Pengujian pemisah dan tanda baca
  8. Pengujian komentar `//` dan spasi
  9. Pengujian akurasi nomor baris dan kolom
  10. Pengujian pelaporan galat leksikal
  11. Pengujian antarmuka `TokenStream`
  12. Pengujian integrasi program resmi dan kasus batas (*edge cases*)

---

## Cara Menjalankan:
```bash
npm run test:lexer
```
atau pengujian menyeluruh:
```bash
npm test
```
