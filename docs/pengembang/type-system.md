# Arsitektur & Dokumentasi Sistem Tipe Data NUSANTARA

Dokumen ini mendokumentasikan desain, aturan kompatibilitas, struktur internal, dan cara kerja dari modul **Sistem Tipe Data & Type Checker** bahasa **NUSANTARA** yang dibangun pada **Phase 9 (Milestone v0.9.0)**.

---

## 1. Filosofi & Pendekatan Sistem Tipe

NUSANTARA menganut sistem pengetikan **statis terverifikasi dan aman (*Strict & Type-Safe*)** dengan aturan berikut:
1. **Kejelasan Bernalar (*Clarity of Thought*):** Tipe data harus secara eksplisit dideklarasikan pada definisi variabel, konstanta tetap, parameter fungsi, dan tipe kembalian.
2. **Tanpa Koersi Implisit Sembarangan (*No Silent Implicit Coercion*):** Tipe `teks` tidak dapat otomatis diubah menjadi `bilangan`, begitu pula `bilangan` tidak otomatis menjadi `desimal` tanpa operasi eksplisit, kecuali pada operasi konkatenasi string yang didukung secara matematis.
3. **Pemisahan Tanggung Jawab (*Separation of Concerns*):**
   - **Lexer (Phase 6):** Memindai token literal.
   - **Parser (Phase 7):** Menangkap anotasi tipe dan menempelkannya ke simpul AST.
   - **Type Checker (Phase 9):** Menganalisis kepatuhan semantik dan kompatibilitas tipe sebelum dan selama runtime.
   - **Interpreter (Phase 8):** Mengeksekusi instruksi dengan perlindungan kekekalan konstanta dan keamanan tipe.

---

## 2. Struktur Modul Tipe (`src/tipe/`)

- **`jenisTipe.ts`**: Definisi nama-nama tipe resmi (`NamaTipe`), status dukungan (`DefinisiTipe`), dan tabel validasi.
- **`kompatibilitas.ts`**: Logika kesetaraan tipe (*type equality*), aturan kompatibilitas (*type compatibility*), dan pemetaan tipe operasi biner.
- **`galatTipe.ts`**: Sistem pelaporan kesalahan tipe terstruktur (`GalatTipe`) dengan koordinat lokasi dan perbandingan tipe harapan vs aktual.
- **`pemeriksaTipe.ts`**: Mesin penganalisis semantik (*Semantic Analyzer / Type Checker*) yang memeriksa AST sebelum eksekusi program.
- **`index.ts`**: Titik masuk ekspor terpadu.

---

## 3. Matriks Tipe Data Resmi & Status Implementasi

| Tipe Data | Contoh Literal | Status Phase 9 | Keterangan |
|---|---|---|---|
| `teks` | `"Halo Nusantara"` | **Lengkap** | Rangkaian karakter teks UTF-8 |
| `bilangan` | `42`, `-10` | **Lengkap** | Bilangan bulat 64-bit bertanda |
| `desimal` | `3.14`, `170.5` | **Lengkap** | Pecahan presisi ganda |
| `logika` | `benar`, `salah` | **Lengkap** | Nilai kebenaran boolean |
| `karakter` | `'A'` | **Lengkap** | Karakter tunggal berpetik satu |
| `kosong` | `kosong` | **Lengkap** | Nilai nir (*null / void*) |
| `daftar` | Didefinisikan | **Fondasi** | Tipe terdaftar, sintaks literal lengkap pada Phase 14 |
| `peta` | Didefinisikan | **Fondasi** | Tipe terdaftar, sintaks literal lengkap pada Phase 14 |
| `tanggal` | Didefinisikan | **Fondasi** | Tipe terdaftar, pustaka kalender pada Phase 29 |
| `waktu` | Didefinisikan | **Fondasi** | Tipe terdaftar, pustaka waktu pada Phase 29 |
| `fungsi` | Objek fungsi | **Lengkap** | Nilai fungsi dengan parameter bertipe |

---

## 4. Aturan Kompatibilitas & Penugasan (Assignment)

### A. Deklarasi & Inisialisasi
```nusantara
umur : bilangan = 30       // Sah: bilangan kompatibel dengan bilangan
nama : teks = "Budi"       // Sah: teks kompatibel dengan teks
salah : bilangan = "30"    // DITOLAK: GalatTipe (diharapkan bilangan, ditemukan teks)
```

### B. Mutasi Variabel
```nusantara
umur : bilangan = 30
umur = 31                  // Sah
umur = "tiga puluh"        // DITOLAK: Kesalahan tipe pada assignment
```

### C. Perlindungan Konstanta Tetap
```nusantara
tetap KODE : teks = "ID"
KODE = "US"                // DITOLAK: Konstanta tetap tidak dapat diubah
```

### D. Parameter & Kembalian Fungsi
```nusantara
fungsi hitung(a : bilangan, b : bilangan) : bilangan
mulai
    kembalikan a + b       // Sah: bilangan + bilangan = bilangan
selesai

hitung(10, 20)             // Sah
hitung("sepuluh", 20)      // DITOLAK: Argumen ke-1 tidak sesuai tipe parameter
```

---

## 5. Menjalankan Pengujian Sistem Tipe

```bash
npm run test:tipe
```
atau pengujian menyeluruh:
```bash
npm test
```
