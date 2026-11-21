# Arsitektur & Dokumentasi Teknis Lexer NUSANTARA

Dokumen ini menjelaskan rancangan, arsitektur, cara kerja, dan antarmuka pemrograman (API) dari modul **Penganalisis Leksikal (Lexer)** bahasa **NUSANTARA** yang dibangun pada **Phase 6 (Milestone v0.6.0)**.

---

## 1. Apa Itu Lexer?

**Lexer (*Lexical Analyzer / Tokenizer*)** adalah komponen lapis pertama dari saluran pipa kompilasi (*compiler pipeline*) NUSANTARA. Lexer bertugas membaca aliran karakter mentah dari kode sumber `.nusantara` berformat teks UTF-8 dan mengelompokkannya menjadi unit-unit leksikal bermakna yang disebut **Token**.

```text
Kode Sumber (.nusantara)
         │
         ▼
 ┌───────────────┐
 │     Lexer     │  <-- (Phase 6: Diimplementasikan di sini)
 └───────────────┘
         │
         ▼
   Rangkaian Token
         │
         ▼
 ┌───────────────┐
 │    Parser     │  <-- (Phase 7: Diimplementasikan)
 └───────────────┘
         │
         ▼
 Pohon Sintaksis (AST)
```

---

## 2. Tanggung Jawab Lexer

1. **Pemindaian Karakter (*Scanning*):** Membaca teks sumber karakter demi karakter.
2. **Pengenalan Pola (*Pattern Recognition*):**
   - Mengidentifikasi kata kunci inti dan kata kunci lintas fase yang terdaftar pada kamus lexer.
   - Mengidentifikasi nama pengidentifikasi (*identifiers*).
   - Memindai literal (bilangan bulat, desimal pecahan, teks, karakter).
   - Menangani operator multi-karakter dengan prinsip kecocokan terpanjang (*longest match*), seperti `<=`, `>=`, `==`, `!=`.
3. **Penyaringan (*Filtering*):** Mengabaikan spasi, tab horizontal, dan komentar satu baris (`//`).
4. **Pelacakan Posisi Presisi:** Menghitung nomor baris dan kolom untuk setiap token secara akurat.
5. **Pelaporan Galat Diagnostik:** Mendeteksi kesalahan leksikal (seperti string tidak ditutup, karakter ilegal) dan menghasilkan pesan kesalahan berbahasa Indonesia tanpa menyebabkan aplikasi *crash*.
6. **Penanda Akhir Dokumen:** Selalu mengakhiri aliran token dengan token khusus `EOF`.

---

## 3. Unicode, Indeks, dan Posisi\n\nLexer membaca karakter berdasarkan Unicode code point (scalar value), sehingga karakter supplementary seperti emoji tidak terbelah menjadi dua unit UTF-16. `posisi.indeks` tetap merupakan offset UTF-16 agar sesuai dengan indeks string JavaScript, sedangkan `baris` dan `kolom` menghitung scalar yang dipindai. Literal `karakter` menerima tepat satu Unicode scalar value sesuai EBNF; literal kosong dan lebih dari satu scalar ditolak.\n\n---\n\n## 4. Struktur Token & Posisi

Setiap token didefinisikan oleh antarmuka `Token`:

```typescript
export interface Token {
  jenis: JenisToken;      // Kategori token (misal: KW_PROGRAM, IDENTIFIER, dsb.)
  nilai: string;          // Teks asli leksikal (lexeme)
  baris: number;          // Nomor baris kemunculan (1-indexed)
  kolom: number;          // Nomor kolom kemunculan (1-indexed)
  posisi: RentangPosisi;  // Titik awal dan akhir koordinat karakter
}
```

---

## 5. Aliran Token (*TokenStream*)

Untuk mempermudah pekerjaan **Parser pada Phase 7**, Lexer menyediakan kelas pembungkus `TokenStream` yang mendukung navigasi kursor token:

- `current(): Token` — Mengembalikan token yang sedang ditunjuk tanpa memajukan kursor.
- `peek(offset?: number): Token` — Mengintip token beberapa langkah ke depan.
- `next(): Token` — Mengambil token saat ini dan memajukan kursor.
- `is(jenis: JenisToken): boolean` — Memeriksa jenis token aktif.
- `eof(): boolean` — Memeriksa apakah aliran token sudah mencapai akhir file.

---

## 6. Antarmuka Pemrograman (API Lexer)

### A. Tokenisasi Sekaligus (*Batch*)
```typescript
import { Lexer } from './lexer';

const kode = `program Halo
mulai
    tampilkan("Halo Dunia!")
selesai`;

const lexer = new Lexer(kode);
const { token, galat } = lexer.tokenisasi();

console.log(token); // Array seluruh Token hingga EOF
```

### B. Pembacaan Token Bertahap (*Iterative Stream*)
```typescript
const lexer = new Lexer(kode);
let tok = lexer.bacaTokenBerikutnya();

while (tok.jenis !== JenisToken.EOF) {
  console.log(`[${tok.baris}:${tok.kolom}] ${tok.jenis}: ${tok.nilai}`);
  tok = lexer.bacaTokenBerikutnya();
}
```

---

## 7. Penanganan Galat Leksikal

Jika ditemukan kekeliruan leksikal pada kode masukan, Lexer tidak memicu penghentian paksa (*unhandled exception / panic*), melainkan mencatatnya ke dalam objek `GalatLexer`:

- **Karakter Tak Dikenal:** Contoh simbol `@` menghasilkan pesan:
  `[Galat Leksikal] Karakter tidak dikenal '@' pada baris 4, kolom 12`
- **Teks Tidak Ditutup:** Contoh `"Halo` menghasilkan pesan:
  `[Galat Leksikal] Literal teks tidak ditutup tanda kutip ganda (") pada baris 2, kolom 15`
- **Format Angka Tidak Valid:** Contoh `12.3.4` menghasilkan pesan:
  `[Galat Leksikal] Format angka tidak valid '12.3.4' pada baris 3, kolom 8`

---

## 8. Cara Menjalankan Pengujian Lexer

Pengujian komprehensif unit test dan property test Lexer dapat dijalankan melalui skrip:

```bash
npx tsx pengujian/lexer/uji_lexer.ts\nnpm run test:lexer-unicode
```

---

## 9. Panduan Menambahkan Token Baru

Jika di masa depan terdapat proposal NIP yang mengesahkan token baru:
1. Daftarkan jenis token baru pada enum `JenisToken` di `src/lexer/jenisToken.ts`.
2. Jika merupakan kata kunci, tambahkan pemetaan kata ke `TABEL_KATA_KUNCI` di `src/lexer/keyword.ts`.
3. Jika merupakan operator baru atau pemisah, tambahkan cabang pengenalan pada `bacaTokenBerikutnya()` di `src/lexer/lexer.ts`.
4. Tambahkan unit test verifikasi pada `pengujian/lexer/uji_lexer.ts`.
