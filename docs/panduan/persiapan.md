# Persiapan Lingkungan Pengembangan

Panduan ini membantu Anda mempersiapkan diri untuk mempelajari dan menulis kode sumber dalam bahasa **NUSANTARA**.

---

## 1. Pemilihan Editor Teks

Kode sumber NUSANTARA disimpan dalam berkas teks polos dengan pengkodean **UTF-8**. Anda dapat menggunakan penyunting teks apa pun yang Anda sukai:
- **Visual Studio Code**
- **Neovim / Vim**
- **Sublime Text**
- **Notepad++**

Pastikan editor Anda menyimpan berkas dengan format baris baru **LF (`\n`)** atau **CRLF (`\r\n`)** dan enkode UTF-8.

---

## 2. Membuat Berkas Ekstensi `.nusantara`

Buatlah sebuah berkas baru dengan ekstensi `.nusantara`, misalnya `halo.nusantara`.

```bash
# Contoh pembuatan berkas di lingkungan terminal:
touch halo.nusantara
```

---

## 3. Status Alat Eksekusi & Kompiler

> **Status Distribusi:** Repositori telah memiliki implementasi lexer, parser, interpreter, dan toolchain pada fase berikutnya. Keberadaan kode sumber harus dibedakan dari ketersediaan paket biner resmi yang siap dipasang. Ikuti petunjuk build dan CLI di dokumentasi pengembang serta status rilis pada [ROADMAP](../../ROADMAP.md). Jangan menganggap perintah CLI tersedia di PATH sebelum paket dipasang.
