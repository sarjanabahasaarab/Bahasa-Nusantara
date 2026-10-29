# Panduan Generator Aplikasi CLI NUSANTARA

Dokumentasi Resmi Bahasa Pemrograman NUSANTARA  
Target Versi: `v0.33.0` (Phase 33)

---

## 1. Pengenalan

**NUSANTARA CLI Application Generator** (`nusantara new`) adalah alat resmi untuk menghasilkan kerangka proyek bahasa NUSANTARA yang modular, aman, terstandarisasi, dan siap pakai. Generator ini mengotomatiskan pembuatan struktur folder, file sumber entry point, konfigurasi manifest (`nusantara.toml` & `nusantara-project.json`), dan berkas pendukung tanpa mengharuskan pengembang menyusunnya secara manual dari nol.

---

## 2. Sintaks Perintah Utama

```bash
nusantara new <nama-proyek> [opsi...]
# atau alias dalam bahasa Indonesia
nusantara baru <nama-proyek> [opsi...]
```

### Opsi Perintah:
| Opsi | Keterangan | Nilai Bawaan |
|---|---|---|
| `--template, -t <id>` | Memilih id template kerangka proyek | `basic` |
| `--force, -f, --paksa` | Menimpa/menggunakan direktori yang sudah ada dan tidak kosong | `false` |
| `--deskripsi <teks>` | Keterangan deskripsi proyek untuk manifest | Nama template |
| `--penulis <teks>` | Nama pengembang atau organisasi pemilik | `Pengembang Nusantara` |
| `--no-interactive, --non-interaktif` | Mode CI/CD tanpa prompt interaktif | Aktif di CLI |
| `--json` | Keluaran hasil generator dalam format JSON | `false` |

---

## 3. Perintah Pendukung

### A. Melihat Daftar Template yang Tersedia
```bash
nusantara templates
# atau
nusantara template
```
Perintah ini mencantumkan seluruh template resmi, kategori, deskripsi, dan status ketersediaannya.

### B. Melihat Informasi Rinci Suatu Template
```bash
nusantara template info <id-template>
# contoh:
nusantara template info web
nusantara template info database
```
Menampilkan deskripsi lengkap, persyaratan runtime, daftar berkas yang akan dibuat, petunjuk menjalankan, dan batasan teknis.

### C. Memeriksa Integritas dan Validitas Proyek
```bash
nusantara check
# atau memeriksa folder tertentu
nusantara check ./aplikasi-saya
```
Memvalidasi apakah direktori memiliki `nusantara.toml` / `nusantara-project.json`, berkas entrypoint (`src/utama.nusantara`), dan seluruh file `.nusantara` bebas dari kesalahan sintaks.

---

## 4. Contoh Penggunaan Nyata

### Membuat Aplikasi Dasar (Basic)
```bash
nusantara new halo-nusantara
cd halo-nusantara
nusantara check
nusantara jalankan src/utama.nusantara
```

### Membuat Aplikasi Web Framework (Phase 30)
```bash
nusantara new portal-berita --template web --deskripsi "Portal Web Komunitas"
cd portal-berita
nusantara layani src/utama.nusantara --port 3000
```

### Membuat Layanan REST API (Phase 30 & 31)
```bash
nusantara new layanan-katalog --template api
cd layanan-katalog
nusantara jalankan src/utama.nusantara
```

### Membuat Aplikasi Basis Data & ORM (Phase 29 & 32)
```bash
nusantara new inventaris-gudang --template database
cd inventaris-gudang
nusantara db status
nusantara db migrasi
nusantara jalankan src/utama.nusantara
```

---

## 5. Keamanan & Mekanisme Atomik

1. **Proteksi Path Traversal**: Nama proyek diperiksa secara ketat dan dilarang mengandung karakter traversal seperti `..`, `/`, `\`, serta nama tereservasi sistem operasi (`CON`, `PRN`, `AUX`, `NUL`).
2. **Pencegahan Penimpaan Tak Sengaja**: Jika folder tujuan sudah ada dan berisi berkas, proses pembuatan langsung ditolak kecuali flag `--force` diberikan secara eksplisit.
3. **Pembersihan Parsial (Rollback)**: Jika terjadi kegagalan sistem saat menulis berkas di tengah jalan, berkas baru yang sempat dibuat akan dibersihkan secara otomatis demi mencegah keadaan repositori yang korup.
4. **Renderer Aman**: Template hanya merender placeholder yang masuk dalam daftar putih (*whitelist*), tanpa mengevaluasi kode JavaScript atau shell berbahaya.
