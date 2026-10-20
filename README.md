# NUSANTARA

> **Bahasa Pemrograman 100% Bahasa Indonesia untuk Komputasi Modern, Terbuka, dan Berkelanjutan.**

[![Status](https://img.shields.io/badge/status-fase_14:_struktur_data_selesai-blue.svg)](ROADMAP.md)
[![Versi](https://img.shields.io/badge/versi-v0.14.0-emerald.svg)](PERUBAHAN.md)
[![Lisensi](https://img.shields.io/badge/lisensi-Apache_2.0-blue.svg)](LISENSI)
[![Tata Bahasa](https://img.shields.io/badge/grammar-EBNF_ISO--14977-purple.svg)](dokumentasi/GRAMMAR-EBNF.md)
[![Lexer](https://img.shields.io/badge/lexer-lulus_100%25-teal.svg)](docs/pengembang/lexer.md)
[![Parser](https://img.shields.io/badge/parser-lulus_100%25-cyan.svg)](docs/pengembang/parser.md)
[![Interpreter](https://img.shields.io/badge/interpreter-eksekusi_nyata-green.svg)](docs/pengembang/interpreter.md)
[![Type System](https://img.shields.io/badge/type_system-strict_&_safe-purple.svg)](docs/pengembang/type-system.md)
[![Operator](https://img.shields.io/badge/operators-8_precedence_levels-orange.svg)](docs/pengembang/operator.md)
[![Perulangan](https://img.shields.io/badge/loops-selama_&_untuk-emerald.svg)](docs/pengembang/perulangan.md)
[![Fungsi](https://img.shields.io/badge/functions-fungsi_&_rekursi-indigo.svg)](docs/pengembang/fungsi.md)
[![Struktur Data](https://img.shields.io/badge/data_structures-daftar_&_peta-rose.svg)](docs/pengembang/struktur-data.md)

---

## 1. Tentang NUSANTARA

**NUSANTARA** adalah bahasa pemrograman serba guna (*general-purpose programming language*) yang dirancang dari nol menggunakan 100% tata bahasa, istilah teknis, dan leksikon Bahasa Indonesia.

NUSANTARA bukan sekadar penerjemah sintaksis bahasa asing, melainkan ikhtiar mandiri dalam rekayasa perangkat lunak untuk menghadirkan kedaulatan teknologi, kejelasan berpikir logis bagi masyarakat Indonesia, serta fondasi komputasi yang dapat berevolusi hingga ke tingkat sistem operasi (**NusantaraOS**).

- **Ekstensi Berkas Resmi:** `.nusantara`
- **Lisensi:** [Apache License 2.0](LISENSI)
- **Status Saat Ini:** **Phase 14: Struktur Data (Daftar & Peta) Selesai (Milestone v0.14.0).**
- **Dokumentasi Struktur Data:** [docs/pengembang/struktur-data.md](docs/pengembang/struktur-data.md) & [docs/referensi/struktur-data.md](docs/referensi/struktur-data.md)
- **Dokumentasi Fungsi:** [docs/pengembang/fungsi.md](docs/pengembang/fungsi.md) & [docs/referensi/fungsi.md](docs/referensi/fungsi.md)
- **Dokumentasi Perulangan:** [docs/pengembang/perulangan.md](docs/pengembang/perulangan.md) & [docs/referensi/perulangan.md](docs/referensi/perulangan.md)
- **Dokumentasi Percabangan:** [docs/pengembang/percabangan.md](docs/pengembang/percabangan.md) & [docs/referensi/percabangan.md](docs/referensi/percabangan.md)
- **Dokumentasi Operator:** [docs/pengembang/operator.md](docs/pengembang/operator.md) & [docs/referensi/operator.md](docs/referensi/operator.md)
- **Dokumentasi Sistem Tipe:** [docs/pengembang/type-system.md](docs/pengembang/type-system.md)
- **Dokumentasi Interpreter:** [docs/pengembang/interpreter.md](docs/pengembang/interpreter.md)
- **Dokumentasi Parser:** [docs/pengembang/parser.md](docs/pengembang/parser.md)
- **Dokumentasi Lexer:** [docs/pengembang/lexer.md](docs/pengembang/lexer.md)
- **Pusat Buku Panduan:** [docs/README.md](docs/README.md) & [Indeks Lengkap](docs/indeks.md)
- **Tata Bahasa Formal:** [GRAMMAR-EBNF.md](dokumentasi/GRAMMAR-EBNF.md)

---

## 2. Saluran Pipa Kompilasi (*Compiler Pipeline*)

Pembangunan arsitektur mesin inti berjalan secara berjenjang:

```text
Source Code (.nusantara)
         │
         ▼
 ┌───────────────┐
 │     Lexer     │  <-- [SELESAI DI PHASE 6 (v0.6.0)]
 └───────────────┘
         │
         ▼
   Rangkaian Token (TokenStream)
         │
         ▼
 ┌───────────────┐
 │    Parser     │  <-- [SELESAI DI PHASE 7 (v0.7.0)]
 └───────────────┘
         │
         ▼
 Pohon Sintaksis Abstrak (AST)
         │
         ▼
 ┌───────────────┐
 │ Type Checker  │  <-- [SELESAI DI PHASE 9 (v0.9.0)]
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │   Operator    │  <-- [SELESAI DI PHASE 10 (v0.10.0)]
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  Percabangan  │  <-- [SELESAI DI PHASE 11 (v0.11.0)]
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  Perulangan   │  <-- [SELESAI DI PHASE 12 (v0.12.0)]
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  Interpreter  │  <-- [SELESAI DI PHASE 8 (v0.8.0)]
 └───────────────┘
         │
         ▼
 Keluaran Eksekusi Program (Output)
```

---

## 3. Menjalankan Pengujian Lengkap

```bash
npm run test:lexer        # 21 Uji modul leksikal
npm run test:parser       # 11 Uji modul sintaksis dan pohon AST
npm run test:interpreter  # 15 Uji eksekusi runtime program nyata
npm run test:tipe         # 12 Uji sistem tipe dan type checker statis
npm test                  # Audit menyeluruh repositori dan seluruh unit test
```

---

## 4. Status Proyek Saat Ini

```
[✓] Phase 1: Identitas & Fondasi NUSANTARA (v0.1.0)
[✓] Phase 2: Konstitusi Bahasa NUSANTARA (v0.2.0)
[✓] Phase 3: Lisensi & Tata Kelola NUSANTARA (v0.3.0)
[✓] Phase 4: Spesifikasi Sintaks NUSANTARA (v0.4.0)
[✓] Phase 5: Dokumentasi Awal & Buku Panduan (v0.5.0)
[✓] Phase 6: Lexer (Penganalisis Leksikal) (v0.6.0)
[✓] Phase 7: Parser (Penganalisis Sintaksis & AST) (v0.7.0)
[✓] Phase 8: Interpreter (Penerjemah Eksekusi AST) (v0.8.0)
[✓] Phase 9: Variabel & Tipe Data Lanjutan (v0.9.0)    <-- Fase Selesai
[ ] Phase 10: Operator & Ekspresi Lanjutan             <-- Target Berikutnya
...
[ ] Phase 36: NUSANTARA System & NusantaraOS
```

---

## 5. Lisensi

Proyek NUSANTARA dilindungi di bawah [Apache License 2.0](LISENSI).
