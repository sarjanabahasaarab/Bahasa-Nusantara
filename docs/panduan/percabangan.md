# Percabangan Kondisional (`jika`)

Percabangan memungkinkan program mengambil alur keputusan yang berbeda berdasarkan hasil evaluasi kondisi logis.

---

## 1. Struktur Dasar: `jika` ... `maka` ... `akhir`

Bentuk paling sederhana dari percabangan adalah memeriksa sebuah kondisi:

```nusantara
program CekLulus

mulai
    nilai : bilangan = 80

    jika nilai >= 75 maka
        tampilkan("Selamat, Anda Lulus!")
    akhir
selesai
```

---

## 2. Percabangan Biner: `selain`

Jika kondisi bernilai `salah`, blok di dalam `selain` akan dieksekusi:

```nusantara
program CekKelulusan

mulai
    nilai : bilangan = 65

    jika nilai >= 75 maka
        tampilkan("Lulus")
    selain
        tampilkan("Belum Lulus, silakan ikuti remedial")
    akhir
selesai
```

---

## 3. Percabangan Bertingkat Banyak

Untuk mengevaluasi beberapa kondisi berurutan, tulis percabangan `jika` bersarang di dalam blok `selain`:

```nusantara
program KategoriNilai

mulai
    skor : bilangan = 85

    jika skor >= 90 maka
        tampilkan("Predikat A")
    selain
        jika skor >= 80 maka
            tampilkan("Predikat B")
        selain
            jika skor >= 70 maka
                tampilkan("Predikat C")
            selain
                tampilkan("Predikat D")
            akhir
        akhir
    akhir
selesai
```

*(Catatan: Contoh ini menunjukkan rancangan sintaks resmi dan belum dapat dijalankan sebelum alat eksekusi NUSANTARA tersedia).*
