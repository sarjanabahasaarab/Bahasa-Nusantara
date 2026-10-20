# Struktur Program Dasar NUSANTARA

Setiap berkas kode sumber `.nusantara` memiliki susunan kerangka dasar yang seragam dan tertata rapi.

---

## 1. Kerangka Dasar Berkas

Sebuah berkas program NUSANTARA yang lengkap memiliki struktur umum sebagai berikut:

```nusantara
// 1. Komentar opsional di awal berkas
// Berkas: aplikasi.nusantara

// 2. Deklarasi fungsi-fungsi pembantu (jika ada)
fungsi kaliDua(angka : bilangan) : bilangan

mulai
    kembalikan angka * 2
selesai

// 3. Program utama yang wajib ada
program AplikasiUtama

mulai
    // Pernyataan-pernyataan instruksi eksekusi
    hasil : bilangan = kaliDua(10)
    tampilkan(hasil)
selesai
```

*(Catatan: Contoh ini menunjukkan rancangan sintaks resmi dan belum dapat dijalankan sebelum alat eksekusi NUSANTARA tersedia).*

---

## 2. Aturan-Aturan Penting

1. **Satu Berkas = Satu Program Utama:** Dalam satu berkas berekstensi `.nusantara`, hanya boleh terdapat tepat **satu** deklarasi `program NamaProgram`.
2. **Batas Blok Eksplisit:** Blok eksekusi diawali kata kunci `mulai` dan diakhiri oleh `selesai`.
3. **Pemisah Pernyataan:** Pernyataan dipisahkan secara alami oleh **ganti baris (*newline*)**. Anda tidak perlu menuliskan tanda titik koma (`;`) di ujung setiap baris.
4. **Indentasi:** Sangat dianjurkan menggunakan indentasi 4 spasi untuk setiap baris instruksi di dalam blok demi kemudahan pembacaan.
