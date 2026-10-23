# Ekstensi VS Code Bahasa Pemrograman NUSANTARA

Ekstensi resmi Visual Studio Code untuk bahasa pemrograman **NUSANTARA** (`.nusantara`).

---

## Fitur Utama (Phase 20)

* **Penyorotan Sintaksis (Syntax Highlighting)**: Mendukung seluruh 21 kata kunci resmi, kata kunci modul, tipe data primitif & majemuk, string escape, komentar ganda (`//`), dan operator logika Bahasa Indonesia.
* **Diagnostik Real-Time**: Deteksi dini kesalahan sintaksis parser, galat sistem tipe, dan peringatan linter (`NUS-W001` s/d `NUS-W004`) secara langsung saat mengetik.
* **Penyelesaian Otomatis (Autocomplete)**:
  * Kata kunci resmi (`jika`, `selama`, `untuk`, `fungsi`, `kembalikan`, dll.).
  * Simbol lokal (variabel, konstanta, fungsi dengan snippet parameter).
  * Anggota modul pustaka standar (`teks.`, `matematika.`, `waktu.`, `koleksi.`, dll.).
* **Informasi Mengambang (Hover Tooltip)**: Penjelasan tipe data, parameter fungsi, dan dokumentasi modul pustaka standar resmi saat kursor diarahkan ke simbol.
* **Lompat ke Definisi (Go-to-Definition)**: Menelusuri deklarasi variabel lokal, fungsi, hingga simbol antar-berkas modul.
* **Simbol Dokumen & Outline**: Navigasi struktur hierarki fungsi dan variabel pada panel samping editor (Breadcrumbs & Outline).

---

## Konfigurasi

Pastikan biner `nusantara` telah terpasang pada `PATH` sistem Anda:

```json
{
  "nusantara.lsp.path": "nusantara",
  "nusantara.lsp.trace.server": "off"
}
```
