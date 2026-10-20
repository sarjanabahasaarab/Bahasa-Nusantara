# Spesifikasi Tipe Data & Deklarasi Nilai Bahasa NUSANTARA

Dokumen ini mendefinisikan taksonomi tipe data awal yang didukung secara resmi oleh bahasa **NUSANTARA** pada Phase 2.

Status: **[DITETAPKAN] untuk taksonomi nama; [RANCANGAN] untuk representasi internal memori (disahkan pada Phase 9).**

---

## 1. Taksonomi Tipe Data Awal

| Tipe Data | Kegunaan Komputasi | Contoh Nilai Literal | Status |
|---|---|---|---|
| `teks` | Menyimpan rangkaian karakter teks Unicode (UTF-8) | `"Halo Dunia"`, `"Nusantara"` | **[DITETAPKAN]** |
| `bilangan` | Menyimpan bilangan bulat (*integer*) | `0`, `42`, `-100`, `1000` | **[DITETAPKAN]** |
| `desimal` | Menyimpan bilangan pecahan / titik mengambang (*floating point*) | `3.14`, `170.5`, `-0.01` | **[DITETAPKAN]** |
| `logika` | Menyimpan nilai kebenaran boolean | `benar`, `salah` | **[DITETAPKAN]** |
| `karakter` | Menyimpan satu satuan karakter UTF-8 tunggal | `'A'`, `'z'`, `'🇮🇩'` | **[DITETAPKAN]** |
| `daftar` | Menyimpan kumpulan nilai berurutan terindeks (*array/list*) | `[1, 2, 3]`, `["A", "B"]` | **[RANCANGAN]** |
| `peta` | Menyimpan pasangan kunci dan nilai (*dictionary/hash map*) | `{"kunci": "nilai"}` | **[RANCANGAN]** |
| `tanggal` | Menyimpan komponen tanggal kalender (Tahun-Bulan-Hari) | `2026-10-02` | **[RANCANGAN]** |
| `waktu` | Menyimpan pencacah jam, menit, detik, dan milidetik | `08:30:00` | **[RANCANGAN]** |
| `kosong` | Menyimpan representasi ketiadaan nilai (*null/void*) | `kosong` | **[DITETAPKAN]** |

---

## 2. Batasan Fase 2 Mengenai Ukuran & Representasi Memori

Sesuai prinsip kehati-hatian rekayasa, detail internal mengenai:
1. Ukuran bit (`32-bit` vs `64-bit` untuk `bilangan` dan `desimal`).
2. Rentang nilai minimum dan maksimum matematis.
3. Konversi tipe data otomatis (*type coercion*) vs konversi eksplisit (*type casting*).
4. Penanganan null-safety ketat (*nullable types*).

**Belum difinalisasi pada Phase 2**. Seluruh spesifikasi representasi memori internal tersebut akan ditetapkan secara resmi pada **Phase 9 (Variabel & Tipe Data)** melalui kajian komparasi arsitektur 64-bit dan LLVM IR.

---

## 3. Sintaks Deklarasi Nilai dan Variabel

Bahasa NUSANTARA menggunakan notasi bertipe statis yang eksplisit dengan pemisah titik dua (`:`):

```nusantara
// Pola: pengidentifikasi : tipe = nilai_awal
nama : teks = "Nusantara"
umur : bilangan = 30
tinggi : desimal = 170.5
aktif : logika = benar
```

### Mutabilitas: Perbedaan `variabel` dan `tetap`
1. **`variabel` (Dapat Berubah / Mutable):**
   Digunakan untuk wadah nilai yang dapat ditugaskan ulang sepanjang siklus hidup blok program.
   ```nusantara
   variabel skor : bilangan = 0
   skor = 100 // Sah
   ```

2. **`tetap` (Konstan / Immutable):**
   Digunakan untuk nilai tetap yang terikat secara kekal setelah inisialisasi pertama kali. Setiap upaya penugasan ulang akan menghasilkan kesalahan kompilasi.
   ```nusantara
   tetap GRAVITASI : desimal = 9.80665
   // GRAVITASI = 10.0 // Kesalahan: Nilai tetap tidak dapat diubah
   ```

3. **Deklarasi Singkat (Inisialisasi Langsung):**
   Pada blok program sederhana, kata kunci `variabel` dapat dihilangkan jika diawali langsung dengan anotasi tipe eksplisit:
   ```nusantara
   kota : teks = "Jakarta"
   ```
