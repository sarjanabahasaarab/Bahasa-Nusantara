# Panduan Pengembang: Arsitektur Language Server NUSANTARA (Phase 20)
**Versi Target:** `v0.20.0`

Dokumen ini menjelaskan arsitektur internal, siklus hidup dokumen, sistem caching, dan integrasi komponen kompilator pada **NUSANTARA Language Server**.

---

## 1. Arsitektur Berlapis

NUSANTARA Language Server memisahkan antarmuka komunikasi protokol LSP dari mesin inti kompilator melalui pembagian tanggung jawab yang ketat:

```
Editor / IDE Client (VS Code, Neovim)
        │
        ▼ (JSON-RPC 2.0 via Stdio)
┌─────────────────────────────────────────────────────────────┐
│  src/language-server/protocol/ (Types & Frame Parser)       │
├─────────────────────────────────────────────────────────────┤
│  src/language-server/server.ts (ServerBahasaNUSANTARA Core) │
├───────────────────────────────┬─────────────────────────────┤
│  documents/ (ManajerDokumen)  │  services/ (Layanan LSP)    │
│  - DokumenTeks In-Memory      │  - LayananDiagnostik        │
│  - Line Offsets & Versioning  │  - LayananKompleksi         │
│  - Multi-Level Cache          │  - LayananHover             │
│                               │  - LayananDefinisi          │
│                               │  - LayananSimbol            │
└───────────────────────────────┴─────────────────────────────┘
        │
        ▼ (Menggunakan Komponen Kompilator Asli)
┌─────────────────────────────────────────────────────────────┐
│  src/lexer/         │ Tokenizer & Perekam Komentar Sumber   │
│  src/parser/        │ AST Program, Fungsi & Pernyataan      │
│  src/tipe/          │ Pemeriksa Tipe & Simbol Semantik      │
│  src/toolchain/     │ Linter Statis (NUS-W001 s/d W004)     │
│  src/stdlib/        │ Katalog 8 Modul Pustaka Standar Resmi │
│  src/diagnostik/    │ Mesin Diagnostik & Visual Caret ^^^^  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Manajemen Dokumen & Invalidation Cache

Untuk menjamin performa tinggi dan responsivitas editor:
1. **Penyimpanan Dalam Memori (`DokumenTeks`)**:
   Setiap berkas yang dibuka melalui `textDocument/didOpen` disimpan di memori `ManajerDokumen` lengkap dengan prapemetaan indeks karakter awal setiap baris (`barisOffset`).
2. **Proteksi Versi (`Version Guard`)**:
   Pembaruan melalui `textDocument/didChange` memeriksa versi dokumen (`version`). Pembaruan dengan versi lebih rendah dari versi dokumen saat ini ditolak untuk mencegah kondisi balapan (*race condition*).
3. **Invalidasi Cache Otomatis**:
   Ketika isi dokumen berubah:
   * `astCache` dikosongkan.
   * `galatParserCache` dikosongkan.
   * `diagnostikCache` dikosongkan.
   * `simbolCache` dikosongkan.

---

## 3. Penanganan Galat & Ketahanan Server (*Fault Tolerance*)

Language Server dirancang agar **tidak pernah crash** (*unhandled exception*) saat melayani editor:
* Setiap panggilan permintaan (`tanganiPermintaan`) dibungkus dalam blok proteksi `try / catch`.
* Jika terjadi galat internal atau parsing gagal, server mengembalikan objek galat resmi JSON-RPC (`InternalError`, `InvalidParams`, `MethodNotFound`).
* Log internal diarahkan ke `stderr` melalui fungsi `pencatatLog`, mencegah polusi pada saluran `stdout` yang dapat memutus jabat tangan JSON-RPC editor.
