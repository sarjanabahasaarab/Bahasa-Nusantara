# Panduan Kontribusi Bahasa Pemrograman NUSANTARA

Terima kasih atas minat Anda untuk berkontribusi dalam membangun dan mengembangkan **NUSANTARA**, bahasa pemrograman 100% Bahasa Indonesia untuk masa depan komputasi terbuka di bawah perlindungan [Apache License 2.0](LISENSI).

---

## 1. Alur Kontribusi Bertahap

Untuk menjaga kualitas dan ketertiban rekayasa piranti lunak, setiap kontributor diharapkan mengikuti 10 langkah kontribusi berikut:

1. **Membaca Dokumentasi Dasar:**
   Pahami filosofi bahasa di [prinsip-desain.md](dokumentasi/prinsip-desain.md) dan ketentuan dasar di [KONSTITUSI-BAHASA.md](dokumentasi/KONSTITUSI-BAHASA.md).
2. **Memeriksa Issue yang Ada:**
   Sebelum memulai pekerjaan, periksa daftar issue di GitHub untuk memastikan topik atau galat tersebut belum pernah dilaporkan atau sedang dikerjakan orang lain.
3. **Membuat Issue Diskusi:**
   Jika menemukan kutu (*bug*) atau ingin mengusulkan perbaikan, buat Issue baru menggunakan template yang tersedia di `.github/ISSUE_TEMPLATE/`.
4. **Membuat Fork atau Branch Kerja:**
   Buat salinan repositori (*fork*) dan buat cabang kerja baru dari `develop`. **Dilarang keras melakukan push langsung ke cabang `main`**.
5. **Membuat Perubahan Kecil & Terfokus:**
   Hindari PR raksasa yang menggabungkan banyak hal tak terkait sekaligus. Buat perubahan atomik yang mudah ditinjau.
6. **Menambahkan Pengujian:**
   Sertakan skenario uji coba di folder `pengujian/` untuk membuktikan bahwa perubahan Anda berfungsi dan tidak memicu regresi.
7. **Memperbarui Dokumentasi:**
   Jika perubahan menyangkut perilaku, sintaksis, atau panduan baru, perbarui berkas dokumentasi terkait di folder `dokumentasi/`.
8. **Mengirim Pull Request:**
   Buka Pull Request menuju cabang `develop` dengan mengisi formulir lengkap di [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
9. **Menunggu Peninjauan (*Review*):**
   Reviewer dan maintainer akan memeriksa kode Anda. Diskusikan masukan dengan pikiran terbuka dan profesional.
10. **Menyempurnakan Masukan Reviewer:**
    Lakukan perbaikan sesuai hasil tinjauan hingga PR disetujui (*Approved*) dan digabungkan (*Merged*).

---

## 2. Standar Penamaan Cabang Kerja (*Branching Model*)

Gunakan pola penamaan cabang kerja berikut:

| Pola Cabang | Kegunaan | Contoh |
|---|---|---|
| `fitur/nama-fitur` | Menambahkan fitur atau spesifikasi bahasa baru | `fitur/sintaks-perulangan-untuk` |
| `perbaikan/nama-perbaikan` | Memperbaiki galat spesifikasi atau kesalahan teknis | `perbaikan/koreksi-operator-modulo` |
| `dokumentasi/nama-dokumen` | Menambah atau memperbaiki dokumen panduan | `dokumentasi/panduan-tipe-data` |
| `eksperimen/nama-eksperimen` | Menguji coba gagasan baru yang bersifat eksploratif | `eksperimen/pola-pencocokan-ragam` |

> ⚠️ **Aturan Ketat:** Seluruh kontributor tidak diizinkan melakukan komit langsung ke cabang `main`. Seluruh penggabungan kode wajib melalui mekanisme Pull Request dan persetujuan minimal satu Reviewer/Maintainer.

---

## 3. Nusantara Improvement Proposal (NIP)

Untuk usulan perubahan besar yang mencakup:
- Penambahan atau penghapusan kata kunci bahasa.
- Perubahan tata bahasa (*grammar*) atau semantik bahasa.
- Desain arsitektur baru kompilator, runtime, atau format berkas mandiri.

Wajib diajukan melalui dokumen **NIP (Nusantara Improvement Proposal)** dengan menyalin format dari [dokumentasi/NIP/TEMPLATE-NIP.md](dokumentasi/NIP/TEMPLATE-NIP.md) dan mengikuti tahapan pada [dokumentasi/NIP/PROSES-NIP.md](dokumentasi/NIP/PROSES-NIP.md).

---

## 4. Standar Pesan Komit Git

Pesan komit harus jelas, tertib, dan mencerminkan perubahan yang dilakukan:

Format: `<tipe>: <penjelasan singkat>`

Contoh tipe:
- `feat:` Penambahan fitur atau spesifikasi baru
- `fix:` Perbaikan galat dokumentasi atau tata bahasa
- `docs:` Pembaruan dokumentasi atau proposal NIP
- `test:` Penambahan kasus uji spesifikasi
- `refactor:` Restrukturisasi tata letak tanpa mengubah perilaku
- `chore:` Pemeliharaan perkakas, skrip verifikasi, atau konfigurasi Git

---

## 5. Menjalankan Uji Kepatuhan Pra-Pengajuan

Sebelum mengirim Pull Request, jalankan skrip verifikasi repositori:

```bash
# Uji kelengkapan seluruh dokumen resmi
node skrip/periksa_fondasi.js
```

Seluruh pengujian harus berstatus **LULUS** sebelum penggabungan kode disetujui.
