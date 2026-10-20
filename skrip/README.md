# Skrip Pemeliharaan Repositori NUSANTARA

Folder ini memuat skrip otomasi untuk memverifikasi keutuhan berkas dan mendukung alur integrasi berkelanjutan (*CI/CD*).

---

## Daftar Skrip

1. **`periksa_fondasi.js`**
   - Memverifikasi kelengkapan seluruh berkas wajib pada **Phase 1: Identitas & Fondasi**.
   - Memeriksa keberadaan berkas root (`README.md`, `LISENSI`, `KONTRIBUSI.md`, `KODE-ETIK.md`, `PERUBAHAN.md`, `ROADMAP.md`, `.gitignore`).
   - Memeriksa keberadaan dokumen `NIP-0001.md`, dokumen arsitektur, panduan GitHub, dan kelima berkas contoh kode `.nusantara`.
   - Menghasilkan laporan evaluasi bersih ke konsol.

---

## Cara Menjalankan

```bash
node skrip/periksa_fondasi.js
```
