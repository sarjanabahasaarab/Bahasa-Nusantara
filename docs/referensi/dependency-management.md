# Referensi Pengguna: Ekosistem Paket & Manajemen Dependensi NUSANTARA — Phase 27

Dokumen ini merupakan panduan referensi resmi dan spesifikasi arsitektur ekosistem paket dan manajemen dependensi bahasa pemrograman **NUSANTARA** pada Phase 27.

Target Milestone: `v0.27.0`  
Status: **[DITETAPKAN untuk Phase 27]**

---

## 1. Ikhtisar Arsitektur Alur Dependensi

Ekosistem paket NUSANTARA dirancang untuk memberikan pengalaman manajemen dependensi modern, aman, deterministik, dan dapat direproduksi (*reproducible*).

### Alur Konsumsi Dependensi Proyek:
```text
NUSANTARA PROJECT
        ↓
Project Manifest (nusantara.toml)
        ↓
Dependency Resolver (SemVer & Constraint Engine)
        ↓
Lockfile (nusantara.lock)
        ↓
Package Cache (~/.nusantara/cache/paket atau .nusantara_cache)
        ↓
Registry (Registri Lokal / Jaringan)
        ↓
Install (paket_modules/)
        ↓
Build (Compiler & Bundler)
        ↓
Run (Interpreter & Runtime)
```

### Alur Penerbitan Paket Pengembang:
```text
Developer
    ↓
Create Package (nusantara inisialisasi --pustaka)
    ↓
Test (nusantara uji)
    ↓
Package (nusantara bangun --arsip)
    ↓
Publish (nusantara terbit)
    ↓
Registry (Penyimpanan Arsip .npk & Metadata)
    ↓
Other Developers
    ↓
Install (nusantara tambah <nama>)
```

---

## 2. Berkas Manifest Proyek: `nusantara.toml`

Berkas `nusantara.toml` adalah dokumen konfigurasi berformat TOML resmi yang mendefinisikan identitas proyek dan deklarasi dependensi.

```toml
[nusantara]
nama = "layanan-web"
versi = "1.0.0"
deskripsi = "Layanan REST API backend menggunakan bahasa Nusantara"
lisensi = "MIT"
penulis = "Tim Rekayasa Nusantara <tim@nusantara.lang>"
repository = "https://github.com/nusantara-lang/layanan-web"

[dependensi]
matematika = "^1.2.0"
kripto = "~2.1.0"
utilitas = ">=0.5.0"
pencatat = "*"
parser-json = "1.0.4"
internal-alat = { path = "../pustaka-internal" }

[pengembangan-dependensi]
kerangka-uji = "^1.0.0"
alat-dokumentasi = "^0.4.0"
```

### Aturan Batasan Versi (SemVer Constraints):
1. **Caret (`^x.y.z`)**:
   - `^1.2.3` cocok dengan `>=1.2.3 <2.0.0` (kompatibilitas API mayor).
   - `^0.2.3` cocok dengan `>=0.2.3 <0.3.0` (kompatibilitas minor pra-1.0).
2. **Tilde (`~x.y.z`)**:
   - `~1.2.3` cocok dengan `>=1.2.3 <1.3.0` (pembaruan patch aman).
3. **Rentang Perbandingan (`>=`, `<=`, `>`, `<`)**:
   - Menentukan ambang batas minimum atau maksimum versi yang diizinkan.
4. **Wildcard (`*`, `x`)**:
   - Memilih rilis versi stabil tertinggi yang tersedia.
5. **Versi Persis (`1.0.4`)**:
   - Hanya mengizinkan versi tersebut secara identik.
6. **Path Dependency (`{ path = "..." }`)**:
   - Menghubungkan paket lokal pada filesystem tanpa resolusi registri jarak jauh.

---

## 3. Berkas Kunci Reproducible: `nusantara.lock`

Berkas `nusantara.lock` mencatat versi persis, checksum integritas SHA-256 (`sha256-...`), dan relasi dependensi transitif.

```toml
# Berkas Kunci Dependensi NUSANTARA (nusantara.lock)
# Dihasilkan secara otomatis oleh PengelolaPaket Phase 27. JANGAN EDIT MANUAL!
versi-format = 2
waktu-dibuat = "2026-10-26T04:00:00.000Z"

[[paket]]
nama = "matematika"
versi = "1.2.3"
sumber = "registri:resmi"
integritas = "sha256-4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
dependensi = {}

[[paket]]
nama = "internal-alat"
versi = "0.5.0"
sumber = "path:../pustaka-internal"
integritas = "sha256-c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2"
dependensi = {}
```

---

## 4. Perintah Baris Perintah (CLI) Phase 27

### 4.1 `nusantara pasang` / `nusantara install`
Memasang seluruh dependensi dari manifest `nusantara.toml`.
- `--terkunci` / `--locked`: Mode build reproduktif ketat. Memastikan versi yang dipasang 100% cocok dengan `nusantara.lock` dan memverifikasi integritas hash SHA-256. Gagal jika ada ketidakcocokan atau dependensi hilang di lockfile.
- `--lewati-cache` / `--no-cache`: Mengabaikan cache lokal dan memvalidasi ulang ke registri.
- `--json`: Keluaran berformat JSON terstruktur untuk otomasi CI/CD.

```bash
# Pemasangan reguler
$ nusantara pasang

# Pemasangan deterministik CI/CD
$ nusantara pasang --terkunci
```

### 4.2 `nusantara tambah <nama> [batasan]` / `nusantara add`
Menambahkan dependensi baru ke `nusantara.toml` dan langsung memasangnya serta memperbarui `nusantara.lock`.
- Opsi `--dev` / `--pengembangan`: Menambahkan ke tabel `[pengembangan-dependensi]`.
- Opsi `--path <jalur>`: Menambahkan dependensi berbasis jalur direktori lokal.

```bash
# Tambah dari registri dengan batasan default
$ nusantara tambah matematika

# Tambah dengan batasan spesifik
$ nusantara tambah kripto "^2.0.0"

# Tambah dependensi pengujian lokal
$ nusantara tambah alat-uji --dev --path ./alat/uji
```

### 4.3 `nusantara hapus <nama>` / `nusantara remove`
Menghapus dependensi dari `nusantara.toml`, mencopot dari direktori instalasi, dan memperbarui `nusantara.lock`.

```bash
$ nusantara hapus utilitas-lama
```

### 4.4 `nusantara perbarui [nama]` / `nusantara update`
Memperbarui dependensi ke versi rilis terbaru yang masih memenuhi batasan versi di `nusantara.toml`.

```bash
# Perbarui seluruh paket
$ nusantara perbarui

# Perbarui paket tertentu saja
$ nusantara perbarui matematika
```

### 4.5 `nusantara pohon` / `nusantara tree` / `nusantara graf`
Menampilkan diagram visual pohon hierarki dependensi proyek, mendeteksi jalur dependensi langsung dan transitif.

```bash
$ nusantara pohon
layanan-web@1.0.0
├── matematika@1.2.3
│   └── algoritma-dasar@1.0.1
└── kripto@2.1.0
```

### 4.6 `nusantara audit`
Menjalankan audit keamanan mendalam:
1. Memeriksa keberadaan dependensi sirkular (*circular dependency*).
2. Memeriksa konflik versi ganda pada pohon ketergantungan.
3. Memvalidasi integritas hash SHA-256 antara berkas instalasi fisik terhadap entri di `nusantara.lock`.

```bash
$ nusantara audit
Audit Keamanan Ekosistem Paket NUSANTARA
========================================
✔ Tidak ditemukan dependensi sirkular.
✔ Tidak ditemukan konflik versi.
✔ Semua hash integritas lockfile terverifikasi valid (SHA-256).
Status: AMAN (0 kerentanan)
```

### 4.7 `nusantara bersihkan-cache` / `nusantara cache-clean`
Menghapus seluruh salinan paket yang di-cache di lingkungan lokal untuk mengosongkan ruang atau mereset keadaan.

```bash
$ nusantara bersihkan-cache
```

---

## 5. Integrasi Lintas Sistem

1. **CLI & Build System**: Compiler `nusantara bangun` secara otomatis menyelesaikan modul dari `paket_modules/` dan cache jika diperlukan.
2. **Registri Phase 22**: Terkoneksi mulus dengan `RegistriLokal` dan antarmuka registri jaringan.
3. **IDE Phase 26**: Menu `StudioEkosistemPaket` menyediakan tab Dependensi dan Cache visual dengan aksi satu klik untuk audit keamanan, pemasangan terkunci, dan pembersihan cache.
4. **CI/CD Phase 24**: Pipeline `mesinCI.ts` mengeksekusi `nusantara pasang --terkunci` dan `nusantara audit` pada tahap pemeriksaan kualitas.
5. **Sistem Integritas**: Deteksi manipulasi berkas (*tamper detection*) otomatis aktif sebelum paket diekstraksi ke direktori proyek.
