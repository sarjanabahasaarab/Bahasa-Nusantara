# NUSANTARA — PRA-CI HARDENING & CERTIFICATION READINESS AUDIT (Phase 23 & Phase 36–42)

- **Proyek:** NUSANTARA Programming Language & NUSANTARA OS (`https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git`)
- **Baseline:** `v0.50.0` (cabang `main`)
- **Tanggal Audit & Hardening:** 17 November 2026
- **Status Pra-CI Saat Ini:** **`PRA-CI HARDENING COMPLETE`** *(seluruh celah kode sumber, regresi kritis Phase 39/42, dan persistensi artefak demo terpadu selesai & terverifikasi hijau 100% di kontainer lokal)*
- **Status Sertifikasi Lintas Platform Penuh:** **`PARTIAL`** *(belum tersertifikasi penuh karena host kontainer Linux `x86_64` tidak memiliki `clang`, `lld`, `pwsh`, `Xvfb`/GTK3, Android SDK/Gradle/Emulator, macOS/Xcode/iOS Simulator, maupun perangkat fisik)*
- **Lingkungan Uji Lokal:** Kontainer Linux `x86_64` (`Node.js v22.23.2`, `OpenSSL 3.0.22`, `gcc 12.2.0`), **tanpa** `clang`, `lld`/`ld.lld`, `llvm-as`, `llc`, `aarch64-linux-gnu-gcc`, `pwsh`, `qemu-system-x86_64`, `qemu-aarch64`, `xvfb-run`, `pkg-config`/`libgtk-3-dev`, `java`/`javac`/`gradle`/`adb`/`apksigner`/`bundletool`/`ANDROID_HOME`, serta **tanpa** `macOS`/`xcodebuild`/`xcrun`.

---

## 1. Keputusan Utama & Ringkasan Kesiapan

| Dimensi Keputusan | Status | Penjelasan Faktual |
| :--- | :---: | :--- |
| **Kesiapan Pra-CI Repositori Lokal** | **`PRA-CI HARDENING COMPLETE`** | Seluruh 4 celah bug/regresi kode (`src/`), 3 celah suite uji (`pengujian/`), persistensi `artifacts/demo-terpadu/` (20 berkas + `manifest.json` + `SHA256SUMS`), dan pembersihan dead imports `src/paket/cli.ts` telah diselesaikan dan lulus `0` gagal. |
| **Status Sertifikasi Phase 23 & 36–42** | **`PARTIAL`** | Seluruh logika, kriptografi, validasi, dan loopback HTTP/HTTPS/WS lulus penuh (`40/40` Phase 39, `27/27` Phase 42, `7/7` Demo Terpadu), namun uji native compiler 6 target, virtual/native display GUI, Gradle/Xcode build, emulator/simulator, dan perangkat fisik belum dapat diverifikasi di kontainer ini (`NOT_VERIFIED` / `SKIPPED`). |
| **Kelayakan Tag / Release / Store Publish** | **`BLOCKED`** | **Dilarang membuat tag, merilis ke GitHub Releases publik, atau mempublikasikan ke toko aplikasi** sampai rancangan pembaruan CI di Seksi 5 ditinjau dan seluruh gerbang sertifikasi di runner GitHub Actions nyata lulus tanpa `FAIL`/`NOT_VERIFIED` untuk item wajib. |

---

## 2. Temuan Awal, Perbaikan yang Diterapkan & Daftar File Berubah

### 2.1 Temuan Awal -> Akar Masalah -> Perbaikan Diterapkan

| No | Temuan Awal Audit | Akar Masalah yang Teridentifikasi | Perbaikan yang Diterapkan |
| :---: | :--- | :--- | :--- |
| **1** | `pengujian/integrasi/uji_demo_terpadu.ts` menghapus `tmpRoot` di `finally`, sehingga artefak demo hilang setelah eksekusi dan tidak dapat diaudit CI. | Tidak ada tahap salin & verifikasi SHA-256 ke direktori permanen; selain itu, `PengemasAplikasiDesktop.kemas()` mengembalikan jalur relatif dalam `pkt.daftarBerkas` (mis. `AppRun`) terhadap `pkt.direktoriBundel`. | Menambahkan Step 7 pada `uji_demo_terpadu.ts`: membersihkan artefak basi di `artifacts/demo-terpadu/`, menyelesaikan jalur absolut berkas bundel, menyalin seluruh **20 berkas** ke `artifacts/demo-terpadu/` sebelum penghapusan `tmpRoot`, menulis `manifest.json` + `SHA256SUMS` dengan label eksplisit `kategoriBuild: 'structural'` vs `'runtime-output'` vs `'archive-bundle'` dan `nativeBinary: false`, serta memverifikasi ulang SHA-256 di disk. |
| **2** | `pengujian/mobile/uji_pembaruan_fase42.ts` belum menguji `TrustManager.cabutKunci()`, rotasi kunci multi-generasi, maupun HTTP OTA terputus di tengah payload. | Audit hardening juga mengungkap 3 celah nyata di kode produksi Phase 42:<br>1) `OTAResourceManager.unduhResourcePaket` tidak membungkus `unduhDaftarResource` dalam `try/catch`, sehingga status `UpdateStateManager` tertinggal di `'downloading'` saat soket putus.<br>2) `ActivationManager.aktifkanAtomik` belum membuat snapshot map untuk pemulihan atomik bila ada eksepsi di tengah.<br>3) `UpdateManager.aktivasiDenganHealthCheck` mereset `this.revisiTerpasang = 0` saat rollback, sehingga revisi lama pada versi yang dipulihkan bisa menembus proteksi anti-replay. | 1) Memperbaiki `OTAResourceManager.ts` agar kegagalan jaringan/unduhan mentransisikan state ke `'failed'` dan mengembalikan `{ sukses: false, pesan }`.<br>2) Menambahkan snapshot & rollback map di `ActivationManager.ts`.<br>3) Menambahkan `revisiPerVersi` di `UpdateManager.ts` untuk mempertahankan high-water mark revisi tiap versi pasca-rollback.<br>4) Menambahkan `[KELOMPOK 12]` pada `uji_pembaruan_fase42.ts`: uji `TrustManager.cabutKunci`, rotasi Ed25519 3 generasi (`gen1 -> gen2 -> gen3`), HTTP mid-stream socket abort (`req.socket.destroy()`), paket parsial, & anti-replay pasca-rollback. |
| **3** | `pengujian/mobile/uji_mobile_networking_fase39.ts` belum menguji handshake TLS HTTPS nyata terhadap sertifikat X.509 invalid/expired/SAN-mismatch maupun soket HTTPS terputus mid-transfer. | Di `src/mobile/networking/core/api_client.ts`, blok `catch` pada `eksekusiFetch` hanya meneruskan `err.message` (`'fetch failed'`) sehingga kode galat OpenSSL/TLS di `err.cause` (`CERT_HAS_EXPIRED`, `SELF_SIGNED_CERT_IN_CHAIN`, `ERR_TLS_CERT_ALTNAME_INVALID`) hilang dan menyulitkan diagnostik/penegasan penolakan TLS. | 1) Memperbaiki `api_client.ts` agar menyertakan `[${cause.code}: ${cause.message}]` dalam galat `eksekusiFetch`.<br>2) Menambahkan grup `[19]` (`19.1` & `19.2`) di `uji_mobile_networking_fase39.ts`: membangkitkan Root CA + leaf cert via `openssl` (`valid SAN DNS:localhost,IP:127.0.0.1`, `expired 2020-01-01..2020-01-02`, `SAN mismatch DNS:salah-host.example.com`) di atas `https.createServer` lokal, menguji `KlienAPIMobile` via subprocess asinkron ber-`NODE_EXTRA_CA_CERTS` tanpa menonaktifkan verifikasi TLS, serta menguji pemutusan soket HTTPS mid-transfer dan pemulihan timeout -> retry hingga HTTP 200. |
| **4** | `src/paket/cli.ts` baris 51–52 menyimpan 2 import tidak terpakai (`ZipBuilder`, `HashValidator`) dan `bun.lock` lokal diperbarui oleh container harness. | `tsc --noEmit` belum mewajibkan `noUnusedLocals`; sementara `bun.lock` (`name: "react-example"`) adalah artefak container runtime (`Bun`) dan bukan lockfile resmi proyek (`package-lock.json` dipakai oleh `npm ci`). | Menghapus 2 import mati (`ZipBuilder`, `HashValidator`) dari `src/paket/cli.ts`. Memverifikasi `package.json` & `package-lock.json` tetap utuh; mencatat bahwa `bun.lock` tidak dipakai oleh `npm ci` di CI dan sebaiknya tidak di-commit atau dibersihkan sebelum PR. |

### 2.2 Daftar File yang Diubah pada Tahap Pra-CI Hardening

- **Kode Sumber (`src/` — 5 berkas):**
  1. `src/paket/cli.ts` (pembersihan import tidak terpakai `ZipBuilder`, `HashValidator`)
  2. `src/mobile/updates/ota/OTAResourceManager.ts` (`try/catch` unduhan agar transisi state `'failed'` bersih)
  3. `src/mobile/updates/ota/ActivationManager.ts` (snapshot rollback atomik `resourceAktif`)
  4. `src/mobile/updates/core/UpdateManager.ts` (`revisiPerVersi` menjaga anti-replay pasca-rollback)
  5. `src/mobile/networking/core/api_client.ts` (pelestarian `err.cause.code` / `err.cause.message` untuk diagnostik TLS/soket)
- **Pengujian Regresi & Integrasi (`pengujian/` — 3 berkas):**
  6. `pengujian/integrasi/uji_demo_terpadu.ts` (penambahan Step 7: ekspor 20 artefak persisten + `manifest.json` + `SHA256SUMS` + verifikasi disk)
  7. `pengujian/mobile/uji_pembaruan_fase42.ts` (penambahan `[KELOMPOK 12]` rotasi/pencabutan kunci, putus HTTP mid-stream, paket parsial, anti-replay pasca-rollback)
  8. `pengujian/mobile/uji_mobile_networking_fase39.ts` (penambahan `[19]` server `https.createServer` + sertifikat X.509 OpenSSL CA/Expired/SAN Mismatch + soket putus & timeout retry recovery)
- **Artefak Uji Terverifikasi di Disk (`artifacts/demo-terpadu/`):**
  9. `artifacts/demo-terpadu/{manifest.json, SHA256SUMS, desktop/*, phase23-dist/*, networking/*, mobile/*, publishing/*, ota/*}` (20 berkas hasil `test:demo-terpadu`, bukan biner toko)
- **Dokumentasi & Laporan (`docs/` & root — 12 berkas):**
  10. `docs/CERTIFICATION-READINESS-PHASE-23-36-42.md` (laporan pra-CI hardening & rancangan perbaikan CI ini)
  11. `docs/PHASE-23-36-42-COMPLETION-REPORT.md`
  12. `docs/phase-39/{PHASE-39-CERTIFICATION-REPORT,ACCEPTANCE,TESTING,PLATFORM_SUPPORT}.md`
  13. `docs/phase-42/{PHASE-42-CERTIFICATION-REPORT,ACCEPTANCE,TESTING}.md`
  14. `pengujian/README.md`, `README.md`, `ROADMAP.md`, `PERUBAHAN.md`

---

## 3. Hasil Verifikasi Penuh & Status Per Fase (Pemisahan Jujur)

Seluruh status dibedakan secara ketat menjadi **`PASS`**, **`FAIL`**, **`SKIPPED`**, **`NOT_VERIFIED`**, dan **`BLOCKED`**:

### 3.1 Ringkasan Eksekusi Perintah Uji Lokal (17 November 2026)

| Perintah Uji | PASS | FAIL | SKIPPED | NOT_VERIFIED | Keterangan Faktual |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `npm run lint` (`tsc --noEmit`) | 100% | `0` | `0` | `0` | Lulus bersih setelah seluruh perubahan |
| `npm run build` (`vite build`) | 100% | `0` | `0` | `0` | Bundel web terkompilasi bersih |
| `npm run quality-gate` (`uji_testing.ts`) | **29** | `0` | `0` | `0` | 29/29 lulus |
| `npm run test:cicd` (`uji_cicd_workflow.ts`) | **25** | `0` | `0` | `0` | 25/25 lulus |
| `npm run test:database-browser-v29` | **3** | `0` | `0` | `0` | 3/3 fallback peramban lulus |
| `npm run test:mobile-networking-v39` *(baru)* | **40** | `0` | `0` | `0` | Naik dari 38 -> **40/40** (+2 uji HTTPS X.509 OpenSSL CA/Expired/SAN/Drop/Retry) |
| `npm run test:pembaruan-v42` *(baru)* | **27** | `0` | `0` | `0` | Naik dari 25 -> **27/27** (+2 uji `cabutKunci`, rotasi 3 gen, HTTP abort, anti-replay rollback) |
| `npm run test:demo-terpadu` *(baru)* | **7** | `0` | `0` | `0` | Naik dari 6 -> **7/7** (+Step 7 persistensi & verifikasi 20 artefak ke `artifacts/demo-terpadu/`) |
| `(cd artifacts/demo-terpadu && sha256sum -c SHA256SUMS)` | **20** | `0` | `0` | `0` | 20/20 digest SHA-256 berkas di disk cocok `OK` |
| `npm test` (46 perintah: `periksa_fondasi.js` + 45 suite TS) | **167** berkas + **1.381** TS | `0` | **3** | **3** | Total **1.554** pemeriksaan dalam `npm test` (**1.387** kasus TS): `0` gagal, `3 SKIPPED` (Phase 44/45/46 tanpa `clang`/`llc`/`lld`), `3 NOT_VERIFIED` (Phase 23 host native/PowerShell tanpa `clang`/`pwsh`). |
| **Total Pemeriksaan Gabungan Seluruh Repo** | **1.558** | **`0`** | **3** | **3** | `167` fondasi + `1.387` kasus TS `npm test` + `3` browser fallback + `7` Demo Terpadu = **1.564 pemeriksaan**. |

### 3.2 Matriks Status Phase 23 & Phase 36–42

| Fase | Judul | Uji Software / Loopback | Uji Toolchain / Hardware / SDK | Status Fase |
| :---: | :--- | :--- | :--- | :---: |
| **23** | Build System & Desktop Distribution | **46 PASS, 0 FAIL, 3 NOT_VERIFIED** (49 skenario); CLI `.zip`/`.tar.gz` **PASS** | `local-snapshot` 6 target: **6/6 NOT_VERIFIED** lokal (tanpa `clang`/`lld`/MSVC/MacOSX SDK/`pwsh`/`qemu-aarch64`) | **`PARTIAL`** |
| **36** | Desktop GUI Framework | **22/22 PASS** (BMP `BM`, SVG, HTML, WebSocket/CSP, bundle `SHA256SUMS`) | Window X11/Wayland/GTK3 (`Xvfb`/`libgtk-3-dev`), Win32/WebView2, Cocoa fisik: **NOT_VERIFIED** | **`PARTIAL`** |
| **37** | Mobile Framework | **40/40 PASS** (reactivity, Navigator, Kotlin/Swift codegen, HTTP/WS preview) | Kompilasi Android Gradle APK & iOS `xcodebuild` + Simulator launch/rotation/restore: **NOT_VERIFIED** | **`PARTIAL`** |
| **38** | Native Device API | **24/24 PASS** (`ditolak_permanen`, AES-256-GCM `v2:`, anti-symlink, codegen) | Camera/GPS/IMU/Audio/BLE/Biometrik pada emulator/perangkat fisik: **NOT_VERIFIED** | **`PARTIAL`** |
| **39** | Mobile Networking | **40/40 PASS** (REST/WS loopback, disk queue, `AbortSignal`, **OpenSSL HTTPS X.509 CA/Expired/SAN/Drop/Retry**) | Pinning SPKI native OkHttp/`URLSession`, WorkManager/BG `URLSession`, seluler fisik: **NOT_VERIFIED** | **`PARTIAL`** |
| **40** | Mobile Application Distribution | **100/100 PASS** (PKZIP CRC-32 `.apk`/`.aab` struktural, `.xcarchive/Info.plist`, `SHA256SUMS`) | Bytecode `.dex`/`aapt2`/`bundletool` Android SDK & `.ipa` Mach-O `xcodebuild` + install emulator: **NOT_VERIFIED** | **`PARTIAL`** |
| **41** | Store Publishing & Digital Signing | **107/107 PASS** (JWT `RS256`/`ES256` HTTP loopback, `SecretProvider`, `ApprovalGate`) | Signing `apksigner`/JKS/`codesign` + unggah sandbox internal non-produksi (publikasi toko produksi **`BLOCKED`**): **NOT_VERIFIED** | **`PARTIAL`** |
| **42** | OTA Updates & Secure Update System | **27/27 PASS** (Ed25519 PEM, `cabutKunci`, rotasi 3 gen, HTTP abort & paket parsial, anti-replay pasca-rollback, health check) | Play Core In-App Updates SDK, StoreKit iOS, & CDN HTTPS jarak jauh di perangkat fisik: **NOT_VERIFIED** | **`PARTIAL`** |

---

## 4. Inventaris Artefak Persisten Demo Terpadu (`artifacts/demo-terpadu/`)

Step 7 `npm run test:demo-terpadu` menghasilkan **20 berkas** nyata di disk beserta `manifest.json` dan `SHA256SUMS` (terverifikasi `20/20 OK` via `sha256sum -c SHA256SUMS`), dengan pemisahan jujur antara artefak struktural dan output runtime:

| Kategori (`kategoriBuild`) | Berkas di `artifacts/demo-terpadu/` | Ukuran (Bytes) | `nativeBinary` | Status Validasi & Batasan Jujur |
| :--- | :--- | :---: | :---: | :--- |
| `runtime-output` | `desktop/preview-desktop.bmp` | `768.054` | `false` | `VERIFIED_BMP_HEADER` (framebuffer software 640x400; bukan display fisik OS) |
| `runtime-output` | `desktop/bundle/{AppRun, id.nusantara.crossdemo.desktop, usr/..., src/nusantara_linux_host.c, manifest.json, SHA256SUMS}` (9 berkas) | Total `~772 KB` | `false` | `VERIFIED_BUNDLE_MEMBER` & `VERIFIED_SHA256` (host C GTK+3.0 belum dikompilasi ke ELF karena `clang`/`libgtk-3-dev` absen) |
| `archive-bundle` | `phase23-dist/nusantara-v0.50.0-linux-x64.{zip, tar.gz}` | `4.546` / `3.071` | `false` | `VERIFIED_ARCHIVE` (bundel JS distribusi CLI Phase 23; bukan executable mesin AOT) |
| `runtime-output` | `networking/offline_q_snapshot.json` | `190` | `false` | `VERIFIED_LOOPBACK_SYNC` (antrean disk offline -> sinkron HTTP loopback) |
| `structural` | `mobile/android/id.nusantara.crossdemo-1.0.0-release.apk` | `2.086` | `false` | `VERIFIED_STRUCTURAL_PKZIP_CRC32` — **kontainer PKZIP struktural TANPA `classes.dex`/AAPT2/`apksigner`** |
| `structural` | `mobile/android/id.nusantara.crossdemo-1.0.0.aab` | `3.456` | `false` | `VERIFIED_STRUCTURAL_PKZIP_CRC32` — **kontainer PKZIP struktural TANPA `bundletool` protobuf/`classes.dex`** |
| `structural` | `mobile/android/SHA256SUMS` | `206` | `false` | `VERIFIED_SHA256` (checksum kontainer Android demo) |
| `structural` | `mobile/ios/CrossDemo.xcarchive/Info.plist` | `942` | `false` | `VERIFIED_STRUCTURAL_PLIST_ONLY` — **`Info.plist` saja TANPA Mach-O `.app` maupun `.ipa`** |
| `runtime-output` | `publishing/publishing-report.md` | `967` | `false` | `VERIFIED_SANDBOX_LOOPBACK` (laporan kepatuhan RS256/ES256 + `ApprovalGate`) |
| `runtime-output` | `ota/manifest-ota-signed.json`, `ota/batik_v2.json` | `966` / `37` | `false` | `VERIFIED_ED25519_SIGNATURE` / `VERIFIED_SHA256_PAYLOAD` (bebas kunci privat) |

---

## 5. Audit 4 Workflow CI & Rancangan Perubahan Terpisah (Siap Ditinjau)

### 5.1 Hasil Audit 4 Workflow Saat Ini

| Dimensi Audit | `.github/workflows/ci.yml` | `.github/workflows/release.yml` | `.github/workflows/kernel-boot-qemu.yml` | `.github/workflows/nusantara-os-ci.yml` |
| :--- | :--- | :--- | :--- | :--- |
| **1. Job Dependencies** | `static-checks` -> `test-suite` -> `quality-gate` -> `build-matrix-validation` -> `phase23-certification-gate` (`if: always()`) -> `ci-summary` (`if: always()`). Belum ada job sertifikasi untuk Phase 36 (`Xvfb`/Win32/Cocoa), 37–41 (Android SDK/Emulator & Xcode/Simulator), maupun agregator terpadu lintas 23+36–42. | `verify-release-approval` -> `test-and-gate` -> `build-release-artifacts` -> `compile-release-bundle` -> `publish-release`. **Celah Kritis:** `build-release-artifacts` tidak bergantung pada `phase23-certification-gate` maupun sertifikasi Phase 36–42, dan memakai `MesinCI(simulasikanRilis: true)`. | Job tunggal `kernel-qemu-boot` menjalankan lint -> `npm test` -> Phase 48–50 -> ISO -> `run-phase50-qemu.sh`. Mandiri & terstruktur baik. | `static-analysis` -> (`unit-and-compiler-tests`, `llvm-and-native-tests`, `kernel-phase48`->`49`->`50`) -> `kernel-build-and-iso` -> `qemu-hardware-validation`. Pemisahan build vs QEMU sangat baik. |
| **2. Runner Availability** | Memakai `ubuntu-latest`, `windows-latest`, `macos-latest`, plus **`windows-11-arm`** dan **`ubuntu-24.04-arm`**. Runner publik `windows-11-arm` hanya tersedia pada paket Team/Enterprise/self-hosted tertentu; bila tidak tersedia di repo ini, matrix ARM64 Windows menggantung/gagal. | Memakai **`macos-13`** untuk `macos-x86_64` — **sudah retired/deprecated** di GitHub Actions (pasti gagal antre/hilang). Juga memakai `windows-11-arm` & `ubuntu-24.04-arm` tanpa fallback/status eksplisit. | `ubuntu-latest` standar. | `ubuntu-latest` standar. |
| **3. Timeouts & Concurrency** | Memiliki `concurrency` aman (`cancel-in-progress` hanya saat PR), namun job matrix belum menetapkan `timeout-minutes` (risiko job macOS/ARM64 gantung selama 360 menit bila runner/APT bermasalah). | Concurrency aman (`cancel-in-progress: false`). Tidak ada `timeout-minutes` di job matrix. | `timeout-minutes: 10` pada job yang menginstal 10 paket `apt` + menjalankan seluruh `npm test` (46 suite) + build ELF/ISO + QEMU — agak sempit (rawan timeout saat `apt` atau runner lambat). **Tidak** mengatur `concurrency`/`permissions` di root. | Concurrency aman, `permissions: contents: read` di root, namun belum menetapkan `timeout-minutes` per job. |
| **4. Artifact Retention & Upload** | Mengunggah `phase23-evidence-<target>` (14d), `nusantara-ci-<target>` (7d), `phase23-certification-report` (30d) dengan `if: always()`. Belum mengunggah `artifacts/demo-terpadu/` dari `test-suite` Linux. | Mengunggah `release-pkg-*` (1d) & `nusantara-release-bundle` (14d). Tidak mengunggah laporan sertifikasi atau bukti non-simulasi. | Mengunggah 19 artefak Phase 50 termasuk `SHA256SUMS` dengan `if: always()` (baik, tanpa `retention-days` eksplisit). | Mengunggah staging (1d) & 19 artefak Phase 50 (14d) dengan `if: always()`. |
| **5. Konsistensi Versi** | `ci-summary` masih menulis header `v0.50.0 + Phase 23.10`, sementara `package.json`, `versi.ts`, dan `nusantara.toml` semuanya `0.50.0`. `workflow` menguji `node-version: 22` (`>=22.13.0`). | `verify-release-approval` mencocokkan `VERSI_NUSANTARA` vs `nusantara.toml` (`0.50.0`), tetapi **`compile-release-bundle` meng-hardcode `generatedAt: '2026-10-25T00:00:00.000Z'`**. | Node `22`, konsisten. | Node `22`, konsisten; daftar uji `unit-and-compiler-tests` terfokus fase inti (1–22, 29, 43–50), terpisah dari GUI/Mobile. |
| **6. Blocking Release on Failed Certification Gate** | `phase23-certification-gate` gagal (`exit 1`) bila ada target missing/corrupt/`NOT_VERIFIED`, dan `ci-summary` jujur mencetak `PARTIAL / FAILED`. Perlu memastikan branch protection menuntut check `phase23-certification-gate` & gate Phase 36–42. | **TIDAK TERBLOKIR:** `release.yml` dapat dipicu via tag `v*.*.*` tanpa `confirm_release` (`if: github.event_name == 'workflow_dispatch'`) dan tidak memeriksa hasil `phase23-certification-gate` ataupun kelengkapan sertifikasi Phase 36–42 sebelum mempublikasikan release! | Tidak melakukan release (aman). | Tidak melakukan release (aman). |

---

### 5.2 Rancangan Perubahan Workflow CI Terpisah (Siap Ditinjau — Belum Diterapkan)

> **Catatan Penting:** Rancangan di bawah ini disiapkan untuk tinjauan operator sebelum menyentuh `.github/workflows/`. Rancangan ini **tidak** mengaktifkan publikasi ke toko aplikasi ataupun publikasi rilis produksi otomatis di `release.yml`.

#### A. Rancangan Patch `.github/workflows/ci.yml`
1. Tambahkan `timeout-minutes` wajar di setiap job (`static-checks: 10`, `test-suite: 30`, `quality-gate: 15`, `build-matrix-validation: 35`, `phase23-certification-gate: 15`) dan unggah `artifacts/demo-terpadu/` dari `test-suite` Ubuntu (`retention-days: 14`).
2. Tambahkan job lanjutan pasca-`quality-gate` untuk cakupan **Phase 36–42** (menggunakan hanya endpoint loopback & kunci ephemeral tanpa secret toko produksi):

```yaml
  # Tambahan di test-suite (Ubuntu): unggah artefak Demo Terpadu yang sudah persisten
      - name: Unggah Artefak Demo Terpadu (Phase 23 & 36–42)
        if: runner.os == 'Linux' && always()
        uses: actions/upload-artifact@v4
        with:
          name: demo-terpadu-artifacts
          path: artifacts/demo-terpadu/
          retention-days: 14
          if-no-files-found: error

  # Job baru: Phase 36 Virtual Display Xvfb + GTK3 Compile/Window Probe
  phase36-gui-xvfb:
    name: NUSANTARA / Validasi GUI Virtual Display (Phase 36)
    needs: quality-gate
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - name: Pasang Xvfb & GTK+ 3.0 Development Headers
        run: |
          sudo apt-get update -y
          sudo apt-get install -y --no-install-recommends xvfb libgtk-3-dev pkg-config xauth
      - name: Uji GUI Phase 36 dalam Xvfb Session
        run: xvfb-run -a npm run test:gui-v36

  # Job baru: Phase 39 & 42 HTTPS TLS OpenSSL + OTA Key Rotation/Abort Probe
  phase39-42-tls-ota-probe:
    name: NUSANTARA / Validasi TLS X.509 & Regresi OTA (Phase 39 & 42)
    needs: quality-gate
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - run: openssl version
      - run: npm run test:mobile-networking-v39
      - run: npm run test:pembaruan-v42

  # Job opsional/terjadwal dengan Android SDK + KVM Emulator (Phase 37, 38, 40, 41)
  phase37-41-android-sdk:
    name: NUSANTARA / Validasi Android SDK, APK/AAB & Signing (Phase 37–41)
    needs: quality-gate
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - uses: android-actions/setup-android@v3
      - run: npm ci
      - name: Validasi Proyek Kotlin & Keystore Uji Ephemeral
        run: |
          npm run test:mobile-v37
          npm run test:distribusi-v40
          npm run test:publikasi-v41
          # Tahap selanjutnya setelah template Gradle penuh tersedia:
          # ./gradlew assembleRelease bundleRelease && apksigner verify ...

  # Job iOS pada Apple Silicon (Phase 37, 40, 41 — tanpa upload toko produksi)
  phase37-41-ios-xcode:
    name: NUSANTARA / Validasi Xcode Toolchain (Phase 37 & 40–41)
    needs: quality-gate
    runs-on: macos-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - run: |
          xcodebuild -version
          npm run test:mobile-v37
          npm run test:distribusi-v40
```

3. **Catatan Runner ARM64 pada `build-matrix-validation`:**
   - Bila akun/paket GitHub tidak menyediakan `windows-11-arm`, dokumentasikan secara eksplisit apakah runner self-hosted ARM64 Windows dipasang atau ubah target tersebut ke mode cross-compile yang jujur melapor `NOT_VERIFIED` pada job terpisah (jangan pernah memaksakan `PASS` tanpa eksekusi ARM64 nyata).
   - Untuk `linux-arm64`, `ubuntu-24.04-arm` sudah tersedia pada GitHub public ARM64 Linux runner standar; tetap pertahankan cabang cross-QEMU pada `ubuntu-latest` sebagai cadangan teruji.

#### B. Rancangan Patch `.github/workflows/release.yml` (Tanpa Mengaktifkan Publikasi Produksi)
Perubahan yang **wajib** ditinjau sebelum mengizinkan rilis apa pun:
1. **Ganti runner retired `macos-13`:** gunakan `macos-latest` (`arm64`) dengan Rosetta 2 untuk target `macos-x86_64` (atau hapus/ubah matrix sesuai ketersediaan runner `ci.yml`).
2. **Blokir release jika certification gate belum lulus & lindungi trigger tag:**
   - Wajibkan `workflow_dispatch` saja untuk publikasi, atau verifikasi status sukses workflow `NUSANTARA Continuous Integration` pada commit SHA tag target via GitHub CLI (`gh run list --commit "$GITHUB_SHA" --workflow ci.yml --json conclusion`) — gagalkan job (`exit 1`) jika `phase23-certification-gate` belum berstatus `success`.
   - Setel default `dry_run: true` pada `workflow_dispatch` hingga sertifikasi penuh selesai, dan pertahankan `if: inputs.dry_run != true && inputs.confirm_release == true` pada langkah `softprops/action-gh-release@v2` agar **tidak ada publikasi rilis produksi otomatis**.
3. **Jalankan `npm run test:demo-terpadu` & verifikasi `artifacts/demo-terpadu/SHA256SUMS`** di `test-and-gate` (lebih ideal lagi: `strategy.matrix` Linux/Windows/macOS).
4. **Hapus hardcoded timestamp:** ganti `'2026-10-25T00:00:00.000Z'` pada `release-manifest.json` dengan `new Date().toISOString()`.
5. **Tambahkan `timeout-minutes`** pada seluruh job `release.yml` (mis. `15`–`35` menit).

#### C. Rancangan Patch Ringan `kernel-boot-qemu.yml` & `nusantara-os-ci.yml`
1. **`kernel-boot-qemu.yml`:** Naikkan `timeout-minutes: 10` -> `timeout-minutes: 20` untuk mencegah timeout fluktuatif saat `apt-get install` + 46 skrip `npm test` + QEMU, serta tambahkan `permissions: { contents: read }` dan `concurrency` agar setara dengan `ci.yml`.
2. **`nusantara-os-ci.yml`:** Tambahkan `timeout-minutes: 15`–`25` pada tiap job dan pertimbangkan menautkan `npm run test:demo-terpadu` atau tetap memisahkannya khusus domain bahasa + OS sambil mengandalkan `ci.yml` sebagai agregator Phase 23 & 36–42.

---

## 6. Batasan Toolchain Lokal & Sisa Pekerjaan Sebelum Sertifikasi Penuh (`SELESAI`)

### 6.1 Batasan Lingkungan Kontainer Lokal Saat Ini
1. **Kompilator & Linker Native (Phase 23, 44–46):** `clang`, `lld`, `llc`, `aarch64-linux-gnu-gcc`, `pwsh`, `MSVC`, `WinSDK`, dan `MacOSX.sdk` tidak terpasang -> uji native biner `local-snapshot` (0/6 PASS, 6/6 `NOT_VERIFIED`), uji `test:build-v23` (`3 NOT_VERIFIED`), serta 3 kasus uji LLVM/Linker/Actor (`SKIPPED`).
2. **Display Server & Widget OS (Phase 36):** Kontainer headless tanpa X11/Wayland/`Xvfb`/`libgtk-3-dev`, Windows DWM, ataupun macOS Cocoa.
3. **Mobile SDK & Emulator/Simulator (Phase 37, 38, 40, 41):** Kontainer tidak memiliki JDK/Android SDK (`aapt2`, `d8`, `apksigner`, `bundletool`, emulator KVM) ataupun macOS + Xcode (`xcodebuild`, `simctl`, `codesign`).
4. **Layanan Cloud & Perangkat Fisik (Phase 38, 39, 41, 42):** Kontainer offline dari layanan SaaS produksi dan tidak terhubung ke ponsel Android/iPhone fisik untuk kamera, GPS GNSS, IMU, BLE GATT, biometrik TEE/Secure Enclave, maupun Play Core / StoreKit.

### 6.2 Sisa Pekerjaan untuk Memindahkan Status dari `PARTIAL` -> `SELESAI`
1. **Review & Terapkan Rancangan Workflow CI:** Tinjau dan terapkan pembaruan `.github/workflows/ci.yml`, `release.yml` (tanpa mengaktifkan publikasi produksi), dan `kernel-boot-qemu.yml` dari Seksi 5.2, serta bersihkan/kecualikan `bun.lock` lokal sebelum push ke cabang pengujian.
2. **Eksekusi GitHub Actions Multi-Runner Nyata:**
   - Pastikan **Phase 23** mencatat **`CERTIFIED (6/6 PASS)`** pada `phase23-certification-gate` dengan sentinel `NUSANTARA_NATIVE_CI_OK` di Windows x64/ARM64 (atau runner self-hosted ARM64 Windows), Linux x64/ARM64, dan macOS arm64/x64.
   - Verifikasi **Phase 36** di `Xvfb` GTK3 (`ubuntu-latest`) serta sesi GUI `windows-latest` & `macos-latest`.
3. **Integrasi Toolchain & Runtime Mobile Nyata (Phase 37–42):**
   - Implementasikan & uji kompilasi proyek Gradle nyata (`classes.dex` + `aapt2` + `bundletool` + `apksigner` keystore ephemera uji) dan launch pada Android Emulator KVM.
   - Implementasikan & uji kompilasi `xcodebuild` nyata di `macos-latest` menghasilkan Mach-O `.app` & `.ipa` serta launch pada iOS Simulator (`xcrun simctl`).
   - Lakukan uji perangkat fisik Android & iOS untuk sensor keras (kamera, BLE, biometrik TEE/FaceID, GPS, notifikasi push nyata FCM/APNs, & Play Core / StoreKit sandbox non-produksi) sebelum status fase mana pun dinaikkan ke `SELESAI`.
