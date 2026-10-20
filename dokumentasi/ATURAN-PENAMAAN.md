# Aturan Penamaan Pengidentifikasi & Komentar Bahasa NUSANTARA

Dokumen ini menetapkan kaidah leksikal resmi untuk pembentukan nama pengidentifikasi (*identifiers*) serta tata cara penulisan komentar kode dalam berkas `.nusantara`.

Status: **[DITETAPKAN] — Acuan Standar Leksikal (Phase 2)**

---

## 1. Aturan Penamaan Pengidentifikasi (*Identifiers*)

Pengidentifikasi mencakup nama unit `program`, `variabel`, `tetap`, `fungsi`, parameter, dan `kelas`.

### Kaidah Wajib:
1. **Karakter yang Diizinkan:** Huruf latin (`a`-`z`, `A`-`Z`), angka (`0`-`9`), dan garis bawah (`_`).
2. **Karakter Pertama:** Wajib diawali oleh huruf latin atau garis bawah (`_`). **Tidak boleh diawali oleh angka**.
3. **Larangan Kata Kunci:** Nama pengidentifikasi **tidak boleh sama persis** dengan salah satu dari 32 kata kunci resmi (misal: dilarang menamai variabel `jika`, `mulai`, `teks`, atau `program`).
4. **Peka Huruf Besar & Kecil (*Case-Sensitive*):** Pengidentifikasi `skor`, `Skor`, dan `SKOR` adalah tiga pengidentifikasi yang berbeda secara leksikal.
5. **Karakter Khusus yang Dilarang:** Dilarang menggunakan spasi, tanda hubung (`-`), simbol matematika (`+`, `@`, `#`, `$`, `%`, dsb.) dalam pengidentifikasi.

---

## 2. Contoh Pengidentifikasi Sah vs Tidak Sah

| Pengidentifikasi | Status | Alasan Penjelasan |
|---|---|---|
| `namaLengkap` | **SAH** | Menggunakan huruf latin dengan pola camelCase |
| `total_nilai_akhir` | **SAH** | Menggunakan huruf dan garis bawah (*snake_case*) |
| `angka1` | **SAH** | Huruf diikuti angka di posisi belakang |
| `_kunciRahasia` | **SAH** | Diawali garis bawah untuk identifikasi internal |
| `KalkulatorProgram` | **SAH** | Menggunakan huruf kapital PascalCase untuk nama program |
| `1angka` | **TIDAK SAH** | Diawali angka (melanggar kaidah karakter awal) |
| `nilai-ujian` | **TIDAK SAH** | Mengandung tanda hubung `-` (akan ditafsirkan sebagai pengurangan) |
| `total harga` | **TIDAK SAH** | Mengandung spasi di antara kata |
| `program` | **TIDAK SAH** | Merupakan kata kunci yang dicadangkan bahasa |
| `fungsi` | **TIDAK SAH** | Merupakan kata kunci yang dicadangkan bahasa |
| `mulai` | **TIDAK SAH** | Merupakan kata kunci pembuka blok |
| `uang$` | **TIDAK SAH** | Mengandung simbol khusus `$` |

---

## 3. Konvensi Gaya Penulisan yang Dianjurkan (*Style Guide*)

Untuk memelihara keindahan dan kerapian kode komunitas NUSANTARA:
- **Nama Program & Kelas:** Disarankan menggunakan gaya **PascalCase** (contoh: `program PenjualanToko`, `kelas Mahasiswa`).
- **Nama Variabel & Fungsi:** Disarankan menggunakan gaya **camelCase** atau **snake_case** yang konsisten (contoh: `hitungRataRata()`, `jumlah_siswa`).
- **Nama Konstanta `tetap`:** Disarankan menggunakan gaya **UPPER_SNAKE_CASE** (contoh: `tetap MAKSIMAL_PERCOBAAN : bilangan = 5`).

---

## 4. Sintaks Komentar Kode

Komentar digunakan untuk dokumentasi penjelasan tanpa dieksekusi oleh mesin.

### A. Komentar Satu Baris [DITETAPKAN]
Menggunakan tanda garis miring ganda (`//`). Seluruh karakter setelah `//` hingga akhir baris diabaikan oleh penganalisis leksikal:

```nusantara
// Ini komentar satu baris dalam bahasa NUSANTARA
nama : teks = "Budi" // Menetapkan nama siswa
```

### B. Komentar Banyak Baris [RANCANGAN]
Untuk blok penjelasan panjang, diusulkan format penutup terstruktur atau blok kurung bintang:

```nusantara
/*
   Rancangan komentar multibaris:
   Ini adalah catatan penjelasan panjang yang mencakup
   beberapa baris kode tanpa dieksekusi.
*/
```

> **Catatan Pengesahan Komentar Multibaris:** Sintaks komentar banyak baris di atas berstatus **[RANCANGAN]** dan akan disahkan secara resmi pada **Phase 4 (Spesifikasi Sintaks Formal)** setelah menguji potensi konflik dengan operator pembagian dan perkalian.
