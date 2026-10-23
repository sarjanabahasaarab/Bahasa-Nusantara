# Referensi Pengguna: Language Server Protocol (LSP) NUSANTARA (Phase 20)
**Versi Target:** `v0.20.0`

Dokumen ini menjelaskan penggunaan resmi **NUSANTARA Language Server** untuk integrasi dengan editor teks dan IDE modern seperti Visual Studio Code, Neovim, Emacs, Sublime Text, dan Helix.

---

## 1. Menjalankan Language Server

NUSANTARA Language Server berkomunikasi menggunakan protokol standar JSON-RPC 2.0 melalui saluran Standard Input/Output (`stdio`).

Perintah baris perintah:

```bash
nusantara bahasa-server
```

atau menggunakan alias:

```bash
nusantara lsp
```

> **Catatan Keamanan Stdio:**
> Seluruh komunikasi JSON-RPC mengalir murni melalui `stdout` dengan header `Content-Length`. Seluruh pesan diagnostik dan log internal diarahkan secara ketat ke `stderr` sehingga tidak akan merusak parser editor klien.

---

## 2. Kemampuan Server (Server Capabilities)

Server mendukung kapabilitas standar LSP berikut:

| Kapabilitas LSP | Metode Permintaan / Notifikasi | Deskripsi |
|---|---|---|
| **Sinkronisasi Dokumen** | `textDocument/didOpen`<br>`textDocument/didChange`<br>`textDocument/didClose` | Sinkronisasi dokumen real-time di memori tanpa I/O berulang |
| **Diagnostik Real-Time** | `textDocument/publishDiagnostics` | Laporan galat sintaksis, sistem tipe, dan linter saat mengetik |
| **Penyelesaian Otomatis** | `textDocument/completion` | Rekomendasi kata kunci, simbol lokal, dan anggota modul |
| **Informasi Mengambang** | `textDocument/hover` | Penjelasan tipe, parameter, dan dokumentasi modul |
| **Lompat ke Definisi** | `textDocument/definition` | Navigasi deklarasi variabel lokal, fungsi, dan simbol lintas berkas |
| **Simbol Dokumen** | `textDocument/documentSymbol` | Pohon hierarki simbol untuk panel Outline & Breadcrumbs editor |
| **Pencarian Workspace** | `workspace/symbol` | Pencarian simbol di seluruh berkas proyek (`Ctrl+T` / `Cmd+T`) |

---

## 3. Fitur Utama

### A. Diagnostik Real-Time Ramah Bahasa Indonesia
Setiap perubahan teks langsung dianalisis oleh `Lexer`, `Parser`, `PemeriksaTipe`, dan `LinterNUSANTARA`. Galat ditampilkan dengan kode resmi Phase 18 (`NUS-xxx-yyy`) dan aturan linter Phase 19 (`NUS-W001` s/d `NUS-W004`).

### B. Autocomplete Cerdas
* **Akses Modul Titik (`.`)**: Mengetik `teks.` atau `matematika.` langsung menampilkan daftar fungsi dan konstanta anggota resmi beserta parameter snippet.
* **Kata Kunci & Tipe**: Otomatis menyarankan kata kunci bahasa seperti `fungsi`, `kembalikan`, `jika`, `untuk`, serta tipe data `bilangan`, `teks`, `desimal`.
* **Simbol Lokal**: Variabel lokal dan parameter fungsi otomatis disarankan sesuai lingkup aktif kursor.

### C. Lompat ke Definisi Lintas Berkas (*Cross-File*)
Saat menekan `F12` atau `Ctrl+Click` pada simbol yang diimpor dari modul lain (misal `util.hitungDiskon`), Language Server menelusuri berkas `utilitas.nusantara` dan langsung mengarahkan kursor ke deklarasi ekspor di berkas tujuan.

---

## 4. Integrasi dengan Visual Studio Code

1. Buka folder ekstensi di `editors/vscode/`.
2. Pastikan perintah `nusantara` dapat dijalankan dari terminal.
3. Buka proyek NUSANTARA apa pun, dan berkas `.nusantara` akan otomatis dikenali dan dilayani oleh Language Server.
