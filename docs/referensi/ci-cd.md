# Referensi Teknis CI/CD & Alur Kerja GitHub Actions NUSANTARA

Target Milestone: **Phase 24 (`v0.24.0`)**  
Status: **Resmi & Terintegrasi**

Bahasa Pemrograman NUSANTARA menerapkan infrastruktur Continuous Integration (CI) dan Automated Release Distribution berbasis **GitHub Actions** yang profesional, mengutamakan keamanan *least privilege*, pengujian otomatis berjenjang, dan perlindungan gerbang persetujuan manual rilis.

---

## 1. Arsitektur Pipeline CI/CD

Alur kerja dirancang untuk memvalidasi setiap perubahan sebelum dapat digabungkan dan dirilis:

```
Developer Push / PR
       ↓
[Pemeriksaan Statis (Lint/TSC)]
       ↓
[Pengujian Otomatis (Phase 1–24)]
       ↓
[Gerbang Kualitas (Quality Gate)]
       ↓
[Validasi Matriks Build (4 OS)]
       ↓
[Ringkasan CI (GITHUB_STEP_SUMMARY)]
       ↓
(Alur Rilis Manual Terpisah)
       ↓
[Verifikasi Persetujuan (confirm_release=true)]
       ↓
[Pengujian & Kompilasi Artefak Bersih]
       ↓
[Penyusunan Checksum SHA-256 & Manifest]
       ↓
[Publikasi GitHub Release (contents: write)]
```

---

## 2. Berkas Alur Kerja (`.github/workflows/`)

Repositori memelihara dua berkas alur kerja utama dengan pemisahan tugas yang tegas:

| Berkas Workflow | Trigger Event | Hak Akses Root | Tujuan Utama |
| :--- | :--- | :--- | :--- |
| **`.github/workflows/ci.yml`** | `push` (main), `pull_request` (main) | `contents: read` | Menjalankan linting, pengujian otomatis multi-OS, Quality Gate, dan build validation sementara. |
| **`.github/workflows/release.yml`** | `workflow_dispatch` (manual), `push tags` (`v*.*.*`) | `contents: read` | Membangun bundel rilis resmi, menghitung SHA-256, dan mempublikasikan release setelah persetujuan manual eksplisit. |

---

## 3. Matriks Platform & Runner Support

Build matrix mencakup 4 platform target utama:

| Target Platform | Runner Host GitHub | Format Artefak | Pemeriksaan Smoke Test |
| :--- | :--- | :--- | :--- |
| **`windows-x64`** | `windows-latest` | `.zip` | Executable `.cmd`, `install.bat`, validasi ZIP |
| **`linux-x64`** | `ubuntu-latest` | `.tar.gz`, `.zip` | Shell launcher, `install.sh`, SHA256SUMS |
| **`macos-x64`** | `macos-13` (Intel) | `.tar.gz`, `.zip` | Validasi UStar TAR & ZIP portable |
| **`macos-arm64`** | `macos-latest` (Apple Silicon) | `.tar.gz`, `.zip` | Validasi arsitektur ARM64 |

---

## 4. Kebijakan Keamanan & *Least Privilege*

1. **Root Permissions**: Seluruh berkas workflow secara default menetapkan:
   ```yaml
   permissions:
     contents: read
   ```
2. **Elevated Permissions Terisolasi**: Hak akses tulis (`contents: write`) HANYA diberikan secara lokal pada satu job khusus publikasi (`publish-release` di `release.yml`).
3. **Pencegahan Kebocoran Rahasia**:
   - Dilarang keras mencetak kredensial atau token ke log workflow (`echo secrets.*`).
   - Audit otomatis menolak commit yang menyertakan token API, private keys, atau berkas `.env`.
4. **Proteksi Concurrency**:
   - `ci.yml`: Membatalkan run lama pada Pull Request (`cancel-in-progress: true`), namun mempertahankan riwayat eksekusi pada branch utama.
   - `release.yml`: Melarang keras pembatalan alur kerja rilis yang sedang berjalan (`cancel-in-progress: false`).

---

## 5. Gerbang Persetujuan Rilis Manual (*Release Approval Gate*)

Untuk mencegah publikasi rilis publik yang tidak disengaja dari alur CI otomatis:
- Alur rilis **tidak pernah dipicu secara otomatis** dari push commit biasa.
- Menggunakan pemicu manual `workflow_dispatch` dengan input wajib:
  ```yaml
  inputs:
    confirm_release:
      description: 'Konfirmasi eksplisit: Setujui publikasi rilis resmi NUSANTARA'
      type: boolean
      required: true
      default: false
  ```
- Jika `confirm_release` bernilai `false`, tahapan `verify-release-approval` akan langsung menggagalkan alur kerja (*fail-fast*) sebelum build dimulai.

---

## 6. CLI Integration (Phase 24)

Kompilator CLI NUSANTARA menyediakan perintah untuk menjalankan validasi CI dan audit alur kerja secara lokal:

```bash
# Menjalankan seluruh alur validasi CI lokal (statis, uji, quality gate, matriks build)
nusantara ci

# Menghasilkan output Markdown terstandar GitHub Step Summary
nusantara ci --markdown

# Memeriksa sintaks dan keamanan berkas alur kerja GitHub Actions
nusantara ci periksa-workflow

# Mensimulasikan gerbang rilis dan validasi prasyarat
nusantara ci --rilis --setujui
```
