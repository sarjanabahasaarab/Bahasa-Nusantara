# Rangkaian Pengujian Spesifikasi Konstitusi (Phase 2)

Folder ini berisi kasus uji spesifikasi untuk menguji kepatuhan terhadap [Konstitusi Bahasa NUSANTARA](../../dokumentasi/KONSTITUSI-BAHASA.md).

---

## Cakupan Pengujian

1. **[program-valid.nusantara](program-valid.nusantara):**
   Contoh kode sumber lengkap yang mematuhi 100% tata bahasa, aturan penamaan, pembatasan blok, dan deklarasi tipe data yang disahkan pada Konstitusi Phase 2.

2. **[program-tidak-valid.md](program-tidak-valid.md):**
   Katalog kasus uji negatif yang memuat contoh kode tidak valid yang melanggar spesifikasi konstitusi (misalnya tanpa `mulai`, tanpa `selesai`, variabel menggunakan kata kunci, blok `jika` tidak ditutup dengan `akhir`, dll.) beserta ekspektasi galat diagnostiknya.

---

## Status Eksekusi

Pada **Phase 2**, seluruh pengujian dalam folder ini diperiksa secara analitis dan manual terhadap konsistensi dokumen, bukan melalui eksekusi biner kompilator (yang baru akan dibangun pada Phase 6 dan 7).
