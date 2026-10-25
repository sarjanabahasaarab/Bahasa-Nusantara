# Panduan Distribusi & Paket Rilis NUSANTARA (v0.23.0)

Dokumen ini menjelaskan struktur arsip distribusi, platform target, skrip pemasang (*installer foundation*), serta verifikasi integritas kriptografis SHA-256.

---

## 1. Platform Target Resmi

Bahasa NUSANTARA v0.23.0 mendistribusikan paket biner resmi untuk 4 platform target utama:

| Target Platform | Sistem Operasi | Arsitektur | Format Arsip | Executable Utama |
|---|---|---|---|---|
| `windows-x64` | Windows | x86_64 / AMD64 | `.zip` | `bin/nusantara.cmd` & `bin/nusantara.bat` |
| `linux-x64` | Linux (glibc/musl) | x86_64 / AMD64 | `.tar.gz` & `.zip` | `bin/nusantara` (POSIX shell) |
| `macos-x64` | macOS (Intel) | x86_64 | `.tar.gz` & `.zip` | `bin/nusantara` (POSIX shell) |
| `macos-arm64` | macOS (Apple Silicon M-series) | ARM64 / aarch64 | `.tar.gz` & `.zip` | `bin/nusantara` (POSIX shell) |

---

## 2. Struktur Isi Paket Distribusi

Setiap arsip distribusi platform memiliki struktur terstandarisasi yang mandiri (*self-contained*):

```
nusantara-v0.23.0-<platform>/
├── bin/
│   ├── nusantara           (Script peluncur resmi untuk Linux & macOS)
│   ├── nusantara.cmd       (Script peluncur batch resmi untuk Windows)
│   └── nusantara.bat       (Script alternatif kompatibilitas Windows)
├── lib/
│   ├── nusantara-core.js   (Mesin runtime dan kompilator terpaket)
│   └── bundle-cli.js       (Metadata executable toolchain)
├── std/
│   ├── teks.nusantara      (Pustaka standar manipulasi teks)
│   ├── matematika.nusantara(Pustaka standar matematika & aljabar)
│   ├── konversi.nusantara  (Pustaka konversi tipe data)
│   └── sistem.nusantara    (Pustaka akses sistem, versi & platform)
├── docs/
│   ├── README.md           (Panduan cepat penggunaan)
│   └── INSTALASI.md        (Panduan instalasi khusus platform)
├── install.bat / install.sh(Pemasang resmi dengan opsi PATH)
├── LICENSE                 (Lisensi resmi Apache-2.0)
└── README.md
```

---

## 3. Pemasang Resmi & Pengaturan PATH

### 3.1 Windows (`install.bat`)
Paket Windows menyertakan `install.bat` yang mengekstrak berkas ke folder pengguna (`%LOCALAPPDATA%\Nusantara`).
Pemasang **tidak mengubah PATH pengguna secara diam-diam**, melainkan memberikan petunjuk eksplisit:
```cmd
setx PATH "%PATH%;%LOCALAPPDATA%\Nusantara\bin"
```

### 3.2 Linux & macOS (`install.sh`)
Skrip `install.sh` memasang biner ke `$HOME/.nusantara` secara default:
```bash
./install.sh
# Menambahkan ke PATH:
export PATH="$HOME/.nusantara/bin:$PATH"
```

### 3.3 Catatan Keamanan macOS (Gatekeeper)
Untuk rilis awal biner yang belum ditandatangani sertifikat berbayar Apple Developer ID (*unsigned binary*), pengguna macOS dapat menghapus atribut karantina via Terminal:
```bash
xattr -dr com.apple.quarantine "$HOME/.nusantara"
```

---

## 4. Verifikasi Integritas Checksum (SHA-256)

Setiap direktori keluaran `dist/` menyertakan berkas `SHA256SUMS` berformat standar UNIX:
```text
<hash_sha256>  nusantara-v0.23.0-windows-x64.zip
<hash_sha256>  nusantara-v0.23.0-linux-x64.tar.gz
<hash_sha256>  nusantara-v0.23.0-macos-arm64.tar.gz
```

Cara verifikasi manual:
- **Linux**: `sha256sum -c SHA256SUMS`
- **macOS**: `shasum -a 256 -c SHA256SUMS`
- **Windows (PowerShell)**: `Get-FileHash -Algorithm SHA256 nusantara-v0.23.0-windows-x64.zip`
