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

> ⚠️ **Informasi Kesiapan Alat Kompilasi:**
> Saat ini, paket biner kompilator (*compiler executable*) untuk menjalankan berkas `.nusantara` **belum dirilis**.
>
> Pembangunan modul kompilasi dimulai dari **Phase 6 (Lexer)** dan **Phase 7 (Parser)**. Petunjuk instalasi paket biner resmi, penambahan ke PATH sistem, serta perintah eksekusi terminal (seperti `nusantara jalankan halo.nusantara`) akan diperbarui secara lengkap setelah perangkat lunak kompilator resmi tersedia.
