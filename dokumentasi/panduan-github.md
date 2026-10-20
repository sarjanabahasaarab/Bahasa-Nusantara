# Panduan Mengunggah Phase 1 ke GitHub

Dokumen ini adalah instruksi operasional resmi bagi maintainer dan kontributor untuk menginisialisasi repositori Git dan menerbitkan rilis perdana **NUSANTARA v0.1.0 — Identitas & Fondasi** di GitHub.

---

## 1. Persiapan Repositori GitHub

1. Buka akun GitHub Anda.
2. Buat repositori baru (*New Repository*):
   - **Repository name:** `NUSANTARA` (atau `bahasa-nusantara`)
   - **Description:** `Bahasa Pemrograman 100% Bahasa Indonesia untuk Komputasi Modern dan Terbuka.`
   - **Visibility:** `Public`
   - **Initialize with:** Jangan centang README/License/Gitignore (karena berkas ini sudah kita siapkan lengkap di direktori proyek).

---

## 2. Inisialisasi Git Lokal & Tambah Berkas

Buka terminal pada direktori kerja proyek, lalu jalankan perintah berikut secara berurutan:

```bash
# 1. Inisialisasi Git jika belum ada
git init

# 2. Atur nama cabang default menjadi main
git branch -M main

# 3. Periksa status berkas
git status

# 4. Tambahkan seluruh berkas fondasi Phase 1
git add .

# 5. Buat komit pertama dengan pesan konvensi resmi
git commit -m "feat: fondasi awal bahasa NUSANTARA"
```

---

## 3. Hubungkan ke Remote GitHub & Dorong (Push)

Ganti `ORGANISASI_ATAU_USERNAME` dengan nama akun GitHub Anda:

```bash
# 6. Tambahkan remote origin
git remote add origin https://github.com/ORGANISASI_ATAU_USERNAME/NUSANTARA.git

# 7. Dorong cabang main ke GitHub
git push -u origin main
```

---

## 4. Membuat Cabang `develop`

Sesuai dengan tata kelola percabangan proyek di [KONTRIBUSI.md](../KONTRIBUSI.md), buat cabang `develop` untuk aktivitas pengembangan harian:

```bash
# Buat cabang develop dari main dan dorong ke GitHub
git checkout -b develop
git push -u origin develop
```

---

## 5. Membuat Tag Rilis `v0.1.0`

Buat *annotated tag* untuk menandai tonggak sejarah selesainya Phase 1:

```bash
# Pindah kembali ke cabang main
git checkout main

# Buat tag v0.1.0 dengan catatan rilis
git tag -a v0.1.0 -m "NUSANTARA v0.1.0 — Identitas & Fondasi"

# Dorong tag ke GitHub
git push origin v0.1.0
```

---

## 6. Menerbitkan GitHub Release

Setelah tag didorong, buat halaman rilis resmi pada antarmuka web GitHub:

1. Buka repositori Anda di peramban: `https://github.com/ORGANISASI_ATAU_USERNAME/NUSANTARA/releases`.
2. Klik tombol **Draft a new release**.
3. Pilih tag yang sudah didorong: `v0.1.0`.
4. Isi **Release title**:
   ```
   NUSANTARA v0.1.0 — Identitas & Fondasi
   ```
5. Isi **Release description** (salin teks berikut):
   ```markdown
   ## NUSANTARA v0.1.0 — Identitas & Fondasi

   Dengan bangga kami mengumumkan rilis perdana **NUSANTARA Phase 1 (v0.1.0)**!

   NUSANTARA adalah bahasa pemrograman 100% Bahasa Indonesia yang dirancang untuk berkembang menjadi bahasa pemrograman umum dari tingkat tinggi hingga sistem operasi **NusantaraOS**.

   ### 🌟 Sorotan Rilis Ini:
   - **Ekstensi Resmi:** Penetapan ekstensi berkas `.nusantara`.
   - **Dokumen NIP-0001:** Identitas resmi dan prinsip dasar bahasa.
   - **Contoh Sintaksis Awal:** 5 berkas acuan (`01_halo.nusantara`, `02_data.nusantara`, `03_kondisi.nusantara`, `04_perulangan.nusantara`, `05_fungsi.nusantara`).
   - **Arsitektur Kompilator:** Cetak biru saluran pipa kompilasi (Lexer -> Parser -> AST -> Semantik -> IR -> Optimizer -> Backend).
   - **Peta Jalan Strategis:** 36 fase pengembangan terencana hingga NusantaraOS.
   - **Tata Kelola Terbuka:** Pedoman kontribusi komunitas, lisensi terbuka MIT, dan kode etik.

   > ⚠️ **Catatan Status:** Rilis v0.1.0 adalah rilis fondasi spesifikasi. Kompilator biner masih dalam tahap pengembangan dan belum dirilis untuk eksekusi publik.

   Terima kasih kepada seluruh perintis dan komunitas teknologi Indonesia!
   ```
6. Pastikan opsi **Set as the latest release** tercentang.
7. Klik tombol hijau **Publish release**.
