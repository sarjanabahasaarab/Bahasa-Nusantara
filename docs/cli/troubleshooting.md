# Panduan Pemecahan Masalah CLI & Generator NUSANTARA

Dokumentasi Resmi Bahasa Pemrograman NUSANTARA  
Target Versi: `v0.33.0` (Phase 33)

---

## 1. Nama Proyek Tidak Valid

### Gejala:
Pesan galat:
`[✗ GAGAL] Nama proyek '...' tidak memenuhi konvensi pengidentifikasi proyek NUSANTARA.`  
atau  
`Nama proyek merupakan nama tereservasi sistem (OS/reserved name).`

### Penyebab:
- Menggunakan huruf kapital, spasi, atau karakter khusus (`@`, `$`, `#`, `!`).
- Menggunakan path traversal (`../`, `./`, `/`).
- Menggunakan nama reserved DOS/Windows (`con`, `prn`, `aux`, `nul`, `com1-9`, `lpt1-9`).
- Menggunakan nama paket sistem (`nusantara`, `node_modules`).

### Solusi:
Gunakan hanya huruf kecil, angka, tanda minus (`-`), atau garis bawah (`_`). Awali dengan huruf atau angka.  
*Contoh valid*: `nusantara new aplikasi-saya`, `nusantara new web_toko_online`.

---

## 2. Direktori Sudah Ada dan Tidak Kosong

### Gejala:
`[✗ GAGAL] Direktori target '...' sudah ada dan berisi berkas. Gunakan nama proyek lain atau tambahkan opsi '--force'.`

### Penyebab:
Generator secara baku melindungi berkas pengguna agar tidak tertimpa secara diam-diam (*silent overwrite protection*).

### Solusi:
- Pilihan 1: Pilih nama proyek lain atau hapus direktori lama terlebih dahulu.
- Pilihan 2: Jika Anda yakin ingin menimpa berkas, gunakan bendera `--force` atau `-f`:
  ```bash
  nusantara new nama-proyek --force
  ```

---

## 3. Template Tidak Ditemukan

### Gejala:
`[✗ GAGAL] Template 'xyz' tidak dikenal. Template yang tersedia: basic, library, web, api, database, console.`

### Penyebab:
ID template yang dimasukkan keliru atau salah ketik.

### Solusi:
Periksa daftar template resmi yang tersedia:
```bash
nusantara templates
```
Lalu pilih salah satu dari: `basic`, `library`, `web`, `api`, `database`, atau `console`.

---

## 4. Kegagalan Pemeriksaan Proyek (`nusantara check`)

### Gejala:
`Kesalahan: Direktori '...' bukan proyek NUSANTARA yang valid (berkas 'nusantara.toml' atau 'nusantara-project.json' tidak ditemukan).`

### Penyebab:
Perintah dijalankan di luar direktori proyek atau manifest proyek terhapus.

### Solusi:
- Pastikan berpindah ke folder proyek terlebih dahulu:
  ```bash
  cd nama-proyek
  nusantara check
  ```
- Pastikan berkas `nusantara.toml` ada di direktori akar proyek.

---

## 5. Entry Point Tidak Ditemukan

### Gejala:
`Kesalahan: Proyek tidak memiliki berkas entry point yang valid ('src/utama.nusantara' atau 'src/lib.nusantara').`

### Penyebab:
Berkas utama program di dalam folder `src/` terhapus atau dipindahkan ke lokasi lain.

### Solusi:
Pastikan terdapat berkas `src/utama.nusantara` (untuk aplikasi) atau `src/lib.nusantara` (untuk library).

---

## 6. Proyek Tidak Dapat Dijalankan

### Gejala:
Galat modul tidak ditemukan atau eksekusi terhenti.

### Solusi:
1. Pastikan versi compiler NUSANTARA minimal adalah `v0.33.0`:
   ```bash
   nusantara versi
   ```
2. Untuk proyek database: jalankan migrasi tabel terlebih dahulu sebelum menjalankan program:
   ```bash
   nusantara db migrasi
   nusantara jalankan src/utama.nusantara
   ```
3. Untuk proyek web: gunakan perintah `layani` atau `jalankan`:
   ```bash
   nusantara layani src/utama.nusantara --port 3000
   ```
