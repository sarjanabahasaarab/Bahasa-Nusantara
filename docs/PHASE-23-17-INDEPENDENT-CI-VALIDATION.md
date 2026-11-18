# NUSANTARA — PHASE 23.17: INDEPENDENT CI WORKFLOW VALIDATION & PRE-PR SAFETY AUDIT

- **Proyek:** NUSANTARA Programming Language & NUSANTARA OS (`https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git`)
- **Baseline:** Phase 23.16 (`IMPLEMENTATION COMPLETE`), `v0.50.0`, cabang target `main`
- **Tanggal Audit:** 18 November 2026
- **Lingkungan Audit:** Kontainer Linux `x86_64` (`Node.js v22.23.2`, `npm 10.9.8`, `OpenSSL 3.0.22`)
- **Status Akhir Phase 23.17:** **`PARTIAL / BLOCKED`** *(bukan `IMPLEMENTATION VALIDATED` penuh karena Git Audit **`BLOCKED`** akibat ketiadaan `.git`, `actionlint` CLI **`NOT_VERIFIED`** karena tidak terpasang di kontainer, dan eksekusi GitHub Actions runner nyata lintas-OS belum dijalankan)*
- **Status Sertifikasi Lintas Platform (Phase 23 & Phase 36–42):** **`PARTIAL`** *(bukan `CROSS-PLATFORM CERTIFIED`)*
- **Status Tag, Rilis Publik & Publikasi Toko:** **`BLOCKED`**

---

## 1. Ringkasan Eksekutif & Temuan Bug Kritis yang Diperbaiki Selama Audit

Audit independen terhadap implementasi Phase 23.16 menemukan **5 celah nyata** yang berpotensi menggagalkan eksekusi workflow atau melemahkan integritas provenance di GitHub Actions. Seluruh 5 celah berikut telah diperbaiki tanpa melemahkan satu pun pengujian maupun mengubah versi proyek (`0.50.0`):

| # | Lokasi | Temuan Audit Independen | Perbaikan yang Diterapkan |
| :-: | :--- | :--- | :--- |
| **1** | `.github/workflows/release.yml` (baris 397) | Ekspresi GitHub Actions memakai tanda kutip ganda ilegal: `'NUSANTARA v${{ inputs.version \|\| "0.50.0" }} — Release & Distribution'` yang akan gagal di-parse oleh runtime GitHub Actions. | Diperbaiki ke `"NUSANTARA v${{ inputs.version \|\| '0.50.0' }} — Release & Distribution"` (string literal kutip tunggal yang sah di ekspresi GHA). |
| **2** | `.github/workflows/ci.yml` (`unified-certification-gate`) | `phase23-certification-gate` mengunggah `artifacts/phase23`, sehingga `download-artifact` mengekstrak ke `downloaded-evidence/phase23-certification-report/artifacts/phase23/certification-summary.json`, tetapi skrip penyalinan sebelumnya menyalin dari root `downloaded-evidence/phase23-certification-report/*` tanpa membersihkan `artifacts/phase23` & `artifacts/demo-terpadu` lama lebih dulu. | Menambahkan `rm -rf artifacts/phase23 artifacts/demo-terpadu artifacts/cert-evidence artifacts/certification` sebelum penyalinan dan memprioritaskan sumber `downloaded-evidence/phase23-certification-report/artifacts/phase23/*`. |
| **3** | `.github/workflows/ci.yml` & `.github/workflows/release.yml` (Runner ARM64 Opsional) | Label runner opsional `windows-11-arm` (dan `ubuntu-24.04-arm`) dipatok keras pada `runs-on: ${{ matrix.os }}`, berisiko membuat workflow macet/gagal total apabila kuota runner ARM tidak aktif pada paket repositori GitHub. | Menerapkan fallback kondisional via repository variables / `workflow_dispatch` (`ENABLE_WINDOWS_ARM64_RUNNER` -> fallback `windows-latest`; `DISABLE_LINUX_ARM64_RUNNER` -> fallback `ubuntu-latest`) dan menonaktifkan exit fatal dini saat lib ARM64 absen di `windows-latest`, sehingga target menghasilkan bukti **`NOT_VERIFIED`** secara jujur tanpa memalsukan `PASS` maupun melumpuhkan pipeline. |
| **4** | `.github/workflows/release.yml` (`verify-certification-gate`) | Langkah `gh api repos/.../commits/.../check-runs` membutuhkan izin `checks: read` (dan `actions: read`), sementara root permissions hanya menyediakan `contents: read`. | Menambahkan blok `permissions: { contents: read, checks: read, actions: read }` khusus pada job `verify-certification-gate` (tetap read-only). |
| **5** | `src/cicd/certificationGate.ts`, `scripts/certification-gate.ts`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `pengujian/cicd/uji_certification_gate.ts` | Gate terpusat belum memverifikasi kecocokan `commitSha` & `workflowRunId` antar-evidence job, belum menolak artefak kedaluwarsa (`maxEvidenceAgeMs`), belum memblokir `local-snapshot` dalam mode provenance CI, dan Phase 39/42 belum memprioritaskan status `SKIPPED`/`BLOCKED` di atas `details`. | Menambahkan validasi provenance CI (`--require-ci-provenance`, `commitSha`, `workflowRunId`, `evidenceScope`, batas usia `maxEvidenceAgeMs`), menyematkan metadata provenance pada seluruh JSON evidence di `ci.yml`, menangani `SKIPPED`/`BLOCKED`, serta menambah uji regresi #9 & #10 (total **10/10 LULUS**). |
| **6** | `.github/workflows/kernel-boot-qemu.yml` | Langkah `actions/upload-artifact@v4` belum menyertakan `retention-days` eksplisit. | Menambahkan `retention-days: 14` agar konsisten dengan ketiga workflow lainnya. |

---

## 2. Hasil Git Repository Validation — **`BLOCKED`**

Sesuai aturan wajib Section 2 Phase 23.17:

- Pemeriksaan langsung di `/app/applet`:
  - `ls -la .git` -> `ls: cannot access '.git': No such file or directory`
  - `git rev-parse --show-toplevel` -> `fatal: not a git repository (or any of the parent directories): .git`
- **Keputusan:** Audit Git (`git status --short`, `git diff --check`, `git diff --stat`, `git diff`, `git ls-files`, `git status --short --untracked-files=all`) **dihentikan dan dilaporkan `BLOCKED`**. Tidak ada repositori Git baru yang dibuat (`git init` dilarang).
- **Audit Sistem Berkas Pra-PR (Untuk Diverifikasi pada Checkout Git Asli Operator):**
  - **Wajib dikecualikan dari PR (bukan bagian repositori resmi):**
    - `bun.lock` — artefak harness runtime Bun kontainer (root tercatat `"react-example"`).
    - `data.sqlite` — berkas basis data uji lokal di root workspace.
    - `dist/` — output sementara build Vite (tercantum di `.gitignore`).
  - **Kebijakan Artefak:**
    - `artifacts/demo-terpadu/` berisi `20` artefak + `manifest.json` + `SHA256SUMS` yang lolos verifikasi kriptografis (`20/20 OK`, `structural=4`, `nativeBinary=0`).
    - `artifacts/certification/CERTIFICATION-GATE-SNAPSHOT.{json,md}` adalah snapshot lokal berstatus `PARTIAL` dan tidak boleh diklaim sebagai bukti GitHub Actions.
  - **Versi & Integritas Fase:** `package.json` (`0.50.0`), `package-lock.json` (`0.50.0`), dan `nusantara.toml` tetap pada versi `0.50.0`; **Phase 51** tidak disentuh.

---

## 3. Hasil YAML Parser, `actionlint` & Workflow Dependency Validation

### 3.1 Status Perangkat Validasi

| Alat Validasi | Status di Kontainer | Hasil |
| :--- | :---: | :--- |
| **`js-yaml` (Strict YAML 1.2 Parser — diinstal terisolasi di `/tmp`, workspace bersih)** | Tersedia (via `/tmp`) | **PASS** — 4/4 berkas workflow lolos parsing strict tanpa error. |
| **Pemeriksaan AST Ekspresi GHA, `needs` DAG, `matrix`, `inputs`, `secrets`, `permissions`, `concurrency`, `timeout-minutes`, `upload`/`download-artifact`** | Tersedia (Node.js AST validator) | **PASS** — 0 temuan di seluruh 4 workflow pasca perbaikan. |
| **`ValidatorAlurKerjaGitHub` (`npm run test:cicd`)** | Tersedia | **PASS** — 27/27 LULUS. |
| **`actionlint` CLI** | **MISSING** (`command -v actionlint` gagal) | **`NOT_VERIFIED`** — Biner `actionlint` tidak terpasang di kontainer. Wajib dijalankan di host operator atau CI sebelum merge PR. |
| **`pyyaml` / `ruby` / `yq`** | **MISSING** | Tidak terpasang; digantikan oleh `js-yaml` strict di direktori terisolasi `/tmp`. |

### 3.2 Matriks Hasil Validasi 4 Workflow

| Workflow | YAML Strict | Jobs | Ekspresi `${{ }}` | DAG `needs` & Siklus | Root `permissions` | `concurrency` | `timeout-minutes` | `upload` / `download` + `retention-days` | Secrets | Issues |
| :--- | :---: | :-: | :-: | :---: | :---: | :---: | :---: | :---: | :--- | :-: |
| `.github/workflows/ci.yml` | **PASS** | 11 | 76 | **PASS** (0 siklus, 0 ref tak dikenal) | `contents: read` | `cancel-in-progress: PR` | 11/11 job (10–45m) | 9 upload (7–30d) / 2 download cocok | `[]` (hanya `GITHUB_TOKEN` implisit) | **0** |
| `.github/workflows/release.yml` | **PASS** | 6 | 30 | **PASS** (0 siklus, `publish-release` butuh `compile-release-bundle` & `verify-certification-gate`) | `contents: read` (elevasi `write` hanya di `publish-release`) | `cancel-in-progress: false` | 6/6 job (10–35m) | 3 upload (1–14d) / 2 download cocok | `[GITHUB_TOKEN]` | **0** |
| `.github/workflows/kernel-boot-qemu.yml` | **PASS** | 1 | 3 | **PASS** | `contents: read` | `cancel-in-progress: PR` | 1/1 job (25m) | 1 upload (14d) / 0 download | `[]` | **0** |
| `.github/workflows/nusantara-os-ci.yml` | **PASS** | 8 | 3 | **PASS** (0 siklus) | `contents: read` | `cancel-in-progress: PR` | 8/8 job (10–25m) | 2 upload (1d, 14d) / 1 download cocok | `[]` | **0** |

---

## 4. Audit Ketersediaan Runner CI (`Runner Availability`)

Status ketersediaan aktual runner GitHub Actions tidak dapat diasumsikan hanya dari nama label dan **belum diverifikasi pada eksekusi runner GitHub Actions aktual (`NOT_VERIFIED`)**:

| Label Runner | Target Platform | Status Ketersediaan Standar GitHub | Mitigasi Workflow Saat Runner Tidak Tersedia |
| :--- | :--- | :--- | :--- |
| `ubuntu-latest` | `linux-x86_64`, static/test/gate/Android SDK/Xvfb/QEMU | Runner standar publik (umumnya tersedia) | — (`NOT_VERIFIED` sampai run CI aktual) |
| `ubuntu-24.04-arm` | `linux-arm64` | Runner ARM64 publik/opsional tergantung kuota repo | Dapat dialihkan ke `ubuntu-latest` (cross-compile + `qemu-aarch64`) via `vars.DISABLE_LINUX_ARM64_RUNNER == 'true'` tanpa memecah pipeline. |
| `windows-latest` | `windows-x86_64`, `test-suite`, `phase36-gui-matrix` | Runner standar publik (umumnya tersedia) | — (`NOT_VERIFIED` sampai run CI aktual) |
| `windows-11-arm` | `windows-arm64` | **Opsional** (sering memerlukan paket GitHub Team/Enterprise atau kuota ARM khusus) | Default fallback aman ke `windows-latest` kecuali `vars.ENABLE_WINDOWS_ARM64_RUNNER == 'true'` atau `inputs.enable_windows_arm64 == true`. Bila MSVC/WinSDK ARM64 absen di `windows-latest`, `phase23-certify.ts` mengeluarkan **`NOT_VERIFIED`** (bukan `PASS` palsu dan tidak menjatuhkan target lain). |
| `macos-latest` | `macos-arm64` (native Apple Silicon) & `macos-x86_64` (via Rosetta 2), `phase37-42-apple` | Runner standar Apple Silicon (`macos-13` retired telah dihapus total dari konfigurasi aktif) | Verifikasi eksplisit `arch -x86_64 /usr/bin/true` untuk Rosetta 2 (`NOT_VERIFIED` sampai run CI aktual). |

---

## 5. Audit Certification Gate (`src/cicd/certificationGate.ts` & `artifactValidator.ts`)

Seluruh mekanisme evaluasi diuji melalui `npm run test:cert-gate` (**10/10 LULUS, 0 GAGAL**) dan eksekusi CLI langsung:

| Skenario Uji | Perilaku yang Diharapkan | Hasil Aktual |
| :--- | :--- | :---: |
| Seluruh 8 fase `PASS` + artefak valid | `overallStatus=PASS`, `certificationVerdict=CERTIFIED`, `gatePassed=true`, `exitCode=0` | **PASS** (Uji #5) |
| Status `FAIL` pada job wajib / artefak korup / tamper | `overallStatus=FAIL`, `gatePassed=false`, `exitCode=1` | **PASS** (Uji #3, #7) |
| Status `NOT_VERIFIED` / `PARTIAL` (Xvfb headless, APK tanpa `.dex`, snapshot lokal) | Tidak pernah dihitung `PASS`; `overallStatus=PARTIAL`, `gatePassed=false`, `exitCode=1` | **PASS** (Uji #6, #8; CLI `GATE_STRICT_LOCAL_EXIT=1`) |
| Status `SKIPPED` pada job wajib | Tidak pernah dihitung `PASS`; `counts.skipped > 0`, `gatePassed=false`, `exitCode=1` | **PASS** (Uji #9) |
| Status `BLOCKED` (kebijakan rilis/tag) | `overallStatus=BLOCKED`, `gatePassed=false`, `exitCode=1` | **PASS** (Uji #7) |
| Provenance `commitSha` berbeda / `workflowRunId` berbeda / artefak > 24 jam / snapshot lokal dalam mode `--require-ci-provenance` | Langsung ditolak (`overallStatus=FAIL`, `exitCode=1`) | **PASS** (Uji #10; CLI `GATE_CI_PROVENANCE_ON_LOCAL_EXIT=1`) |
| Integritas `artifacts/demo-terpadu/` (path traversal `../`, file yatim, tamper hash, klaim `nativeBinary=true` pada APK struktural) | Semua serangan ditolak; bundel nyata 20/20 `OK` (`structural=4`, `nativeBinary=0`) | **PASS** (Uji #1–#4) |

---

## 6. Audit Release Protection (`.github/workflows/release.yml`)

| Kriteria Proteksi Rilis | Hasil Verifikasi Statis & Uji Dry-Run |
| :--- | :--- |
| **`dry_run` menjadi pilihan default** | **PASS** — `on.workflow_dispatch.inputs.dry_run.default: true`. |
| **Publish membutuhkan konfirmasi eksplisit** | **PASS** — `confirm_release.default: false`; step `verify-release-approval` gagal bila `dry_run != true && confirm_release != true`; job `publish-release` memakai `if: ${{ github.event_name == 'workflow_dispatch' && inputs.dry_run != true && inputs.confirm_release == true }}`. |
| **Certification gate wajib berhasil** | **PASS** — `publish-release` bergantung pada `needs: [compile-release-bundle, verify-certification-gate]`; `verify-certification-gate` memeriksa check-run CI pada `github.sha` dan menjalankan `scripts/certification-gate.ts evaluate --require-ci-provenance`. |
| **Release tidak berjalan otomatis akibat push tag** | **PASS** — `publish-release` membatasi `github.event_name == 'workflow_dispatch'`, sehingga event `push.tags` (`v*.*.*`) tidak pernah mengeksekusi publikasi rilis. |
| **`NOT_VERIFIED`, `SKIPPED`, `FAIL`, `BLOCKED` menggagalkan release** | **PASS** — Dalam mode non-dry-run, setiap status selain `PASS` mengembalikan `exitCode=1`. |
| **Tidak ada timestamp hardcoded** | **PASS** — Menggunakan `new Date().toISOString()`; tidak ada `2026-10-25T00:00:00.000Z`. |
| **Tidak ada runner retired (`macos-13`)** | **PASS** — Seluruh target macOS menggunakan `macos-latest`. |
| **Tidak ada publikasi toko otomatis** | **PASS** — Tidak ada langkah unggah Play Store / App Store produksi di `release.yml`. |
| **Uji Dry-Run Lokal** | **PASS** — `scripts/certification-gate.ts evaluate ... --dry-run` keluar `0` (sambil tetap mencetak verdict jujur `PARTIAL`, `gatePassed=false`) tanpa membuat tag/release; mode ketat tanpa `--dry-run` keluar `1`. Eksekusi `workflow_dispatch` `dry_run=true` di GitHub Actions sendiri tetap **`NOT_VERIFIED`** sampai dijalankan di GitHub. |

---

## 7. Hasil Clean CI Validation & Bukti Eksekusi

### 7.1 Uji `npm ci` pada Lingkungan Terisolasi Bersih (`/tmp`)

Untuk menguji `package.json` + `package-lock.json` tanpa menyentuh `node_modules` workspace:

| Perintah Uji Terisolasi | Exit Code | Keterangan Faktual |
| :--- | :---: | :--- |
| `npm ci --offline --dry-run` (di direktori `/tmp` bersih dengan `package.json` + `package-lock.json`) | **`0`** | Resolusi lockfile valid dan konsisten 100%. |
| `npm ci --offline` (instalasi offline penuh di `/tmp`) | **`1`** (`ENOTCACHED`) | Cache npm lokal kontainer tidak menyimpan tarball `ws-8.23.0.tgz` dkk. |
| `npm ci --no-audit --no-fund` (instalasi bersih penuh dari registry npm di `/tmp`) | **`0`** | Memasang **184 paket** dalam 8 detik; `npx --no tsc --noEmit` terhadap `src/` memakai `node_modules` bersih ini keluar **`0`**. |

### 7.2 Hasil Perintah Validasi Lokal Kontainer (Dipisahkan Tegas dari GitHub Actions)

| Perintah | Status Lokal | Rincian Faktual (`PASS` / `FAIL` / `SKIPPED` / `NOT_VERIFIED`) |
| :--- | :---: | :--- |
| `npm run lint` (`tsc --noEmit`) | **PASS** | Exit `0`, 0 error TypeScript. |
| `npm run build` (`vite build`) | **PASS** | Exit `0`, 2297 modul terkompilasi bersih. |
| `npm run test:cicd` | **PASS** | **27/27 LULUS**, 0 gagal. |
| `npm run test:cert-gate` | **PASS** | **10/10 LULUS**, 0 gagal. |
| `npm run test:demo-terpadu` | **PASS** | **7/7 LULUS**, 0 gagal; 20 artefak tersimpan di `artifacts/demo-terpadu/`. |
| `npm run quality-gate` | **PASS** | **29/29 LULUS**, 0 gagal. |
| `scripts/certification-gate.ts verify-artifacts --dir artifacts/demo-terpadu --min-artifacts 20` | **PASS** | `manifest.json` 20/20, `SHA256SUMS` 20/20 OK, `structural=4`, `nativeBinary=0`. |
| `npm test` (46 perintah, Phase 1–50) | **PASS** (dengan 3 `NOT_VERIFIED` & 3 `SKIPPED`) | Exit `0`, **0 GAGAL**; Phase 23 (`test:build-v23`): **46 LULUS, 0 GAGAL, 3 BELUM DIVERIFIKASI** (uji 3.2, 5.3, 5.4); Phase 44 (`17/18`, 1 `SKIPPED`), Phase 45 (`21/22`, 1 `SKIPPED`), Phase 46 (`31/32`, 1 `SKIPPED`) karena `clang` tidak terpasang di kontainer. |
| **Eksekusi GitHub Actions CI & `upload`/`download-artifact` antar-runner nyata** | **`NOT_VERIFIED`** | Belum ada workflow run ID / artifact ID GitHub Actions baru pasca Phase 23.16–23.17 karena push/PR dilarang pada tahap ini. |

---

## 8. Daftar Lengkap Blocker & Item `NOT_VERIFIED` (Evaluasi Kriteria Penyelesaian Section 9)

| Kriteria Section 9 | Status Saat Ini | Alasan / Blocker |
| :--- | :---: | :--- |
| 1. Git audit selesai | **`BLOCKED`** | Direktori `.git` tidak tersedia di kontainer; wajib dijalankan pada checkout Git asli operator (`git status`, `git diff --check`, mengecualikan `bun.lock`, `data.sqlite`, `dist/`). |
| 2. Empat workflow lolos validasi | **`PARTIAL`** | `js-yaml` strict + AST GHA expression/DAG/artifact/release-protection **PASS (0 error)**, tetapi biner `actionlint` **tidak terpasang di kontainer (`NOT_VERIFIED`)**. |
| 3. Certification gate lolos regression | **`PASS`** | 10/10 uji regresi lulus mencakup `PASS`, `FAIL`, `SKIPPED`, `NOT_VERIFIED`, `BLOCKED`, provenance `commitSha`/`runId`, kesegaran artefak, dan isolasi snapshot lokal. |
| 4. Release protection terbukti bekerja | **`PARTIAL`** | Seluruh aturan statis & CLI `dry-run` vs strict gate **PASS**, namun uji `workflow_dispatch` `dry_run=true` pada GitHub Actions nyata masih **`NOT_VERIFIED`**. |
| 5. Clean CI validation berhasil | **`PARTIAL`** | Instalasi bersih `npm ci` (184 paket) + `lint` + `build` + `npm test` + `test:cert-gate` + `test:demo-terpadu` + `test:cicd` **PASS secara lokal**, namun eksekusi runner GitHub Actions multi-OS & upload/download artifact nyata masih **`NOT_VERIFIED`**. |
| 6. Dokumentasi lengkap | **`PASS`** | Laporan ini (`docs/PHASE-23-17-INDEPENDENT-CI-VALIDATION.md`) disusun lengkap dan jujur. |
| **Status Akhir Phase 23.17** | **`PARTIAL / BLOCKED`** | Belum dapat dinyatakan `IMPLEMENTATION VALIDATED` sampai Git audit pada checkout Git asli, `actionlint`, dan run GitHub Actions bersih (termasuk `dry_run` release) dijalankan oleh operator. |
| **Status Sertifikasi Phase 23 & 36–42** | **`PARTIAL`** | Tetap memerlukan bukti native 6 target desktop, Xvfb + layar fisik, Android Gradle `.dex`/Emulator KVM, Xcode `.app`/`.ipa`/iOS Simulator, dan perangkat keras mobile fisik untuk mencapai `CROSS-PLATFORM CERTIFIED`. |
