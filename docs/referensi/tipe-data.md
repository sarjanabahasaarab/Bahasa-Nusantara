# Referensi Tipe Data Resmi Bahasa NUSANTARA

Dokumen ini merupakan panduan referensi resmi seluruh sistem tipe data bahasa **NUSANTARA** yang telah diperkuat pada **Phase 9 (v0.9.0)**.

---

## 1. Tabel Tipe Data & Status Kesiapan

| Tipe Data | Kategori | Contoh Penggunaan | Status Phase 9 |
|---|---|---|---|
| `teks` | Primitif | `nama : teks = "Indonesia"` | **Lengkap** |
| `bilangan` | Primitif | `umur : bilangan = 25` | **Lengkap** |
| `desimal` | Primitif | `suhu : desimal = 36.5` | **Lengkap** |
| `logika` | Primitif | `aktif : logika = benar` | **Lengkap** |
| `karakter` | Primitif | `huruf : karakter = 'A'` | **Lengkap** |
| `kosong` | Khusus | `data : kosong = kosong` | **Lengkap** |
| `daftar` | Majemuk | Terdaftar dalam sistem tipe | **Fondasi** (Phase 14) |
| `peta` | Majemuk | Terdaftar dalam sistem tipe | **Fondasi** (Phase 14) |
| `tanggal` | Domain | Terdaftar dalam sistem tipe | **Fondasi** (Phase 29) |
| `waktu` | Domain | Terdaftar dalam sistem tipe | **Fondasi** (Phase 29) |
| `fungsi` | Orde Tinggi | Definisi subrutin modular | **Lengkap** |

---

## 2. Aturan Deklarasi Variabel & Konstanta

1. **Variabel Dinamis (*Mutable*):**
   ```nusantara
   // Gaya ringkas:
   nama : teks = "Budi"
   nama = "Santoso"

   // Gaya eksplisit kata kunci:
   variabel skor : bilangan = 100
   skor = skor + 10
   ```
2. **Konstanta Kekal (*Immutable*):**
   ```nusantara
   tetap PHI : desimal = 3.14
   // PHI = 3.1415  <-- Dilarang! Menghasilkan galat modifikasi tetap
   ```

---

## 3. Kompatibilitas Penugasan (*Type Compatibility*)

NUSANTARA tidak melakukan konversi implisit silang yang berpotensi menimbulkan bug logis. Penugasan harus memiliki tipe data yang kompatibel secara langsung:

```nusantara
skor : bilangan = 100
skor = "seratus"   // GALAT TIPE: variabel 'skor' bertipe bilangan tidak dapat menerima teks
```

---

## 4. Validasi Tipe pada Fungsi

Setiap fungsi mendefinisikan tipe parameter dan tipe nilai kembali:
```nusantara
fungsi hitungDiskon(harga : bilangan, persen : bilangan) : bilangan
mulai
    kembalikan (harga * persen) / 100
selesai
```
Jika dipanggil dengan argumen yang salah jenisnya, mesin eksekusi akan menolak instruksi tersebut sebelum kerusakan runtime terjadi.
