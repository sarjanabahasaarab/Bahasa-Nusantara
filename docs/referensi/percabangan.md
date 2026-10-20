# Referensi Sintaks: Percabangan Kondisional (`jika`)

Dokumen ini merupakan panduan referensi resmi bagi pengembang dan pengguna bahasa **NUSANTARA** mengenai konstruksi percabangan kondisional (*conditional branching*) yang diimplementasikan pada **Phase 11 (Milestone v0.11.0)**.

---

## 1. Pengantar Percabangan

Percabangan adalah mekanisme kontrol alur yang memungkinkan program mengeksekusi kumpulan instruksi tertentu berdasarkan hasil evaluasi suatu ekspresi logika (*boolean condition*).

Dalam bahasa NUSANTARA, percabangan dirancang dengan kata-kata leksikal bahasa Indonesia yang intuitif, formal, dan tidak ambigu:
- `jika`: Membuka struktur percabangan dan mendahului ekspresi kondisi.
- `maka`: Menandai akhir ekspresi kondisi dan awal blok perintah saat kondisi bernilai `benar`.
- `selain`: (Opsional) Membuka blok perintah alternatif saat kondisi bernilai `salah`.
- `akhir`: Menutup blok percabangan `jika` secara berpasangan.

---

## 2. Sintaks Dasar `jika` (Tanpa `selain`)

Bentuk paling sederhana hanya mengeksekusi perintah jika kondisi bernilai `benar`:

```nusantara
jika kondisi maka
    // instruksi dijalankan jika kondisi bernilai benar
akhir
```

### Contoh:
```nusantara
program PemeriksaanNilai
mulai
    nilai : bilangan = 80

    jika nilai >= 75 maka
        tampilkan("Selamat, Anda memenuhi kriteria kelulusan!")
    akhir
selesai
```

Jika `nilai` bernilai kurang dari 75, blok di antara `maka` dan `akhir` dilewati sepenuhnya tanpa galat.

---

## 3. Sintaks `jika` dengan Alternatif `selain`

Ketika program memerlukan dua jalur keputusan terpisah:

```nusantara
jika kondisi maka
    // instruksi jika benar
selain
    // instruksi jika salah
akhir
```

### Contoh:
```nusantara
program Kelulusan
mulai
    nilai : bilangan = 65

    jika nilai >= 75 maka
        tampilkan("Lulus")
    selain
        tampilkan("Belum lulus")
    akhir
selesai
```

---

## 4. Peran dan Kewajiban Kata Kunci `akhir`

Setiap pembuka `jika` **wajib** memiliki pasangan penutup `akhir`. Aturan ini menjamin kejelasan batas blok kode (*block scoping*) tanpa bergantung pada kurung kurawal `{}` atau kedalaman indentasi whitespace.

```nusantara
// BENAR:
jika statusAktif maka
    tampilkan("Aktif")
akhir

// SALAH: Lupa menutup dengan 'akhir'
jika statusAktif maka
    tampilkan("Aktif")
selesai // KESALAHAN: Diharapkan 'akhir' sebelum penutup program 'selesai'
```

---

## 5. Keharusan Kondisi Bertipe `logika`

Kondisi percabangan pada NUSANTARA **harus** menghasilkan nilai bertipe `logika` (`benar` atau `salah`). Bahasa NUSANTARA menganut sistem pengetikan statis yang kuat (*strong typing*) dan **tidak melakukan konversi implisit (truthy/falsy)** dari angka atau teks.

| Tipe Ekspresi Kondisi | Keabsahan | Penjelasan |
| :--- | :--- | :--- |
| `logika` (`benar` / `salah`) | **Sah** | Tipe resmi untuk kondisi percabangan |
| `bilangan` (misal `1` atau `0`) | **Ditolak** | Menghasilkan galat tipe saat kompilasi/analisis |
| `teks` (misal `"halo"` atau `""`) | **Ditolak** | Menghasilkan galat tipe saat kompilasi/analisis |
| `desimal` (misal `0.0`) | **Ditolak** | Menghasilkan galat tipe saat kompilasi/analisis |

---

## 6. Percabangan Bertingkat (*Nested Branching*)

Percabangan dapat disusun secara bersarang di dalam blok `maka` maupun blok `selain` untuk menguji beberapa kondisi berurutan:

```nusantara
program KategoriNilai
mulai
    skor : bilangan = 85

    jika skor >= 90 maka
        tampilkan("Predikat A - Sangat Baik")
    selain
        jika skor >= 80 maka
            tampilkan("Predikat B - Baik")
        selain
            jika skor >= 70 maka
                tampilkan("Predikat C - Cukup")
            selain
                tampilkan("Predikat D - Perlu Perbaikan")
            akhir
        akhir
    akhir
selesai
```

> **Catatan Struktur:** Setiap blok `jika` yang dibuka memiliki penutup `akhir`-nya masing-masing.

---

## 7. Penggunaan Operator dalam Kondisi

Ekspresi kondisi dapat memanfaatkan seluruh operator yang diresmikan pada Phase 10:
- **Operator Perbandingan:** `==`, `!=`, `<`, `<=`, `>`, `>=`
- **Operator Logika:** `dan`, `atau`, `tidak`
- **Tanda Kurung:** `(...)` untuk mengatur prioritas evaluasi

### Contoh Kondisi Majemuk:
```nusantara
program SeleksiBeasiswa
mulai
    ipk : desimal = 3.75
    penghasilan : bilangan = 2500000
    prestasiNasional : logika = benar

    jika (ipk >= 3.50 dan penghasilan <= 3000000) atau prestasiNasional maka
        tampilkan("Diterima sebagai penerima beasiswa")
    selain
        tampilkan("Belum memenuhi persyaratan beasiswa")
    akhir
selesai
```

### Evaluasi Hubung Singkat (*Short-Circuit*):
Pada kondisi dengan operator `dan` serta `atau`, NUSANTARA menjamin evaluasi hubung singkat:
- Jika operan kiri `dan` bernilai `salah`, operan kanan **tidak dievaluasi**.
- Jika operan kiri `atau` bernilai `benar`, operan kanan **tidak dievaluasi**.

---

## 8. Ruang Lingkup Variabel (*Scope*) dalam Percabangan

1. **Variabel Lokal:** Variabel yang dideklarasikan di dalam blok `maka` atau `selain` hanya dapat diakses di dalam blok tersebut.
2. **Mutasi Variabel Luar:** Penugasan ulang (`variabel = nilai`) terhadap variabel yang telah dideklarasikan di luar blok percabangan akan memutasi nilai variabel tersebut secara permanen.

```nusantara
program UjiLingkup
mulai
    status : teks = "Awal"

    jika benar maka
        status = "Berubah" // Memperbarui variabel luar
        angkaLokal : bilangan = 100
        tampilkan(angkaLokal) // Sah
    akhir

    tampilkan(status) // Mencetak "Berubah"
    // tampilkan(angkaLokal) // KESALAHAN: angkaLokal tidak dikenal di luar blok jika
selesai
```

---

## 9. Kesalahan Umum & Diagnostik Galat

| Kesalahan | Contoh Kasus | Pesan Diagnostik Resmi |
| :--- | :--- | :--- |
| **Kondisi Bukan Logika** | `jika 100 maka ...` | `Kesalahan tipe: Kondisi percabangan 'jika' harus menghasilkan nilai logika, tetapi ditemukan 'bilangan'.` |
| **Lupa Kata Kunci `maka`** | `jika nilai >= 75 \n ...` | `Kesalahan sintaks: diharapkan kata kunci 'maka' setelah kondisi jika.` |
| **Lupa Kata Kunci `akhir`** | `jika nilai >= 75 maka ... selesai` | `Kesalahan sintaks: Blok percabangan 'jika' belum ditutup. Diharapkan kata kunci 'akhir' sebelum 'selesai'.` |
| **Kondisi Kosong** | `jika maka ... akhir` | `Kesalahan sintaks: Kondisi percabangan 'jika' tidak boleh kosong.` |
| **`selain` Tanpa `jika`** | `selain ...` | `Kesalahan sintaks: Kata kunci 'selain' tidak pada tempatnya di luar percabangan 'jika'.` |
| **Variabel Tak Dikenal** | `jika variabelBelumAda maka` | `Kesalahan tipe: Variabel 'variabelBelumAda' pada kondisi percabangan belum dideklarasikan.` |
