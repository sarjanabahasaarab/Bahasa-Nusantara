# Referensi Sintaks: Sistem Perulangan NUSANTARA

Dokumen ini merupakan panduan referensi resmi bagi pengembang dan pengguna bahasa **NUSANTARA** mengenai konstruksi perulangan (*loops*) dan kendali alirannya yang diresmikan pada **Phase 12 (Milestone v0.12.0)**.

---

## 1. Pengantar Perulangan

Perulangan memungkinkan pengeksekusian sekumpulan instruksi secara berulang-ulang berdasarkan suatu kondisi logika atau rentang bilangan tertentu.

NUSANTARA menyediakan dua mekanisme perulangan pokok:
1. **`selama`:** Perulangan bersyarat (*conditional while loop*).
2. **`untuk`:** Perulangan rentang berpenghitung (*counted range loop*).

Keduanya ditutup secara eksplisit dengan kata kunci **`akhir`**.

---

## 2. Perulangan Bersyarat (`selama`)

Struktur `selama` mengevaluasi ekspresi kondisi sebelum setiap putaran iterasi. Instruksi di dalam tubuh perulangan akan terus dijalankan selama kondisi bernilai `benar`.

### Sintaksis Resmi:
```nusantara
selama kondisi lakukan
    // instruksi perulangan
akhir
```

### Ketentuan Semantik:
- **Tipe Kondisi:** Ekspresi kondisi wajib menghasilkan tipe data `logika` (`benar` / `salah`).
- **Evaluasi Awal:** Jika kondisi bernilai `salah` sejak awal, tubuh perulangan dilewati 0 kali tanpa galat.
- **Pembaruan Nilai:** Perubahan variabel di dalam tubuh perulangan akan terbaca pada pengujian kondisi putaran berikutnya.

### Contoh:
```nusantara
program HitungMaju
mulai
    angka : bilangan = 1

    selama angka <= 5 lakukan
        tampilkan("Iterasi ke-", angka)
        angka = angka + 1
    akhir
selesai
```

---

## 3. Perulangan Rentang Berpenghitung (`untuk`)

Struktur `untuk` mengiterasi variabel penghitung dari nilai awal hingga batas akhir yang ditentukan.

### Sintaksis Resmi:
```nusantara
untuk pengidentifikasi dari ekspresi_awal sampai ekspresi_akhir lakukan
    // instruksi perulangan
akhir
```

### Ketentuan Semantik:
- **Batas Inklusif:** Batas `sampai` bersifat **inklusif** (angka batas akhir ikut diproses dalam iterasi). Contoh `1 sampai 5` akan memproses nilai 1, 2, 3, 4, dan 5.
- **Tipe Data:** Variabel penghitung serta ekspresi batas (`dari` dan `sampai`) wajib bertipe data `bilangan` (bilangan bulat).
- **Cakupan Lingkup (*Scope*):** Variabel penghitung otomatis didefinisikan secara lokal di dalam blok perulangan dan tidak dapat diakses di luar blok `akhir`.
- **Rentang Kosong (*Empty Range*):** Jika nilai awal lebih besar dari batas akhir (misal `dari 5 sampai 1`), rentang dianggap kosong dan tubuh perulangan dilewati 0 kali tanpa memicu galat.

### Contoh:
```nusantara
program CetakTabelPerkalian
mulai
    faktor : bilangan = 7

    untuk i dari 1 sampai 10 lakukan
        tampilkan(faktor, "x", i, "=", faktor * i)
    akhir
selesai
```

---

## 4. Perintah Kendali Aliran: `hentikan` (*break*)

Kata kunci `hentikan` digunakan untuk keluar seketika dari perulangan terdekat yang sedang aktif dan melompat ke baris setelah penutup `akhir`.

### Contoh:
```nusantara
program CariAngka
mulai
    untuk i dari 1 sampai 100 lakukan
        jika i == 42 maka
            tampilkan("Angka 42 ditemukan, hentikan pencarian!")
            hentikan
        akhir
    akhir
    tampilkan("Pencarian selesai.")
selesai
```

---

## 5. Perintah Kendali Aliran: `lanjutkan` (*continue*)

Kata kunci `lanjutkan` digunakan untuk melompati sisa instruksi pada putaran iterasi saat ini dan langsung berpindah ke putaran berikutnya.

- Pada perulangan `untuk`, variabel penghitung akan dinaikkan (*increment*) sebelum putaran berikutnya dimulai.
- Pada perulangan `selama`, alur program langsung memeriksa kembali ekspresi kondisi.

### Contoh:
```nusantara
program CetakGanjil
mulai
    untuk angka dari 1 sampai 10 lakukan
        jika angka % 2 == 0 maka
            lanjutkan // Lewati angka genap
        akhir

        tampilkan("Ganjil:", angka)
    akhir
selesai
```

---

## 6. Perulangan Bertingkat (*Nested Loops*)

Perulangan dapat diletakkan di dalam perulangan lainnya untuk memproses struktur matriks atau multi-dimensi.

```nusantara
program Matriks
mulai
    untuk baris dari 1 sampai 3 lakukan
        untuk kolom dari 1 sampai 2 lakukan
            tampilkan("Baris:", baris, "Kolom:", kolom)
        akhir
    akhir
selesai
```

> **Aturan Kendali Bersarang:** Instruksi `hentikan` atau `lanjutkan` hanya memengaruhi blok perulangan terdalam di mana instruksi tersebut berada. Perulangan luar akan tetap berlanjut sesuai alurnya.

---

## 7. Kombinasi Perulangan dan Percabangan

Percabangan `jika` dapat digunakan secara leluasa di dalam perulangan `untuk` dan `selama`, begitu pula sebaliknya:

```nusantara
program KlasifikasiAngka
mulai
    untuk angka dari 1 sampai 5 lakukan
        jika angka % 2 == 0 maka
            tampilkan(angka, "adalah Genap")
        selain
            tampilkan(angka, "adalah Ganjil")
        akhir
    akhir
selesai
```

---

## 8. Perlindungan Perulangan Tak Terbatas (*Infinite Loop Protection*)

Untuk melindungi kestabilan lingkungan pengembangan dan mencegah penguncian memori (*system hang*), runtime Interpreter NUSANTARA menyertakan batas keamanan iterasi (`maksimalIterasiPerulangan`). Jika suatu perulangan berjalan melebihi batas yang dikonfigurasikan (misal akibat lupa menaikkan nilai penghitung pada `selama`), Interpreter akan menghentikan eksekusi dengan aman:

```text
Kesalahan runtime pada baris 4 kolom 5:
Batas maksimal iterasi perulangan terlampaui. Kemungkinan terjadi perulangan tak terbatas (infinite loop).
```

---

## 9. Kesalahan Umum & Diagnostik Galat

| Kesalahan | Contoh Kasus | Pesan Diagnostik Resmi |
| :--- | :--- | :--- |
| **Kondisi `selama` Bukan Logika** | `selama 100 lakukan ...` | `Kesalahan tipe: Kondisi perulangan 'selama' harus menghasilkan nilai logika, tetapi ditemukan 'bilangan'.` |
| **Rentang `untuk` Bukan Bilangan** | `untuk i dari "a" sampai 10 ...` | `Kesalahan tipe: Batas awal perulangan 'untuk' ('dari') harus bertipe bilangan bulat, tetapi ditemukan 'teks'.` |
| **Lupa Kata Kunci `lakukan`** | `selama aktif \n ...` | `Kesalahan sintaks: diharapkan kata kunci 'lakukan' setelah kondisi selama.` |
| **Lupa Kata Kunci `akhir`** | `untuk i dari 1 sampai 5 lakukan ... selesai` | `Kesalahan sintaks: Blok perulangan 'untuk' belum ditutup. Diharapkan kata kunci 'akhir' sebelum 'selesai'.` |
| **`hentikan` di Luar Loop** | `hentikan` di tingkat utama | `Kesalahan tipe: Instruksi 'hentikan' hanya dapat digunakan di dalam blok perulangan.` |
| **`lanjutkan` di Luar Loop** | `lanjutkan` di tingkat utama | `Kesalahan tipe: Instruksi 'lanjutkan' hanya dapat digunakan di dalam blok perulangan.` |
| **`lakukan` Nyasar** | `lakukan` di luar loop | `Kesalahan sintaks: Kata kunci 'lakukan' tidak pada tempatnya di luar perulangan.` |
