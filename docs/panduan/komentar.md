# Menulis Komentar Kode

Komentar adalah catatan atau penjelasan yang ditulis di dalam kode sumber untuk membantu manusia membaca kode. Komentar akan sepenuhnya diabaikan oleh kompiler dan tidak mempengaruhi jalannya program.

---

## 1. Komentar Satu Baris (`//`)

Bahasa NUSANTARA menggunakan tanda garis miring ganda (`//`) untuk menandai komentar satu baris. Semua karakter setelah tanda `//` hingga ujung baris dianggap sebagai komentar:

```nusantara
program ContohKomentar

mulai
    // Ini adalah komentar satu baris penuh
    nama : teks = "Budi" // Ini komentar di ujung pernyataan baris

    // tampilkan("Kode ini tidak akan dieksekusi")
    tampilkan(nama)
selesai
```

*(Catatan: Contoh ini menunjukkan rancangan sintaks resmi dan belum dapat dijalankan sebelum alat eksekusi NUSANTARA tersedia).*

---

## 2. Aturan Peletakan Komentar

- **Di Awal Baris:** Berguna untuk menjelaskan fungsi blok instruksi di bawahnya.
- **Di Akhir Baris Kode:** Berguna untuk memberi keterangan singkat pada variabel atau operasi tertentu.
- **Di Antara Baris Kosong:** Membantu membagi kode program menjadi beberapa bagian logika yang rapi.

> ℹ️ **Catatan Format Multibaris:** Format komentar multibaris (seperti `/* ... */`) saat ini berstatus keputusan terbuka (lihat [Katalog Keputusan Terbuka](../referensi/sintaks.md)) dan belum ditetapkan secara resmi pada spesifikasi inti.
