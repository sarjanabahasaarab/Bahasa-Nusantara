# Standar Pesan Kesalahan Diagnostik Bahasa NUSANTARA

Dokumen ini mendefinisikan standar formulasi dan taksonomi pesan kesalahan (diagnostik galat) yang wajib diadopsi oleh kompilator, penganalisis leksikal, dan interpreter bahasa **NUSANTARA**.

Status: **[RANCANGAN SPESIFIKASI] — Acuan format diagnostik (disahkan pada Phase 6 & Phase 18).**

> ⚠️ **Catatan Penting Fase 2:** Seluruh format pesan kesalahan dalam dokumen ini adalah **rancangan spesifikasi masa depan**. Kompilator biner belum dibuat pada Phase 2, sehingga sistem belum menghasilkan pesan-pesan ini secara otomatis saat ini.

---

## 1. Filosofi Diagnostik Bahasa Indonesia

Pesan diagnostik kompilator NUSANTARA dirancang dengan 3 pilar:
1. **Bahasa Indonesia Baku & Santun:** Tidak menggunakan singkatan asing yang membingungkan pemula.
2. **Presisi Lokasi:** Menunjukkan berkas, nomor baris, dan nomor kolom kejadian galat secara akurat.
3. **Konstruktivitas:** Tidak hanya menyebutkan apa yang salah, melainkan juga menyarankan perbaikan yang benar.

---

## 2. Format Baku Pesan Diagnostik

```
[Kategori Kesalahan] pada berkas: [nama_berkas], baris [X], kolom [Y]:
    [Kutipan baris kode yang memicu galat]
    ^^^^^ [Penunjuk posisi token bermasalah]
Penyebab: [Penjelasan deskriptif dalam Bahasa Indonesia]
Saran:    [Rekomendasi perbaikan kode]
```

---

## 3. Contoh Rancangan Pesan Kesalahan Berdasarkan Kategori

### A. Kesalahan Sintaksis (*Syntax Error*)
Terjadi ketika urutan token melanggar tata bahasa formal NUSANTARA.

**Contoh Kasus 1: Kata Pembuka Ganda atau Tak Sesuai**
```
Kesalahan Sintaks pada berkas: program.nusantara, baris 3, kolom 1:
    mulai
    ^^^^^
Penyebab: Ditemukan kata kunci 'mulai' yang tidak sesuai pada posisi ini.
Saran:    Blok program utama sudah dibuka sebelumnya. Hapus kata kunci 'mulai' yang berlebih.
```

**Contoh Kasus 2: Blok Tidak Ditutup**
```
Kesalahan Sintaks pada berkas: kondisi.nusantara, baris 10, kolom 1:
    selesai
    ^^^^^^^
Penyebab: Blok percabangan 'jika' pada baris 4 belum ditutup dengan kata 'akhir'.
Saran:    Tambahkan kata kunci 'akhir' sebelum menutup program dengan 'selesai'.
```

### B. Kesalahan Tipe (*Type Error*)
Terjadi ketika operasi diterapkan pada tipe data yang tidak cocok tanpa konversi eksplisit.

**Contoh Kasus: Ketidakcocokan Operasi Aritmatika**
```
Kesalahan Tipe pada berkas: kalkulasi.nusantara, baris 5, kolom 13:
    total = nilai + "10"
                    ^^^^
Penyebab: Nilai 'teks' ("10") tidak dapat digunakan dalam operasi penjumlahan numerik dengan 'bilangan' tanpa konversi eksplisit.
Saran:    Gunakan konversi numerik atau pastikan kedua operan bertipe sepadan.
```

### C. Kesalahan Pengidentifikasi (*Name / Scope Error*)
Terjadi saat simbol variabel, fungsi, atau tetapan dipanggil tanpa deklarasi sebelumnya.

**Contoh Kasus: Variabel Belum Dikenal**
```
Kesalahan Nama pada berkas: salam.nusantara, baris 4, kolom 15:
    tampilkan(nama)
              ^^^^
Penyebab: Pengidentifikasi 'nama' belum dideklarasikan di dalam cakupan blok ini.
Saran:    Deklarasikan variabel terlebih dahulu, contoh: 'nama : teks = "Budi"'.
```

### D. Kesalahan Immutability (Konstanta Tetap)
```
Kesalahan Penugasan pada berkas: fisika.nusantara, baris 6, kolom 5:
    PHI = 3.14
    ^^^
Penyebab: Pengidentifikasi 'PHI' dideklarasikan sebagai nilai 'tetap' (konstanta) dan tidak dapat diubah kembali.
Saran:    Jika nilai harus dapat berubah, gunakan deklarasi 'variabel', bukan 'tetap'.
```
