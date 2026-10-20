# Referensi Sintaks: Struktur Data (Daftar & Peta) Bahasa NUSANTARA (Phase 14)

Dokumen ini merupakan panduan referensi resmi pengguna untuk pembuatan, pembacaan, pembaruan, dan manipulasi struktur data koleksi dasar bahasa **NUSANTARA**: tipe `daftar` dan `peta`.

Target Milestone: `v0.14.0`  
Status: **[DITETAPKAN untuk Phase 14]**

---

## 1. Taksonomi Struktur Data Koleksi

Bahasa NUSANTARA menyediakan dua tipe data majemuk bawaan (*built-in composite types*):

| Tipe Data | Klasifikasi | Keterangan & Karakteristik | Contoh Literal |
|---|---|---|---|
| `daftar` | Majemuk Terindeks | Koleksi elemen berurutan dinamis, berbasis indeks bilangan bulat 0 (*0-indexed*). Mendukung berbagai tipe data elemen dan struktur bersarang. | `[1, 2, 3]`, `["A", "B"]`, `[]` |
| `peta` | Majemuk Asosiatif | Koleksi pasangan kunci-nilai (*dictionary / hash map*) di mana setiap kunci teks dipetakan ke nilai runtime apapun. | `{"kunci": "nilai"}`, `{nama: "Ayu"}`, `{}` |

---

## 2. Sintaks Pembuatan & Inisialisasi

Koleksi dapat diinisialisasi menggunakan notasi literal kurung siku `[...]` untuk `daftar` dan kurung kurawal `{...}` untuk `peta`.

### A. Deklarasi Koleksi `daftar`
Tersedia dua gaya penulisan deklarasi yang sah:
1. **Gaya Standar Bertipe Eksplisit:**
   ```nusantara
   angka : daftar = [10, 20, 30, 40]
   variabel buah : daftar = ["Mangga", "Jeruk", "Apel"]
   ```
2. **Gaya Singkat Tipe Sebagai Kata Awal:**
   ```nusantara
   daftar skor = [100, 85, 92]
   ```

### B. Deklarasi Koleksi `peta`
1. **Gaya Standar Bertipe Eksplisit:**
   ```nusantara
   siswa : peta = {"nama": "Ayu", "umur": 20}
   variabel koordinat : peta = {"x": 10, "y": 25}
   ```
2. **Gaya Kunci Pengidentifikasi Tanpa Kutip:**
   Kunci peta dapat ditulis berupa pengidentifikasi langsung:
   ```nusantara
   peta pengguna = {nama: "Budi", peran: "Admin"}
   ```

### C. Koleksi Kosong
Koleksi dapat dibuat dalam keadaan kosong tanpa elemen:
```nusantara
daftarKosong : daftar = []
petaKosong : peta = {}
```

### D. Struktur Data Bersarang (*Nested Structures*)
NUSANTARA mendukung penuh struktur bertingkat tanpa batas kedalaman arbitrer:
```nusantara
// Matriks 2D (Daftar di dalam Daftar)
matriks : daftar = [[1, 2], [3, 4]]

// Peta Bersarang
konfigurasi : peta = {"server": {"host": "localhost", "port": 3000}}
```

---

## 3. Pembacaan Elemen Berdasarkan Indeks & Kunci

### A. Akses Elemen `daftar` (Berbasis 0 / 0-Indexed)
Elemen daftar diakses menggunakan tanda kurung siku `[indeks]`. Indeks dimulai dari `0` untuk elemen pertama:
```nusantara
angka : daftar = [10, 20, 30]
pertama : bilangan = angka[0]  // 10
kedua : bilangan = angka[1]    // 20
```

### B. Akses Nilai `peta`
Nilai dalam peta diakses menggunakan tanda kurung siku dengan kunci string `[kunci]`:
```nusantara
siswa : peta = {"nama": "Dewi", "umur": 19}
namaSiswa : teks = siswa["nama"]  // "Dewi"
```

### C. Akses Bersarang Bertingkat
```nusantara
tampilkan(matriks[0][1])           // 2
tampilkan(konfigurasi["server"]["port"]) // 3000
```

---

## 4. Mutasi & Pembaruan Elemen

Koleksi dalam NUSANTARA bersifat dapat dimutasi (*mutable*) jika variabel penampungnya tidak dideklarasikan sebagai konstanta `tetap`.

### A. Memperbarui Elemen `daftar`
```nusantara
variabel data : daftar = [1, 2, 3]
data[0] = 99
// data menjadi [99, 2, 3]
```

### B. Memperbarui dan Menambah Pasangan `peta`
Jika kunci sudah ada, nilainya akan ditimpa. Jika kunci belum ada, pasangan kunci-nilai baru otomatis ditambahkan:
```nusantara
variabel pengguna : peta = {"nama": "Eko"}
pengguna["nama"] = "Eko Prasetyo"  // Memperbarui nilai kunci yang ada
pengguna["kota"] = "Surabaya"      // Menambahkan pasangan kunci baru
```

### C. Penegakan Mutabilitas & Konstanta `tetap`
Jika koleksi dideklarasikan menggunakan kata kunci `tetap`, elemen atau pasangan di dalamnya terlindungi dari perubahan nilai:
```nusantara
tetap KONSTANTA_DATA : daftar = [1, 2, 3]
// KONSTANTA_DATA[0] = 100 // KESALAHAN: Koleksi 'KONSTANTA_DATA' bersifat tetap dan elemennya tidak dapat diubah nilainya.
```

---

## 5. Fungsi Bawaan Koleksi: `panjang(koleksi)`

Fungsi bawaan resmi `panjang(...)` digunakan untuk memeriksa dimensi koleksi:
- Pada `daftar`: mengembalikan jumlah total elemen.
- Pada `peta`: mengembalikan jumlah pasangan kunci-nilai.
- Pada `teks`: mengembalikan jumlah karakter teks.

```nusantara
angka : daftar = [10, 20, 30]
tampilkan(panjang(angka)) // 3

m : peta = {"a": 1, "b": 2}
tampilkan(panjang(m))     // 2
```

---

## 6. Operator Kesetaraan Struktur Data (`==`, `!=`)

Bahasa NUSANTARA mengimplementasikan kesetaraan struktural mendalam (*deep structural equality*):
- Dua daftar bernilai `benar` pada `==` jika memiliki panjang yang sama dan seluruh elemen pada indeks yang sama bernilai setara.
- Dua peta bernilai `benar` pada `==` jika memiliki jumlah entri yang sama dan setiap pasangan kunci memuat nilai yang setara.

```nusantara
tampilkan([1, 2] == [1, 2]) // benar
tampilkan([1, 2] != [1, 3]) // benar
tampilkan({"x": 1} == {"x": 1}) // benar
```

---

## 7. Integrasi dengan Fungsi, Perulangan, & Percabangan

Struktur data dapat digunakan secara mulus pada seluruh konstruksi bahasa NUSANTARA:

```nusantara
fungsi hitungRataRata(nilai : daftar) : bilangan
mulai
    total : bilangan = 0
    n : bilangan = panjang(nilai)
    untuk i dari 0 sampai n - 1 lakukan
        total = total + nilai[i]
    akhir
    kembalikan total / n
selesai

program ProgramStatistik
mulai
    skorSiswa : daftar = [80, 90, 100]
    rerata : bilangan = hitungRataRata(skorSiswa)
    tampilkan("Rata-rata:", rerata)
selesai
```

---

## 8. Diagnostik Kesalahan Runtime

Sistem diagnostik NUSANTARA memberikan pesan kesalahan berbahasa Indonesia yang presisi:

1. **`BATAS_INDEKS_TERLAMPAUI`**: Terjadi jika indeks daftar negatif atau melebihi batas panjang daftar.
   > `Kesalahan runtime pada baris 5, kolom 12: Indeks daftar 10 di luar batas (panjang daftar: 3).`
2. **`KUNCI_TIDAK_DITEMUKAN`**: Terjadi jika membaca kunci peta yang tidak ada.
   > `Kesalahan runtime pada baris 4, kolom 15: Kunci 'alamat' tidak ditemukan pada peta.`
3. **`INDEKS_TIDAK_SESUAI`**: Terjadi saat indeks daftar bukan bilangan bulat atau kunci peta bukan teks.
   > `Kesalahan tipe pada baris 3, kolom 10: Indeks daftar harus bertipe bilangan bulat, tetapi ditemukan 'teks'.`
4. **`TIPE_BUKAN_KOLEKSI`**: Terjadi saat menerapkan notasi indeks `[...]` pada tipe skalar (seperti bilangan bulat).
   > `Kesalahan tipe pada baris 3, kolom 5: Operasi pengindeksan tidak didukung pada tipe 'bilangan'.`

---

## 9. Kesenjangan Desain & Usulan Sintaks Lanjutan

Topik-topik berikut diidentifikasi sebagai peluang pengembangan pada fase-fase berikutnya dan belum disahkan sebagai sintaks resmi:

1. **Operasi Pemotongan (*Slice* / Irisan):** Sintaks seperti `angka[1:3]` untuk mengambil sub-daftar.
2. **Metode Bawaan Koleksi:** Pemanggilan berorientasi objek seperti `daftar.tambah(elemen)` atau `peta.hapus(kunci)`.
3. **Pengetikan Generik Homogen:** Format tipe seperti `daftar<bilangan>` atau `peta<teks, bilangan>`. Pada Phase 14, tipe dicatat sebagai `daftar` dan `peta` dinamis bertipe elemen `apapun`.
