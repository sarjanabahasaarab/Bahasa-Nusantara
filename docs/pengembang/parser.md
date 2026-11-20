# Arsitektur & Dokumentasi Teknis Parser NUSANTARA

Dokumen ini menjelaskan rancangan, arsitektur, cara kerja, dan antarmuka pemrograman (API) dari modul **Penganalisis Sintaksis (Parser) & Abstract Syntax Tree (AST)** bahasa **NUSANTARA** yang dibangun pada **Phase 7 (Milestone v0.7.0)**.

---

## 1. Peran Parser dalam Saluran Pipa Kompilasi

**Parser (*Syntactic Analyzer*)** adalah komponen lapis kedua dari saluran pipa kompilasi NUSANTARA. Parser menerima aliran token (*TokenStream*) dari Lexer dan mengonstruksinya menjadi struktur pohon data hirarkis yang dinamakan **Pohon Sintaksis Abstrak (*Abstract Syntax Tree* / AST)**.

```text
Aliran Token (dari Lexer)
         │
         ▼
 ┌───────────────┐
 │    Parser     │  <-- (Phase 7: Parser Penurunan Rekursif)
 └───────────────┘
         │
         ▼
Pohon Sintaksis (AST)
         │
         ▼
 ┌───────────────┐
 │  Type Checker │  <-- (Phase 9 & 10: Pemeriksa Tipe & Operator)
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  Interpreter  │  <-- (Phase 8, 9, 10: Mesin Eksekusi Runtime)
 └───────────────┘
```

---

## 2. Metodologi Parsing: Recursive Descent Parsing

Parser NUSANTARA mengadopsi algoritma **Recursive Descent Parsing** (Penurunan Rekursif) dengan kemampuan *lookahead* token 1 langkah (LL(1)).

Keunggulan metode ini:
1. **Deterministik & Mudah Ditelusuri:** Setiap aturan tata bahasa (EBNF) dipetakan 1:1 ke satu metode parsing khusus (misal: `parsePernyataan()`, `parseEkspresi()`).
2. **Penanganan Galat Ramah (*Error Recovery*):** Menghasilkan pesan galat kontekstual dalam bahasa Indonesia saat terjadi kesalahan sintaks, serta mendukung mode sinkronisasi batas pernyataan.
3. **Presedensi Operator Hirarkis:** Menggunakan teknik *Precedence Climbing* bertingkat untuk mengevaluasi operator sesuai prioritas matematika dan logika tanpa ambiguitas gramatika.

---

## 3. Node AST Utama

Node AST NUSANTARA didefinisikan secara kuat (*strongly typed*) di `src/parser/ast.ts`:

- `NodeProgram`: Titik awal akar program memuat nama program dan daftar deklarasi/pernyataan dalam blok utama.
- `NodeDeklarasiVariabel`: Deklarasi `nama : tipe = nilai` atau `tetap nama : tipe = nilai`.
- `NodePenugasan`: Pernyataan perubahan nilai `target = nilai`.
- `NodeBlok`: Sekumpulan pernyataan yang dieksekusi secara berurutan.
- `NodeJika`: Percabangan kondisi `jika ... maka ... selain jika ... selain ... selesai`.
- `NodeUntuk`: Perulangan rentang `untuk i dari 1 sampai 10 lakukan ... selesai`.
- `NodeSelama`: Perulangan kondisi `selama kondisi lakukan ... selesai`.
- `NodeFungsi`: Deklarasi fungsi modular `fungsi nama(param: tipe) -> tipe ... selesai`.
- `NodePanggilanFungsi`: Pemanggilan fungsi dan subrutin bawaan `tampilkan(arg)`.
- `NodeEkspresiBiner`: Operasi biner `kiri [op] kanan`.
- `NodeEkspresiUnari`: Operasi unari `[op] argumen` (misal `-x` atau `tidak aktif`).
- `NodeLiteral`: Nilai konstan literal (`bilangan`, `desimal`, `teks`, `karakter`, `logika`, `kosong`).

---

## 4. Antarmuka Pemrograman (API)

API yang digunakan parser saat ini:

```typescript
import { Lexer } from '../../src/lexer/lexer';
import { Parser } from '../../src/parser/parser';

const sumber = `
program Hitung
mulai
    a : bilangan = 10
    tampilkan(a * 2)
selesai
`;

const lexer = new Lexer(sumber, { sertakanBarisBaru: false });
const hasilLexer = lexer.tokenisasi();

const parser = new Parser(hasilLexer.token);
const program = parser.parse();
const galat = parser.dapatkanDaftarGalat();

if (galat.length > 0) {
  for (const item of galat) {
    console.error(item.message);
  }
} else {
  console.log('AST berhasil dibuat:', program);
}
```

Parser menerima teks sumber, array token, `TokenStream`, atau instance `Lexer`.
Ketika menerima array token, `TokenStream` memastikan aliran memiliki satu sentinel
`EOF`; token setelah sentinel pertama tidak dikonsumsi. Metode `parse()`
mengembalikan `NodeProgram`, sedangkan diagnostik parser dibaca melalui
`dapatkanDaftarGalat()`. Setiap objek galat yang sama hanya dicatat satu kali.

---

## 5. Pengujian & Keandalan

Rangkaian pengujian modul Parser berada pada `pengujian/parser/uji_parser.ts`, memvalidasi:
- Pembentukan node program valid
- Presedensi operator dan evaluasi tanda kurung
- Pernyataan deklarasi, penugasan, kontrol alur, fungsi
- Visualisasi pohon sintaksis melalui `ASTPrinter`
- Diagnostik galat sintaksis dalam Bahasa Indonesia
