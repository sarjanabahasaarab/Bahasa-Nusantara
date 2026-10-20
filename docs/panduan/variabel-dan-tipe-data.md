# Variabel & Tipe Data Dasar

Variabel adalah wadah penyimpanan dalam memori untuk menyimpan nilai yang dapat berubah selama program berjalan, sedangkan konstanta `tetap` menyimpan nilai kekal yang tidak boleh diubah.

---

## 1. Deklarasi Variabel

Bahasa NUSANTARA menyediakan dua gaya penulisan deklarasi variabel yang sama-sama sah menurut tata bahasa:

### A. Gaya Ringkas (Idiomatik)
```nusantara
nama : teks = "Ahmad"
umur : bilangan = 20
```

### B. Gaya Eksplisit (Menggunakan kata kunci `variabel`)
```nusantara
variabel nama : teks = "Ahmad"
variabel umur : bilangan = 20
```

Kedua cara di atas sah. Gaya ringkas lebih sering digunakan karena lebih padat dan bersih.

---

## 2. Nilai Tetap / Konstanta (`tetap`)

Gunakan kata kunci `tetap` untuk mendeklarasikan nilai yang tidak boleh diubah setelah diinisialisasi:

```nusantara
tetap PHI : desimal = 3.14159
tetap KODE_NEGARA : teks = "ID"

// PHI = 3.15 // KESALAHAN: Pengidentifikasi tetap tidak dapat ditugaskan ulang!
```

---

## 3. Tipe Data Dasar Pokok

| Nama Tipe | Contoh Nilai | Keterangan |
|---|---|---|
| `teks` | `"Halo"`, `"Nusantara 2026"` | Rangkaian karakter teks UTF-8 diapit tanda kutip ganda |
| `bilangan` | `0`, `42`, `-10` | Bilangan bulat positif atau negatif |
| `desimal` | `3.14`, `0.75`, `100.0` | Bilangan pecahan bertitik desimal |
| `logika` | `benar`, `salah` | Nilai kebenaran boolean |
| `kosong` | `kosong` | Penanda ketiadaan nilai (*null*) |

---

## 4. Penugasan Ulang Nilai (*Assignment*)

Setelah sebuah variabel dideklarasikan, Anda dapat mengubah nilainya menggunakan operator penugasan sama dengan (`=`):

```nusantara
program UjiPenugasan

mulai
    skor : bilangan = 10
    tampilkan(skor) // Skor awal: 10

    skor = 25 // Mengubah nilai skor menjadi 25
    tampilkan(skor)
selesai
```

*(Catatan: Contoh ini menunjukkan rancangan sintaks resmi dan belum dapat dijalankan sebelum alat eksekusi NUSANTARA tersedia).*
