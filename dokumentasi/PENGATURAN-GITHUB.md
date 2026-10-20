# Panduan Manual Pengaturan Repositori GitHub NUSANTARA

Dokumen ini adalah instruksi panduan langkah demi langkah bagi administrator dan maintainer untuk mengonfigurasi repositori GitHub resmi bahasa **NUSANTARA**.

> ⚠️ **Catatan Penting:** Pengaturan di bawah ini adalah **panduan konfigurasi manual** yang harus diterapkan oleh pemilik repositori pada antarmuka web GitHub. Membuat dokumen ini tidak secara otomatis mengaktifkan fitur-fitur tersebut di GitHub.

---

## 1. Mengaktifkan Fitur Issues & Discussions

1. Buka repositori di GitHub, klik tab **Settings**.
2. Gulir ke bawah menuju bagian **Features**.
3. Centang opsi **Issues** untuk mengizinkan pelaporan kutu dan usulan fitur.
4. *(Opsional / Direkomendasikan)* Centang opsi **Discussions** untuk wadah tanya jawab santai dan obrolan komunitas tanpa mengotori issue tracker.

---

## 2. Mengaktifkan Template Issue & Pull Request

1. Repositori NUSANTARA telah memuat templat resmi pada direktori `.github/ISSUE_TEMPLATE/` (`bug.md`, `fitur.md`, `dokumentasi.md`, `pertanyaan.md`) dan `.github/PULL_REQUEST_TEMPLATE.md`.
2. Di tab **Settings** > **General** > **Features** > **Issues**, klik tombol **Set up templates** untuk memverifikasi bahwa GitHub telah mendeteksi keempat templat tersebut.

---

## 3. Perlindungan Cabang Utama (*Branch Protection Rules*)

Untuk mencegah komit langsung yang dapat merusak kode di cabang `main` dan `develop`:

1. Di tab **Settings**, pilih menu sisi kiri **Branches**.
2. Klik tombol **Add branch ruleset** atau **Add rule**.
3. Pada **Branch name pattern**, masukkan `main`.
4. Aktifkan proteksi:
   - Centang **Require a pull request before merging**.
   - Centang **Require approvals** (tetapkan minimal 1 persetujuan Reviewer).
   - Centang **Dismiss stale pull request approvals when new commits are pushed**.
   - Centang **Require status checks to pass before merging** (pilih verifikasi CI `periksa_fondasi`).
   - Centang **Do not allow bypassing the above settings** (berlaku untuk admin dan maintainer).
5. Ulangi aturan serupa untuk cabang `develop`.

---

## 4. Pengaturan Hak Akses Tim (*Collaborators & Teams*)

1. Di tab **Settings**, pilih menu **Collaborators and teams** (atau **Collaborators**).
2. Tambahkan anggota sesuai peran di [TATA-KELOLA.md](../TATA-KELOLA.md):
   - **Triage:** Untuk memilah dan memberi label pada Issue.
   - **Write:** Untuk Reviewer dan Kontributor aktif (membuat branch dan PR internal).
   - **Maintain:** Untuk Pemelihara Utama yang berwenang menggabungkan PR yang telah disetujui.
   - **Admin:** Khusus pendiri atau administrator organisasi.

---

## 5. Mengaktifkan Pelaporan Keamanan Privat (*Security Settings*)

1. Buka tab **Security** di bagian atas repositori.
2. Pada menu kiri, pilih **Vulnerability reporting**.
3. Klik tombol **Enable private vulnerability reporting** agar peneliti keamanan dapat mengirim laporan secara rahasia tanpa membuka issue publik.
4. Pastikan **Dependabot alerts** dan **Secret scanning** aktif untuk mendeteksi dependensi rentan dan kebocoran kredensial secara otomatis.

---

## 6. Prosedur Penandaan Tag & Penerbitan GitHub Release

Setelah rilis disetujui oleh tim maintainer:
1. Pastikan seluruh berkas telah digabungkan ke cabang `main`.
2. Buat tag lokal beranotasi:
   ```bash
   git tag -a v0.3.0 -m "NUSANTARA v0.3.0 — Lisensi & Tata Kelola"
   git push origin v0.3.0
   ```
3. Buka menu **Releases** di GitHub, klik **Draft a new release**.
4. Pilih tag `v0.3.0`.
5. Salin format teks dari [TEMPLATE-RELEASE.md](TEMPLATE-RELEASE.md) dan isi catatan rilisnya.
6. Klik **Publish release**.
