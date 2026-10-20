# Referensi Resmi Sistem Operator Bahasa NUSANTARA

Dokumen ini mendokumentasikan taksonomi lengkap, tabel presedensi, aturan asosiativitas, kompatibilitas tipe data, dan semantik runtime dari seluruh operator dalam bahasa pemrograman **NUSANTARA** (Milestone v0.10.0 — Phase 10).

Status: **[DITETAPKAN & DIIMPLEMENTASIKAN] — Sesuai Spesifikasi Phase 4 dan Mesin Phase 6-10.**

---

## 1. Tabel 8 Tingkat Presedensi & Asosiativitas Resmi

Ketika sebuah ekspresi memuat lebih dari satu operator tanpa tanda kurung eksplisit, urutan evaluasi ditentukan secara kaku oleh tingkat presedensi berikut (Tingkat 1 memiliki prioritas tertinggi):

| Tingkat | Kategori Operator | Simbol / Kata Kunci | Arah Asosiasi | Contoh Ekspresi | Evaluasi Setara |
|---|---|---|---|---|---|
| **1 (Tertinggi)** | Pengelompokan | `( )` | Dari dalam ke luar | `(2 + 3) * 4` | `5 * 4` -> `20` |
| **2** | Negasi & Tanda Unari | `tidak`, `-` (unari) | Kanan ke Kiri | `tidak tidak benar`, `- - 5` | `tidak (tidak benar)`, `-(-5)` |
| **3** | Perkalian, Pembagian, Modulo | `*`, `/`, `%` | Kiri ke Kanan | `10 * 4 / 2 % 3` | `((10 * 4) / 2) % 3` |
| **4** | Penjumlahan & Pengurangan | `+`, `-` | Kiri ke Kanan | `10 - 4 - 2 + 1` | `(((10 - 4) - 2) + 1)` |
| **5** | Perbandingan Relasional | `<`, `<=`, `>`, `>=` | Kiri ke Kanan | `a < b` | `(a < b)` -> `logika` |
| **6** | Perbandingan Kesetaraan | `==`, `!=` | Kiri ke Kanan | `x == y` | `(x == y)` -> `logika` |
| **7** | Konjungsi Logika (AND) | `dan` | Kiri ke Kanan | `a dan b dan c` | `(a dan b) dan c` |
| **8 (Terendah)** | Disjungsi Logika (OR) | `atau` | Kiri ke Kanan | `a atau b atau c` | `(a atau b) atau c` |

*(Catatan Khusus: Simbol penugasan `=` adalah konstruksi pernyataan (statement level), bukan operator biner berekspresi).*

---

## 2. Kategori Operator

### A. Operator Aritmetika
Digunakan untuk kalkulasi matematis terhadap operan numerik (`bilangan` dan `desimal`).

| Operator | Nama | Operan Kiri | Operan Kanan | Hasil | Deskripsi |
|---|---|---|---|---|---|
| `+` | Penjumlahan | `bilangan` | `bilangan` | `bilangan` | Menjumlahkan dua bilangan bulat |
| `+` | Penjumlahan | `bilangan`/`desimal` | `bilangan`/`desimal` | `desimal` | Menjumlahkan angka melibatkan desimal |
| `+` | Penggabungan Teks | `teks` | `teks` / tipe lain | `teks` | Menggabungkan teks (*string concatenation*) |
| `-` | Pengurangan | `bilangan` | `bilangan` | `bilangan` | Mengurangkan bilangan bulat |
| `-` | Pengurangan | `bilangan`/`desimal` | `bilangan`/`desimal` | `desimal` | Pengurangan melibatkan desimal |
| `*` | Perkalian | `bilangan` | `bilangan` | `bilangan` | Mengalikan dua bilangan bulat |
| `*` | Perkalian | `bilangan`/`desimal` | `bilangan`/`desimal` | `desimal` | Perkalian melibatkan desimal |
| `/` | Pembagian | `bilangan`/`desimal` | `bilangan`/`desimal` | `desimal` | Membagi operan (menghasilkan desimal presisi) |
| `%` | Modulo (Sisa Bagi) | `bilangan` | `bilangan` | `bilangan` | Menghitung sisa pembagian bilangan bulat |

#### Proteksi Pembagian & Modulo dengan Nol:
NUSANTARA menjamin keamanan eksekusi runtime. Operasi pembagian dengan nol (`x / 0`) atau modulo dengan nol (`x % 0`) akan membangkitkan `GalatRuntime` terstruktur dengan koordinat baris dan kolom yang jelas:
```text
Kesalahan runtime pada baris 4 kolom 15:
pembagian dengan nol tidak diperbolehkan.
```

---

### B. Operator Perbandingan (Relasional & Kesetaraan)
Membandingkan dua nilai dan selalu menghasilkan nilai bertipe `logika` (`benar` atau `salah`).

| Operator | Nama | Operan yang Didukung | Tipe Kembalian | Contoh |
|---|---|---|---|---|
| `==` | Sama Dengan | Tipe sejenis, atau pasangan `bilangan` & `desimal` | `logika` | `10 == 10.0` -> `benar` |
| `!=` | Tidak Sama Dengan | Tipe sejenis, atau pasangan `bilangan` & `desimal` | `logika` | `"A" != "B"` -> `benar` |
| `<` | Lebih Kecil Dari | Numerik (`bilangan`, `desimal`) atau `teks` | `logika` | `5 < 10` -> `benar` |
| `<=` | Lebih Kecil Sama | Numerik (`bilangan`, `desimal`) atau `teks` | `logika` | `10 <= 10` -> `benar` |
| `>` | Lebih Besar Dari | Numerik (`bilangan`, `desimal`) atau `teks` | `logika` | `15 > 20` -> `salah` |
| `>=` | Lebih Besar Sama | Numerik (`bilangan`, `desimal`) atau `teks` | `logika` | `20 >= 20` -> `benar` |

---

### C. Operator Logika Berbahasa Indonesia & Evaluasi Hubung Singkat
NUSANTARA menggunakan kata Bahasa Indonesia alami untuk seluruh operator logika:

1. **`dan` (Konjungsi):**
   - Menghasilkan `benar` jika kedua operan bernilai `benar`.
   - **Hubung Singkat (*Short-circuit Evaluation*):** Jika operan sisi kiri bernilai `salah`, operan sisi kanan **sama sekali tidak dievaluasi** (fungsi atau instruksi di sisi kanan tidak dipanggil).
2. **`atau` (Disjungsi):**
   - Menghasilkan `benar` jika salah satu atau kedua operan bernilai `benar`.
   - **Hubung Singkat (*Short-circuit Evaluation*):** Jika operan sisi kiri bernilai `benar`, operan sisi kanan **sama sekali tidak dievaluasi**.
3. **`tidak` (Negasi Unari):**
   - Membalikkan kebenaran logika: `tidak benar` menjadi `salah`, `tidak salah` menjadi `benar`.

#### Contoh Semantik Hubung Singkat:
```nusantara
program UjiHubungSingkat

fungsi fungsiBerbahaya() : logika
mulai
    tampilkan("Ini tidak boleh dicetak!")
    kembalikan benar
selesai

mulai
    // Karena sisi kiri sudah 'salah', fungsiBerbahaya() TIDAK akan dipanggil:
    hasil1 : logika = salah dan fungsiBerbahaya()

    // Karena sisi kiri sudah 'benar', fungsiBerbahaya() TIDAK akan dipanggil:
    hasil2 : logika = benar atau fungsiBerbahaya()
selesai
```

---

### D. Operator Unari
Menerima satu operan dengan asosiativitas kanan-ke-kiri:
- **`-` (Negasi Angka):** Digunakan pada `bilangan` atau `desimal` (contoh: `-x`, `- -5` menghasilkan `5`).
- **`tidak` (Negasi Logika):** Digunakan pada nilai bertipe `logika` (contoh: `tidak aktif`, `tidak tidak benar` menghasilkan `benar`).

---

## 3. Kompatibilitas Tipe & Pesan Kesalahan Statis

Pemeriksa Tipe Statis (*Type Checker*) menolak kombinasi operan yang tidak sah sebelum program dieksekusi:

1. **Operasi Logika Bukan Tipe Logika:**
   ```text
   Kesalahan tipe pada baris 3 kolom 12:
   operator 'dan' membutuhkan operan bertipe logika, tetapi ditemukan 'teks' dan 'logika'.
   ```
2. **Operasi Aritmetika Tidak Kompatibel:**
   ```text
   Kesalahan tipe pada baris 5 kolom 18:
   operasi '-' tidak didukung antara tipe 'teks' dan 'bilangan'.
   ```
3. **Operator Unari pada Tipe Ilegal:**
   ```text
   Kesalahan tipe pada baris 2 kolom 10:
   operator unari 'tidak' membutuhkan operan bertipe logika, tetapi ditemukan 'bilangan'.
   ```

---

## 4. Contoh Program Demonstrasi Komprehensif

```nusantara
program DemonstrasiOperator

mulai
    a : bilangan = 10
    b : bilangan = 3

    // 1. Aritmatika
    tampilkan(a + b)  // 13
    tampilkan(a - b)  // 7
    tampilkan(a * b)  // 30
    tampilkan(a / b)  // 3.3333333333333335
    tampilkan(a % b)  // 1

    // 2. Perbandingan
    tampilkan(a > b)   // benar
    tampilkan(a < b)   // salah
    tampilkan(a == b)  // salah
    tampilkan(a != b)  // benar

    // 3. Logika & Presedensi
    kondisi : logika = (a > 5) dan (b < 5)
    tampilkan(kondisi) // benar

    // 4. Asosiativitas Kiri ke Kanan
    tampilkan(10 - 5 - 2) // (10 - 5) - 2 = 3
selesai
```
