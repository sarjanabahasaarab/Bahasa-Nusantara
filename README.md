# NUSANTARA

> **Bahasa Pemrograman 100% Bahasa Indonesia untuk Komputasi Modern, Terbuka, dan Berkelanjutan.**

[![Status](https://img.shields.io/badge/status-fase_50:_nusantara_os_process_isolation_&_user_mode-emerald.svg)](ROADMAP.md)
[![Versi](https://img.shields.io/badge/versi-v0.50.0-emerald.svg)](PERUBAHAN.md)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-passing-brightgreen.svg)](.github/workflows/ci.yml)
[![Lisensi](https://img.shields.io/badge/lisensi-Apache_2.0-blue.svg)](LISENSI)
[![Tata Bahasa](https://img.shields.io/badge/grammar-EBNF_ISO--14977-purple.svg)](dokumentasi/GRAMMAR-EBNF.md)
[![Testing](https://img.shields.io/badge/testing-46_suites_lulus_100%25-green.svg)](pengujian/README.md)
[![Nusantara OS](https://img.shields.io/badge/os_user_mode-ring0_ring3_process_isolation-blue.svg)](docs/os/01-arsitektur-kernel.md)
[![Game SDK](https://img.shields.io/badge/game_sdk-2d%2F3d_ecs_physics_audio-blue.svg)](docs/game-sdk/01_pendahuluan_arsitektur.md)
[![Actor Concurrency](https://img.shields.io/badge/concurrency-actor_model_&_structured_async-blue.svg)](docs/runtime/actor-model.md)
[![Linker](https://img.shields.io/badge/linker-advanced_&_standalone-blue.svg)](docs/compiler/linker.md)
[![NIR & SSA](https://img.shields.io/badge/compiler-nir_ssa_&_cfg-blue.svg)](docs/compiler/nir.md)
[![LLVM AOT](https://img.shields.io/badge/backend-llvm_ir_&_aot_native-blue.svg)](docs/compiler/llvm-backend.md)
[![Mobile OTA](https://img.shields.io/badge/mobile_ota-in--app_&_cloud_updates-blue.svg)](docs/mobile/updates/index.md)
[![Mobile CI/CD](https://img.shields.io/badge/mobile_cicd-fastlane_&_github_actions-purple.svg)](docs/mobile/cicd/index.md)
[![Distribusi](https://img.shields.io/badge/distribusi-android_apk_aab_&_ios-blue.svg)](docs/mobile/distribution/index.md)
[![Networking](https://img.shields.io/badge/networking-offline_first_&_cloud-blue.svg)](docs/mobile/networking/01_arsitektur_networking_mobile.md)
[![Native API](https://img.shields.io/badge/native_api-android_&_ios-purple.svg)](docs/mobile/native-api/pengenalan-native-api.md)
[![Mobile Framework](https://img.shields.io/badge/mobile-android_&_ios-purple.svg)](docs/mobile/01_pendahuluan.md)
[![Desktop GUI](https://img.shields.io/badge/desktop-gui_framework-indigo.svg)](docs/desktop/pengenalan-gui.md)
[![Autentikasi](https://img.shields.io/badge/keamanan-scrypt_&_rbac-red.svg)](docs/referensi/authentication.md)
[![Web & REST](https://img.shields.io/badge/web-framework_&_rest_api-cyan.svg)](docs/referensi/web-framework.md)
[![Database](https://img.shields.io/badge/database-sqlite_native-amber.svg)](docs/referensi/database.md)

---

## 1. Tentang NUSANTARA

**NUSANTARA** adalah bahasa pemrograman serba guna (*general-purpose programming language*) tingkat tinggi yang dirancang dan dikembangkan dari nol menggunakan 100% tata bahasa, kata kunci teknis, dan leksikon Bahasa Indonesia.

NUSANTARA bukan sekadar terjemahan sintaksis atau praprosesor teks atas bahasa asing, melainkan rekayasa perangkat lunak mandiri yang mencakup arsitektur kompilasi lengkap: *Lexer*, *Parser (Recursive Descent AST)*, *Sistem Tipe Statis & Inferensi*, *Pohon Sintaksis Abstrak*, *Interpreter Eksekusi*, *CLI Toolkit*, *Pustaka Standar (std)*, *Ekosistem Aplikasi Web & Desktop*, *Platform Mobile Lintas-Platform (Android & iOS)*, *Nusantara Intermediate Representation (NIR) berbasis SSA & CFG*, *LLVM Backend & Kompilasi Native Ahead-of-Time (AOT)*, *Sistem Linker & Standalone Executable Generator*, *Sistem Konkurensi Performa Tinggi berbasis Actor Model*, *Nusantara Game Development Kit (Game SDK)*, hingga *Nusantara OS: Process Isolation & User Mode*.

### Visi & Misi Proyek
- **Kedaulatan Teknologi & Bahasa:** Memberikan kemandirian dalam ekosistem perangkat lunak nasional melalui bahasa pemrograman formal berstandar internasional (ISO/IEC 14977 EBNF).
- **Akselerasi Edukasi Komputasi:** Menghilangkan batasan bahasa asing bagi pelajar dan pengembang di seluruh Nusantara dalam memahami konsep algoritma, struktur data, dan rekayasa perangkat lunak.
- **Produksi Industri & Multiplatform:** Mampu digunakan untuk membangun utilitas terminal, layanan API web, aplikasi desktop GUI, aplikasi seluler produksi, game 2D/3D deterministik, hingga biner kompilasi native yang dioptimalkan.
- **Evolusi Menuju Sistem Operasi:** Menjadi fondasi runtime dan bahasa pemrograman utama bagi proyek jangka panjang **NusantaraOS**.

---

## 2. Status Perkembangan Proyek & Roadmap

- **Status Saat Ini:** **🟠 Phase 50: Nusantara OS: Process Isolation & User Mode — PARTIAL (CI_READY) (Milestone v0.50.0)**.
- **Total Fase Diaudit:** 50 Fase (Phase 1 s/d Phase 50).
  - 🟢 **Selesai Penuh (40 Fase):** Phase 1–22, Phase 24–35, dan Phase 43–48 berstatus implementasi penuh dan lulus seluruh pengujian unit, integrasi, serta E2E (catatan: 3 skenario biner native LLVM/Linker/Actor pada Phase 44–46 ditandai *skipped* transparan di container tanpa `clang`/`llc`/`lld`).
  - 🟠 **Selesai Sebagian / PARTIAL (10 Fase):** Phase 23 & 36–42 (implementasi inti & protokol nyata aktif dan teruji via loopback HTTP/WebSocket, kripto Ed25519/RS256/ES256, & PKZIP CRC-32; perangkat keras fisik, display server, Android SDK, Xcode, serta toko produksi memerlukan toolchain/kredensial eksternal) dan Phase 49–50 (90 pengujian OS kernel/usermode lulus 100% dan ISO `artifacts/phase50/` tervalidasi; eksekusi boot bare-metal QEMU siap di GitHub Actions karena container lokal tidak memiliki `qemu-system-x86_64`).
- **Rangkaian Pengujian (`npm test`):** 46 perintah uji otomatis berjalan 100% tanpa kegagalan di Linux x86_64 (`Node.js v22.23.2`): 167 pemeriksaan dokumen fondasi + 1.292 skenario TypeScript di 45 suite (1.288 lulus, 0 gagal, 3 *skipped* transparan pada LLVM/Linker/Actor + 1 `BELUM DIVERIFIKASI` pada Phase 23 native host build tanpa `clang` = **1.459 pemeriksaan gabungan terverifikasi**), ditambah 3 uji terpisah untuk fallback peramban (`npm run test:database-browser-v29`).
- **Pemisahan Status Verifikasi Lingkungan:**
  - **SQLite Native (`node:sqlite`):** `26/26` lulus lokal pada Node.js 22 LTS Linux; tidak diam-diam fallback in-memory di Node.js.
  - **Regresi Lintas Platform:** Linux lulus lokal; `ubuntu-latest`, `macos-latest`, dan `windows-latest` disiapkan pada `.github/workflows/ci.yml` dengan **Node.js 22 LTS** & `npm ci` (eksekusi macOS/Windows menunggu GitHub Actions).
  - **Build ISO & Eksekusi QEMU:** Biner `kernel.elf`/`user-test.elf`/`user-fault-test.elf` tervalidasi ELF64/Multiboot2, namun ISO GRUB2 (`NOT_BUILT`) dan QEMU (`NOT EXECUTED`) menunggu runner Ubuntu di GitHub Actions.
- **Audit Terakhir:** 13 November 2026.
- **Dokumentasi Roadmap Lengkap:** Silakan baca [ROADMAP.md](ROADMAP.md) untuk tabel detail status, bukti implementasi, dan rencana pengembangan fase 1 hingga 50.

---

## 3. Fitur yang Benar-Benar Sudah Tersedia

Seluruh fitur di bawah ini telah diverifikasi melalui audit kode sumber (`src/`) dan rangkaian pengujian otomatis (`pengujian/`):

### A. Inti Bahasa, Tata Bahasa & Kompiler
- **Spesifikasi Bahasa Formal (EBNF ISO/IEC 14977):** Struktur leksikal, tata bahasa, dan konvensi penamaan leksikon Indonesia.
- **Sistem Tipe Statis & Inferensi Tipe:** Tipe primitif (`bilangan`, `teks`, `logika`, `kosong`), tipe komposit (`larik`, `kamus`), dan tipe bentukan (`struktur`).
- **Lexer & Tokenizer:** Pemindaian token presisi dengan penanda posisi baris dan kolom.
- **Parser & Pohon Sintaksis Abstrak (AST):** Parsing rekursif dengan penanganan galat sintaksis informatif.
- **Interpreter Eksekusi:** Evaluasi ekspresi aritmetika/logika, percabangan (`jika`, `jika_tidak`, `jika_tidak_maka`), perulangan (`selama`, `untuk`), dan definisi fungsi (`fungsi ... kembali`).
- **CLI Toolkit Lengkap:** `nusantara jalankan`, `nusantara cek`, `nusantara format`, `nusantara uji`, `nusantara repl`, `nusantara bangun`.

### B. Runtime, Ekosistem Server & Desktop
- **Pustaka Standar (`std`):** Operasi matematika (`std::matematika`), manipulasi string (`std::teks`), sistem berkas (`std::berkas`), waktu (`std::waktu`), JSON (`std::json`), dan kriptografi (`std::kripto`).
- **Penyimpanan Data & Database:** Driver SQLite terintegrasi, Query Builder tipe aman, migrasi skema, dan ORM sederhana.
- **Framework Web & REST API:** Router HTTP berbasis leksikon Indonesia, penanganan middleware (CORS, Logger, Rate Limiter), otentikasi token JWT/Sesi, dan validasi muatan JSON.
- **Komunikasi Realtime:** Server WebSocket mandiri, penanganan kanal/ruang siaran, dan manajer tugas latar belakang (*background workers*).
- **Framework Desktop GUI:** Manajemen jendela, sistem tata letak kontainer (Flex/Grid), komponen tombol, label, bidang input, dan penangan acara berbasis sinyal.

### C. Ekosistem Mobile Lintas-Platform (Android & iOS)
- **Framework Aplikasi Seluler:** Sistem komponen reaktif seluler, navigasi tumpukan (*stack navigation*), dan manajemen status global.
- **Native Device APIs (25 Modul):** Kamera, geolokasi/GPS, akselerometer, sensor biometrik (sidik jari/wajah), penyimpanan aman (Keystore/Keychain), getaran (haptik), jaringan, baterai, papan klip, dan notifikasi lokal.
- **Networking Mobile:** Arsitektur *offline-first*, sinkronisasi data awan bertahap (*delta sync*), penyimpan cache lokal, dan manajer antrean permintaan offline.
- **Mobile Distribution & Publishing:** Pembuat paket Android APK & AAB, penandatanganan Keystore, Apple iOS Archive & Code Signing, validator kelayakan rilis Play Store/App Store, dan pelapor build.
- **Mobile CI/CD & Store Automation:** Integrasi GitHub Actions & Fastlane, generator alur kerja otomatis, manajemen rahasia/sertifikat, dan otomatisasi rilis TestFlight/Play Store Internal.
- **Mobile App Update & OTA Engine (Phase 42):** Pemeriksa pembaruan dalam aplikasi (*in-app update*), pengunduh aman berverifikasi SHA-256, delta patcher, hot-reload bundle OTA JavaScript/Nusantara, pemulihan rollback otomatis jika instalasi gagal, dan banner notifikasi pembaruan ramah pengguna.

### D. Nusantara Intermediate Representation (NIR) & SSA Form (Phase 43)
- **Representasi Tingkat Rendah NIR:** Arsitektur berbasis register tak terbatas dengan pelacakan rantai *def-use*, penataan *Basic Blocks*, dan instruksi *terminator* (`ret`, `br`, `cond_br`, `unreachable`).
- **AST-to-NIR Lowering:** Penurunan menyeluruh struktur AST bahasa Nusantara ke representasi perantara memori (`NIRModule`).
- **Control Flow Graph (CFG) & Dominator Tree:** Pembangkit graf aliran kontrol lengkap dengan kalkulasi *Dominance Frontier* untuk penempatan simpul Phi SSA.
- **SSA Mem2Reg Engine:** Algoritma promosi variabel tumpukan (`alloca`/`load`/`store`) ke bentuk SSA murni dengan simpul `phi` berkinerja tinggi.
- **Optimizer Pipeline:** Pipeline pengoptimalan modular (`NIRPassManager`) mencakup *Constant Folding*, *Algebraic Simplification*, dan *Dead Code Elimination (DCE)*.
- **NIR Verifier & CLI Tool:** Verifikasi integritas semantik IR dan utilitas baris perintah `nusantara nir` (`--verify`, `--dump`, `--json`, `--optimize`, `--ssa`).

### E. LLVM Backend & AOT Native Compilation (Phase 44)
- **Deteksi Toolchain LLVM Aman:** `LLVMToolchainManager` mendeteksi `clang`, `llc`, `opt`, `llvm-as`, `llvm-dis`, `llvm-objdump`, dan `lld` secara aman tanpa shell injection serta mendukung kustomisasi jalur dan diagnostik pemasangan.
- **Target Triple & Data Layout Cross-Platform:** Resolusi target host otomatis dan target kompilasi silang (`x86_64-linux`, `aarch64-linux`, `arm64-macos`, `x86_64-macos`, `x86_64-windows`) dengan format objek ELF, Mach-O, dan COFF.
- **Pemetaan Tipe & Emisi Instruksi LLVM IR:** Pemetaan lengkap tipe NIR ke LLVM IR (`i1`, `i32`, `i64`, `double`, opaque pointer `ptr`, array, struct, signature fungsi) dan emisi instruksi SSA (`alloca`, `load`, `store`, `gep`, `add`, `sub`, `mul`, `sdiv`, `icmp`, `phi`, `call`, `br`, `cond_br`, `ret`).
- **Validasi & Optimasi LLVM IR:** Validasi sintaks LLVM IR lokal terpadu + validasi via `llvm-as` jika terpasang, serta integrasi pass manager `opt` (`-O0`, `-O1`, `-O2`, `-O3`, `-Os`).
- **Runtime C & Native Linker:** Runtime stub `nusantara-native-runtime.c` yang mendelegasikan `main` native ke `@utama` Nusantara dan menyediakan pustaka C runtime terisolasi (`nusantara_cetak_bilangan`, `nusantara_cetak_teks`, `malloc`, `free`, `printf`).
- **AOT Pipeline & CLI:** Pipeline utuh dari berkas `.nusantara` -> LLVM IR -> Object File -> Biner Mesin Native via perintah `nusantara aot` / `nusantara kompilasi` dan `nusantara toolchain`.

### F. Linker & Standalone Executable (Phase 45)
- **Sistem Tabel Simbol (`SymbolTable`):** Manajemen simbol global, lokal, dan weak dengan skema name mangling terstruktur (`_N_F_*`, `_N_V_*`, `_N_C_*`), visibilitas ELF/Mach-O/COFF, dan resolusi seksi (`.text`, `.data`, `.rodata`, `.bss`).
- **Resolusi Simbol Kuat & Lemah (`SymbolResolver`):** Deteksi galat terstruktur untuk konflik simbol ganda (`LN4001`) dan simbol tak terdefinisi (`LN4002`), serta penimpaan simbol lemah oleh simbol kuat secara deterministik.
- **Mesin Relokasi Multi-Format (`RelocationManager`):** Validasi tipe relokasi arsitektur ELF (x86_64, AArch64), PE/COFF (AMD64), dan Mach-O dengan verifikasi batas offset dan pencegahan overflow addend PC32.
- **Linker Statis & Dinamis:** Penggabungan berkas objek `.o`, pustaka statis `.a`/`.lib`, integrasi C runtime stub, serta dukungan pustaka bersama (`.so`, `.dylib`, `.dll`) dengan konfigurasi `RPATH` (`$ORIGIN`, `@executable_path`).
- **Manajer Pustaka & Inspektur Dependensi:** Konfigurasi deklaratif `[pustaka]` pada `nusantara.toml` dan `DependencyInspector` untuk menganalisis dependensi biner saat runtime.
- **Inspektur Format Biner Mesin (`BinaryInspector`):** Validasi biner native bawaan tanpa alat eksternal untuk header ELF (`\x7fELF`), PE/COFF (`MZ`), dan Mach-O.
- **Pembuatan & Pengemasan Executable Mandiri:** `ExecutableBuilder` dan `StandalonePackager` yang menghasilkan executable mandiri dengan profil runtime `BUNDLED`, `MINIMAL`, atau `SHARED`, beserta struktur direktori portabel (`bin/`, `lib/`, `config/`, `resources/`, `manifest.json`, `LISENSI.txt`, `BACA-SAYA.txt`) dan arsip terkompresi.
- **Perintah CLI:** `nusantara link` (menautkan objek/pustaka), `nusantara inspect` (analisis biner dan dependensi), dan `nusantara package` (membuat paket bundel mandiri).

### G. High-Performance Concurrency & Actor Model (Phase 46)
- **Model Aktor Terisolasi:** Pola *share nothing* di mana setiap aktor memiliki siklus hidup independen (`ActorStatus`), alamat unik (`ActorRef`), dan state privat yang terlindung dari akses konkuren langsung.
- **Mailbox Berbatas & Kebijakan Luapan:** Antrean pesan berbatas (bounded FIFO) dengan 4 strategi luapan (*overflow policy*): `REJECT`, `WAIT`, `DROP_OLDEST`, dan `DROP_NEWEST`.
- **Semantik Pengiriman Pesan:** Pengiriman asinkron tanpa blokir (`kirim`), pola permintaan-tanggapan dengan batas waktu otomatis (`ask`), pengalihan pesan (`forward`), serta penampungan pesan tak terkirim pada *Dead Letter Queue*.
- **Penjadwalan Adil & Pengendali Throughput:** Penjadwal kooperatif (`FairnessController`) dengan alokasi throughput budget per giliran untuk mencegah starvation antar-aktor.
- **Structured Concurrency Runtime:** Abstraksi tugas ringan `Task<T>`, pengelompokan `TaskGroup` (`joinAll`, `joinAny`), pembatalan kooperatif `CancellationToken`, dan pembatasan durasi `withTimeout`.
- **Pengawasan & Ketahanan Kesalahan:** Hirarki supervisi aktor dengan 4 strategi pemulihan: `RESUME` (lanjutkan pesan berikutnya), `RESTART` (reset state aktor), `STOP` (hentikan aktor), dan `ESCALATE` (teruskan ke supervisor induk).
- **Manajemen Sumber Daya & Diagnostik Stall:** `ResourceManager` pembatas kuota aktor/mailbox aktif dan `ConcurrencyDiagnostics` pendeteksi aktor macet (*stalls*) dan deadlock siklis.
- **Dukungan Kompiler & LLVM:** Kata kunci bahasa `aktor`, `terima`, `kirim`, `hentikan`, dan `await`, opcode NIR (`actor.create`, `actor.send`, `actor.stop`, `async.start`, `await`), serta emisi LLVM IR dengan stub native runtime C terintegrasi (`nusantara_actor_*`, `nusantara_task_*`).
- **CLI Konkurensi:** Perintah `nusantara actor` (`--list`, `--stats`, `--inspect`) dan `nusantara concurrency` (`--benchmark`, `--diagnostics`).

### H. Nusantara Game Development Kit (Game SDK) (Phase 47)
- **Core Engine & Deterministic GameLoop:** Siklus frame deterministik dengan fixed timestep accumulator (`Time.deltaTime`, `unscaledDeltaTime`, `timeScale`, perhitungan FPS akurat).
- **Abstraksi Grafika & Rasterizer Virtual:** Antarmuka terpadu `IRenderer` dengan `Canvas2DRenderer` yang mendukung rendering HTML5 Canvas serta software rasterizer command buffer virtual tanpa ketergantungan wajib pada GPU fisik.
- **Kamera 2D & 3D:** `Camera2D` (koordinat dunia-ke-layar, zoom, pembatasan batas, pergerakan halus) dan `Camera3D` (bidang pandang FOV, rasio aspek, vektor tatap *lookAt*, dan vektor maju).
- **Primitif 3D, Material & Shader:** Pembangkit mesh geometris (`Mesh.createCube`, `createPlane`, `createSphere`), `MaterialManager`, `TextureManager`, dan kompilasi mock shader `ShaderManager`.
- **Entity Component System (ECS) & Scene Manager:** Arsitektur ECS berkinerja tinggi dengan indexing sparse query, hierarki parent/children, `SceneManager`, serta serialisasi/deserialisasi penuh snapshot dunia game.
- **Simulasi Fisika 2D Deterministik:** `PhysicsWorld2D` dengan integrasi gravitasi Euler, deteksi tabrakan AABB dan Lingkaran, pemisahan penetrasi & respon impuls momentum, serta penembakan sinar (*raycasting*).
- **Manajemen Input Terpadu:** `InputManager` keyboard, mouse (posisi, tombol), pemetaan aksi abstrak terkonfigurasi, dan generator peristiwa input simulasi.
- **Sistem Audio Berlapis:** `AudioManager` dengan registrasi klip suara, pemutaran, jeda, penghentian, serta hierarki volume master dan multi-kategori (Master, Music, SFX, Voice).
- **Animasi Sprite & Sistem Partikel:** `SpriteAnimationController` berbasis timeline frame & callback `onComplete`, serta `ParticleEmitter2D` berbasis gravitasi, lifetime, dan interpolasi warna.
- **Game UI Modular:** Komponen antarmuka `UIPanel`, `UIButton`, `UILabel`, `UIProgressBar`, `UISlider`, dan hit-testing interaksi input.
- **Manajemen Aset Aman:** `AssetManager` terproteksi perisai anti path-traversal dan whitelist ekstensi file (`.png`, `.jpg`, `.wav`, `.mp3`, `.json`).
- **Jaringan & Multiplayer:** Serialisasi paket data deterministik `PacketSerializer`, `GameNetworkClient`, dan `GameNetworkServer` (broadcast, state sync).
- **Sistem Simpanan Aman:** `SaveManager` dengan verifikasi integritas hash checksum SHA-256 dan migrasi versi simpanan otomatis.
- **Integrasi Actor Model (Phase 46):** `ActorComponent` untuk memetakan perilaku AI entitas, state concurrent, dan pengiriman pesan antar-aktor via `ActorSystem`.
### I. Nusantara OS: Minimal Kernel Interface & Bootable Hardware Validation (Phase 48 & 49)
- **Kernel Core & ABI:** Inisialisasi siklus hidup kernel x86_64 (`KernelCore`), tata letak memori Higher-Half (-2GB), dan penanganan `KernelPanic` terstruktur.
- **Physical Memory Manager (PMM):** Frame bitmap allocator dengan manajemen alokasi dan pembebasan halaman fisik 4 KiB.
- **Virtual Memory Manager (VMM):** Paginasi 4-tingkat x86_64 (`PML4`, `PDPT`, `PD`, `PT`) dengan pemetaan Higher-Half dan proteksi hak akses.
- **Kernel Heap Dinamis:** Alokator heap dengan penggabungan blok bebas (*free block merging*) dan pencegahan *double-free*.
- **Interrupt Descriptor Table (IDT) & Exceptions:** 256 entri gerbang interupsi, penanganan fault `#DE`, `#UD`, `#DF`, `#GP`, `#PF`, dan remap PIC 8259 ke vektor `0x20`–`0x2F`.
- **Hardware Abstraction Layer (HAL) & Drivers:** Abstraksi port I/O x86, driver UART 16550 COM1 (`0x3F8`), PIT 8254, keyboard PS/2, dan buffer teks VGA `80x25`.
- **Multiboot2 & ELF64 Validator:** Kepatuhan penuh standar Multiboot2 `0xE85250D6` dengan perataan batas 8-byte dan verifikasi struktur biner ELF64 x86_64.
- **Long Mode Bootstrap Machine Code:** Titik masuk 32-bit Multiboot2, aktivasi PAE/Paging/Long Mode, far jump ke titik masuk 64-bit, dan transmisi sentinel boot: `NUSANTARA_KERNEL_BOOT_OK`.

### J. Nusantara OS: Process Isolation & User Mode (Phase 50)
- **Pemisahan Hak Istimewa CPU Ring 0 & Ring 3:** Konfigurasi segment selector GDT 64-bit (`KERNEL_CS` 0x08, `KERNEL_SS` 0x10, `USER_CS` 0x23, `USER_SS` 0x1B).
- **Task State Segment (TSS) 64-bit:** Konfigurasi `TSS.RSP0` untuk peralihan stack otomatis saat trap/interupsi dari Ring 3, serta Interrupt Stack Table (`IST1` untuk Double Fault).
- **Ruang Alamat Terisolasi Per-Proses (`AddressSpace`):** Setiap proses memiliki PML4/CR3 terpisah dengan penegakan W^X (Write XOR Execute), No-Execute (NX), dan validasi alamat kanonikal 48-bit.
- **Keamanan Pointer Pengguna & Batas Memori:** Pencegahan injeksi alamat Higher-Half kernel (`EFAULT`), proteksi Zero-Page (`< 64 KiB`), serta fungsi salin aman `copyFromUser` dan `copyToUser`.
- **Pemuat Biner ELF64 Pengguna (`ELF64UserLoader`):** Pemuat aplikasi ruang pengguna dengan validasi batas alamat virtual dan pemetaan hak akses segmen `PT_LOAD`.
- **Alokasi Stack Pengguna:** Tumpukan pengguna 2 MiB dengan Guard Page dan perataan 16-byte sesuai standar System V AMD64 ABI.
- **Isolasi Kesalahan Proses (`ProcessFaultHandler`):** Kegagalan aplikasi pengguna (`#GP`, `#PF`, `#UD`) menghentikan proses tanpa memicu `KernelPanic`.
- **Komunikasi Antar-Proses (IPC):** Antrean pesan berprioritas `KernelMessageQueue`, pipa aliran data `KernelPipe`, dan memori bersama berizin `SharedMemoryManager`.
- **Subperintah CLI Proses:** `nusantara os process list`, `inspect`, `memory-map`, `terminate`, `syscall-test`, `isolation-test`, dan `run`.

---

## 4. Contoh Kode NUSANTARA (100% Sesuai Tata Bahasa)

Contoh kode berikut telah teruji dan dapat langsung dieksekusi oleh interpreter NUSANTARA:

### 4.1 Program Dasar
```nusantara
program HaloDunia
mulai
    pesan : teks = "Selamat datang di Bahasa Pemrograman NUSANTARA!"
    tampilkan(pesan)

    angka_a : bilangan = 10
    angka_b : bilangan = 32
    total : bilangan = angka_a + angka_b
    tampilkan("Hasil penjumlahan 10 + 32 =", total)
selesai
```

### 4.2 Fungsi dan Percabangan Logika
```nusantara
fungsi hitung_faktorial(n : bilangan) : bilangan
mulai
    jika n <= 1 maka
        kembalikan 1
    selain
        kembalikan n * hitung_faktorial(n - 1)
    akhir
selesai

program HitungFaktorial
mulai
    bil : bilangan = 5
    hasil : bilangan = hitung_faktorial(bil)
    tampilkan("Faktorial dari 5 adalah:", hasil)
selesai
```

### 4.3 Struktur Data Komposit (Daftar & Peta)
```nusantara
program DataPengguna
mulai
    pengguna : peta = {
        nama: "Budi Santoso",
        usia: 28,
        aktif: benar
    }
    daftar_keahlian : daftar = ["TypeScript", "Nusantara", "Mobile"]

    tampilkan("Nama Pengguna:", pengguna["nama"])
    tampilkan("Usia:", pengguna["usia"])
    tampilkan("Jumlah Keahlian:", panjang(daftar_keahlian))
selesai
```

### 4.4 Konkurensi & Model Aktor (Phase 46)
```nusantara
program DemoAktor
mulai
    aktor Penghitung mulai
        variabel nilai: Bulat = 0

        terima Tambah(jumlah: Bulat)
            nilai = nilai + jumlah
            cetak("Nilai bertambah menjadi: " + nilai)
        akhir

        terima Ambil(pemohon: Aktor)
            kirim(pemohon, nilai)
        akhir
    selesai

    variabel p: Aktor = buat Penghitung()
    kirim(p, Tambah(10))
    kirim(p, Tambah(25))
    hentikan(p)
selesai
```

### 4.5 Game Development Kit (Phase 47)
```nusantara
program GamePertama
gunakan "std:game" sebagai game
mulai
    tampilkan("=== GAME PERTAMA NUSANTARA ===")

    // 1. Buat aplikasi game dan dimensi viewport
    app : peta = game.buatAplikasiGame("Petualangan Nusantara", 800, 600)
    tampilkan("Aplikasi diinisialisasi:", app["judul"])

    // 2. Vektor geometri dan warna
    pos : peta = game.vektor2(100, 200)
    warnaPemain : peta = game.warna(0.2, 0.7, 1.0, 1.0)
    kotakPemain : peta = game.kotak(100, 200, 32, 32)

    // 3. Simulasikan langkah frame deterministik
    app.langkah(1 / 60)
    tampilkan("Simulasi frame sukses pada target 60 FPS")
selesai
```

---

## 5. Instalasi & Menjalankan Proyek

### 5.1 Menggunakan Paket Biner Rilis Resmi
Unduh paket distribusi untuk sistem operasi Anda dari direktori `dist/` atau halaman rilis resmi:

- **Windows (x64)**: `nusantara-v0.46.0-windows-x64.zip`
- **Linux (x64)**: `nusantara-v0.46.0-linux-x64.tar.gz` atau `.zip`
- **macOS (Intel x64)**: `nusantara-v0.46.0-macos-x64.tar.gz`
- **macOS (Apple Silicon ARM64)**: `nusantara-v0.46.0-macos-arm64.tar.gz`

#### Langkah Pemasangan Cepat (Linux / macOS):
```bash
# 1. Ekstrak arsip rilis
tar -xzf nusantara-v0.46.0-linux-x64.tar.gz
cd nusantara-v0.46.0-linux-x64

# 2. Jalankan skrip instalasi otomatis ke PATH pengguna
./install.sh

# 3. Verifikasi instalasi di terminal
nusantara --versi
```

Pada Windows:
1. Ekstrak berkas `nusantara-v0.46.0-windows-x64.zip`.
2. Klik ganda berkas `install.bat` atau tambahkan direktori `bin` ke variabel lingkungan `PATH`.
3. Buka PowerShell / Command Prompt dan jalankan:
   ```powershell
   nusantara --versi
   ```

### 5.2 Membangun dari Sumber (Build From Source)
Kebutuhan lingkungan:
- Node.js versi 22 LTS (`>= 22.13.0`, wajib untuk dukungan native `node:sqlite` / `DatabaseSync`).
- npm versi 10 ke atas.

```bash
# 1. Klon repositori proyek
git clone https://github.com/sarjanabahasaarab/Bahasa-Nusantara.git
cd Bahasa-Nusantara

# 2. Pasang dependensi
npm install

# 3. Jalankan pengujian mutu menyeluruh
npm test

# 4. Bangun bundel distribusi
npm run build
```

---

## 6. Dokumentasi Teknis

Dokumentasi resmi tersusun secara terstruktur di dalam direktori `docs/` dan `dokumentasi/`:

- **Tata Bahasa Formal:** [dokumentasi/GRAMMAR-EBNF.md](dokumentasi/GRAMMAR-EBNF.md)
- **Linker & Sistem Simbol (Fase 45):** [docs/compiler/linker.md](docs/compiler/linker.md)
- **Executable Mandiri & Pengemasan (Fase 45):** [docs/compiler/standalone-executable.md](docs/compiler/standalone-executable.md)
- **Backend Kompilator LLVM & AOT (Fase 44):** [docs/compiler/llvm-backend.md](docs/compiler/llvm-backend.md)
- **Representasi Perantara NIR & SSA (Fase 43):** [docs/compiler/nir.md](docs/compiler/nir.md)
- **Pembaruan Aplikasi Seluler & OTA (Fase 42):** [docs/mobile/updates/index.md](docs/mobile/updates/index.md) (18 panduan lengkap)
- **CI/CD & Otomatisasi Store Mobile (Fase 41):** [docs/mobile/cicd/index.md](docs/mobile/cicd/index.md)
- **Distribusi & Penerbitan Mobile (Fase 40):** [docs/mobile/distribution/index.md](docs/mobile/distribution/index.md) (14 panduan)
- **Jaringan & Sinkronisasi Seluler (Fase 39):** [docs/mobile/networking/01_arsitektur_networking_mobile.md](docs/mobile/networking/01_arsitektur_networking_mobile.md) (13 panduan)
- **API Perangkat Keras Seluler Asli (Fase 38):** [docs/mobile/native-api/pengenalan-native-api.md](docs/mobile/native-api/pengenalan-native-api.md) (25 panduan)
- **Kerangka Kerja Seluler (Fase 37):** [docs/mobile/01_pendahuluan.md](docs/mobile/01_pendahuluan.md)
- **Antarmuka Desktop GUI (Fase 36):** [docs/desktop/pengenalan-gui.md](docs/desktop/pengenalan-gui.md)
- **Klien HTTP & Integrasi API Eksternal (Fase 35):** [docs/referensi/http-client.md](docs/referensi/http-client.md)
- **WebSocket & Pekerja Latar Belakang (Fase 34):** [docs/referensi/realtime.md](docs/referensi/realtime.md)
- **Object-Relational Mapping / ORM (Fase 32):** [docs/referensi/orm.md](docs/referensi/orm.md)
- **Autentikasi, Sesi & Keamanan RBAC (Fase 31):** [docs/referensi/authentication.md](docs/referensi/authentication.md)
- **Framework Web & Server HTTP (Fase 30):** [docs/referensi/web-framework.md](docs/referensi/web-framework.md)
- **Basis Data API & SQLite Native (Fase 29):** [docs/referensi/database.md](docs/referensi/database.md)
- **Build System & Distribusi Desktop (Fase 23):** [docs/distribusi/build-native.md](docs/distribusi/build-native.md), [cross-compilation.md](docs/distribusi/cross-compilation.md), [instalasi.md](docs/distribusi/instalasi.md), [distribusi-paket.md](docs/distribusi/distribusi-paket.md)

---

## 7. Arsitektur Saluran Pipa Kompilasi

```text
Source Code (.nusantara)
         │
         ▼
 ┌───────────────┐
 │     Lexer     │  <-- [PHASE 6 (v0.6.0)]
 └───────────────┘
         │
         ▼
   TokenStream
         │
         ▼
 ┌───────────────┐
 │    Parser     │  <-- [PHASE 7 (v0.7.0)]
 └───────────────┘
         │
         ▼
 Pohon AST & Type Checker <-- [PHASE 8-14]
         │
         ▼
 Modul & Pustaka Standar  <-- [PHASE 15 & 17]
         │
         ▼
 Testing & Quality Gate   <-- [PHASE 21 (v0.21.0)]
         │
         ▼
 Package & Local Registry <-- [PHASE 22 (v0.22.0)]
         │
         ▼
 Nusantara IR (NIR) & SSA <-- [PHASE 43 (v0.43.0)]
         │
         ▼
 LLVM IR & AOT Generator  <-- [PHASE 44 (v0.44.0)]
         │
         ▼
 Linker & Standalone Exec <-- [PHASE 45 (v0.45.0)]
         │
         ▼
 Multi-Platform Targets   <-- [PHASE 23-45]
 ├── Standalone Native Exec (Linux ELF, Windows PE, macOS Mach-O)
 ├── Desktop GUI App      (Linux, macOS, Windows)
 ├── Web & REST Backend   (Server HTTP, WebSocket, DB)
 ├── Mobile App Bundles   (Android APK/AAB, iOS Archive)
 └── OTA Update Server    (Delta Bundles, Signature Verify)
```

---

## 8. Panduan Kontribusi (Contributing)

Kami menyambut hangat kontribusi dari seluruh pengembang, akademisi, dan praktisi teknologi untuk memajukan ekosistem NUSANTARA.

1. **Laporkan Isu atau Gagasan:** Buka *Issue* di GitHub jika menemukan kutu (*bug*), inkonsistensi tata bahasa, atau usulan pustaka baru.
2. **Fork Repositori:** Buat *branch* fitur baru dari `main` dengan format nama `fitur/nama-fitur` atau `perbaikan/nama-kutu`.
3. **Patuhi Standar Penamaan:** Seluruh API publik dan pustaka standar wajib menggunakan istilah Bahasa Indonesia baku yang jelas.
4. **Sertakan Pengujian Otomatis:** Setiap perubahan kode wajib disertai berkas pengujian di direktori `pengujian/` dan lulus pengujian `npm test`.
5. **Kirim Pull Request:** Jelaskan perubahan secara rinci pada templat Pull Request dan pastikan build CI/CD berstatus hijau.

---

## 9. Lisensi

Proyek Bahasa Pemrograman NUSANTARA dilindungi di bawah lisensi terbuka [Apache License 2.0](LISENSI).
Hak Cipta (c) 2026 Komunitas Bahasa Pemrograman NUSANTARA.
Semua orang bebas menggunakan, mempelajari, memodifikasi, dan mendistribusikan perangkat lunak ini sesuai dengan syarat dan ketentuan lisensi.
