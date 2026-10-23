# Sistem Error & Debugging Bahasa NUSANTARA (Phase 18)

**Target Versi**: v0.18.0  
**Status**: Standar Resmi

---

## 1. Pendahuluan

Bahasa Pemrograman NUSANTARA menganut prinsip transparansi dan kejelasan bagi pengembang (*developer-first*). Sistem error dan debugging pada Phase 18 dirancang untuk memastikan setiap kegagalan program:
1. Disampaikan dalam **Bahasa Indonesia** yang baku, sopan, dan jelas.
2. Memiliki **kode error unik** yang stabil dan dapat ditelusuri.
3. Menyajikan **lokasi berkas, baris, dan kolom** yang akurat (`berkas.nusantara:baris:kolom`).
4. Menampilkan **cuplikan kode sumber (*source snippet*)** dengan penunjuk visual caret (`^^^^`).
5. Menyediakan **saran perbaikan (*intelligent suggestions*)** berbasis algoritma *Levenshtein Distance* untuk saltik (typo).
6. Mempertahankan **jejak pemanggilan tumpukan (*stack trace*)** lengkap yang memuat riwayat pemanggilan fungsi, modul, serta paket pihak ketiga.
7. Mendukung format tampilan teks terminal ramah manusia (dengan dukungan warna ANSI) serta format **JSON terstruktur** untuk integrasi perkakas pengembang (IDE/LSP).

---

## 2. Alur Diagnostik Program

```
Program NUSANTARA
       ↓
Terjadi Kesalahan (Lexer / Parser / Tipe / Modul / Paket / Runtime)
       ↓
Mesin Diagnostik (MesinDiagnostik)
       ↓
Resolusi Kode & Kategori (NUS-xxx-yyy)
       ↓
Pencocokan Lokasi Sumber & Pembuatan Caret (^^^^)
       ↓
Analisis Saran Perbaikan (Levenshtein Distance)
       ↓
Rekonstruksi Konteks (Paket & Modul) & Jejak Tumpukan (Stack Trace)
       ↓
Renderer (Teks Terminal ANSI atau JSON Terstruktur)
```

---

## 3. Kategori Error Resmi

Bahasa NUSANTARA mengklasifikasikan kesalahan ke dalam 12 kategori terpisah:

| Kategori | Identifikasi | Deskripsi Singkat |
| :--- | :--- | :--- |
| **Kesalahan Lexer** | `LEXER` | Kegagalan dalam membaca aliran karakter atau token tidak sah |
| **Kesalahan Sintaks** | `SINTAKS` / `PARSER` | Struktur tata bahasa tidak sesuai dengan tata bahasa EBNF |
| **Kesalahan Parsing** | `PARSER` | Ekspresi tidak lengkap atau blok belum ditutup |
| **Kesalahan Tipe** | `TIPE` | Ketidakcocokan tipe data atau operasi tidak diizinkan |
| **Kesalahan Nama** | `NAMA` | Pengidentifikasi variabel atau fungsi tidak ditemukan / di luar lingkup |
| **Kesalahan Modul** | `MODUL` | Modul tidak ditemukan, ketergantungan melingkar, atau akses simbol privat |
| **Kesalahan Package** | `PAKET` | Anomali manifest `nusantara.toml`, kunci `nusantara.lock`, atau integritas |
| **Kesalahan Runtime** | `RUNTIME` | Operasi ilegal saat program berjalan (pembagian nol, overflow iterasi) |
| **Kesalahan Berkas** | `BERKAS` | Berkas tidak ditemukan atau pelanggaran keamanan filesystem sandbox |
| **Kesalahan Indeks** | `INDEKS` | Indeks daftar di luar rentang sah atau kunci peta tidak ditemukan |
| **Kesalahan Konversi** | `KONVERSI` | Kegagalan konversi tipe data eksplisit |
| **Kesalahan Internal** | `INTERNAL` | Anomali internal mesin interpreter atau pohon AST rusak |

---

## 4. Daftar Kode Error Resmi

Setiap kode error memiliki format terstruktur: `NUS-[KATEGORI]-[NOMOR]`.

### 4.1. Kesalahan Leksikal (`NUS-LEX-xxx`)
- `NUS-LEX-001`: Karakter Tidak Dikenal
- `NUS-LEX-002`: Literal Teks Tidak Ditutup Tanda Kutip Ganda (`"`)
- `NUS-LEX-003`: Literal Karakter Tidak Ditutup Tanda Kutip Tunggal (`'`)
- `NUS-LEX-004`: Format Angka Numerik Tidak Valid
- `NUS-LEX-005`: Urutan Karakter Lolos (*Escape Sequence*) Tidak Valid

### 4.2. Kesalahan Sintaks & Parser (`NUS-PAR-xxx`)
- `NUS-PAR-001`: Token Tak Terduga
- `NUS-PAR-002`: Ekspresi Tidak Lengkap
- `NUS-PAR-003`: Pernyataan Tidak Valid
- `NUS-PAR-004`: Blok Tidak Ditutup (kekurangan kata kunci penutup `selesai` / `akhir`)
- `NUS-PAR-005`: Struktur Program Utama Tidak Valid

### 4.3. Kesalahan Sistem Tipe (`NUS-TYP-xxx`)
- `NUS-TYP-001`: Ketidakcocokan Tipe Data
- `NUS-TYP-002`: Tipe Data Tidak Dikenal
- `NUS-TYP-003`: Operator Tidak Didukung untuk Pasangan Tipe Tersebut
- `NUS-TYP-004`: Deklarasi Ganda Pengidentifikasi dalam Lingkup yang Sama
- `NUS-TYP-005`: Modifikasi Konstanta Tetap (`tetap`) Dilarang
- `NUS-TYP-006`: Argumen Pemanggilan Fungsi Tidak Cocok dengan Parameter
- `NUS-TYP-007`: Tipe Nilai Kembalian Fungsi Tidak Sesuai Deklarasi

### 4.4. Kesalahan Resolusi Nama (`NUS-NAM-xxx`)
- `NUS-NAM-001`: Variabel Tidak Ditemukan
- `NUS-NAM-002`: Fungsi Tidak Ditemukan
- `NUS-NAM-003`: Pengidentifikasi Berada di Luar Lingkup (*Scope*) Akses

### 4.5. Kesalahan Sistem Modul (`NUS-MOD-xxx`)
- `NUS-MOD-001`: Modul Tidak Ditemukan pada Jalur Pencarian
- `NUS-MOD-002`: Anggota / Simbol Tidak Diekspor oleh Modul
- `NUS-MOD-003`: Ketergantungan Melingkar (*Circular Dependency*) Terdeteksi
- `NUS-MOD-004`: Jalur Modul Tidak Aman (*Path Traversal Attempt*)
- `NUS-MOD-005`: Akses ke Anggota Internal Terlindungi (Bukan Simbol `ekspor`)
- `NUS-MOD-006`: Berkas Modul Rusak atau Gagal Diurai

### 4.6. Kesalahan Package Manager (`NUS-PKG-xxx`)
- `NUS-PKG-001`: Berkas Manifest `nusantara.toml` Rusak atau Tidak Sah
- `NUS-PKG-002`: Konflik Versi Antar-Dependensi Paket
- `NUS-PKG-003`: Ketergantungan Melingkar Antar-Paket
- `NUS-PKG-004`: Berkas Kunci `nusantara.lock` Rusak
- `NUS-PKG-005`: Pemeriksaan Integritas (*Checksum*) Paket Gagal
- `NUS-PKG-006`: Format Nama Paket Tidak Valid
- `NUS-PKG-007`: Paket Tidak Ditemukan di Registri atau Direktori Lokal

### 4.7. Kesalahan Runtime (`NUS-RUN-xxx`)
- `NUS-RUN-001`: Pembagian atau Modulo dengan Nol
- `NUS-RUN-002`: Instruksi Kendali (`hentikan` / `lanjutkan`) di Luar Konteks Perulangan
- `NUS-RUN-003`: Batas Iterasi atau Kedalaman Rekursi Terlampaui (*Stack Overflow*)
- `NUS-RUN-004`: Operasi Runtime Tidak Valid
- `NUS-RUN-005`: Upaya Mutasi Konstanta Tetap saat Runtime

### 4.8. Kesalahan Indeks & Koleksi (`NUS-IDX-xxx`)
- `NUS-IDX-001`: Indeks Daftar Berada di Luar Rentang Ukuran yang Sah
- `NUS-IDX-002`: Kunci yang Diminta Tidak Ada dalam Pasangan Kunci-Nilai Peta
- `NUS-IDX-003`: Operasi Pengindeksan Diterapkan pada Nilai Bukan Koleksi

### 4.9. Kesalahan I/O Berkas & Sandbox (`NUS-FILE-xxx`)
- `NUS-FILE-001`: Berkas Tidak Ditemukan
- `NUS-FILE-002`: Pelanggaran Keamanan Sandbox Berkas (Upaya Keluar dari Direktori Kerja)
- `NUS-FILE-003`: Akses Ditolak ke Berkas Sensitif Sistem (Kredensial, dsb)
- `NUS-FILE-004`: Kegagalan I/O Sistem saat Membaca atau Menulis Berkas

### 4.10. Kesalahan Konversi Tipe (`NUS-CON-xxx`)
- `NUS-CON-001`: Gagal Melakukan Konversi Nilai Menjadi Bilangan Bulat
- `NUS-CON-002`: Gagal Melakukan Konversi Nilai Menjadi Desimal
- `NUS-CON-003`: Gagal Melakukan Konversi Nilai Menjadi Logika

### 4.11. Kesalahan Internal Mesin (`NUS-INT-xxx`)
- `NUS-INT-001`: Kesalahan Internal Mesin Eksekusi NUSANTARA
- `NUS-INT-002`: Node Pohon AST Rusak atau Tidak Terdefinisi

---

## 5. Anatomi Pesan Kesalahan Teks

Contoh pesan kesalahan yang ditampilkan di konsol terminal:

```
Kesalahan tipe [NUS-TYP-001]: Ketidakcocokan Tipe Data
  Lokasi: utama.nusantara:14:23
  Konteks: Paket: matematika v1.2.0 | Modul: aljabar | Fungsi: hitungTotal()

  14 |     hasil = hitungTotal(10, "50")
     |                             ^^^^

  Masalah:
    parameter kedua membutuhkan tipe 'bilangan', tetapi menerima tipe 'teks'.

  Saran:
    Sesuaikan nilai dengan tipe yang dideklarasikan, atau gunakan modul konversi.

  Jejak Pemanggilan (Stack Trace):
    1.  hitungTotal() [modul: aljabar] (paket: matematika) — aljabar.nusantara:8:5
    2.  prosesKalkulasi() — utama.nusantara:14:23
    3.  program Demonstrasi — utama.nusantara:2:1
```

---

## 6. Format JSON Terstruktur

Untuk kebutuhan integrasi IDE, Language Server Protocol (LSP), atau integrasi CI/CD, perintah CLI menyediakan opsi `--json`:

```json
{
  "tingkat": "KESALAHAN",
  "kategori": "TIPE",
  "kode": "NUS-TYP-001",
  "pesan": "parameter kedua membutuhkan tipe 'bilangan', tetapi menerima tipe 'teks'.",
  "lokasi": {
    "berkas": "utama.nusantara",
    "baris": 14,
    "kolom": 23,
    "panjang": 4
  },
  "potonganKode": {
    "nomorBaris": 14,
    "teksBaris": "    hasil = hitungTotal(10, \"50\")",
    "kolomAwal": 23,
    "panjang": 4,
    "teksCaret": "                            ^^^^"
  },
  "saran": "Sesuaikan nilai dengan tipe yang dideklarasikan, atau gunakan modul konversi.",
  "konteks": {
    "namaPaket": "matematika",
    "versiPaket": "1.2.0",
    "namaModul": "aljabar",
    "namaFungsi": "hitungTotal"
  },
  "jejakTumpukan": [
    {
      "namaFungsi": "hitungTotal",
      "namaModul": "aljabar",
      "namaPaket": "matematika",
      "lokasi": {
        "berkas": "aljabar.nusantara",
        "baris": 8,
        "kolom": 5
      }
    }
  ]
}
```

---

## 7. Saran Saltik Otomatis (Typo Suggestions)

Sistem error menggunakan algoritma **Jarak Levenshtein** untuk mendeteksi kesamaan penulisan identifier variabel, fungsi, modul, atau kata kunci bahasa.

Contoh:
- Pengembang menulis `tampilkann("halo")`  
  -> Sistem menghasilkan saran: `Mungkin yang Anda maksud: 'tampilkan'?`
- Pengembang menulis `pajang(daftar)`  
  -> Sistem menghasilkan saran: `Mungkin yang Anda maksud: 'panjang'?`
- Pengembang menulis `fungsii hitung()`  
  -> Sistem menghasilkan saran: `Mungkin kata kunci yang Anda maksud adalah 'fungsi'?`
