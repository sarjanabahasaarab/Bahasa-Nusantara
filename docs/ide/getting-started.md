# Panduan Memulai IDE NUSANTARA (Phase 26)

Selamat datang di **NUSANTARA IDE & Developer Tools Foundation (v0.26.0)**.
NUSANTARA IDE dirancang sebagai lingkungan pengembangan terpadu cross-platform yang menghubungkan langsung antarmuka editor modern dengan seluruh toolchain resmi Bahasa NUSANTARA (Lexer, Parser, AST, Sistem Tipe, Language Server, Formatter, Debugger, Profiler, dan CLI).

---

## 1. Arsitektur Komponen IDE

IDE NUSANTARA terdiri dari subsistem terpadu:
- **Project Explorer**: Manajemen berkas hirarkis, pembuatan berkas/folder baru, ganti nama, dan penghapusan aman.
- **Source Editor**: Penyuntingan multi-tab dengan nomor baris, gutter breakpoint interaktif, pelacak kursor (baris & kolom), dan status kotor/tersimpan.
- **Lexer-Based Syntax Highlighting**: Pewarnaan kode sumber real-time menggunakan `Lexer` resmi NUSANTARA (kata kunci, literal bilangan & string, komentar, operator, dan pemisah).
- **Language Server (LSP Bridge)**: Diagnostik real-time, autocomplete kontekstual, hover tooltip dokumentasi, go-to-definition, dan format dokumen.
- **Output & Process Runner**: Pelari program terkontrol (Run, Debug, Profiler) yang menangkap `stdout`, `stderr`, kode keluar, dan durasi eksekusi tanpa proses zombie.
- **Integrated Terminal**: Terminal shell terintegrasi dengan akses ke CLI resmi `nusantara`, perintah `ls`, `cat`, `bantuan`, dan `bersih`.
- **Debugger Panel**: Panel penelusur dengan tumpukan panggilan (call stack), inspeksi variabel lokal, dan evaluator ekspresi dinamis.
- **Profiler Panel**: Visualisasi waktu eksekusi total, pemanggilan fungsi, dan alokasi memori runtime.
- **Command Palette & Shortcuts**: Palet perintah terpadu (`Ctrl+Shift+P`) dan pintasan keyboard standar industri.
- **Settings & Lokalisasi**: Pengaturan tema warna (Dark/Light/System) dan dukungan dwibahasa penuh (Bahasa Indonesia & English).

---

## 2. Struktur Proyek Standar

IDE membuka ruang kerja proyek yang memuat:
```
proyek/
├── nusantara.toml                 # Manifest konfigurasi proyek & dependensi
├── src/
│   ├── utama.nusantara            # Titik masuk program utama
│   └── matematika_ekstra.nusantara # Modul pustaka lokal
├── pengujian/
│   └── utama_test.nusantara       # Pengujian unit otomatis
└── docs/
    └── panduan.md                 # Dokumentasi pengembang
```

---

## 3. Pintasan Keyboard Utama

| Pintasan | Perintah | Deskripsi |
| :--- | :--- | :--- |
| `F5` | Jalankan Program | Eksekusi berkas aktif via Interpreter NUSANTARA |
| `Shift + F5` | Mulai Debugging | Jalankan program dalam mode penelusuran interaktif |
| `F9` | Pasang/Cabut Breakpoint | Toggle titik henti pada baris kursor saat ini |
| `Ctrl + S` | Simpan Berkas | Simpan berkas aktif (otomatis format jika diaktifkan) |
| `Ctrl + Shift + S` | Simpan Semua | Simpan seluruh tab yang sedang dibuka |
| `Shift + Alt + F` | Format Dokumen | Merapikan kode sumber dengan `FormatterNUSANTARA` |
| `Ctrl + Shift + P` | Command Palette | Buka modal pencarian seluruh perintah IDE |
| `Ctrl + F` | Cari & Ganti | Cari dan ganti teks di dalam tab editor aktif |
| `Ctrl + Shift + F` | Cari di Semua Berkas | Pencarian teks terindeks di seluruh file proyek |
