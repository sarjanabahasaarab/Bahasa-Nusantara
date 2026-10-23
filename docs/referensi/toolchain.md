# Referensi Toolchain Resmi NUSANTARA

Versi Dokumen: v0.19.0  
Status: Ditetapkan (Resmi)

Toolchain NUSANTARA menyediakan rangkaian utilitas pengembang baris perintah (CLI) untuk memeriksa kode, memformat berkas, memvalidasi dependensi proyek, dan mendeteksi potensi anomali sebelum eksekusi program.

---

## 1. Perintah Pemeriksaan (`nusantara cek`)

Perintah `nusantara cek` (alias: `periksa`, `check`) melakukan analisis statis menyeluruh tanpa mengeksekusi program.

### Alur Kerja (Pipeline):
```
Kode Sumber
    ↓
Lexer (Leksikal)
    ↓
Parser (Sintaksis & AST)
    ↓
Pemeriksa Tipe & Resolusi Modul
    ↓
Linter Analisis Statis
    ↓
Diagnostic Engine (Format Terminal / JSON)
```

### Penggunaan CLI:

1. **Memeriksa berkas tunggal:**
   ```bash
   nusantara cek utama.nusantara
   ```
   Jika tidak ada kesalahan:
   ```
   [✓ VALID] Berkas 'utama.nusantara' sah dan valid. Tidak ditemukan kesalahan.
   ```

2. **Memeriksa seluruh proyek:**
   ```bash
   nusantara cek .
   ```
   Memvalidasi integritas `nusantara.toml`, `nusantara.lock`, dan seluruh berkas `.nusantara` di direktori proyek.

3. **Format JSON Mesin (`--json`):**
   ```bash
   nusantara cek utama.nusantara --json
   ```
   Menghasilkan keluaran JSON terstruktur yang kompatibel dengan integrasi CI/CD, editor teks, dan IDE.

---

## 2. Aturan Linter Dasar (Warning Rules)

Linter mendeteksi pola kode yang secara teknis valid dalam tata bahasa tetapi patut dihindari. Aturan linter menggunakan kode resmi dengan awalan `NUS-W`:

| Kode Aturan | Kategori | Penjelasan |
| :--- | :--- | :--- |
| `NUS-W001` | Variabel Tidak Digunakan | Variabel atau konstanta dideklarasikan namun nilainya tidak pernah dibaca dalam lingkupnya. Variabel berawalan `_` dikecualikan. |
| `NUS-W002` | Kode Tak Terjangkau | Pernyataan yang ditulis setelah instruksi pengalihan alur (`kembalikan`, `hentikan`, `lanjutkan`) dalam blok yang sama. |
| `NUS-W003` | Perbandingan Identik | Perbandingan kesetaraan (`==`, `!=`) antara dua ekspresi atau nilai yang sama persis (selalu bernilai konstan). |
| `NUS-W004` | Impor Tidak Digunakan | Modul atau simbol yang diimpor tetapi tidak pernah diakses sama sekali di dalam berkas. |

---

## 3. Konvensi Kode Status Keluar (Exit Codes)

Toolchain NUSANTARA mematuhi konvensi status keluar deterministik:

| Kode Status | Makna | Kondisi Terjadinya |
| :---: | :--- | :--- |
| **0** | **Sukses** | Semua pemeriksaan valid, pemformatan berhasil, atau tidak ada galat fatal. |
| **1** | **Kesalahan Pengguna / Kode** | Terjadi galat leksikal, sintaksis, sistem tipe, atau ketidaksesuaian saat `--cek`. |
| **2** | **Kesalahan Penggunaan CLI** | Argumen perintah hilang, perintah tidak dikenal, atau parameter CLI tidak valid. |

---

## 4. Opsi Perintah Global

- `--debug`: Menampilkan jejak tumpukan pemanggilan rinci dan konteks lingkungan eksekusi.
- `--json` / `--format=json`: Menghasilkan diagnostik dalam format JSON murni.
- `--warna`: Memaksa pengaktifan penyorotan warna terminal ANSI.
- `--tanpa-warna` / `--no-color`: Menonaktifkan seluruh warna terminal (sesuai spesifikasi standar NO_COLOR).
- `--bantuan`, `-h`, `bantu`: Menampilkan petunjuk bantuan resmi CLI.
- `--version`, `-v`, `versi`: Menampilkan versi resmi toolchain NUSANTARA.
