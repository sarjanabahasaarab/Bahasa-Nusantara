# Katalog Contoh Sintaksis Resmi Bahasa NUSANTARA

Dokumen ini menyajikan 10 contoh program acuan dalam berkas `.nusantara` lengkap dengan status kepatuhan spesifikasi dan kesiapan implementasi.

---

## 1. Halo Dunia
- **Status:** **[SESUAI SPESIFIKASI] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Program minimal penanda eksekusi instruksi keluaran standar.

```nusantara
program HaloDunia

mulai
    tampilkan("Halo Dunia!")
selesai
```

---

## 2. Deklarasi Variabel & Tipe Data
- **Status:** **[SESUAI SPESIFIKASI] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Deklarasi nilai dengan anotasi tipe statis eksplisit.

```nusantara
program UjiVariabel

mulai
    namaPengembang : teks = "Budi Santoso"
    umur : bilangan = 25
    tinggiBadan : desimal = 172.5
    statusAktif : logika = benar
    catatan : kosong = kosong

    tampilkan(namaPengembang)
selesai
```

---

## 3. Penugasan Ulang & Konstanta `tetap`
- **Status:** **[SESUAI SPESIFIKASI] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Membedakan mutabilitas wadah data dinamis vs konstanta kekal.

```nusantara
program UjiPenugasan

mulai
    variabel skor : bilangan = 50
    tetap SKOR_MAKSIMAL : bilangan = 100

    skor = 85 // Sah: variabel dinamis dapat ditugaskan ulang
    tampilkan(skor)
selesai
```

---

## 4. Operasi Matematika & Presedensi
- **Status:** **[SESUAI SPESIFIKASI] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Kalkulasi aritmetika terstruktur mematuhi urutan perkalian sebelum penjumlahan.

```nusantara
program HitungMatematika

mulai
    alas : desimal = 10.0
    tinggi : desimal = 5.0
    luas : desimal = (alas * tinggi) / 2.0

    sisaBagi : bilangan = 17 % 5
    tampilkan(luas)
selesai
```

---

## 5. Percabangan Kondisional
- **Status:** **[SESUAI SPESIFIKASI] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Percabangan biner menggunakan batas blok `jika` ... `maka` ... `selain` ... `akhir`.

```nusantara
program EvaluasiNilai

mulai
    nilai : bilangan = 78

    jika nilai >= 75 maka
        tampilkan("Status: Lulus Kompetensi")
    selain
        tampilkan("Status: Perlu Bimbingan Remedial")
    akhir
selesai
```

---

## 6. Perulangan Iteratif (`untuk` & `selama`)
- **Status:** **[SESUAI SPESIFIKASI] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Perulangan berpenghitung rentang inklusif dan perulangan berbasis kondisi.

```nusantara
program PerulanganHitung

mulai
    // Perulangan rentang inklusif (1 sampai 5)
    untuk i dari 1 sampai 5 lakukan
        tampilkan(i)
    akhir

    variabel pencacah : bilangan = 3
    selama pencacah > 0 lakukan
        tampilkan("Hitung mundur: ")
        pencacah = pencacah - 1
    akhir
selesai
```

---

## 7. Definisi & Pemanggilan Fungsi
- **Status:** **[SESUAI SPESIFIKASI] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Subrutin modular dengan parameter beranotasi tipe dan nilai kembali.

```nusantara
fungsi kali(a : bilangan, b : bilangan) : bilangan

mulai
    kembalikan a * b
selesai

program ProgramFungsi

mulai
    hasil : bilangan = kali(6, 7)
    tampilkan(hasil)
selesai
```

---

## 8. Struktur Data Koleksi `daftar`
- **Status:** **[RANCANGAN] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Usulan koleksi urutan terindeks (*list/array*).

```nusantara
program ContohDaftar

mulai
    // Sintaks usulan koleksi daftar (Phase 14)
    daftar angka = [10, 20, 30, 40]
    tampilkan(angka[0])
selesai
```

---

## 9. Struktur Data Asosiatif `peta`
- **Status:** **[RANCANGAN] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Usulan pasangan kunci dan nilai (*dictionary/hash map*).

```nusantara
program ContohPeta

mulai
    // Sintaks usulan koleksi peta (Phase 14)
    peta siswa = {"nama": "Ayu", "umur": 20}
    tampilkan(siswa["nama"])
selesai
```

---

## 10. Program Gabungan Lengkap
- **Status:** **[SESUAI SPESIFIKASI] — Belum Didukung Implementasi Kompiler**
- **Penjelasan:** Integrasi fungsi, perulangan, percabangan, dan konstanta dalam satu program.

```nusantara
fungsi hitungTotal(harga : bilangan, jumlah : bilangan) : bilangan

mulai
    kembalikan harga * jumlah
selesai

program KasirSederhana

mulai
    tetap DISKON_PERSEN : desimal = 0.1
    namaBarang : teks = "Buku Tulis"
    hargaSatuan : bilangan = 5000
    kuantitas : bilangan = 4

    totalKotor : bilangan = hitungTotal(hargaSatuan, kuantitas)

    jika totalKotor >= 20000 maka
        tampilkan("Mendapatkan Kupon Diskon!")
    selain
        tampilkan("Belanja lagi untuk mendapatkan diskon.")
    akhir

    untuk baris dari 1 sampai 3 lakukan
        tampilkan("Terima Kasih!")
    akhir
selesai
```
