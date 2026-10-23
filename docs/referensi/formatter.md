# Referensi Pemformat Kode Resmi (Formatter) NUSANTARA

Versi Dokumen: v0.19.0  
Status: Ditetapkan (Resmi)

Pemformat kode NUSANTARA (`nusantara format`) adalah alat bantu otomatis berbasis Pohon Sintaksis Abstrak (AST) untuk memastikan tata letak kode program seragam, bersih, konsisten, dan mematuhi panduan gaya resmi bahasa NUSANTARA.

---

## 1. Prinsip Utama Pemformatan

1. **Berbasis AST**: Bukan manipulasi string reguler sederhana, melainkan memproses urutan `Lexer -> Parser -> AST -> Pretty Printer`.
2. **Deterministik & Idempoten**:
   ```
   format(format(kode)) == format(kode)
   ```
   Menjalankan formatter berulang kali menghasilkan keluaran yang persis sama.
3. **Preservasi Semantik**: Formatter tidak mengubah struktur alur logika, urutan eksekusi, nilai literal, atau arti program.
4. **Preservasi String & Teks**: Spasi internal, tanda petik, dan urutan karakter escape (`\n`, `\t`, `\"`, `\\`) dipertahankan secara utuh.
5. **Preservasi Komentar**: Komentar satu baris (`//`) dipertahankan posisinya (baik komentar kepala blok maupun komentar inline).
6. **Safety Check (Pemeriksaan Aman)**: Sebelum mengganti berkas asli di disk, hasil format wajib diparse ulang secara otomatis. Jika ditemukan kegagalan sintaksis, operasi penulisan dibatalkan secara aman.

---

## 2. Penggunaan Perintah CLI

### Memformat Berkas ke Standar Output
Menampilkan hasil format ke terminal tanpa memodifikasi berkas asli di penyimpanan:
```bash
nusantara format berkas.nusantara
```

### Memeriksa Format (`--cek`)
Memeriksa apakah berkas sudah mematuhi standar pemformatan resmi tanpa melakukan perubahan apa pun:
```bash
nusantara format --cek berkas.nusantara
```
**Kode Status Keluar:**
- `0`: Berkas sudah rapi dan terformat dengan benar (`File sudah terformat: ...`).
- `1`: Berkas belum mengikuti format standar (`File belum mengikuti format standar: ...`).

### Memformat Langsung di Berkas (`--tulis` / `-w`)
Memformat berkas langsung secara aman (in-place) setelah melalui safety check:
```bash
nusantara format --tulis berkas.nusantara
# atau bentuk singkat:
nusantara format -w berkas.nusantara
```

### Memformat Seluruh Proyek
Memformat semua berkas `*.nusantara` dalam direktori proyek secara rekursif (otomatis mengabaikan folder `.git`, `.nusantara`, dan `node_modules`):
```bash
nusantara format . --tulis
```

---

## 3. Aturan Standar Tata Letak Kode (Code Style)

| Elemen Sintaks | Format Standar | Contoh |
| :--- | :--- | :--- |
| **Indentasi** | 4 spasi (bukan tab) | `    variabel x: bilangan = 10` |
| **Spasi Operator** | 1 spasi di kiri dan kanan | `a + b * c`, `x == y` |
| **Pemisah Koma** | 1 spasi setelah tanda koma | `[1, 2, 3]`, `f(a, b)` |
| **Tipe Data Titik Dua** | Menempel pada nama, spasi setelah titik dua | `variabel nama: teks = "Budi"` |
| **Blok Kontrol Alur** | Kata kunci penutup sejajar dengan pembuka | `jika ... maka`, `selain`, `akhir` |
| **Blok Fungsi** | Tubuh terindentasi di antara `mulai` dan `selesai` | `fungsi ... mulai ... selesai` |

---

## 4. Konfigurasi (`nusantara.toml`)

Konfigurasi pemformat dapat disesuaikan pada berkas manifes proyek:

```toml
[nusantara]
nama = "proyekku"
versi = "1.0.0"

[format]
indentasi = 4               # Jumlah spasi per tingkat indentasi (1 sampai 8)
panjang_baris = 100         # Rekomendasi batas panjang karakter baris
spasi_operator = true       # Sisipkan spasi di sekitar operator biner
spasi_koma = true           # Sisipkan spasi setelah tanda koma
spasi_sebelum_titik_dua = false # Sisipkan spasi sebelum titik dua tipe
```
