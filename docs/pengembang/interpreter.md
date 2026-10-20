# Arsitektur & Dokumentasi Teknis Interpreter NUSANTARA

Dokumen ini mendokumentasikan arsitektur, cara kerja, dan antarmuka pemrograman (API) dari modul **Penerjemah Eksekusi (Interpreter)** bahasa **NUSANTARA** yang dibangun pada **Phase 8 (Milestone v0.8.0)**.

---

## 1. Apa Itu Interpreter NUSANTARA?

**Interpreter (*Tree-Walk AST Interpreter*)** adalah komponen lapis ketiga pada saluran pipa kompilasi NUSANTARA. Interpreter bertugas menerima pohon sintaksis abstrak (AST) yang dihasilkan oleh Parser Phase 7, lalu mengeksekusi instruksi-instruksi secara berurutan di dalam memori tanpa perlu mengompilasi kode ke biner mesin (*native machine code*).

```text
Source Code (.nusantara)
         │
         ▼
 ┌───────────────┐
 │     Lexer     │  (Phase 6)
 └───────────────┘
         │
         ▼
    TokenStream
         │
         ▼
 ┌───────────────┐
 │    Parser     │  (Phase 7)
 └───────────────┘
         │
         ▼
 Abstract Syntax Tree (AST)
         │
         ▼
 ┌───────────────┐
 │  Interpreter  │  (Phase 8: Modul ini)
 └───────────────┘
         │
         ▼
  Keluaran Program (Output)
```

Dengan selesainya Phase 8, program NUSANTARA untuk pertama kalinya dapat **benar-benar dieksekusi secara nyata** dan menghasilkan keluaran program ke layar/terminal.

---

## 2. Struktur Modul Interpreter (`src/interpreter/`)

1. **`nilai.ts`**: Representasi nilai runtime (`Teks`, `Bilangan`, `Desimal`, `Logika`, `Kosong`, `Fungsi`).
2. **`environment.ts`**: Manajemen lingkup leksikal (*lexical scope*), tabel simbol, dan proteksi konstanta `tetap` (*immutable*).
3. **`sinyal.ts`**: Mekanisme penanganan kontrol alur internal (`SinyalKembalikan`, `SinyalHentikan`, `SinyalLanjutkan`).
4. **`outputWriter.ts`**: Abstraksi keluaran (`PenulisOutputKonsol` dan `PenulisOutputBuffer`) untuk memudahkan pengujian unit terisolasi maupun integrasi antarmuka peramban web.
5. **`galat.ts`**: Pelaporan kesalahan runtime (`GalatRuntime`) dilengkapi pelacak jejak tumpukan (*stack trace*) dan koordinat posisi sumber.
6. **`interpreter.ts`**: Mesin inti penerjemah pohon AST, evaluasi ekspresi matematis dan logika, percabangan, perulangan, dan pemanggilan fungsi.
7. **`index.ts`**: Titik masuk ekspor terpadu modul.

---

## 3. Sistem Nilai Runtime

| Tipe Nilai | Contoh Nilai | Keterangan |
|---|---|---|
| `teks` | `"Halo Nusantara"` | Rangkaian karakter teks UTF-8 |
| `bilangan` | `42`, `-10` | Bilangan bulat matematis |
| `desimal` | `3.14`, `170.5` | Pecahan berpresisi ganda (*floating point*) |
| `logika` | `benar`, `salah` | Nilai kebenaran boolean |
| `kosong` | `kosong` | Nilai nir (*null/void*) |
| `fungsi` | `tambah(a, b)` | Penutup fungsi pengguna berlingkup leksikal |
| `fungsi_bawaan` | `tampilkan(...)` | Fungsi built-in runtime sistem |

---

## 4. Evaluasi Operator & Hubung Singkat (Short-Circuit)

- **Aritmatika:** `+` (penjumlahan angka atau konkatenasi string), `-`, `*`, `/` (dengan proteksi terhadap pembagian dengan nol), `%`.
- **Perbandingan:** `==`, `!=`, `<`, `<=`, `>`, `>=`.
- **Logika Hubung Singkat (*Short-Circuit*):**
  - Pada operasi `A dan B`: Jika `A` bernilai `salah`, operan `B` tidak akan dievaluasi.
  - Pada operasi `A atau B`: Jika `A` bernilai `benar`, operan `B` tidak akan dievaluasi.

---

## 5. Fungsi Bawaan: `tampilkan(...)`

Fungsi bawaan `tampilkan` mencetak nilai argumen ke `OutputWriter`:
```nusantara
program Uji
mulai
    nama : teks = "Budi"
    umur : bilangan = 25
    tampilkan("Nama:", nama, "Umur:", umur)
selesai
```
Keluaran:
```text
Nama: Budi Umur: 25
```

---

## 6. Contoh Pemakaian & Helper API

```typescript
import { Interpreter, PenulisOutputBuffer } from './interpreter';

const kode = `
fungsi faktorial(n : bilangan) : bilangan
mulai
    jika n <= 1 maka
        kembalikan 1
    akhir
    kembalikan n * faktorial(n - 1)
selesai

program Hitung
mulai
    hasil : bilangan = faktorial(5)
    tampilkan("5! =", hasil)
selesai
`;

const buffer = new PenulisOutputBuffer();
const interpreter = new Interpreter(buffer);
interpreter.jalankanKode(kode);

console.log(buffer.dapatkanSeluruhTeks());
// Output: ["5! = 120"]
```

---

## 7. Cara Menjalankan Pengujian Interpreter

```bash
npm run test:interpreter
```
atau seluruh pengujian:
```bash
npm test
```
