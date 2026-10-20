# Perulangan Iteratif (`untuk` & `selama`)

Perulangan digunakan untuk menjalankan sekumpulan instruksi berulang kali tanpa harus menulis ulang kode tersebut.

---

## 1. Perulangan Rentang Berpenghitung (`untuk`)

Digunakan ketika jumlah perulangan sudah diketahui secara pasti:

```nusantara
program HitungMaju

mulai
    // Mengulang dari angka 1 sampai 5 (inklusif: 1, 2, 3, 4, 5)
    untuk angka dari 1 sampai 5 lakukan
        tampilkan(angka)
    akhir
selesai
```

> 📌 **Catatan Batas:** Kata kunci `sampai` bersifat **inklusif**, artinya angka batas akhir (angka `5` pada contoh di atas) akan ikut diproses dalam perulangan.

---

## 2. Perulangan Bersyarat (`selama`)

Digunakan ketika perulangan bergantung pada kondisi kebenaran tertentu:

```nusantara
program HitungMundur

mulai
    variabel sisa : bilangan = 3

    selama sisa > 0 lakukan
        tampilkan(sisa)
        sisa = sisa - 1
    akhir

    tampilkan("Selesai!")
selesai
```

---

## 3. Mengontrol Aliran Perulangan

- **`hentikan` (*break*):** Menghentikan dan keluar dari blok perulangan secara paksa.
- **`lanjutkan` (*continue*):** Melompati sisa pernyataan pada iterasi saat ini dan langsung menuju iterasi berikutnya.

```nusantara
program ContohKontrol

mulai
    untuk i dari 1 sampai 10 lakukan
        jika i == 3 maka
            lanjutkan // Lewati angka 3
        akhir

        jika i == 7 maka
            hentikan // Berhenti saat mencapai angka 7
        akhir

        tampilkan(i)
    akhir
selesai
```

*(Catatan: Contoh ini menunjukkan rancangan sintaks resmi dan belum dapat dijalankan sebelum alat eksekusi NUSANTARA tersedia).*
