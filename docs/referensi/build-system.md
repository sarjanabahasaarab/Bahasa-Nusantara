# Panduan Referensi Sistem Build NUSANTARA (v0.23.0)

Dokumen ini memuat spesifikasi teknis dan panduan operasional Sistem Build resmi Bahasa Pemrograman NUSANTARA.

---

## 1. Ikhtisar Sistem Build

Sistem Build NUSANTARA bertanggung jawab mentransformasikan kode sumber program, pustaka standar (*standard library*), konfigurasi proyek, dan perkakas runtime menjadi paket distribusi rilis yang siap pakai (*production-ready release artifacts*).

### Alur Pipeline Build Resmi
```
Kode Sumber (.nusantara)
         ↓
Konfigurasi (nusantara.toml [build])
         ↓
Resolusi Dependensi Proyek (nusantara.lock)
         ↓
Validasi Sintaksis & Parser
         ↓
Audit Keamanan & Kredensial
         ↓
Pengujian Otomatis (Pre-release Quality Gate)
         ↓
Penyusunan Struktur Rilis (bin, lib, std, docs)
         ↓
Pembuatan Arsip (.zip & .tar.gz)
         ↓
Kalkulasi Checksum (SHA256SUMS)
         ↓
Generasi Manifest Rilis (release-manifest.json)
         ↓
Validasi Artefak & Smoke Test
```

---

## 2. Perintah Baris Perintah (CLI)

### 2.1 `nusantara bangun`
Membangun proyek atau artefak distribusi resmi.

```bash
# Membangun mode release untuk seluruh platform resmi
nusantara bangun

# Membangun mode debug (tanpa optimasi biner penuh)
nusantara bangun --mode debug

# Membangun untuk platform tertentu saja
nusantara bangun --target windows-x64
nusantara bangun --target linux-x64
nusantara bangun --target macos-arm64

# Pembersihan otomatis sebelum build
nusantara bangun --bersih

# Melewatkan pengujian pra-rilis (hanya untuk pengujian cepat lokal)
nusantara bangun --tanpa-uji
```

### 2.2 `nusantara bersihkan` / `nusantara clean`
Menghapus seluruh artefak perantara dan hasil build pada direktori `dist/` dan `target/`. Perintah ini menjamin tidak menyentuh kode sumber di `src/`, berkas pengujian di `pengujian/`, dokumentasi di `docs/`, berkas manifest `nusantara.toml`, atau riwayat `.git/`.

```bash
nusantara bersihkan
```

### 2.3 `nusantara rilis`
Jalan pintas resmi (*alias*) untuk `nusantara bangun --mode release` yang menjalankan seluruh gerbang pengujian kualitas dan validasi artefak.

```bash
nusantara rilis
```

### 2.4 `nusantara info`
Menampilkan informasi arsitektur host, platform OS, versi rilis, mode build default, dan direktori penemuan sumber daya.

```bash
nusantara info
```

---

## 3. Konfigurasi `nusantara.toml` ([build])

Sistem build membaca konfigurasi deklaratif dari berkas `nusantara.toml` pada bagian `[build]`:

```toml
[nusantara]
nama = "aplikasi-saya"
versi = "0.23.0"
deskripsi = "Aplikasi dengan sistem build NUSANTARA"

[build]
mode = "release"                  # "release" atau "debug"
target = [                        # Target platform yang didukung
  "windows-x64",
  "linux-x64",
  "macos-x64",
  "macos-arm64"
]
output = "dist"                   # Direktori artefak rilis
direktori_build = "target"        # Direktori kompilasi perantara
optimasi = true                   # Minifikasi / optimasi byte-code
stdlib = true                     # Sertakan standard library resmi
dokumentasi = true                # Sertakan berkas panduan rilis
lisensi = true                    # Sertakan salinan lisensi resmi
verifikasi_uji = true             # Wajib lolos seluruh penegasan uji sebelum rilis
reproducible = true               # Normalisasi stempel waktu dan izin berkas
```

---

## 4. Reproducible Builds (Keterulangan Hasil)

Sistem build NUSANTARA menerapkan prinsip *Reproducible Build Foundation*:
1. **Pengurutan Deterministik**: Berkas dalam arsip ZIP dan TAR selalu diurutkan secara alfabetis leksikografis.
2. **Normalisasi Stempel Waktu (Timestamp)**: Metadata waktu arsip distandardisasi ke `2026-01-01 00:00:00 UTC` sehingga dua proses build dari kode sumber yang identik menghasilkan *byte-identical checksum*.
3. **Pembersihan Jalur Absolut Mesin Pengembang**: Tidak ada jalur lokal (`/home/user/...` atau `C:\Users\...`) yang tersimpan dalam artefak rilis.
