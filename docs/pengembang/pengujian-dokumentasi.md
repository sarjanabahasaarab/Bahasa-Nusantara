# Pengujian Integritas & Konsistensi Dokumentasi

Untuk memastikan tidak ada berkas spesifikasi yang hilang atau tautan yang rusak, repositori menyediakan perkakas pengujian berbasis Node.js.

---

## 1. Menjalankan Skrip Pemeriksaan Fondasi

Gunakan skrip `skrip/periksa_fondasi.js` untuk memvalidasi keberadaan seluruh berkas resmi:

```bash
# Menjalankan pemeriksaan audit kelengkapan berkas:
node skrip/periksa_fondasi.js
```

### Kriteria Kelulusan Skrip:
- Seluruh berkas wajib terdeteksi di sistem berkas lokal.
- Jumlah berkas yang gagal (*missing files*) wajib bernilai `0`.
- Skrip mengembalikan status keluar `0` (*exit code 0*).

---

## 2. Pemeriksaan Tautan Internal & Sintaksis

Sebelum mengirimkan Pull Request dokumentasi baru:
1. Periksa seluruh tautan relatif antardokumen (misal: `../panduan/program-pertama.md`) dan pastikan berkas tujuan benar-benar ada.
2. Jalankan linter TypeScript dan kompilasi portal antarmuka:
   ```bash
   npm run lint
   npm run build
   ```
3. Pastikan tidak ada karakter tersembunyi yang merusak rendering Markdown.
