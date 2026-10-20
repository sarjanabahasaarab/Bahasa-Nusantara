# Referensi Pengguna: Package Manager NUSANTARA (`nusantara`) — Phase 16

Dokumen ini merupakan panduan referensi resmi pengguna untuk pengelolaan paket dan dependensi pada bahasa pemrograman **NUSANTARA** menggunakan antarmuka baris perintah (*CLI*) `nusantara`.

Target Milestone: `v0.16.0`  
Status: **[DITETAPKAN untuk Phase 16]**

---

## 1. Konsep Paket NUSANTARA

Paket (*package*) dalam ekosistem NUSANTARA adalah kumpulan kode program dan modul terstruktur yang memiliki berkas manifest resmi `nusantara.toml`. Paket memungkinkan kode untuk dibagikan, dipasang, diperbarui, dan digunakan kembali oleh proyek lain secara modular.

Struktur standar sebuah paket:
```text
nama-paket/
├── nusantara.toml      # Manifest identitas dan daftar dependensi
├── nusantara.lock      # Berkas kunci resolusi versi (dihasilkan otomatis)
├── README.md           # Dokumentasi paket
└── src/
    └── utama.nusantara # Titik masuk modul utama
```

---

## 2. Berkas Manifest: `nusantara.toml`

Berkas `nusantara.toml` menggunakan format TOML resmi dan memuat metadata paket serta tabel dependensi:

```toml
[nusantara]
nama = "kalkulator"
versi = "1.0.0"
deskripsi = "Pustaka kalkulator ilmiah dan aritmatika Nusantara"
lisensi = "MIT"
penulis = "Pengembang Nusantara <pengembang@nusantara.lang>"
repository = "https://github.com/nusantara-lang/kalkulator"

[dependensi]
matematika = "1.2.0"
teks = "^2.0.0"
utilitas = { path = "../utilitas" }
```

### Format Batasan Versi Dependensi:
- **Versi Persis**: `"1.2.0"` — Mengunci tepat ke versi `1.2.0`.
- **Caret (`^`)**: `"^1.2.0"` — Kompatibel dengan versi `>=1.2.0 <2.0.0`.
- **Tilde (`~`)**: `"~1.2.0"` — Kompatibel dengan perbaikan patch `>=1.2.0 <1.3.0`.
- **Wildcard**: `"1.x"`, `"*"` — Memilih versi rilis dalam kelompok mayor atau sembarang versi.
- **Jalur Lokal (*Path Dependency*)**: `{ path = "./paket/matematika" }` — Dependensi berbasis direktori berkas lokal tanpa registri.

---

## 3. Berkas Kunci Dependensi: `nusantara.lock`

Berkas `nusantara.lock` mencatat versi pasti (*pinned version*), sumber, dan hash integritas dari seluruh pohon dependensi yang terpasang. Berkas ini memastikan replikasi build yang 100% deterministik (*reproducible builds*) antar-lingkungan mesin.

Contoh struktur `nusantara.lock`:
```toml
# Berkas Kunci Dependensi NUSANTARA (nusantara.lock)
# Dihasilkan secara otomatis oleh Package Manager. JANGAN EDIT MANUAL.

versi_format = 1

[[paket]]
nama = "matematika"
versi = "1.2.0"
sumber = "registri:matematika@1.2.0"
integritas = "sha256-4a1b..."

[[paket]]
nama = "utilitas"
versi = "0.5.0"
sumber = "path:../utilitas"
integritas = "sha256-8f3c..."
```

---

## 4. Perintah Baris Perintah (CLI Commands)

### A. Membuat Paket Baru (`nusantara buat`)
Membuat struktur proyek atau pustaka baru dengan konfigurasi awal yang sah:
```bash
nusantara buat proyekku
```
Hasil:
- Membuat folder `proyekku/`
- Menghasilkan berkas `nusantara.toml` awal
- Menghasilkan berkas `src/utama.nusantara`
- Menghasilkan berkas `README.md`

### B. Memasang Dependensi (`nusantara pasang`)
Menyelesaikan grafik dependensi, memvalidasi siklus, memeriksa konflik versi, dan memasang berkas paket ke direktori `.nusantara/paket/`:
```bash
nusantara pasang
```
Opsi deterministik:
```bash
nusantara pasang --terkunci
```
Opsi `--terkunci` memastikan bahwa instalasi hanya membaca `nusantara.lock` tanpa menaikkan atau mengubah versi yang telah terkunci.

### C. Menghapus Dependensi (`nusantara hapus`)
Menghapus paket dari `nusantara.toml` dan membersihkan berkas paket dari `.nusantara/paket/`:
```bash
nusantara hapus matematika
```
Sistem akan memvalidasi apakah paket tersebut masih menjadi dependensi dari paket lain sebelum menghapusnya.

### D. Memperbarui Dependensi (`nusantara perbarui`)
Memeriksa pembaruan versi minor dan patch terbaru yang masih mematuhi batasan SemVer di `nusantara.toml`:
```bash
nusantara perbarui
```
Atau memperbarui paket spesifik:
```bash
nusantara perbarui matematika
```

### E. Menampilkan Daftar Dependensi (`nusantara daftar`)
Menampilkan status dependensi yang terpasang:
```bash
nusantara daftar
```
Contoh luaran:
```text
Dependency proyek:

  matematika       1.2.0      (terpasang: 1.2.0)
  teks             ^2.0.0     (terpasang: 2.1.0)
```

### F. Informasi Proyek (`nusantara info`)
Menampilkan ringkasan paket proyek aktif:
```bash
nusantara info
```

---

## 5. Integrasi dengan Sistem Modul

Setelah paket terpasang via `nusantara pasang`, kode program `.nusantara` dapat langsung mengimpor modul dari paket tersebut menggunakan sintaks resmi Phase 15:

```nusantara
program ProgramUtama

gunakan matematika
gunakan teks

mulai
    hasil : bilangan = matematika.tambah(10, 20)
    tampilkan("Hasil:", hasil)
selesai
```

Resolver modul secara otomatis memeriksa direktori `.nusantara/paket/<nama>/` tanpa membutuhkan path manual tambahan.

---

## 6. Penanganan Kesalahan & Keamanan

### A. Deteksi Ketergantungan Melingkar
```text
Kesalahan dependency:

terdeteksi dependency melingkar:

A
→ B
→ C
→ A
```

### B. Deteksi Konflik Versi
```text
Kesalahan dependency:

versi package 'matematika' tidak dapat memenuhi
semua kebutuhan dependency.

Dibutuhkan:
1.x (dibutuhkan oleh modul_a)
2.x (dibutuhkan oleh modul_b)
```

### C. Perlindungan Keamanan (Path Traversal)
Percobaan menulis atau membaca di luar direktori proyek menggunakan pola `../` tak terkendali akan ditolak dengan `GalatKeamananPaket`.
