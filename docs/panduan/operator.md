# Operator & Evaluasi Ekspresi

Operator adalah simbol atau kata leksikal yang digunakan untuk memanipulasi nilai atau variabel dalam sebuah ekspresi.

---

## 1. Operator Aritmetika

Digunakan untuk melakukan kalkulasi matematis pada tipe `bilangan` dan `desimal`:

```nusantara
program HitungAritmetika

mulai
    a : bilangan = 15
    b : bilangan = 4

    tambah : bilangan = a + b   // 19
    kurang : bilangan = a - b   // 11
    kali   : bilangan = a * b   // 60
    bagi   : desimal  = a / b   // 3.75
    sisa   : bilangan = a % b   // 3 (Sisa bagi / modulo)
selesai
```

*(Catatan: Operator `+` juga dapat digunakan untuk menggabungkan dua `teks`, misalnya: `"Halo " + "Nusantara"`).*

---

## 2. Operator Perbandingan (Relasional)

Membandingkan dua nilai dan menghasilkan nilai bertipe `logika` (`benar` atau `salah`):

- `==` : Sama dengan
- `!=` : Tidak sama dengan
- `>`  : Lebih besar dari
- `<`  : Lebih kecil dari
- `>=` : Lebih besar atau sama dengan
- `<=` : Lebih kecil atau sama dengan

---

## 3. Operator Logika Berbahasa Indonesia

Bahasa NUSANTARA menggunakan kata Bahasa Indonesia asli sebagai operator logika:

- **`dan` (Konjungsi):** Menghasilkan `benar` jika kedua operan bernilai `benar`.
- **`atau` (Disjungsi):** Menghasilkan `benar` jika salah satu atau kedua operan bernilai `benar`.
- **`tidak` (Negasi):** Membalikkan nilai kebenaran.

```nusantara
program UjiLogika

mulai
    usia : bilangan = 18
    punyaKTP : logika = benar

    bolehMemilih : logika = (usia >= 17) dan punyaKTP
    tampilkan(bolehMemilih) // benar
selesai
```

*(Catatan: Contoh ini menunjukkan rancangan sintaks resmi dan belum dapat dijalankan sebelum alat eksekusi NUSANTARA tersedia).*
