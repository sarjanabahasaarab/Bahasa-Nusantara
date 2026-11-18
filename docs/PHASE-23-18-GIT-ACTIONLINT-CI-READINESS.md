# NUSANTARA — PHASE 23.18: GIT CHECKOUT RECOVERY, ACTIONLINT VALIDATION & CI EXECUTION READINESS

- **Proyek:** NUSANTARA Programming Language & NUSANTARA OS (`https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git`)
- **Baseline:** Phase 23.16 (`IMPLEMENTATION COMPLETE`), Phase 23.17 (`PARTIAL / BLOCKED`), `v0.50.0`
- **Tanggal Audit:** 18 November 2026
- **Lingkungan Audit:** Kontainer Linux `x86_64` (`Node.js v22.23.2`, `npm 10.9.8`, `actionlint v1.7.12` resmi terverifikasi SHA-256)
- **Status Akhir Phase 23.18:** **`BLOCKED / PARTIAL`** *(belum **`IMPLEMENTATION VALIDATED`** karena Git Checkout Audit **`BLOCKED`** akibat ketiadaan `.git` di kontainer dan eksekusi aktual GitHub Actions + Release Dry-Run di runner GitHub masih **`NOT_VERIFIED`**)*
- **Status Sertifikasi Phase 23 & Phase 36–42:** **`PARTIAL`** *(bukan `CROSS-PLATFORM CERTIFIED`)*
- **Status Tag, Rilis Publik & Publikasi Toko:** **`BLOCKED`**

---

## 1. Status Penuntasan Tiga Blocker Phase 23.17

| # | Blocker dari Phase 23.17 | Status Phase 23.18 | Ringkasan Bukti Faktual |
| :-: | :--- | :---: | :--- |
| **1** | Validasi 4 workflow dengan `actionlint` resmi | **`PASS`** | Biner resmi **`actionlint v1.7.12`** (SHA-256 diverifikasi terhadap `actionlint_1.7.12_checksums.txt`) dijalankan pada 4 workflow: **0 parse error, 0 workflow error (`exit 0`)**. *(Catatan jujur: plugin opsional `shellcheck` & `pyflakes` tidak terpasang di `$PATH` kontainer).* |
| **2** | Git Checkout Audit pada checkout asli | **`BLOCKED`** | Direktori `.git` tidak tersedia di kontainer (`/app/applet`). Sesuai aturan Section B, tidak ada repositori Git baru yang dibuat; operator wajib membuka checkout asli `Bahasa-Nusantara.git`. |
| **3** | Eksekusi GitHub Actions (`clean-install`, runner availability, `release.yml` dry-run) | **`NOT_VERIFIED`** (Kesiapan Workflow **`PASS`**) | Job `clean-install` (tanpa cache npm) telah ditambahkan ke `.github/workflows/ci.yml` dan lolos `actionlint` + `test:cicd` (`27/27`), simulasi lokal & clean `npm ci` terisolasi lulus, namun eksekusi pada runner GitHub Actions aktual belum dijalankan (push/PR/tag dilarang pada tahap ini). |

---

## 2. Hasil Git Checkout Audit (Section B) — **`BLOCKED`**

### 2.1 Log Perintah Git Aktual
```text
$ git rev-parse --show-toplevel
fatal: not a git repository (or any of the parent directories): .git

$ git branch --show-current
fatal: not a git repository (or any of the parent directories): .git

$ ls -la .git
ls: cannot access '.git': No such file or directory
```

- **Tindakan Aman:** Audit Git dihentikan dan dilaporkan **`BLOCKED`**. Tidak ada `git init`, `git reset`, `git clean`, atau penghapusan file otomatis yang dijalankan.
- **Permintaan ke Operator:** Buka checkout Git asli `https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git` pada mesin/runner operator dan jalankan:
  ```bash
  git rev-parse --show-toplevel
  git branch --show-current
  git status --short --untracked-files=all
  git diff --check
  git diff --stat
  git diff
  git ls-files
  ```

### 2.2 Audit Berkas Khusus di Disk (Tanpa Penghapusan Otomatis)

| Jalur | Kondisi Aktual di Disk | Klasifikasi & Tindakan Operator pada Checkout Git Asli |
| :--- | :--- | :--- |
| `bun.lock` | Ada (`67 KB`, timestamp sesi kontainer) | **Artefak harness runtime Bun kontainer** (`workspaces[""].name: "react-example"`). **Jangan di-commit ke PR `main`.** |
| `data.sqlite` | Ada (`28 KB`, root workspace) | **Basis data uji lokal.** Pastikan tidak ikut ter-stage di PR `main`. |
| `dist/` | Ada (`index.html`, bundle Vite) | **Output build sementara** (terdaftar di `.gitignore`). Jangan di-commit. |
| `artifacts/demo-terpadu/` | Ada (`20` artefak + `manifest.json` + `SHA256SUMS`) | Tervalidasi ketat (`20/20 OK`, `structural=4`, `nativeBinary=0`). Sertakan hanya sesuai kebijakan artefak repositori. |
| `artifacts/certification/` | Ada (`CERTIFICATION-GATE-SNAPSHOT.{json,md}`, `TOOLCHAINS-LOCAL.json`) | Snapshot lokal (`overallStatus=PARTIAL`, `commitSha=unavailable-no-git-metadata`). Tidak boleh diklaim sebagai bukti CI GitHub Actions. |

---

## 3. Hasil Validasi Resmi `actionlint` (Section C) — **`PASS`**

- **Versi & Integritas Biner:** `actionlint v1.7.12` (`linux/amd64`, diunduh ke direktori sementara `/tmp/actionlint-bin`, diverifikasi SHA-256 terhadap `actionlint_1.7.12_checksums.txt`: `actionlint_1.7.12_linux_amd64.tar.gz: OK`, lalu dibersihkan dari `/tmp` selesai audit).
- **Log Eksekusi Aktual (Pasca Penambahan Job `clean-install`):**
  ```text
  verbose: Linting 4 files
  verbose: Found 0 parse errors in 0 ms for .github/workflows/kernel-boot-qemu.yml
  verbose: Found total 0 errors in 1 ms for .github/workflows/kernel-boot-qemu.yml
  verbose: Found 0 parse errors in 2 ms for .github/workflows/release.yml
  verbose: Found total 0 errors in 3 ms for .github/workflows/release.yml
  verbose: Found 0 parse errors in 1 ms for .github/workflows/nusantara-os-ci.yml
  verbose: Found total 0 errors in 1 ms for .github/workflows/nusantara-os-ci.yml
  verbose: Found 0 parse errors in 3 ms for .github/workflows/ci.yml
  verbose: Found total 0 errors in 5 ms for .github/workflows/ci.yml
  verbose: Found 0 errors in 4 files
  FINAL_ACTIONLINT_EXIT=0
  ```
- **Catatan Transparan:** Aturan opsional eksternal `shellcheck` dan `pyflakes` tidak aktif karena kedua biner tersebut tidak terpasang di `$PATH` kontainer (`Rule "shellcheck" was disabled`, `Rule "pyflakes" was disabled`).

---

## 4. Audit Kesiapan GitHub Actions (Section D)

| Aspek Pemeriksaan | Status Audit Statis + `actionlint` | Catatan & Bukti |
| :--- | :---: | :--- |
| **Workflow Triggers** | **PASS** | `ci.yml`, `kernel-boot-qemu.yml`, `nusantara-os-ci.yml`: `push`, `pull_request`, `workflow_dispatch`; `release.yml`: `workflow_dispatch` (default `dry_run: true`, `confirm_release: false`) & `push.tags` (`publish-release` diblokir pada `push`). |
| **Job Dependencies (`needs`)** | **PASS** | 27 job lintas 4 workflow (`ci.yml`: 12, `release.yml`: 6, `kernel-boot-qemu.yml`: 1, `nusantara-os-ci.yml`: 8); 0 siklus DAG, seluruh referensi `needs.<id>.result` cocok. |
| **Runner Labels & Opsional ARM64** | **Siap / Eksekusi `NOT_VERIFIED`** | Runner standar (`ubuntu-latest`, `windows-latest`, `macos-latest`) aktif; runner retired `macos-13` dihapus dari matriks aktif. Runner ARM opsional (`windows-11-arm`, `ubuntu-24.04-arm`) menggunakan fallback kondisional aman (`ENABLE_WINDOWS_ARM64_RUNNER` / `DISABLE_LINUX_ARM64_RUNNER`) dan menghasilkan **`NOT_VERIFIED`** jujur bila toolchain/runner ARM64 tidak tersedia. Ketersediaan aktual pada repositori GitHub tetap **`NOT_VERIFIED`** sampai dieksekusi di GitHub Actions. |
| **Matrix Configuration** | **PASS** | `test-suite` (3 OS), `build-matrix-validation` (6 target kanonik desktop), `phase36-gui-matrix` (Linux Xvfb + Windows + macOS), `build-release-artifacts` (6 target dengan `fail-fast: false`). |
| **Artifact Upload / Download & Retention** | **PASS** (Transfer antar-runner: **`NOT_VERIFIED`**) | Seluruh `actions/upload-artifact@v4` (16 langkah lintas 4 workflow) memiliki `retention-days` eksplisit (1–30 hari) dan seluruh `download-artifact@v4` cocok dengan nama/pola artefak hulu. |
| **Permissions** | **PASS** | Least-privilege `permissions: contents: read` pada root keempat workflow; `verify-certification-gate` hanya menambah `checks: read` & `actions: read`; `contents: write` terbatas pada `publish-release` di `release.yml`. |
| **Concurrency** | **PASS** | CI/OS membatalkan run PR lama (`cancel-in-progress: ${{ github.event_name == 'pull_request' }}`); `release.yml` mengunci `cancel-in-progress: false`. |
| **Timeouts** | **PASS** | 27/27 job menetapkan `timeout-minutes` eksplisit (10–45 menit). |
| **Secrets References** | **PASS** | Tidak ada secret toko produksi atau kredensial hardcoded; hanya `GITHUB_TOKEN` bawaan GitHub Actions. |

---

## 5. Persiapan Job `clean-install` & Validasi Lokal (Section E)

### 5.1 Job Baru `clean-install` di `.github/workflows/ci.yml`
Ditambahkan job **`clean-install`** (`NUSANTARA / Clean Install CI`, `runs-on: ubuntu-latest`, `timeout-minutes: 35`, **tanpa cache npm** pada `actions/setup-node@v4`) yang menjalankan 8 perintah wajib secara berurutan:
1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. `npm test`
5. `npm run test:cert-gate`
6. `npm run test:demo-terpadu`
7. `npm run test:cicd`
8. `npm run quality-gate`

Job ini menulis dan mengunggah `artifacts/clean-install/CLEAN-INSTALL-EVIDENCE.json` (artefak `clean-install-evidence`, `retention-days: 14`) berisi: `runner`, `nodeVersion`, `npmVersion`, `commitSha`, `workflowRunId`, `exitCode` (keseluruhan + per perintah), dan `artifactReferences` (termasuk SHA-256 `manifest.json` & `SHA256SUMS`). Job terhubung ke `needs` pada `unified-certification-gate` dan `ci-summary`.

### 5.2 Bukti Validasi Lokal Kontainer (Bukan Bukti GitHub Actions)

| Metadata / Perintah | Nilai / Hasil Aktual Lokal |
| :--- | :--- |
| **Host / Runner Lokal** | Kontainer Linux `x86_64` (bukan runner GitHub Actions) |
| **Node.js / npm** | `v22.23.2` / `10.9.8` |
| **Commit SHA / Workflow Run ID** | `unavailable-no-git-metadata` / `local-run` (`.git` absen) |
| **Clean `npm ci` terisolasi (`/tmp`)** | Exit **`0`** (`added 184 packages in 8s` + `tsc --noEmit` exit `0`) |
| **`npm run lint` (`tsc --noEmit`) & `lint_applet`** | **PASS** (exit `0`) |
| **`npm run build` (`vite build`) & `compile_applet`** | **PASS** (exit `0`, 2297 modul) |
| **`npm test` (Phase 1–50, 46 perintah)** | Exit **`0`**, **0 GAGAL** *(dengan catatan jujur: Phase 23 `46/49` = **3 `NOT_VERIFIED`**; Phase 44 `17/18`, Phase 45 `21/22`, Phase 46 `31/32` = **3 `SKIPPED`** karena `clang` absen di kontainer)* |
| **`npm run test:cert-gate`** | **10/10 LULUS** (`0` gagal) |
| **`npm run test:demo-terpadu`** | **7/7 LULUS** (`0` gagal; `20/20` artefak `SHA256SUMS` OK) |
| **`npm run test:cicd`** | **27/27 LULUS** (`0` gagal) |
| **`npm run quality-gate`** | **29/29 LULUS** (`0` gagal) |
| **Eksekusi Job `clean-install` di GitHub Actions** | **`NOT_VERIFIED`** *(menunggu PR/run di GitHub Actions)* |

---

## 6. Validasi Release Dry-Run (Section F)

Pengujian dilakukan untuk skenario `dry_run=true`, `confirm_release=false` tanpa membuat tag, tanpa membuat release, dan tanpa unggah ke toko:

1. **Bukti Kondisi Ekspresi `publish-release`:**
   - Guard pada `.github/workflows/release.yml` baris 347:
     `if: ${{ github.event_name == 'workflow_dispatch' && inputs.dry_run != true && inputs.confirm_release == true }}`
   - Matriks kebenaran terverifikasi:
     - `event=workflow_dispatch, dry_run=true, confirm_release=false` -> **`publish-release` TIDAK BERJALAN (`false`)**
     - `event=workflow_dispatch, dry_run=true, confirm_release=true` -> **`publish-release` TIDAK BERJALAN (`false`)**
     - `event=workflow_dispatch, dry_run=false, confirm_release=false` -> **`publish-release` TIDAK BERJALAN (`false`)**
     - `event=push` (push tag `v*.*.*`), `dry_run=false, confirm_release=true` -> **`publish-release` TIDAK BERJALAN (`false`)**
     - Hanya `(workflow_dispatch, dry_run=false, confirm_release=true)` yang mengizinkan eksekusi, dan tetap bergantung pada `needs: [compile-release-bundle, verify-certification-gate]`.
2. **Bukti CLI Certification Gate Mode Dry-Run vs Ketat:**
   - `scripts/certification-gate.ts evaluate ... --dry-run` -> `RELEASE_DRY_RUN_EVAL_EXIT=0`, tetap melaporkan jujur `Verdict: PARTIAL (overallStatus=PARTIAL, gatePassed=false, PASS=0/8, NOT_VERIFIED=8)`.
   - `scripts/certification-gate.ts evaluate ... --require-ci-provenance` -> `RELEASE_STRICT_EVAL_EXIT=1`, melaporkan `Verdict: FAILED (overallStatus=FAIL, gatePassed=false)`.
3. **Eksekusi `workflow_dispatch` (`dry_run=true`, `confirm_release=false`) pada GitHub Actions nyata:** **`NOT_VERIFIED`** sampai dijalankan pada repositori GitHub.

---

## 7. Evaluasi Kriteria Penyelesaian (Section H) & Langkah Operator Berikutnya

| Kriteria Section H | Status | Keterangan |
| :--- | :---: | :--- |
| 1. Git audit selesai | **`BLOCKED`** | `.git` tidak tersedia di kontainer. |
| 2. `actionlint` lulus pada 4 workflow | **`PASS`** | `actionlint v1.7.12` resmi keluar `0` (`Found 0 errors in 4 files`). |
| 3. Workflow dependencies valid | **`PASS`** | Diverifikasi `actionlint` + AST DAG + `test:cicd` (27/27). |
| 4. Release dry-run aman | **`PARTIAL`** | Guard & CLI dry-run lulus; eksekusi `workflow_dispatch` di GitHub Actions `NOT_VERIFIED`. |
| 5. Clean install CI lulus | **`PARTIAL`** | Job `clean-install` siap & uji `/tmp` lokal lulus; eksekusi runner GitHub Actions `NOT_VERIFIED`. |
| 6. Semua bukti terdokumentasi | **`PASS`** | Tercatat lengkap pada laporan ini. |
| **Keputusan Akhir Phase 23.18** | **`BLOCKED / PARTIAL`** | **Belum `IMPLEMENTATION VALIDATED`** dan **belum `CROSS-PLATFORM CERTIFIED`**. |

### Tindakan Wajib Operator di Checkout Git Asli:
1. Buka checkout Git asli `https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git` dan jalankan audit Git (`git status --short --untracked-files=all`, `git diff --check`, `git diff --stat`), pastikan `bun.lock`, `data.sqlite`, dan `dist/` tidak di-commit.
2. Opsional: jalankan `actionlint` dengan `shellcheck` terpasang untuk audit shell-lint tambahan.
3. Setelah PR disetujui dan dibuka di GitHub, jalankan workflow `.github/workflows/ci.yml` (termasuk job `clean-install`) serta `.github/workflows/release.yml` dengan `dry_run=true`, `confirm_release=false` untuk mengumpulkan bukti nyata runner GitHub Actions (commit SHA, workflow run ID, artifact IDs, dan status ketersediaan runner ARM).
