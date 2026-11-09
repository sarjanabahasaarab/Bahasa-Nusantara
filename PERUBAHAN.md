# Catatan Perubahan (CHANGELOG) NUSANTARA

Seluruh perubahan penting pada proyek bahasa pemrograman NUSANTARA dicatat dalam dokumen ini.

Format penomoran versi mengacu pada **Semantic Versioning** (`vMAJOR.MINOR.PATCH`). Pada masa pengembangan awal, versi minor mencerminkan tahapan fase roadmap (misal `v0.1.0` untuk Phase 1, `v0.2.0` untuk Phase 2, `v0.3.0` untuk Phase 3, `v0.4.0` untuk Phase 4, `v0.5.0` untuk Phase 5, `v0.6.0` untuk Phase 6, `v0.7.0` untuk Phase 7, `v0.8.0` untuk Phase 8, `v0.9.0` untuk Phase 9, `v0.10.0` untuk Phase 10).

## [v0.48.0] — 2026-11-09
### Phase 48: Nusantara OS Minimal Kernel Interface

Fase ini mengimplementasikan fondasi antarmuka kernel sistem operasi mandiri (NUSANTARA OS Minimal Kernel Interface) berbasis kompilasi freestanding arsitektur x86_64 higher-half (-2 GiB). Implementasi ini menyediakan manajemen perangkat keras tingkat rendah, manajemen memori fisik dan virtual, sistem panggilan (syscalls), penanganan interupsi dan exception, penjadwalan proses/thread preemptive, driver perangkat periferal esensial, sistem berkas in-memory (RamFS & VFS), integrasi bootloader spesifikasi Multiboot2, pembangun biner ELF64 x86_64, modul pustaka standar `std:os` (alias: `kernel`, `sistem_operasi`), perkakas baris perintah `nusantara os`, 15 dokumentasi panduan teknis, dan suite pengujian Quality Gate 44 dengan 42 pengujian berstatus 100% lulus.

#### Ditambahkan:
- **Kernel Core Engine (`src/runtime/os/kernel/`):**
  - `KernelCore`: Manajemen siklus hidup transisi status (`UNINITIALIZED -> BOOTING -> RUNNING -> HALTED -> PANICKED`), konfigurasi batas memori, uptime ticks, dan integrasi komponen sistem.
  - `KernelLogger`: Sistem logging konsol kernel hierarkis dengan tingkat log (DEBUG, INFO, WARN, ERROR, PANIC).
  - `KernelPanic`: Penanganan kondisi panik fatal kernel dengan pelaporan subsistem, pencatatan alasan, dan dump register konteks CPU 64-bit.
  - `KernelDiagnostics`: Pengumpulan metrik real-time alokasi memori, total interupsi, total syscall, dan riwayat kesalahan sistem.
- **Kernel ABI & Kontrak Arsitektur (`src/runtime/os/abi/`):**
  - `KernelABI`: Peta memori higher-half kanonikal x86_64 (Userspace 128TB, Non-canonical Hole, Direct Physical Map, Kernel Heap, Kernel Text Base `-2 GiB`).
  - Isolasi Keamanan Batas Pointer: `isUserPointerValid` mencegah serangan eskalasi hak akses (*privilege escalation* / pointer injection) dari ruang pengguna ke ruang kernel.
  - Perataan Stack: Penegakan perataan batas 16-byte (`isAligned`, `alignUp`, `alignDown`) dan penonaktifan red-zone (`-mno-red-zone`).
  - Konvensi Simbol: Skema mangling simbol kernel Nusantara `_NK_<modul>_<nama>`.
  - Register Context: Representasi lengkap 16 register umum x86_64, `RIP`, `RFLAGS`, `CS`, `SS`, dan `CR3`.
- **System Call Interface (`src/runtime/os/syscall/`):**
  - `SyscallTable`: Registri 11 panggilan sistem standar dengan validasi jumlah minimum argumen.
  - `SyscallDispatcher`: Validator pointer memori pengguna (`EFAULT`) dan pencatat riwayat penelusuran panggilan sistem (*syscall tracing*).
  - 11 System Call Resmi: `sys_process_exit`, `sys_process_id`, `sys_thread_yield`, `sys_memory_allocate`, `sys_memory_release`, `sys_console_write`, `sys_clock_get`, `sys_file_open`, `sys_file_read`, `sys_file_write`, `sys_file_close`.
- **Manajemen Memori Komprehensif (`src/runtime/os/memory/`):**
  - **Physical Memory Manager (`physical-memory.ts`):** Bitmap frame allocator 4 KiB, alokasi frame berurutan (`allocateContiguous`), pembebasan frame dengan pencegahan double-free, dan reservasi wilayah memori firmware (`reserveRegion`).
  - **Virtual Memory Manager (`virtual-memory.ts`):** Arsitektur 4-level paging x86_64 (PML4, PDPT, PD, PT), translasi alamat virtual ke fisik, penegakan hak akses halaman (`checkAccess` untuk Read, Write, Supervisor/User, dan No-Execute).
  - **Kernel Heap Allocator (`kernel-heap.ts`):** Alokasi memori dinamis terarah dengan dukungan perataan pangkat dua (8..4096 byte), header magic `0x4E555341` ('NUSA'), pendaurulangan blok bebas (*free-list recycling*), pencegahan double-free, dan deteksi kehabisan memori (OOM).
  - **MemoryDiagnostics (`memory-diagnostics.ts`):** Pembangkit laporan status memori fisik, halaman terpetakan, dan fragmentasi heap.
- **Interupsi & Exception (`src/runtime/os/interrupt/`):**
  - `InterruptDescriptorTable` (IDT): Tabel 256 gerbang 64-bit dengan limit IDTR dan selector segmen kernel.
  - `ExceptionHandler`: Penanganan terdaftar untuk exception kunci CPU x86_64 (#DE Divide-by-Zero, #UD Invalid Opcode, #DF Double Fault, #GP General Protection Fault, #PF Page Fault dengan analisis bit CR2).
  - `InterruptController`: Remapping pengontrol interupsi PIC 8259 ke vektor 32..47 dan masking/unmasking jalur IRQ.
- **Hardware Abstraction Layer (`src/runtime/os/hal/`):**
  - `X86_64HAL`: Abstraksi instruksi privileged CPU (`cli`, `sti`, `halt`), emulasi register port I/O (`inb`, `outb`, `inw`, `outw`, `inl`, `outl`), akses byte memori fisik, register pewaktu PIT, konsol UART, dan antrean scancode keyboard.
  - `HALManager`: Akses singleton terisolasi ke instansi HAL yang aktif.
- **Driver Perangkat Inti (`src/runtime/os/drivers/`):**
  - `SerialDriver`: Driver port serial UART 16550 COM1 (`0x3F8`) kecepatan 115200 baud format 8N1.
  - `TimerDriver`: Driver pewaktu periodik PIT 8254 (`0x40`/`0x43`) frekuensi 100 Hz (10 ms time slice).
  - `KeyboardDriver`: Driver pengontrol keyboard PS/2 dengan penerjemah scancode set 1.
  - `FramebufferDriver`: Driver konsol VGA text mode 80x25 (`0xB8000`) dengan penanganan warna atribut dan scroll baris otomatis.
  - `DriverRegistry`: Manajemen registri terpusat dengan batch lifecycle `initAll()` dan `shutdownAll()`.
- **Manajemen Proses, Thread & Penjadwal (`src/runtime/os/process/` & `src/runtime/os/scheduler/`):**
  - `Process`: Process Control Block (PCB) dengan tabel deskriptor berkas VFS terisolasi dan pengelola thread.
  - `Thread`: Thread Control Block (TCB) dengan prioritas 1..5, kuantum waktu proporsional, dan register context.
  - `ContextSwitch`: Kontrak peralihan konteks CPU antar-thread.
  - `KernelScheduler`: Penjadwal preemptive berbasis antrean siap bertingkat (Multi-Level Ready Queue levels 1..5) dan kebijakan Round-Robin/Cooperative.
- **Sistem Berkas VFS & RamFS (`src/runtime/os/filesystem/`):**
  - `RamFS`: Sistem berkas in-memory berbasis pohon simpul direktori dan berkas reguler dengan operasi `create`, `read`, `write`, `remove`, `readdir`, dan `stat`.
  - `VirtualFileSystem`: Abstraksi tabel mount hierarki tunggal, resolusi berkas terpanjang (*longest match*), serta pemetaan nomor deskriptor berkas terbuka (fd >= 3).
- **Target Kompilasi & Bootloader (`src/compiler/targets/kernel/`):**
  - `X86_64_KERNEL_TARGET`: Target triple `x86_64-unknown-none-elf` dengan bendera freestanding lengkap.
  - `Multiboot2HeaderBuilder`: Generator header bootloader spesifikasi Multiboot2 (magic `0xE85250D6`, architecture 0, checksum zero-sum, dan tag framebuffer).
  - `generateKernelLinkerScript`: Pembangkit linker script higher-half x86_64 dengan segmen `.boot` (1 MiB fisikal) dan `.text` (virtual base `-2 GiB`).
  - `KernelELFBuilder`: Pembangkit biner ELF64 x86_64 autentik (`\x7fELF`, ET_EXEC, EM_X86_64, segmen `PT_LOAD`, seksi `.multiboot`, `.text`, `.rodata`, `.data`, `.bss`, `.shstrtab`, `.symtab`, `.strtab`, dan simbol `_start` / `kernel_main`).
- **Standard Library & CLI Integration:**
  - Modul standar `std:os` (alias: `kernel`, `sistem_operasi`) dengan fungsi bawaan `versiKernel`, `statusKernel`, `alokasiMemori`, `bebaskanMemori`, `laporanMemori`, `tulisKonsol`, `dapatkanPid`, `yieldThread`, `bukaBerkas`, `bacaBerkas`, `tulisBerkas`, `tutupBerkas`.
  - Perintah CLI `nusantara os`: `new` (scaffolder proyek kernel lengkap), `build` (sintesis biner ELF64 kernel), `inspect` (inspeksi header dan segmen ELF), `run` (peluncuran pada emulator QEMU dengan penanganan deteksi transparan jika belum terpasang), `test` (validasi kernel), `debug` (panduan konfigurasi GDB/QEMU), `targets` (daftar target kernel), `memory` (peta memori x86_64), dan `syscalls` (tabel system call).
- **Contoh Program & Dokumentasi:**
  - 4 contoh program Nusantara: `contoh/os/minimal/kernel_minimal.nusantara`, `contoh/os/memory/uji_memori.nusantara`, `contoh/os/syscall/uji_syscall.nusantara`, `contoh/os/driver/uji_serial.nusantara`.
  - 15 panduan teknis berbahasa Indonesia dalam direktori `docs/os/` (01 s/d 15).

## [v0.47.0] — 2026-11-08
### Phase 47: Nusantara Game Development Kit (Game SDK)

Fase ini mengimplementasikan Nusantara Game Development Kit (Game SDK) sebagai toolkit pengembangan game 2D dan 3D terpadu, modular, dan berperforma tinggi untuk bahasa pemrograman NUSANTARA. Implementasi ini mencakup siklus game loop deterministik dengan fixed timestep accumulator, abstraksi grafika multi-backend dengan software rasterizer command buffer virtual, kamera 2D dan 3D, generator primitif geometri mesh 3D, material, tekstur, shader, pencahayaan, arsitektur Entity Component System (ECS) dengan sparse indexing dan serialisasi penuh, sistem fisika 2D (integrasi kecepatan, deteksi tabrakan AABB & Lingkaran, pemisahan benturan impuls, dan raycasting), manajer input aksi keyboard dan mouse terpadu, manajer audio multi-kategori dan hierarki volume, animasi sprite timeline, sistem partikel 2D, antarmuka pengguna (Game UI) modular, proteksi aset anti path-traversal & format whitelist, jaringan multiplayer terserialisasi, sistem simpanan verifikasi checksum SHA-256 & migrasi versi, integrasi Actor Model (Phase 46) melalui ActorComponent, modul pustaka standar `std:game` (alias: `permainan`, `engine`), perkakas baris perintah `nusantara game` (`new`, `run`, `build`, `inspect`, `benchmark`, `assets`, `package`), serta profiler performa game.

#### Ditambahkan:
- **Core Engine & Deterministic GameLoop (`src/runtime/game/core/`):**
  - **Siklus GameLoop (`game-loop.ts`):** Fixed timestep accumulator dengan simulasi deterministik (`update`, `render`, `fixedUpdate`), batas akumulator waktu (*spiral of death protection*), serta metode `step(dt)` manual untuk pengujian otomatis.
  - **Manajemen Waktu (`time.ts`):** `Time` dengan `deltaTime`, `unscaledDeltaTime`, `timeScale`, `totalTime`, dan perhitungan FPS real-time.
  - **Sistem Peristiwa (`event-system.ts`):** `GameEventBus` terisolasi dengan registrasi langganan `on` (mengembalikan fungsi pembatalan unsubscribe), sekali jalan `once`, `off`, dan `emit`.
  - **Orkestrator GameApp (`game-app.ts`):** Penggabungan seluruh subsistem (renderer, scene, input, audio, assets, save, ui, physics) dalam satu wadah runtime aplikasi game.
- **Geometri & Matematika Grafika (`src/runtime/game/types.ts`):**
  - `Vector2`: Operasi penjumlahan, pengurangan, penskalaan, panjang, jarak, normalisasi, dot product, rotasi, pembatasan rentang, dan alias dwibahasa Indonesia/Inggris.
  - `Vector3`: Operasi vektor 3 dimensi, panjang, normalisasi, dot product, cross product, dan interpolasi lerp.
  - `Color`: Representasi kanal RGBA ternormalisasi (0..1), konversi format heksadesimal `#RRGGBB` / `#RRGGBBAA`, format CSS `rgba(...)`, dan warna dasar konstan (`putih`, `hitam`, `merah`, `hijau`, `biru`).
  - `Rect`: Batas persegi 2D dengan titik posisi, ukuran, hit-test `contains`, pengujian tumpang tindih `intersects`, dan pelebaran `expand`.
- **Grafika 2D & 3D (`src/runtime/game/graphics/`):**
  - **Abstraksi Renderer Terpadu (`renderer.ts`, `canvas2d-renderer.ts`):** Antarmuka `IRenderer` dengan `Canvas2DRenderer` yang dapat merender ke HTML5 Canvas atau command buffer software rasterizer virtual (tanpa ketergantungan wajib pada GPU fisik headless).
  - **Kamera 2D (`camera.ts`):** Transformasi koordinat `worldToScreen`, `screenToWorld`, pembesaran `zoom`, pembatasan batas pandang (*bounds clamp*), dan pembidikan target halus (*follow*).
  - **Kamera 3D (`camera.ts`):** Proyeksi perspektif dengan sudut pandang `fov`, rasio aspek `aspectRatio`, vektor pengamatan `lookAt`, dan orientasi vektor maju `getForward`.
  - **Pembangkit Mesh 3D (`mesh.ts`):** Pembuatan primitif kubus (`createCube`), bidang datar (`createPlane`), dan bola (`createSphere`) dengan data posisi vertex, normal, UV, dan indeks segitiga.
  - **Material & Tekstur (`material.ts`, `texture.ts`):** `MaterialManager` pengelola shader/warna dan `TextureManager` pembuat tekstur warna pekat serta pemuat berkas gambar.
  - **Shader & Pencahayaan (`lighting.ts`):** `ShaderManager` pembuat shader mock terkompilasi, serta objek cahaya `Light` tipe directional, point, dan spotlight.
- **Entity Component System & Scene Manager (`src/runtime/game/ecs/`):**
  - **Komponen Inti (`component.ts`):** Komponen siap pakai `Transform2D`, `Transform3D`, `Sprite`, `MeshRenderer`, `CameraComponent`, `RigidBody2D`, `RigidBody3D`, `BoxCollider2D`, `CircleCollider2D`, `AudioSourceComponent`, `AnimationComponent`, `ScriptComponent`, `ActorComponent`, dan `NetworkIdentity`.
  - **Entitas & Hierarki (`entity.ts`):** Entitas game dengan penambahan/pencarian/penghapusan komponen instan, aktivasi, tag, lapisan, dan hubungan induk/anak (*parent/children hierarchy*).
  - **Dunia ECS (`world.ts`):** Penampung entitas dengan query filter sparse indexing berkinerja tinggi, eksekutor sistem, serta serialisasi snapshot JSON dunia game dan deserialisasi penuh.
  - **Pengelola Adegan (`scene.ts`):** `Scene` dan `SceneManager` dengan registrasi adegan, transisi adegan aktif, dan pendelegasian siklus pembaruan serta penggambaran.
- **Fisika 2D Deterministik (`src/runtime/game/physics/physics2d.ts`):**
  - `PhysicsWorld2D` dengan integrasi gravitasi terpadu.
  - Deteksi tabrakan AABB vs AABB dan Lingkaran vs Lingkaran.
  - Resolusi tabrakan: pemisahan penetrasi posisi dan pantulan impuls kecepatan berdasarkan koefisien restitusi.
  - Penembakan sinar (*raycasting*) untuk pengujian visibilitas dan halangan garis pandang.
- **Manajemen Input (`src/runtime/game/input/input-manager.ts`):**
  - Pelacakan status tombol keyboard (`isKeyDown`, `isKeyPressed`).
  - Pelacakan posisi mouse dan penekanan tombol klik mouse.
  - Pemetaan aksi abstrak (*action mapping*) untuk memisahkan logika input game dari tombol fisik.
  - Utilitas peristiwa simulasi untuk pengujian otomatis headless tanpa perangkat keras input nyata.
- **Sistem Audio Berlapis (`src/runtime/game/audio/audio-manager.ts`):**
  - Registrasi klip suara `AudioClip` dengan durasi dan sumber berkas.
  - Pemutaran, jeda, pemulihan (*resume*), dan penghentian suara instan.
  - Hierarki volume berlapis: volume master dan pengali kategori independen (Master, Music, SFX, Voice).
- **Animasi Sprite & Sistem Partikel (`src/runtime/game/animation/`, `src/runtime/game/particles/`):**
  - `SpriteAnimationController`: Pembedahan lembar spritesheet otomatis (`createFromSpritesheet`), pergantian frame berbasis timeline durasi, looping, dan callback `onComplete`.
  - `ParticleEmitter2D`: Emisi partikel dinamis dengan kecepatan, percepatan gravitasi, rentang masa hidup (*lifetime*), interpolasi warna awal ke akhir, dan fungsi ledakan partikel (*burst*).
- **Game UI Modular (`src/runtime/game/ui/game-ui.ts`):**
  - Hirarki antarmuka pengguna: `UIPanel`, `UIButton` interaktif, `UILabel` tipografi, `UIProgressBar` penunjuk darah/status, dan `UISlider` penggeser nilai terikat batas.
  - Pemrosesan peristiwa input hit-testing global ke lokal.
- **Manajemen Aset & Keamanan (`src/runtime/game/assets/asset-manager.ts`):**
  - `AssetManager` terpadu dengan cache memori untuk tekstur, audio, dan berkas JSON.
  - Perisai anti path-traversal (pencegahan eksploitasi `../` dan akses berkas sistem sensitif).
  - Whitelist ekstensi berkas yang diizinkan (`.png`, `.jpg`, `.jpeg`, `.wav`, `.mp3`, `.ogg`, `.json`).
- **Jaringan & Multiplayer (`src/runtime/game/network/network.ts`):**
  - `PacketSerializer`: Serialisasi dan deserialisasi tipe paket baku (`CONNECT`, `DISCONNECT`, `INPUT`, `STATE_UPDATE`, `EVENT`, `PING`, `PONG`).
  - `GameNetworkServer`: Peladen sinkronisasi dengan pelacakan klien tersambung dan penyiaran paket (*broadcast*).
  - `GameNetworkClient`: Klien game yang terhubung ke server dengan penanganan peristiwa berbasis tipe paket.
- **Sistem Simpanan Aman (`src/runtime/game/save/save-manager.ts`):**
  - `SaveManager` dengan pembagian slot simpanan independen.
  - Proteksi integritas data menggunakan kalkulasi hash checksum SHA-256 (menolak data yang dimanipulasi secara ilegal).
  - Sistem migrasi versi skema simpanan otomatis saat versi aplikasi diperbarui.
- **Integrasi Actor Model (`src/runtime/game/ecs/component.ts`):**
  - `ActorComponent` yang menautkan `ActorRef` dari subsistem konkurensi Phase 46 ke entitas game untuk memproses logika AI asinkron dan komunikasi pesan terisolasi.
- **Perkakas Proyek & CLI (`src/runtime/game/tools/`, `src/paket/cli.ts`):**
  - `GameProjectGenerator`: Pembangkit struktur berkas proyek game baru (`project.nusantara.toml`, `src/utama.nusantara`, `adegan_utama.json`, `.gitignore`, `BACA-SAYA.md`).
  - `GameProfiler`: Pemantau performa real-time (rata-rata FPS, waktu frame, waktu fisika/update/render, alokasi memori, dan throughput simulasi).
  - Perintah CLI `nusantara game`:
    - `nusantara game new <Nama>`: Membuat struktur proyek game Nusantara baru.
    - `nusantara game run [berkas]`: Menjalankan game Nusantara dalam mode simulator deterministik.
    - `nusantara game build [berkas]`: Mengompilasi dan mengemas game Nusantara ke direktori distribusi `dist/game/`.
    - `nusantara game inspect`: Memeriksa kapabilitas dan spesifikasi Game SDK.
    - `nusantara game benchmark`: Menguji performa throughput simulasi dan kapasitas partikel.
    - `nusantara game assets`: Memvalidasi integritas aset dan proteksi anti path-traversal.
    - `nusantara game package`: Mengemas game menjadi bundel mandiri portabel.
- **Pustaka Standar Resmi (`src/stdlib/game.ts`, `src/stdlib/index.ts`):**
  - Registrasi modul standar `game` (beserta alias `permainan` dan `engine`).
  - Ekspor fungsi standar: `buatAplikasiGame`, `buatGame`, `vektor2`, `vektor3`, `warna`, `kotak`, `buatEntitas`, `buatDunia`, `buatAdegan`, `kamera2D`, `kamera3D`, `buatPartikel`, `buatTombolUI`, `buatLabelUI`, `buatPanelUI`, `buatProgresUI`, `buatKlienJaringan`, `buatServerJaringan`, `buatManajerSimpan`.
- **Contoh Program Game Nusantara (`contoh/game/`):**
  - `contoh/game/2d/game_pertama.nusantara`: Aplikasi game 2D pertama dengan inisialisasi viewport, vektor, dan loop frame.
  - `contoh/game/2d/platformer.nusantara`: Game platformer dengan kamera 2D, gravitasi, dan lompatan karakter.
  - `contoh/game/3d/game_3d.nusantara`: Game 3D dengan kamera perspektif, koordinat 3D, dan material warna.
  - `contoh/game/ecs/entitas.nusantara`: Demonstrasi arsitektur Entity Component System (ECS) dengan entitas ksatria dan monster.
  - `contoh/game/network/multiplayer.nusantara`: Demonstrasi sinkronisasi multiplayer dan penyimpanan save slot aman.
- **Dokumentasi Teknis 15 Panduan Komprehensif (`docs/game-sdk/`):**
  - 15 berkas dokumentasi teknis berbahasa Indonesia mencakup arsitektur inti, math, render loop, ECS, fisika 2D, input, audio, animasi, partikel, UI, aset, networking, save system, integrasi aktor, dan referensi CLI.
- **Rangkaian Pengujian Otomatis Suite 43 (`pengujian/game/uji_game_sdk_fase47.ts`):**
  - Suite pengujian ke-43 beranggotakan 33 skenario pengujian unit, integrasi, dan e2e yang lulus 100% (33 LULUS, 0 GAGAL, 0 SKIPPED).

## [v0.46.0] — 2026-11-06
### Phase 46: High-Performance Concurrency (Actor Model)

Fase ini mengimplementasikan sistem konkurensi performa tinggi berbasis *Actor Model* dan *Structured Concurrency* terpadu pada bahasa pemrograman NUSANTARA. Implementasi ini menghadirkan isolasi status (*share nothing state isolation*), antrean pesan berbatas (*bounded mailboxes*), kebijakan luapan (*overflow policies*), jaminan pengurutan pesan FIFO, pola interaksi *Ask-Reply*, *Dead Letter Queue*, sistem supervisi berjenjang, *task executor* kooperatif, pengatur keadilan (*fairness controller*), manajer kuota sumber daya (*resource manager*), deteksi kemacetan (*concurrency diagnostics*), hingga integrasi menyeluruh pada parser, NIR intermediate representation, emisi LLVM IR dengan runtime C native, dan antarmuka CLI.

#### Ditambahkan:
- **Sistem Model Aktor & Isolasi Status (`src/runtime/actor/`):**
  - **Siklus Hidup Aktor (`lifecycle.ts`):** 6 status formal (`CREATED`, `RUNNING`, `SUSPENDED`, `STOPPING`, `STOPPED`, `FAILED`) dengan validasi transisi status mutlak dan proteksi dari transisi ilegal (`KOR4005`).
  - **Mailbox Berbatas & Kebijakan Luapan (`mailbox.ts`):** Antrean FIFO pesan berbatas dengan kapasitas terkonfigurasi dan 4 strategi luapan: `REJECT` (melempar `MailboxOverflowError` KOR4003), `WAIT` (backpressure asinkron berbasis Promise), `DROP_OLDEST` (menghapus pesan terlama), dan `DROP_NEWEST` (mengabaikan pesan masuk terbaru).
  - **Pesan Terstruktur & Format Baku (`message.ts`):** Interface pesan baku `Message<T>` dengan ID unik, timestamp nano/milidetik, tipe pesan (`USER`, `SYSTEM`, `SUPERVISION`, `HEARTBEAT`), pengirim opsional `sender`, dan muatan `payload`.
  - **Pola Komunikasi & Penanganan Pesan (`actor-ref.ts`, `actor.ts`, `actor-context.ts`):** Pengiriman pesan tanpa blokir `send()`, pola permintaan-tanggapan `ask(payload, timeoutMs)` dengan Promise dan timeout otomatis, pengalihan pesan `forward()`, dan pembuatan anak aktor `spawn()`.
  - **Registri & Sistem Aktor (`actor-registry.ts`, `actor-system.ts`):** Singleton `ActorSystem` terisolasi, pencarian aktor berdasarkan ID dan nama unik, pendaftaran otomatis, dan penampungan pesan ke aktor yang telah mati pada *Dead Letter Queue*.
  - **Supervisi Kesalahan Modular (`actor-supervisor.ts`):** Strategi supervisi bertingkat dengan 4 direktif aksi pemulihan: `RESUME` (lanjutkan pesan berikutnya), `RESTART` (reset state aktor ke kondisi awal), `STOP` (hentikan aktor secara permanen), dan `ESCALATE` (teruskan galat ke supervisor induk).
  - **Worker Pool & Dispatcher (`worker-pool.ts`, `scheduler.ts`):** Penjadwalan kooperatif aktor di atas worker pool dengan kuota giliran (*throughput budget*) untuk menjamin eksekusi yang adil (*fair scheduling*).
- **Structured Concurrency Runtime (`src/runtime/async/`):**
  - **Abstraksi Tugas Ringan (`task.ts`):** Kelas `Task<T>` dengan status siklus hidup (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`), eksekusi terisolasi, dan perolehan hasil `result()`.
  - **Grup Tugas Terstruktur (`task-group.ts`):** Abstraksi `TaskGroup` untuk meluncurkan sub-tugas paralel, penggabungan seluruh tugas `joinAll()`, penggabungan tugas tercepat `joinAny()`, dan kaskade pembatalan hierarkis.
  - **Pembatalan Kooperatif (`cancellation.ts`):** `CancellationToken` dan `CancellationTokenSource` reaktif dengan pemicu pembatalan instan dan callback pendengar.
  - **Batas Waktu Operasi (`timeout.ts`):** Utilitas `withTimeout(promise, ms)` dan `sleep(ms)` dengan pelaporan galat ramah `TaskTimeoutError` (`KOR4008`).
  - **Task Executor Terbatas (`executor.ts`):** Eksekutor antrean konkurensi dengan slot batas eksekusi simultan.
- **Manajemen Sumber Daya, Keadilan & Diagnostik (`src/runtime/concurrency/`):**
  - **Manajer Sumber Daya (`resource-manager.ts`):** Penegakan kuota maksimum aktor aktif (`maxActors`) dan pemantauan memori untuk mencegah kehabisan sumber daya (`ResourceExhaustedError` KOR4006).
  - **Pengendali Keadilan Penjadwalan (`fairness.ts`):** `FairnessController` berbasis batas throughput per giliran (*throughput budget*) untuk mencegah *starvation* aktor lambat oleh aktor sibuk.
  - **Diagnostik Stall & Deadlock (`diagnostics.ts`):** `ConcurrencyDiagnostics` yang memantau durasi pemrosesan pesan, mendeteksi aktor yang mengalami *stall* (melebihi batas toleransi milidetik), dan menganalisis siklus saling-tunggu deadlock antar-aktor.
- **Sintaks Bahasa Nusantara & Dukungan Kompiler (`src/parser/`, `src/compiler/`):**
  - **Parser & Pohon Sintaksis Abstrak:** Kata kunci resmi `aktor`, `terima`, `kirim`, `hentikan`, dan `await`, pembuatan node AST `DEKLARASI_AKTOR`, `PENANGAN_PESAN`, `KIRIM_PESAN`, `HENTIKAN_AKTOR`, `EKSPRESI_BUAT_AKTOR`, dan `EKSPRESI_AWAIT`.
  - **Nusantara Intermediate Representation (NIR):** Opcodes konkurensi baru (`actor.create`, `actor.send`, `actor.stop`, `async.start`, `await`), metode pembangun `NIRBuilder`, validasi semantik pada `NIRVerifier`, serta serialisasi/deserialisasi JSON round-trip pada `NIRSerializer` dan `NIRDeserializer`.
  - **LLVM Backend & Native C Runtime:** Pemetaan instruksi LLVM IR memanggil fungsi C Runtime konkurensi native (`nusantara_actor_create`, `nusantara_actor_send`, `nusantara_actor_stop`, `nusantara_task_spawn`, `nusantara_task_wait`) pada `native-runtime.ts` dan `runtime-packager.ts`.
- **Integrasi Antarmuka CLI (`src/paket/cli.ts`):**
  - `nusantara actor`: Perintah pemantauan status aktor (`--stats`), daftar aktor aktif (`--list`), dan inspeksi detail aktor (`--inspect <id>`).
  - `nusantara concurrency`: Perintah tolok ukur throughput pesan (`--benchmark`, `--workers <n>`) dan diagnosa kesehatan konkurensi (`--diagnostics`).
- **Dokumentasi Teknis Lengkap (`docs/runtime/`):**
  - `docs/runtime/actor-model.md`: Panduan arsitektur model aktor, isolasi memori, dan siklus hidup.
  - `docs/runtime/message-passing.md`: Panduan semantik pengiriman pesan, mailbox, backpressure, dan ask-reply.
  - `docs/runtime/concurrency.md`: Panduan structured concurrency, worker pools, dan resource management.
  - `docs/runtime/asynchronous.md`: Panduan pemrograman asinkron `Task<T>`, `TaskGroup`, dan pembatalan kooperatif.
  - `docs/runtime/scheduling.md`: Panduan penjadwalan kooperatif dan pengendalian keadilan throughput.
  - `docs/runtime/runtime-safety.md`: Panduan keselamatan runtime, penanganan galat `KOR4001`–`KOR4011`, dan supervisi.
- **Contoh Program Acuan (`contoh/`):**
  - `contoh/actor/penghitung.nusantara`: Implementasi aktor penghitung dengan mutasi state terisolasi.
  - `contoh/actor/pengiriman_pesan.nusantara`: Komunikasi asinkron antar-aktor pengirim dan penerima.
  - `contoh/actor/banyak_actor.nusantara`: Orkestrasi ratusan aktor serentak dengan worker pool.
  - `contoh/async/tugas_asinkron.nusantara`: Pola tugas asinkron `Task` dan penanganan batas waktu.
  - `contoh/concurrency/worker_pool.nusantara`: Pemrosesan terdistribusi beban kerja melalui worker pool terpadu.
- **Rangkaian Pengujian Otomatis (`pengujian/actor/uji_actor_fase46.ts`):**
  - Suite pengujian ke-42 beranggotakan 32 skenario pengujian komprehensif mencakup siklus hidup, penolakan transisi ilegal, jaminan FIFO, pola ask-reply, timeout, dead letter queue, kebijakan luapan mailbox (`REJECT`, `DROP_OLDEST`, `DROP_NEWEST`), throughput budget scheduler, task life-cycle, token cancellation, timeout, task groups, strategi supervisi `RESUME`/`STOP`, resource manager quota, stall detection diagnostics, stress test 5.000 pesan dengan throughput aktual 40.000–52.000 pesan/detik tanpa memory leak, parser sintaks aktor/await, NIR opcodes & verifier, serialisasi roundtrip JSON, emisi LLVM IR C stub, dan CLI commands (31 pengujian LULUS 100%, 1 pengujian toolchain host dilewati *SKIPPED* secara transparan).

## [v0.45.0] — 2026-11-05
### Phase 45: Nusantara Linker & Standalone Executable

Fase ini mengimplementasikan sistem *linker* tingkat lanjut dan pembuat berkas *standalone executable* mandiri untuk menghubungkan berkas objek (.o), pustaka statis (.a/.lib), pustaka dinamis (.so/.dylib/.dll), serta mengemas runtime dan aplikasi menjadi bundel distribusi portabel yang dapat dijalankan langsung.

#### Ditambahkan:
- **Sistem Tabel Simbol & Name Mangling (`src/compiler/linker/symbol-table.ts`):**
  - Penyimpanan simbol komprehensif (`SymbolTable`) yang mendukung binding `GLOBAL`, `LOCAL`, dan `WEAK`, serta visibilitas `DEFAULT`, `HIDDEN`, dan `PROTECTED`.
  - Skema penamaan terstruktur `SymbolNameMangler`: prefix `_N_F_` untuk fungsi, `_N_V_` untuk variabel global, `_N_C_` untuk konstanta, dan identifikasi entry point `_N_F_utama_utama`.
- **Mesin Resolusi Simbol (`src/compiler/linker/symbol-resolver.ts`):**
  - Resolusi simbol internal, eksternal, dan antar-objek lintas berkas.
  - Penimpaan simbol lemah (*weak symbol*) oleh simbol kuat (*strong symbol*) secara deterministik.
  - Deteksi dan pelaporan galat terstruktur untuk konflik simbol ganda (`LN4001`) dan simbol belum terdefinisi (`LN4002`) dalam Bahasa Indonesia.
- **Mesin Relokasi Multi-Format (`src/compiler/linker/relocation-manager.ts`):**
  - Pemodelan dan validasi relokasi arsitektur ELF (x86_64, AArch64), PE/COFF (AMD64), dan Mach-O.
  - Validasi keberadaan simbol target, verifikasi batas offset seksi, dan kalkulasi addend PC32 dengan pencegahan overflow.
- **Linker Statis & Dinamis (`src/compiler/linker/static-linker.ts`, `dynamic-linker.ts`):**
  - Linking statis objek dan pustaka (`.a`, `.lib`) dengan opsi `--strip` dan `--no-default-libraries`.
  - Linking dinamis pustaka bersama (`.so`, `.dylib`, `.dll`) dengan konfigurasi `RPATH` (`$ORIGIN`, `@executable_path`) dan `-fPIC`.
- **Manajer Pustaka & Inspektur Dependensi (`src/compiler/linker/library-manager.ts`, `dependency-inspector.ts`):**
  - Parsing konfigurasi `[pustaka]` / `[libraries]` pada `nusantara.toml` untuk jalur pencarian (`pencarian`), pustaka statis, dan pustaka dinamis.
  - Analisis dependensi biner saat runtime di Linux (`ldd`), macOS (`otool`), dan Windows (`dumpbin`), memetakan pustaka yang ditemukan vs missing.
- **Pengemasan Runtime & Dependensi (`src/compiler/runtime/runtime-packager.ts`, `runtime-dependencies.ts`):**
  - Tiga mode distribusi runtime: `BUNDLED` (lengkap mandiri), `MINIMAL` (alokasi memori dasar dan libc), dan `SHARED` (pustaka bersama dinamis).
- **Inspektur Format Biner Mesin (`src/compiler/executable/binary-inspector.ts`, `binary-metadata.ts`):**
  - Inspeksi biner native bawaan tanpa alat eksternal untuk header ELF (`\x7fELF`), PE/COFF (`MZ`), dan Mach-O, memverifikasi arsitektur, OS ABI, bitness, dan tipe berkas.
- **Pembangun Executable Mandiri & Standalone Packager (`src/compiler/executable/executable-builder.ts`, `standalone-packager.ts`):**
  - Pembuatan biner executable dari kode sumber `.nusantara` atau berkas objek `.o`.
  - Pembuatan struktur direktori distribusi mandiri (`bin/`, `lib/`, `config/`, `resources/`, `manifest.json`, `LISENSI.txt`, `BACA-SAYA.txt`) dengan hashing SHA-256 dan pembuatan arsip terkompresi.
- **Integrasi Antarmuka CLI (`src/paket/cli.ts`):**
  - `nusantara link <objek...>`: Menautkan objek menjadi biner mandiri.
  - `nusantara inspect <biner>`: Analisis format biner dan dependensi runtime.
  - `nusantara package -b <biner> -o <dist>`: Mengemas executable menjadi bundel distribusi portabel.
- **Rangkaian Pengujian Otomatis (`pengujian/linker/uji_linker_fase45.ts`):**
  - 21 pengujian unit dan integrasi mencakup tabel simbol, resolusi, relokasi, pustaka, dependensi, format biner, runtime packager, executable builder, dan standalone packager (20 pengujian lulus 100%, 1 pengujian biner native ditandai *SKIPPED* secara transparan karena ketiadaan linker sistem di host).

## [v0.44.0] — 2026-11-05
### Phase 44: LLVM Backend & AOT Native Compilation

Fase ini mengimplementasikan backend kompilasi *Ahead-of-Time* (AOT) berbasis LLVM Toolchain untuk menerjemahkan representasi perantara NIR (*Nusantara Intermediate Representation*) menjadi berkas LLVM IR tekstual (.ll), berkas objek biner (.o / .obj), dan biner mesin native yang dapat dieksekusi langsung tanpa ketergantungan interpreter JavaScript/Node.js.

#### Ditambahkan:
- **LLVM Toolchain Manager (`src/compiler/llvm/toolchain-manager.ts`):**
  - Deteksi aman keberadaan toolchain LLVM (`clang`, `llc`, `opt`, `llvm-as`, `llvm-dis`, `llvm-objdump`, `lld`) tanpa injeksi shell menggunakan argumen array `execFileSync`.
  - Dukungan kustomisasi jalur direktori toolchain melalui metode `setCustomPath(dir)`.
  - Pelaporan status kesiapan instalasi, petunjuk langkah instalasi (Ubuntu/Debian, macOS Homebrew, Windows winget), dan transparansi lingkungan tanpa membuat klaim palsu jika toolchain belum terpasang.
- **Target Triple & Data Layout Cross-Platform (`src/compiler/llvm/target-triple.ts`):**
  - Resolusi arsitektur dan sistem operasi host (`x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`, `arm64-apple-darwin`, `x86_64-apple-darwin`, `x86_64-pc-windows-msvc`).
  - Pemetaan otomatis spesifikasi *Data Layout* resmi LLVM dan penetapan format berkas objek (`ELF`, `Mach-O`, `COFF`).
- **LLVM Type Mapper (`src/compiler/llvm/llvm-type-mapper.ts`):**
  - Pemetaan tipe data NIR ke representasi tipe LLVM IR: tipe primitif (`void`, `i1`, `i32`, `i64`, `double`), pointer opaque (`ptr`) sesuai standar LLVM 15+, array bertipe (`[N x T]`), struct terdefinisi (`{ T1, T2 }`), dan signature fungsi.
- **LLVM Instruction Emitter (`src/compiler/llvm/llvm-instruction-emitter.ts`):**
  - Pembangkit instruksi LLVM SSA: `alloca`, `load`, `store`, `getelementptr` (gep), aritmetika (`add`, `sub`, `mul`, `sdiv`, `fdiv`, `srem`, `frem`), perbandingan terpadu (`icmp`, `fcmp`), simpul percabangan `phi`, pemanggilan fungsi `call`, konversi tipe `cast`, dan instruksi terminator kendali (`br`, `cond_br`, `ret`, `unreachable`).
- **LLVM IR Generator (`src/compiler/llvm/llvm-ir-generator.ts`):**
  - Emisi modul LLVM IR tekstual lengkap dengan metadata target triple, data layout, string literal globals yang ter-escape rapi, variabel global beralamat unik, dan deklarasi pustaka C libc standar (`printf`, `malloc`, `free`, `exit`) serta stub Nusantara (`nusantara_cetak_bilangan`, `nusantara_cetak_teks`).
- **LLVM Validator & Optimizer (`src/compiler/llvm/llvm-validator.ts`, `src/compiler/llvm/llvm-optimizer.ts`):**
  - Validasi integritas sintaksis LLVM IR lokal (pengecekan penyeimbang kurung kurawal, keberadaan terminator pada basic block, label valid) serta verifikasi semantik melalui `llvm-as` jika terpasang.
  - Integrasi pass manager optimasi LLVM `opt` dengan preset `-O0`, `-O1`, `-O2`, `-O3`, dan `-Os`, dilengkapi penanganan fallback anggun (*graceful fallback*) ketika binary `opt` tidak tersedia di sistem.
- **Object Generator & Native Linker (`src/compiler/llvm/object-generator.ts`, `src/compiler/llvm/linker.ts`):**
  - Penerjemahan LLVM IR ke berkas objek biner (.o/.obj) via `llc` atau `clang -c`.
  - Penghubungan (*linking*) berkas objek dengan runtime C stub Nusantara via `clang` untuk menghasilkan biner mesin yang dapat dieksekusi secara mandiri.
- **Pustaka C Runtime Nusantara (`src/compiler/runtime/native-runtime.ts`):**
  - Penghubung entry point native `main` bahasa C dengan fungsi `@utama` Nusantara.
  - Pustaka runtime mandiri mencakup pencetakan bilangan 64-bit berformat, manipulasi teks, dan manajemen memori terisolasi.
- **AOT Compiler Pipeline (`src/compiler/aot/aot-compiler.ts`):**
  - Pipeline orkestrasi satu pintu dari berkas sumber `.nusantara` -> Parser AST -> AST Lowering ke NIR -> Validasi NIR -> Optimasi NIR (O2) -> LLVM IR Gen -> Validasi LLVM -> Optimasi LLVM -> Emisi Berkas Objek -> Linking Biner Native.
- **Integrasi Antarmuka CLI (`src/paket/cli.ts`):**
  - Perintah `nusantara toolchain`: Menampilkan diagnostik deteksi LLVM dan panduan instalasi.
  - Perintah `nusantara aot` / `nusantara kompilasi`: Menerima opsi `--emit-llvm`, `--emit-object`, `--opt=O0|O1|O2|O3|Os`, `--target=<triple>`, dan `-o <output>`.
- **Rangkaian Pengujian Otomatis (`pengujian/llvm/uji_llvm_fase44.ts`):**
  - 15 pengujian komprehensif mencakup deteksi toolchain, target triple host/cross, type mapper, instruction emitter, generator LLVM IR, validator, optimizer, C runtime stub, dan pipeline AOT (14 pengujian lulus 100%, 1 pengujian biner dieksekusi ditandai *SKIPPED* secara transparan karena lingkungan pengujian container tidak memiliki compiler clang/llc sistem).

## [v0.43.0] — 2026-11-04
### Phase 43: Nusantara Intermediate Representation (NIR) & SSA Form

Fase ini menghadirkan representasi perantara tingkat rendah (**NIR**) berbasis *Static Single Assignment* (SSA) dan *Control Flow Graph* (CFG) yang menghubungkan AST tingkat tinggi bahasa Nusantara dengan backend kompilasi masa depan (khususnya backend native LLVM pada Fase 44).

#### Ditambahkan:
- **Arsitektur Inti NIR (`src/compiler/nir/`):**
  - `NIRModule`: Kontainer tingkat atas penyimpan fungsi, variabel global, target triple, data layout, dan metadata.
  - `NIRFunction`: Representasi fungsi terisolasi dengan parameter bertipe, tipe kembalian, dan kumpulan blok kontrol.
  - `NIRBasicBlock`: Blok dasar aliran kendali linier dengan relasi pendahulu (*predecessors*) dan penerus (*successors*).
  - `NIRInstruction` & `NIRTerminator`: Kumpulan instruksi bertipe (`alloca`, `load`, `store`, `gep`, `add`, `sub`, `mul`, `sdiv`, `icmp`, `fcmp`, `call`, `phi`, `cast`) dan instruksi terminator (`ret`, `br`, `cond_br`, `unreachable`).
  - `NIRValue` & `NIRConstant`: Model nilai SSA dengan pelacakan rantai penggunaan (*def-use chain*) dan metode `replaceAllUsesWith()`.
  - `NIRBuilder`: API ergonomis untuk membangun instruksi dan blok secara terstruktur.
- **Analisis CFG & Dominator Tree (`src/compiler/nir/cfg/`):**
  - `NIRControlFlowGraph`: Analisis ketercapaian blok, konstruksi graf kendali, dan validasi topologi CFG.
  - `NIRDominatorTree`: Algoritma perhitungan relasi dominasi, pembentukan pohon dominator, dan kalkulasi batas dominasi (*Dominance Frontier*).
- **Transformasi Bentuk SSA & Mem2Reg (`src/compiler/nir/ssa/`):**
  - `SSAConverter`: Promosi variabel tumpukan lokal (`alloca`/`load`/`store`) ke register SSA murni berbasis *Iterated Dominance Frontier* (IDF) dan penamaan ulang variabel (*variable renaming walk*).
  - `NIRPhiInst`: Pembentukan simpul Phi SSA dan penyederhanaan otomatis phi redundan.
  - `SSAVerifier`: Audit statis kepatuhan aturan SSA tunggal.
- **AST to NIR Lowering (`src/compiler/nir/lowering/`):**
  - `ASTToNIRLowering`: Transformasi seluruh konstruksi AST bahasa Nusantara (deklarasi variabel, konstanta, penugasan, aritmetika, perbandingan, logika, percabangan `jika-maka-selain`, perulangan `selama` dan `untuk`, fungsi dan pemanggilan fungsi) menjadi modul NIR in-memory.
- **NIR Verifier & Skema JSON (`src/compiler/nir/verifier.ts`, `serializer.ts`, `deserializer.ts`):**
  - `NIRVerifier`: Validasi integritas semantik modul, kelayakan tipe operand pada instruksi biner, dan keberadaan terminator pada setiap Basic Block.
  - `NIRSerializer` & `NIRDeserializer`: Ekspor dan impor lengkap skema modul NIR dalam format JSON murni.
- **Pipa Optimasi NIR (`src/compiler/nir/optimizer/`):**
  - `ConstantFoldingPass`: Evaluasi dan pelipatan operasi aritmetika dan perbandingan bernilai konstan saat waktu kompilasi.
  - `AlgebraicSimplificationPass`: Penyederhanaan identitas aljabar ($x + 0 \rightarrow x$, $x \times 1 \rightarrow x$, dll).
  - `DeadCodeEliminationPass` (DCE): Penghapusan instruksi tanpa pengguna sampingan (*unused pure instructions*).
  - `CFGCleanupPass`: Penggabungan blok redundan dan eliminasi blok mati.
  - `NIRPassManager`: Orkestrator pipeline optimasi tingkat O1 dan O2.
- **Perkakas Baris Perintah & Visualisasi (`src/compiler/nir/inspector/`, `src/paket/cli.ts`):**
  - `NIRFormatter`: Generator representasi tekstual NIR bergaya LLVM IR dan ekspor graf kontrol berformat Graphviz DOT.
  - Perintah CLI `nusantara nir`: Opsi `--verify`, `--dump`, `--json`, `--optimize`, dan `--ssa`.
- **Rangkaian Pengujian & Dokumentasi:**
  - `pengujian/nir/uji_nir_fase43.ts`: 28 skenario pengujian komprehensif pada 10 kelompok uji (Lulus 100%).
  - Dokumentasi teknis: `docs/compiler/nir.md`, `docs/compiler/nir-instruction-set.md`, `docs/compiler/nir-ssa.md`, dan `docs/compiler/nir-architecture.md`.

## [v0.42.0] — 2026-11-03
### Phase 42: Mobile App Update System & Over-the-Air Updates (OTA)

Fase ini menghadirkan sistem pembaruan aplikasi mobile yang aman, modular, dan mematuhi batas arsitektur ketat (*Strict Boundary Architecture*) antara pembaruan biner native (Google Play In-App Updates & Apple App Store Connect) dan pembaruan resource OTA non-eksekutabel (tema, font, paket bahasa, konfigurasi) dengan verifikasi tanda tangan digital Ed25519 dan pemulihan otomatis (*Safe Mode Rollback*).

#### Ditambahkan:
- **Arsitektur Dua Jalur & Keamanan Jalur (`src/mobile/updates/security/`):**
  - `UpdateSecurityPolicy`: Penegakan HTTPS (TLS 1.3), batas ukuran berkas tunggal (50 MB) dan paket bundle (100 MB), proteksi Zip-Slip, dan pencegahan absolut terhadap ekstensi biner terlarang (`.apk`, `.dex`, `.so`, `.dylib`, `.exe`, dll.).
  - `HashValidator`: Implementasi murni algoritma FIPS 180-4 SHA-256 tanpa dependensi platform untuk validasi integritas berkas di browser maupun runtime Node.js.
  - `TrustManager`: Registri kunci publik tepercaya (*Pinned Public Keys*) dengan dukungan rotasi kunci dan pencabutan kunci kedaluwarsa.
  - `SignatureVerifier`: Penandatanganan kanonikal manifest dan verifikasi tanda tangan digital kurva eliptik Ed25519 dengan deteksi pemalsuan (*anti-tamper*).
- **Pemeriksa Versi & Evaluasi Kebijakan (`src/mobile/updates/core/`):**
  - `VersionChecker`: Parser SemVer 2.0.0, perbandingan versi tingkat mayor/minor/patch, evaluasi batas versi minimum, dan deteksi tipe perbedaan versi.
  - `UpdatePolicyManager`: Evaluasi kebijakan pembaruan lima tingkat (`opsional`, `disarankan`, `wajib`, `keamanan`, `resource_saja`) beserta frekuensi interval pengingat.
  - `UpdateChannelManager`: Pengelolaan 5 saluran distribusi rilis (`development`, `alpha`, `beta`, `testing`, `stable`).
  - `CompatibilityManager`: Validasi kompatibilitas OS host, target Android SDK 24–34+, target minimum iOS 15.0+, dan ketersediaan ruang penyimpanan.
  - `UpdateManager`: Fasad sentral terpadu orkestrasi pembaruan mobile.
- **Skema Manifest Pembaruan (`src/mobile/updates/manifest/`):**
  - `ManifestValidator`: Validasi skema ketat JSON manifest pembaruan, format reverse-DNS applicationId, integritas resource array, dan tanggal kedaluwarsa rilis.
  - `ManifestParser`: Parser aman dan formatter JSON manifest kanonikal.
- **Pembaruan Resource & Konten OTA (`src/mobile/updates/ota/`):**
  - `DownloadManager`: Pengunduh aman berbasis HTTPS dengan pelacak progres unduhan persentase, mekanisme retry, dan dukungan pembatalan (`AbortController`).
  - `IntegrityValidator`: Verifikator SHA-256 dan ukuran byte berkas per-resource dan total bundle.
  - `ActivationManager`: Mekanisme aktivasi atomik (*atomic swap*) dari folder staging ke direktori aktif dengan pencadangan snapshot instan.
  - `OTAResourceManager`: Koordinator alur lengkap unduhan dan aktivasi OTA.
  - `OTAContentManager`: Pengakses dinamis konten tema UI, file bahasa lokalisasi, dan konfigurasi runtime.
- **Penyimpanan, Status & Pemulihan Cadangan (`src/mobile/updates/storage/`):**
  - `UpdateStateManager`: Mesin status pembaruan 11-status (*State Machine*) dengan pemulihan crash.
  - `UpdateHistoryManager`: Audit log permanen riwayat pembaruan yang tersimpan aman.
  - `RollbackManager`: Pemulihan snapshot cadangan resource secara instan jika terjadi kegagalan rendering atau crash runtime (maks. 3 kegagalan).
  - `UpdateCache`: Pengelola direktori isolasi staging, active, dan backup.
- **Jembatan Toko Aplikasi Resmi (`src/mobile/updates/store/`):**
  - `GooglePlayInAppUpdate`: Integrasi Android Google Play Core AppUpdateManager untuk alur *Flexible* (background) dan *Immediate* (blocking modal).
  - `AppleAppStoreUpdate`: Integrasi StoreKit dan deep-linking resmi ke Apple App Store sesuai kebijakan Apple Guideline 2.5.2.
- **Notifikasi & Backend API (`src/mobile/updates/notification/`, `backend/`, `analytics/`, `reporting/`):**
  - `UpdateNotificationManager` & `UpdateReminder`: Pengiriman notifikasi pembaruan dengan pembatasan frekuensi pengingat.
  - `UpdateRegistry` & `UpdateAPI`: Endpoint tiruan server pembaruan `/check`, `/manifest`, dan `/report`.
  - `UpdateAnalytics`: Metrik performa distribusi pembaruan berorientasi privasi tanpa pelacakan PII pengguna.
  - `UpdateReportGenerator`: Pembuat laporan audit pembaruan format Markdown dan JSON.
- **Integrasi CLI Baris Perintah (`nusantara mobile update`):**
  - `nusantara mobile update periksa`: Periksa ketersediaan pembaruan di server.
  - `nusantara mobile update versi`: Tampilkan perbandingan SemVer lokal vs server.
  - `nusantara mobile update channel <nama>`: Beralih saluran rilis.
  - `nusantara mobile update manifest <berkas>`: Validasi berkas manifest dan tanda tangan.
  - `nusantara mobile update resource unduh`: Unduh paket resource OTA yang diizinkan.
  - `nusantara mobile update store`: Status ketersediaan di Google Play & App Store.
  - `nusantara mobile update history`: Tampilkan riwayat audit pembaruan.
  - `nusantara mobile update laporan`: Cetak laporan status pembaruan Markdown resmi.
- **Integrasi Standard Library `std:mobile`:**
  - `periksaPembaruanMobile(appId?, versi?, platform?)`: Memeriksa ketersediaan rilis baru.
  - `unduhPembaruanResourceMobile(idResource?)`: Mengunduh berkas resource OTA.
  - `aktifkanPembaruanResourceMobile()`: Mengaktifkan resource yang telah diunduh.
  - `rollbackPembaruanResourceMobile(platform?)`: Mengembalikan resource ke cadangan stabil terakhir.
  - `dapatkanStatusPembaruanMobile()`: Mengambil status sistem pembaruan saat ini.
- **Antarmuka Grafis GUI Dashboard (`src/komponen/StudioPembaruanMobile.tsx`):**
  - Studio Pembaruan Mobile dengan 8 tab interaktif: Ringkasan & Status, Pemeriksa SemVer & Kebijakan, Saluran Rilis & Peluncuran, Manifest & Tanda Tangan, Pembaruan Resource OTA, Toko Aplikasi (Play/Apple), Rollback & Pemulihan, Laporan Audit & CLI.
- **Contoh Proyek & Suite Pengujian:**
  - `examples/mobile/update-demo/`: Proyek demonstrasi pembaruan mobile lengkap dengan `nusantara.mobile.json`, `update-manifest.json`, `main.nusantara`, dan aset OTA (tema, bahasa, konfigurasi).
  - `pengujian/mobile/uji_pembaruan_fase42.ts`: Suite 21 pengujian otomatis yang mencakup 9 kelompok pengujian dengan tingkat kelulusan 100%.
  - `docs/mobile/updates/`: 18 berkas dokumentasi teknis komprehensif.

## [v0.41.0] — 2026-11-03
### Phase 41: Mobile App Store Integration & Automated Release

Fase ini menghadirkan sistem integrasi toko aplikasi (Google Play Console & Apple App Store Connect / TestFlight) dan otomatisasi proses rilis mobile profesional, aman, berorientasi kepatuhan, serta dilengkapi gerbang persetujuan manusia (*human approval gate*) pada bahasa pemrograman NUSANTARA.

#### Ditambahkan:
- **Arsitektur Inti Publikasi (`src/mobile/publishing/core/`):**
  - `PublishingManager`: Fasad tunggal terpadu orkestrasi integrasi toko dan rilis otomatis.
  - `StoreRegistry`: Registri konfigurasi target toko, credentials, tracks, dan pengaturan rollout.
- **Pengelolaan Kredensial & Keamanan (`src/mobile/publishing/credentials/`):**
  - `SecretProvider`: Pembaca aman variabel lingkungan dengan penyensoran token dan masking rahasia.
  - `CredentialValidator`: Validasi berkas Service Account JSON Google Play, App Store Connect `.p8` Key, Key ID, dan Issuer ID.
  - `CredentialManager`: Pengelola resolusi kredensial otomatis dengan Sandbox Mode terisolasi saat environment resmi belum dikonfigurasi.
  - Pemindai anti-hardcoded secret scanner yang memblokir commit atau rilis jika terdeteksi kunci privat.
- **Metadata Toko, Lokalisasi & Aset Grafis (`src/mobile/publishing/metadata/`):**
  - `Localization`: Dukungan lokalisasi 7 bahasa resmi (`id`, `en`, `ms`, `ar`, `ja`, `zh`, `es`) dengan deteksi RTL dan validasi kelengkapan terjemahan.
  - `AppMetadata`: Validasi batas karakter toko (Nama aplikasi maks 30 kar, deskripsi singkat 80 kar, deskripsi lengkap 4000 kar, keywords 100 kar).
  - `StoreListing`: Penyimpanan dan sinkronisasi berkas cantuman toko ke direktori `store-metadata/`.
  - `ScreenshotManager`: Validator spesifikasi pixel, aspek rasio, dan dimensi grafis untuk Google Play (Ikon 512x512, Feature Graphic 1024x500) dan iOS (Layar 6.7", 6.5", iPad 12.9").
  - `ReleaseNotes`: Pembangkit catatan rilis otomatis berbasis Git commit history dan CHANGELOG dengan batas 500 karakter dan penyaring pesan internal.
- **Integrasi Google Play Developer API (`src/mobile/publishing/android/`):**
  - `GooglePlayClient`: Klien resmi Google Play Developer API v3 dengan Sandbox Mode aman.
  - `PlayTrackManager`: Pengelolaan 4 track rilis (`internal`, `closed`, `open`, `production`), peluncuran bertahap (*staged rollout*), dan promosi build.
  - `PlayValidation`: Validasi wajib Target SDK 34+ (Android 14) dan validasi urutan `versionCode`.
  - `PlayListingManager`: Pengunggahan dan pembaruan cantuman toko multibahasa.
  - `PlayReleaseManager`: Koordinator end-to-end publikasi Android App Bundle (`.aab`).
- **Integrasi Apple App Store Connect & TestFlight (`src/mobile/publishing/ios/`):**
  - `AppStoreConnectClient`: Otentikasi JWT ES256 Apple dengan masa berlaku 20 menit (1200 detik).
  - `TestFlightManager`: Distribusi beta TestFlight grup internal dan eksternal, catatan pengujian, dan pelacak kedaluwarsa 90 hari.
  - `IOSValidation`: Validasi format Reverse-DNS bundle ID, deployment target iOS 15.0+, dan kepatuhan ekspor kriptografi (`ITSAppUsesNonExemptEncryption`).
  - `AppStoreReleaseManager`: Koordinator pengunggahan `.xcarchive` / `.ipa` dan pengajuan tinjauan App Store.
- **Otomatisasi Release Pipeline & Gerbang Persetujuan (`src/mobile/publishing/automation/`):**
  - `ReleasePipeline`: Eksekusi 11 tahapan rilis berurutan (validasi, pengujian, kompilasi, integritas, signing, metadata, kesiapan, approval gate, upload, status processing, dan laporan).
  - `ApprovalGate`: Gerbang persetujuan manusia tunggal yang mewajibkan konfirmasi eksplisit (`--setujui`) sebelum publikasi ke track produksi.
  - `RollbackPlanner`: Prosedur pemulihan dan hotfix yang jujur terhadap batasan teknis toko aplikasi (toko tidak mendukung downgrade langsung).
- **Audit Kepatuhan & Riwayat Rilis (`src/mobile/publishing/reports/`, `validation/`):**
  - `ComplianceValidator`: Evaluasi otomatis terhadap Google Play Developer Policy dan Apple App Store Review Guidelines.
  - `ReleaseReadiness`: Penilaian skor kesiapan rilis (0–100%) dan deteksi isu pemblokir (*blockers*).
  - `PublishingHistory`: Jejak audit permanen (*audit trail*) yang mencatat setiap aksi rilis.
  - `PublishingReport`: Pembuat laporan publikasi format JSON dan Markdown.
- **Antarmuka Grafis GUI Dashboard (`src/komponen/StudioPublikasiMobile.tsx`):**
  - Dasbor *NUSANTARA Mobile App Store Studio* dengan 9 sub-tab interaktif (Kesiapan, Kredensial, Metadata, Aset Grafis, Release Notes, Google Play, App Store & TestFlight, Pipeline Rilis, Riwayat).
- **Perintah CLI Terpadu:**
  - `nusantara mobile store periksa`
  - `nusantara mobile store koneksi <android|ios>`
  - `nusantara mobile store android <metadata|validasi|track|release>`
  - `nusantara mobile store ios <metadata|validasi|testflight|upload>`
  - `nusantara mobile store aset`
  - `nusantara mobile store release-notes`
  - `nusantara mobile store pipeline <periksa|jalankan>`
  - `nusantara mobile store history`
  - `nusantara mobile store laporan`
- **Integrasi Standard Library `std:mobile`:**
  - `periksaKesiapanTokoMobile()`, `buatCatatanRilisMobile()`, `buatLaporanPublikasiMobile()`.
- **Proyek Percontohan & Dokumentasi:**
  - Proyek demo di `examples/mobile/app-publishing-demo/`.
  - 6 panduan komprehensif di `docs/mobile/publishing/`.

## [v0.40.0] — 2026-11-02
### Phase 40: Mobile App Distribution & Publishing

Fase ini menghadirkan sistem distribusi dan penerbitan aplikasi mobile profesional, modular, dan aman untuk platform Android dan Apple iOS pada bahasa pemrograman NUSANTARA.

#### Ditambahkan:
- **Arsitektur Inti Distribusi (`src/mobile/distribution/core/`):**
  - `DistributionManager`: Fasad terpadu orkestrasi distribusi aplikasi mobile.
  - `BuildManager`: Orkestrator kompilasi multi-platform (Android APK, Android AAB, iOS archive).
  - `ReleaseManager`: Pipeline rilis terpadu, penataan checklist kelayakan, dan penyusunan laporan rilis.
  - `VersionManager`: Pengelola Semantic Versioning (SemVer), kenaikan otomatis `versionCode` Android dan `CFBundleVersion` iOS, saluran rilis (`debug`, `internal`, `beta`, `produksi`), dan generator catatan rilis otomatis.
- **Sistem Distribusi Android (`src/mobile/distribution/android/`):**
  - `AndroidManifestManager`: Generator dan validator `AndroidManifest.xml` resmi dengan integrasi package name, versioning, permissions, dan metadata.
  - `AndroidSigningManager`: Pengelolaan penandatanganan keystore, key alias, validasi skema signature v1/v2/v3, perhitungan sidik jari SHA-256, dan pencegahan kata sandi plaintext (menggunakan environment variables).
  - `APKBuilder`: Generator paket instalasi APK Debug dan Release dengan verifikasi integritas biner dan SHA-256.
  - `AABBuilder`: Generator Android App Bundle (`.aab`) resmi Google Play Store dengan konfigurasi bundletool dan optimasi ukuran.
  - `AndroidDistributionManager`: Pemeriksaan lingkungan Android SDK, JDK, Gradle, dan eksekusi build terpadu.
- **Sistem Distribusi Apple iOS (`src/mobile/distribution/ios/`):**
  - `IOSDistributionManager`: Pemeriksaan lingkungan macOS, Xcode, dan `xcodebuild` dengan pelaporan transparan.
  - `CodeSigningManager`: Validasi identitas sertifikat Apple Distribution, Team ID, dan generator `ExportOptions.plist`.
  - `ProvisioningManager`: Validasi berkas provisioning profile (`.mobileprovision`), App ID, UUID, dan entitlements.
  - `ArchiveManager`: Persiapan struktur Xcode Archive (`.xcarchive`), `Info.plist`, dan checklist kesiapan TestFlight serta Apple App Store.
- **Pengelolaan Aset Visual Mobile (`src/mobile/distribution/assets/`):**
  - `IconManager`: Spesifikasi resmi Android adaptive icon (foreground/background) dan iOS AppIcon (1024x1024 App Store, iPhone, iPad).
  - `SplashManager`: Generator Android 12+ SplashScreen API (`Theme.SplashScreen`) dan storyboard iOS LaunchScreen.
  - `AssetValidator`: Validasi dimensi, aspek rasio 1:1 untuk ikon, format gambar (`.png`, `.webp`, `.svg`), dan batasan ukuran berkas.
- **Validasi & Laporan Rilis (`src/mobile/distribution/validation/`, `reports/`):**
  - `BuildValidator`: Verifikasi integritas berkas artefak build biner.
  - `SigningValidator`: Audit keamanan kredensial dan deteksi kebocoran rahasia (*secret leak detection*).
  - `ReleaseValidator`: Evaluasi otomatis seluruh kriteria toko aplikasi (Android & iOS).
  - `BuildReportGenerator`: Pembuat laporan build JSON (`build-report.json`).
  - `ReleaseReportGenerator`: Pembuat laporan rilis Markdown terstruktur (`release-report.md`).
- **Antarmuka GUI Dashboard (`src/komponen/StudioDistribusiMobile.tsx`):**
  - Halaman interaktif *NUSANTARA Mobile Distribution Center* di tab Studio.
  - Menampilkan ringkasan proyek, status toolchain SDK/JDK/Xcode, pemicu build APK/AAB/Archive, pengelola versi, checklist kelayakan, dan penampil laporan Markdown.
- **Integrasi CLI Nusantara Mobile:**
  - `nusantara mobile distribusi periksa`
  - `nusantara mobile distribusi konfigurasi [lingkungan]`
  - `nusantara mobile distribusi android <apk|aab|debug|release|tanda-tangan>`
  - `nusantara mobile distribusi ios <periksa|archive|validasi>`
  - `nusantara mobile distribusi versi <tampil|naikkan>`
  - `nusantara mobile distribusi aset <periksa|daftar>`
  - `nusantara mobile distribusi rilis <laporan|checklist>`
- **Integrasi Standard Library `std:mobile` (`src/stdlib/mobile.ts`):**
  - `dapatkanInfoDistribusi()`, `validasiRilisMobile()`, `kelolaVersiMobile()`, `periksaAsetMobile()`, `buatLaporanDistribusi()`.
- **Proyek Percontohan Nyata:**
  - `contoh/mobile/distribution_demo/` memuat `nusantara.mobile.json`, `src/main.nusantara`, dan `README.md`.
- **Dokumentasi Komprehensif:**
  - 14 berkas dokumentasi di `docs/mobile/distribution/`.

## [v0.39.0] — 2026-11-01
### Phase 39: Nusantara Mobile Networking & Cloud Services

Fase ini menghadirkan kemampuan konektivitas internet mobile, integrasi REST API, manajemen token otentikasi aman (JWT & OAuth 2.0 PKCE), sinkronisasi data offline-first dengan resolusi konflik terdistribusi, transfer berkas cloud anti-path traversal, WebSocket mobile sadar status latar belakang, dan arsitektur penyedia multi-cloud pada bahasa pemrograman NUSANTARA.

#### Ditambahkan:
- **Networking Core & Manajemen Permintaan (`src/mobile/networking/core/`):**
  - `types.ts`: Kontrak tipe data lengkap untuk metode HTTP, opsi permintaan, hasil respon API, token otentikasi, antrean offline, resolusi konflik, dan metadata cloud.
  - `request_manager.ts`: `ManajerPermintaanMobile` dengan antrean prioritas (`tinggi`, `normal`, `rendah`), pembatasan konkurensi (maks 4 koneksi bersamaan), pembuatan UUID `Idempotency-Key`, dan kebijakan coba ulang (*retry*) dengan *exponential backoff* dan *jitter*.
  - `api_client.ts`: `KlienAPIMobile` yang mendukung metode `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, encoding URL query aman, intersepsi otomatis ke antrean offline saat jaringan terputus, dan eksekusi sinkron untuk interpreter NUSANTARA.
- **Autentikasi Mobile & OAuth 2.0 PKCE (`src/mobile/networking/auth/`):**
  - `auth_client.ts`: `KlienAutentikasiMobile` mengelola siklus hidup token JWT, auto-refresh token sebelum kedaluwarsa, generator PKCE (RFC 7636) dengan `code_verifier` dan `code_challenge` SHA-256 base64url, serta integrasi penyimpanan aman Keystore / Keychain.
- **Pola Offline-First & Mesin Sinkronisasi Data (`src/mobile/networking/offline/`, `sync/`):**
  - `offline_queue.ts`: `PengelolaOperasiOffline` dengan antrean FIFO persisten, de-duplikasi otomatis berdasarkan idempotency key, pelacakan percobaan, dan pembersihan berkala operasi yang berhasil.
  - `sync_engine.ts`: `MesinSinkronisasiMobile` untuk pengiriman otomatis mutasi tertunda saat koneksi pulih, dilengkapi 4 strategi resolusi konflik: *Last-Write-Wins* (LWW dengan toleransi *clock drift*), *Server Wins*, *Client Wins*, dan *Manual*.
- **Cloud Storage & Transfer Berkas Aman (`src/mobile/networking/storage/`):**
  - `cloud_storage.ts`: Abstraksi `PenyediaStorageNetral` dengan adaptor `mock_local` (in-memory sandbox) dan `s3_compatible`, pelacak progres transfer `(persen, byteTerkirim, totalByte)`, batas ukuran mobile 50 MB, dan proteksi anti-path traversal.
- **WebSocket & Background Tasks (`src/mobile/networking/realtime/`, `background/`):**
  - `websocket_client.ts`: `KlienWebSocketMobile` dengan interval heartbeat ping/pong (25s) hemat daya seluler, serta penangguhan saat aplikasi berada di latar belakang (*background*) dan pemulihan saat di latar depan (*foreground*).
  - `background_sync.ts`: `PengelolaTugasBackgroundMobile` berbasis kontrak Android WorkManager dan iOS BackgroundTasks dengan batasan jaringan dan daya baterai.
- **Cloud Database REST & Push Notifications (`src/mobile/networking/database/`, `push/`):**
  - `cloud_database.ts`: `KlienDatabaseCloudMobile` untuk operasi CRUD, paginasi, dan penyaringan tanpa mengekspos kredensial administrator.
  - `push_notification.ts`: `PengelolaNotifikasiPushMobile` untuk pengelolaan token registrasi FCM / APNs dan perutean deep link.
- **Multi-Cloud Provider & Konfigurasi (`src/mobile/networking/providers/`, `config/`):**
  - `provider_registry.ts`: `RegistriPenyediaCloud` mendukung `mock_local`, `supabase`, `firebase`, dan `rest_kustom`.
  - `cloud_config.ts`: `PengelolaKonfigurasiCloud` dengan profil lingkungan (`pengembangan`, `staging`, `produksi`) dan penegakan TLS wajib.
- **Lapisan Keamanan & Sensor Rahasia (`src/mobile/networking/security/`):**
  - `cloud_security.ts`: `LapisanKeamananMobile` menyensor otomatis header dan data sensitif (`Authorization`, `token`, `password`, `secret`), memvalidasi URL produksi wajib HTTPS, serta memblokir upaya injeksi role di sisi klien.
- **Integrasi CLI Nusantara Mobile:**
  - Subperintah `nusantara mobile jaringan periksa`.
  - Subperintah `nusantara mobile cloud <info|konfigurasi|validasi>`.
  - Subperintah `nusantara mobile sync <periksa|sinkronkan>`.
- **Integrasi Pustaka Standar `std:mobile` (`src/stdlib/mobile.ts`):**
  - `buatKlienAPI`, `buatKlienAutentikasi`, `sinkronkanDataMobile`, `antreanOfflineMobile`, `periksaJaringanMobile`, `unggahBerkasCloud`, `unduhBerkasCloud`, `dapatkanKonfigurasiCloud`.
- **Contoh Aplikasi Nyata (.nusantara):**
  - `contoh/mobile/api_explorer/api_explorer.nusantara` (REST API Client demo).
  - `contoh/mobile/cloud_login/cloud_login.nusantara` (Autentikasi token JWT & Keystore demo).
  - `contoh/mobile/offline_notes/offline_notes.nusantara` (Aplikasi catatan offline-first & sinkronisasi data).
  - `contoh/mobile/cloud_file_manager/cloud_file_manager.nusantara` (Transfer berkas cloud & metadata demo).
- **Dokumentasi Lengkap (13 Berkas):**
  - `docs/mobile/networking/` (01 s/d 13 panduan komprehensif Bahasa Indonesia).
- **Pengujian Terotomasi:**
  - `pengujian/mobile/uji_mobile_networking_fase39.ts`: 32/32 skenario pengujian lulus 100%.

## [v0.38.0] — 2026-11-01
### Phase 38: Nusantara Mobile Native API & Device Integration

Fase ini menghadirkan sistem integrasi fitur asli (native) smartphone Android dan iOS pada bahasa pemrograman NUSANTARA, memungkinkan aplikasi seluler NUSANTARA memanfaatkan kamera, sensor gerak, Bluetooth, geolokasi, notifikasi lokal, audio, sistem berkas sandbox, papan klip, lembar berbagi, dan penyimpanan terenkripsi hardware secara aman dan transparan.

#### Ditambahkan:
- **Native API Core & Registri (`src/mobile/native/`):**
  - `core/result.ts`: Standar hasil operasi native (`HasilOperasiNative<T>`), enum `KodeGalatNative`, dan pembantu pembuatan respon (`buatHasilSukses`, `buatHasilGagal`, `buatHasilIzinDitolak`, `buatHasilTidakDidukung`, `buatHasilDibatalkan`).
  - `core/capabilities.ts`: `PengelolaKemampuanPerangkat` untuk deteksi kapabilitas perangkat keras (kamera, sensor 3-sumbu, Bluetooth BLE, GPS, Keystore/Keychain, audio) tanpa pelacakan sensitif (anti-fingerprinting).
  - `core/events.ts`: `PengirimPeristiwaNative` (Native Event Dispatcher) untuk pub/sub peristiwa perangkat keras (sensor stream, perubahan jaringan/baterai, status Bluetooth).
  - `core/registry.ts`: `RegistriNativeAPI` terpusat mengelola registrasi 25+ native API, verifikasi perizinan dinamis otomatis, validasi parameter, dan penanganan galat terstandarisasi.
- **Adaptor Platform Native (`src/mobile/native/adapters/`):**
  - `platform_adapter.ts`: Kontrak antarmuka `AdaptorPlatformNative`.
  - `simulator_adapter.ts`: Implementasi simulator responsif untuk pengembangan cepat di desktop/peramban dengan simulasi sensor, berkas sandbox, kamera, dan clipboard.
  - `android_adapter.ts`: Adaptor Android terintegrasi dengan Android Jetpack Contracts (`TakePicture`, `PickVisualMedia`), Google Location Services, dan Android Keystore AES-256-GCM.
  - `ios_adapter.ts`: Adaptor iOS terintegrasi dengan Apple Frameworks (`AVFoundation`, `PHPickerViewController`, `CoreLocation`, `UserNotifications`, `CoreMotion`, `Keychain Services`).
- **Layanan API Perangkat Lengkap (`src/mobile/native/services/`):**
  - Kamera: `kamera.ketersediaan`, `kamera.ambil`.
  - Galeri & Media Picker: `galeri.pilih_foto`, `galeri.pilih_video`.
  - Lokasi GPS: `lokasi.ambil`, `lokasi.pantau`, `lokasi.henti`.
  - Notifikasi Lokal: `notifikasi.kirim`, `notifikasi.jadwal`, `notifikasi.batal`.
  - Sensor Perangkat: `sensor.akselerometer`, `sensor.giroskop`, `sensor.magnetometer`, `sensor.kedekatan`, `sensor.cahaya`.
  - Bluetooth & BLE: `bluetooth.status`, `bluetooth.pindai`.
  - Daya & Baterai: `baterai.info`.
  - Jaringan: `jaringan.status`.
  - Audio & Mikrofon: `audio.putar`, `audio.rekam`, `audio.henti`.
  - Sistem Berkas Sandbox: `berkas.baca`, `berkas.tulis`, `berkas.hapus` dengan proteksi anti-path traversal (`..`).
  - Papan Klip: `papan_klip.salin`, `papan_klip.tempel`.
  - Lembar Berbagi: `bagikan.konten`.
  - Penyimpanan Aman: `simpan_aman.tulis`, `simpan_aman.baca`, `simpan_aman.hapus` (AES-256).
  - Haptik: `haptik.getar`, `haptik.pola`.
  - Siklus Hidup: `lifecycle.status`.
- **Integrasi Pustaka Standar (`std:mobile`):**
  - Fungsi bawaan `seluler.panggilNative(namaApi, parameter)`, `seluler.daftarNativeAPI()`, `seluler.periksaNativeAPI(namaApi)`, `seluler.dapatkanKemampuanPerangkat()`.
- **Ekstensi CLI Nusantara Mobile (`nusantara mobile`):**
  - `nusantara mobile api daftar`: Menampilkan seluruh API terdaftar per kategori beserta kebutuhan izin dan status implementasi.
  - `nusantara mobile api periksa <nama>`: Inspeksi detail parameter, tipe kembalian, versi minimum OS, dan kode galat API.
  - `nusantara mobile permission daftar`: Daftar kebijakan izin perangkat.
  - `nusantara mobile device info`: Spesifikasi teknis perangkat dan matriks kapabilitas hardware.
- **Aplikasi Percontohan Nyata (`contoh/mobile/device_explorer/`):**
  - `device_explorer.nusantara`: Aplikasi Device Explorer interaktif yang mendemonstrasikan akses kamera, sensor akselerometer, notifikasi lokal, dan secure storage AES-256.
- **Dokumentasi Lengkap 25 Berkas (`docs/mobile/native-api/`):**
  - Panduan lengkap arsitektur, izin, penanganan galat, integrasi Android/iOS, matriks kapabilitas, dan troubleshooting.

## [v0.37.0] — 2026-10-31
### Phase 37: Nusantara Mobile Application Framework (Android & iOS Development Support)

Fase ini menghadirkan fondasi lengkap Nusantara Mobile Application Framework, memungkinkan pengembang membangun aplikasi seluler lintas platform untuk sistem operasi Android dan iOS menggunakan sintaks deklaratif Bahasa Indonesia pada bahasa pemrograman NUSANTARA.

#### Ditambahkan:
- **Mobile Core (`src/mobile/core/`):**
  - `lifecycle.ts`: Pengelola siklus hidup aplikasi mobile (`StatusLifecycleMobile`: `DIBUAT`, `MEMULAI`, `AKTIF`, `JEDA`, `RESUME`, `LATAR_BELAKANG`, `BERHENTI`, `DIHANCURKAN`) dengan hook transisi dan listener.
  - `config.ts`: `PengelolaKonfigurasiMobile` yang memvalidasi `nusantara.json` (ID paket terbalik, semver, orientasi, platform target, min SDK range).
  - `state.ts`: `PengelolaStateMobile` untuk manajemen state global reaktif dengan listener spesifik per kunci dan global.
  - `application_context.ts`: `KonteksAplikasiMobile` singleton penyedia metadata perangkat default, orientasi, dan manager perizinan.
  - `application.ts`: `AplikasiMobile` sebagai orkestrator aplikasi seluler, hierarki komponen akar, dan serialisasi JSON.
- **Sistem Keamanan Mobile (`src/mobile/security/`):**
  - `permission.ts`: `PengelolaIzinMobile` menangani 10 jenis izin seluler dinamis (kamera, lokasi, notifikasi, foto media, mic, bluetooth, sensor, dll) dengan rasional dan listener status.
  - `secure_storage.ts`: `PenyimpananAmanMobile` mengabstraksikan Android Keystore & iOS Keychain menggunakan enkripsi simetris AES-256-CBC dengan IV dinamis.
- **Primitif Antarmuka Visual & Formulir (`src/mobile/ui/`):**
  - `TeksMobile`, `TombolMobile` (varian primer, sekunder, garis, teks, bahaya; loading spinner), `InputTeksMobile`, `InputSandiMobile`, `SakelarMobile`, `KotakCentangMobile`, `TombolRadioMobile`, `DropdownMobile`, `GambarMobile`, `IkonMobile`, `IndikatorProgresMobile`, `IndikatorMemuatMobile`, `KartuMobile`, `PemisahMobile`, `DaftarMobile`, dan `GridMobile`.
  - `DialogMobile`, `AlertMobile`, dan `SnackbarMobile` (varian info, sukses, peringatan, bahaya).
- **Mesin Tata Letak Responsif (`src/mobile/layout/`):**
  - `responsive.ts`: `PengelolaResponsifMobile` mengelola breakpoint (`ponsel_kecil`, `ponsel_standar`, `ponsel_besar`, `tablet`), orientasi potret/lanskap, dan rasio skala piksel.
  - `safe_area.ts`: `AreaAmanMobile` wadah pembungkus insets takik kamera, status bar, dan home gesture bar (atas, bawah, kiri, kanan).
  - `flex.ts`: `TataLetakVertikalMobile`, `TataLetakHorizontalMobile`, `TataLetakFleksibelMobile` (perataan, jarak/gap, wrapping).
  - `stack.ts`: `TataLetakTumpukMobile` untuk Z-index layering dan floating positioning.
  - `scroll.ts`: `TampilanGulirMobile` untuk navigasi gulir vertikal/horizontal dengan inersia pantulan.
- **Sistem Navigasi & Tautan Dalam (`src/mobile/navigation/`):**
  - `route.ts`: Definisi `RuteMobile` dengan pembuat halaman dan transisi animasi.
  - `stack_navigator.ts`: `NavigatorTumpukanMobile` (`dorong`, `kembali`, `ganti`, `reset`, `bisaKembali`, `dapatkanKedalaman`, listener perubahan).
  - `tab_navigator.ts`: `NavigatorTabMobile` untuk antarmuka multi-tab.
  - `bottom_nav.ts`: `NavigasiBawahMobile` untuk bilah menu bawah seluler dengan lencana (badge).
  - `deep_link.ts`: `PengelolaDeepLinkMobile` mengurai custom URL schemes (`nusantara://...`), host, path, dan query params.
- **API Perangkat Seluler (`src/mobile/device/`):**
  - `info.ts`: `InfoPerangkatMobile` (metadata perangkat keras, simulator flag, platform detection).
  - `network.ts`: `StatusJaringanMobile` (wifi, cellular metered, listener koneksi).
  - `battery.ts`: `StatusBateraiMobile` (persentase baterai, pengisian daya, mode hemat energi).
  - `haptics.ts`: `GetaranMobile` (vibrate ms dan 6 pola umpan balik haptik).
  - `clipboard.ts`: `PapanKlipMobile` (salin dan tempel teks).
  - `location.ts`: `LokasiPerangkatMobile` (koordinat geolokasi dengan pemeriksaan izin otomatis).
  - `notification.ts`: `NotifikasiLokalMobile` (penjadwalan pengingat lokal dan pembatalan).
  - `share.ts`: `BerbagiMobile` (dialog berbagi konten sistem).
- **Jembatan Platform Native (`src/mobile/bridge/`):**
  - Protokol IPC native dua arah (`PesanJembatanPermintaan`, `PesanJembatanRespon`, `PesanJembatanPeristiwa`).
  - `JembatanMobileNative`: Panggilan metode RPC native, penanganan galat `METODE_TIDAK_DITEMUKAN`, dan pub/sub saluran peristiwa.
- **Pengelola Aset Mobile (`src/mobile/assets/`):**
  - `PengelolaAsetMobile`: Pengelompokan aset di `aset/`, mitigasi path traversal `..`, whitelist ekstensi resmi, dan generator manifest aset.
- **Fondasi Sistem Build Android & iOS (`src/mobile/build/`):**
  - `android.ts`: Deteksi `ANDROID_HOME`/JDK/ADB, generator `AndroidManifest.xml` dinamis, generator `build.gradle` (SDK 34), dan konfigurasi `proguard-rules.pro`.
  - `ios.ts`: Deteksi macOS/Xcode, generator `Info.plist` dinamis dengan entri privasi, dan generator template `Podfile`.
- **Integrasi CLI Mobile (`src/mobile/cli/` & `src/paket/cli.ts`):**
  - Subperintah: `nusantara mobile <baru|platform|periksa|build|jalankan|info>`.
- **Integrasi Pustaka Standar (`src/stdlib/mobile.ts` & `src/stdlib/index.ts`):**
  - Modul resmi `std:mobile` dengan alias `mobile`, `seluler`, `android`, `ios`.
  - Fungsi wrapper runtime untuk pembuatan aplikasi, komponen UI, navigator, dialog, snackbar, dan API perangkat.
- **Template Proyek Baru (`src/generator/templateRegistry.ts`):**
  - Template `mobile` resmi untuk `nusantara new <nama> --template mobile`.
- **Contoh Aplikasi Nyata (`contoh/mobile/`):**
  - `hello_mobile.nusantara`, `counter_mobile.nusantara`, `profile_mobile.nusantara`, `demo_mobile.nusantara`.
- **18 Berkas Dokumentasi Resmi (`docs/mobile/`):**
  - Mencakup pengenalan, instalasi, persiapan Android/iOS, struktur proyek, konfigurasi, komponen UI, layout, navigasi, state, device API, perizinan, aset, build Android/iOS, keamanan, pengujian, dan pemecahan masalah.
- **Suite Pengujian Otomatis (`pengujian/mobile/uji_mobile_fase37.ts`):**
  - Skrip npm `"test:mobile-v37"` dan integrasi ke suite uji utama `npm test`.

---

## [v0.31.0] — 2026-10-28
### Phase 31: Nusantara Authentication, Session & Access Control

Fase ini mengimplementasikan fondasi autentikasi, manajemen sesi berbasis CSPRNG, proteksi brute-force, kontrol akses berbasis peran (RBAC), serta proteksi CSRF untuk aplikasi web dan REST API bahasa pemrograman NUSANTARA.

#### Ditambahkan:
- **Subsistem Autentikasi & Otorisasi (`src/autentikasi/`):**
  - `src/autentikasi/jenis.ts`: Definisi antarmuka `Pengguna`, `Sesi`, `OpsiPasswordPolicy`, `OpsiSesi`, `OpsiBruteForce`, `GalatAutentikasi`.
  - `src/autentikasi/password.ts`: Implementasi `PengelolaPassword` berbasis **Scrypt KDF** (RFC 7914, N=16384, r=8, p=1), salt 16-byte CSPRNG, dan verifikasi waktu konstan `crypto.timingSafeEqual`.
  - `src/autentikasi/pengguna.ts`: Repositori pengguna `RepositoriPengguna` dengan query SQL berparameter, indeks unik cepat, dan pembersihan profil publik aman.
  - `src/autentikasi/sesi.ts`: Pengelola sesi `PengelolaSesi` dengan token 32-byte CSPRNG, penyimpanan database ber-hash SHA-256 (`token_hash`), kedaluwarsa absolut (7 hari), idle timeout (2 jam), dan rotasi sesi (*session fixation protection*).
  - `src/autentikasi/rbac.ts`: Mesin kontrol akses `ManajerRBAC` dengan peran bawaan (`pengguna`, `editor`, `admin`), izin hierarkis berbasis namespace, dan pencocokan wildcard (`artikel:*`, `*`).
  - `src/autentikasi/csrf.ts`: Generator dan middleware proteksi CSRF dengan validasi waktu konstan pada metode mutasi HTTP (`POST`, `PUT`, `PATCH`, `DELETE`).
  - `src/autentikasi/layanan.ts`: Orkestrator terpadu `LayananAutentikasi` yang menyediakan registrasi aman, login anti-enumeration dengan dummy verification latensi setara, penguncian brute-force otomatis, validasi sesi, rotasi sesi, serta penggantian password.
  - `src/autentikasi/middleware.ts`: Middleware framework web: `buatMiddlewareWajibAutentikasi`, `buatMiddlewareWajibPeran`, `buatMiddlewareWajibIzin`, `buatMiddlewareSesi`, `buatMiddlewareCSRF`.
- **Integrasi Pustaka Standar (`src/stdlib/autentikasi.ts`):**
  - Modul standar resmi `autentikasi` (alias: `auth`, `std:autentikasi`, `std:auth`).
  - Fungsi modul: `hashPassword`, `verifikasiPassword`, `buatLayanan`, `apakahTerautentikasi`, `dapatkanPenggunaSaatIni`, `apakahAdmin`.
  - Registrasi simbol ke `KATALOG_MODUL_STANDAR`, `DAFTAR_MODUL_STANDAR_FASE31`, dan `DAFTAR_SEMUA_MODUL_STANDAR`.
- **Contoh Aplikasi & Pengujian:**
  - `contoh/auth/aplikasi.nusantara` & `contoh/auth/README.md`.
  - `pengujian/autentikasi/uji_autentikasi_fase31.ts`: 27 skenario uji komprehensif (100% Lulus, 0 Gagal).
- **Dokumentasi Lengkap:**
  - `docs/referensi/authentication.md`
  - `docs/panduan/membuat-login.md`
  - `docs/panduan/session.md`
  - `docs/panduan/authorization.md`
  - `docs/pengembang/authentication-architecture.md`

---

## [v0.30.0] — 2026-10-27
### Phase 30: Web Application Framework NUSANTARA
Implementasi fondasi web application framework resmi (modul `web` dan `http`), server HTTP adapter, router dinamis dengan parameter `:id`, mesin template aman Anti-XSS, middleware pipeline, dan REST API generator.

---

## [v0.29.0] — 2026-10-27
### Phase 29: Database API & Data Access NUSANTARA
Implementasi antarmuka akses basis data relasional SQLite terpadu berbasis `node:sqlite` (modul `basisdata`), prepared statement, parameter binding, dan manajemen transaksi ACID.

---

## [v0.28.0] — 2026-10-26
### Phase 28: Nusantara Standard Library Expansion
Implementasi 6 modul standar ekspansi: `kripto`, `kompresi`, `http_klien`, `validasi`, `berkas_ekspansi`, dan `proses_ekspansi`.

---

## [v0.27.0] — 2026-10-26
### Phase 27: Nusantara Package Ecosystem & Dependency Management

Fase ini mengimplementasikan ekosistem paket dan sistem manajemen dependensi profesional yang terintegrasi penuh dengan CLI (`nusantara`), build system, registri (Phase 22), IDE (Phase 26), CI/CD (Phase 24), pustaka standar, serta sistem keamanan integritas kriptografis.

#### Ditambahkan:
- **Subsistem Package Cache (`src/paket/cache.ts`):**
  - Mesin `ManajerCachePaket` untuk penyimpanan dan pengambilan paket berbasis identitas `nama@versi`.
  - Verifikasi integritas hash SHA-256 otomatis (`sha256-...`) dan deteksi pemalsuan arsip (*tamper detection*).
  - Metode manajemen cache: `simpan`, `ambil`, `memiliki`, `verifikasiIntegritas`, `daftarCache`, `hapus`, dan `bersihkan`.
  - Abstraksi multi-runtime yang kompatibel dengan filesystem Node.js (`fs`) dan lingkungan memori/peramban (`PembacaBerkasMemori`).
- **Pohon & Audit Dependensi (`src/paket/graph.ts`):**
  - Representasi graf dan visualisasi pohon dependensi hierarkis (`formatPohon()`) dengan perlindungan siklus tak terbatas (*cycle-safe recursion*).
  - Mesin audit keamanan internal (`auditKeamanan()`) yang mendeteksi ketergantungan sirkular (*circular dependencies*) dan konflik versi paket.
- **Penyempurnaan Pengelola Paket (`src/paket/pengelolaPaket.ts`):**
  - Integrasi cache-first: pencarian dari cache lokal sebelum menghubungi registri.
  - Bridge ganda: pencarian pada `RegistriLokal` (Phase 22/27) dengan fallback mulus ke `PackageRegistry` (Phase 16).
  - Pemasangan deterministik dan reproduktif (`pasang({ terkunci: true })`): verifikasi kepatuhan 100% terhadap `nusantara.lock` dan pembatalan otomatis jika hash integritas tidak cocok.
  - Perintah baru: `tambah()` (menambahkan dependensi ke manifest dan lockfile), `dapatkanPohonDependensi()` (pohon grafis), `audit()` (audit integritas berkas fisik dan lockfile), dan `bersihkanCache()`.
- **Perluasan CLI Subsystem (`src/paket/cli.ts`):**
  - Perintah baru: `nusantara tambah <nama> [batasan]` (alias: `add`), `nusantara pohon` (alias: `tree`, `graf`), `nusantara audit`, dan `nusantara bersihkan-cache` (alias: `cache-clean`).
  - Opsi bendera baru: `--terkunci` / `--locked` dan `--lewati-cache` / `--no-cache` pada perintah `pasang`.
  - Dukungan output JSON `--json` pada seluruh perintah paket untuk integrasi CI/CD.
- **Integrasi Antarmuka Studio IDE (`StudioEkosistemPaket.tsx` & `StudioIDE.tsx`):**
  - Penambahan subtab `dependensi` dan `cache` pada modul Ekosistem Paket IDE.
  - Formulir interaktif penambahan dependensi baru, audit keamanan sekali klik, instalasi mode terkunci, dan visualisasi pohon dependensi proyek.
  - Tombol aksi cepat terminal di laci paket IDE untuk mengeksekusi `$ nusantara pasang`, `$ nusantara audit`, dan `$ nusantara pohon`.
- **Dokumentasi & Pengujian:**
  - `docs/referensi/dependency-management.md` dan `docs/pengembang/package-cache.md`.
  - `pengujian/paket/uji_ekosistem_dependensi.ts`: 25 skenario pengujian komprehensif (100% Lulus) mencakup SSOT, SemVer, graph resolver, cache, tampering, determinisme lockfile, dan tata bahasa parser aktual.

---

## [v0.19.0] — 2026-10-22
### Phase 19: Toolchain & Formatter NUSANTARA

Fase ini mengimplementasikan toolchain terpadu bahasa pemrograman NUSANTARA yang mencakup formatter resmi berbasis AST (*Abstract Syntax Tree*), protokol keselamatan *safety check* (re-parsing), linter statis dengan rule ID stabil (`NUS-W001`..`NUS-W004`), konfigurasi berkas `nusantara.toml` (`[format]`), dan pemeriksa proyek/berkas (`nusantara cek`).

#### Ditambahkan:
- **Subsistem Toolchain (`src/toolchain/`):**
  - `src/toolchain/konfigurasi.ts`: Antarmuka `KonfigurasiFormat`, nilai baku (`indentasi: 4`, `panjangBaris: 100`, `pertahankanKomentar: benar`), dan parser konfigurasi dari manifest `nusantara.toml`.
  - `src/toolchain/formatter.ts`: Implementasi `FormatterNUSANTARA`, `formatKode()`, `formatAman()`, serta AST pretty-printer untuk seluruh simpul program, fungsi, percabangan, perulangan, koleksi, dan modul.
  - `src/toolchain/linter.ts`: Mesin `LinterNUSANTARA` dengan aturan diagnostik peringatan:
    - `NUS-W001`: Variabel tidak pernah digunakan (mendukung pengecualian awalan `_`).
    - `NUS-W002`: Kode yang tidak pernah dieksekusi (*unreachable code*).
    - `NUS-W003`: Perbandingan variabel dengan dirinya sendiri.
    - `NUS-W004`: Simbol impor tidak pernah digunakan.
  - `src/toolchain/pemeriksa.ts`: Mesin `PemeriksaProyek` untuk validasi berkas tunggal (`periksaBerkas`) dan validasi menyeluruh struktur proyek (`periksaProyek`) yang memeriksa manifes, lockfile, sintaksis parser, tipe statis, dan linter.
- **Perintah CLI Baru (`src/paket/cli.ts`):**
  - `nusantara format <berkas|direktori>`: Menghasilkan kode terformat ke terminal.
  - `nusantara format --tulis <berkas|direktori>` (atau `-w`): Menulis perubahan ke berkas secara aman setelah lolos *safety check*.
  - `nusantara format --cek <berkas|direktori>`: Memeriksa apakah berkas sudah rapi tanpa mengubahnya.
  - `nusantara cek [<berkas|direktori>]`: Memeriksa keabsahan kode dan manifes tanpa menjalankan program.
  - Opsi `--json`: Format diagnostik terstruktur untuk integrasi pihak ketiga.
- **Preservasi String & Komentar:**
  - `src/lexer/lexer.ts`: Dukungan pencatatan `KomentarSumber` dan fungsi `dapatkanDaftarKomentar()`.
  - Penenunan komentar baris penuh dan inline pada hasil pretty-printer.
- **Dokumentasi & Pengujian:**
  - `docs/referensi/formatter.md`, `docs/referensi/toolchain.md`, `docs/pengembang/formatter.md`.
  - `examples/toolchain/format-before.nusantara`, `examples/toolchain/format-after.nusantara`, `examples/toolchain/checker-example.nusantara`.
  - `pengujian/toolchain/uji_toolchain.ts`: 54 uji komprehensif (100% Lulus).

---

## [v0.18.0] — 2026-10-21
### Phase 18: Sistem Error & Debugging NUSANTARA
Implementasi sistem diagnostik ramah manusia dengan 12 kategori terstruktur, visual caret `^^^^`, saran saltik Levenshtein, dan pelacakan tumpukan (*stack trace*).

---

## [v0.17.0] — 2026-10-20
### Phase 17: Standard Library NUSANTARA
Implementasi 8 modul standar resmi (`teks`, `matematika`, `konversi`, `waktu`, `acak`, `koleksi`, `berkas`, `sistem`) dengan isolasi keamanan Sandbox Filesystem.

---

## [v0.16.0] — 2026-10-20
### Phase 16: Package Manager NUSANTARA (`nusantara`)
Implementasi pengelola paket resmi dengan manifest `nusantara.toml`, berkas kunci `nusantara.lock`, pencegahan siklus DFS, dan validasi SemVer.

---

## [v0.15.0] — 2026-10-19
### Phase 15: Sistem Modul NUSANTARA

Fase ini mengimplementasikan sistem modul dan manajemen ruang lingkup (*module system & namespace*) resmi bahasa NUSANTARA, memungkinkan pemecahan program menjadi beberapa berkas `.nusantara` independen yang terisolasi, terproteksi dari serangan eksploitasi direktori (*anti-path-traversal*), terlindungi dari pemuatan ganda melalui cache modul, serta memiliki deteksi ketergantungan melingkar (*circular dependency detection*).

#### Ditambahkan:
- **Subsistem Modul (`src/modul/`):**
  - `src/modul/jenisModul.ts`: Antarmuka `CatatanModul`, `InfoSimbolModul`, dan status siklus hidup `StatusPemuatanModul` (`BELUM_DIMUAT`, `SEDANG_DIMUAT`, `SUDAH_DIMUAT`, `GAGAL_DIMUAT`).
  - `src/modul/galatModul.ts`: Kelas `GalatModul` dengan taksonomi kesalahan Bahasa Indonesia (`MODUL_TIDAK_DITEMUKAN`, `KETERGANTUNGAN_MELINGKAR`, `NAMA_MODUL_TIDAK_VALID`, `JALUR_TIDAK_AMAN`, `ANGGOTA_TIDAK_DITEMUKAN`, `ANGGOTA_INTERNAL_TERLINDUNGI`, `MODUL_RUSAK`).
  - `src/modul/pembacaBerkas.ts`: Abstraksi `PembacaBerkas` dengan implementasi in-memory (`PembacaBerkasMemori`) untuk pengujian/lingkungan web dan Node.js fs (`PembacaBerkasNode`).
  - `src/modul/resolverModul.ts`: Resolver lokasi berkas aman dengan validasi batas direktori proyek dan proteksi anti-path-traversal (`../`, `../../`).
  - `src/modul/pemuatModul.ts`: Mesin pemuat modul dengan singleton cache, isolasi lingkup (*scope isolation*), parsing AST mandiri, eksekusi inisialisasi, dan ekstraksi ekspor.
  - `src/modul/index.ts`: Ekspor terpadu subsistem modul.
- **Sintaksis & Kata Kunci Baru:**
  - Kata kunci resmi `modul`, `gunakan`, `ekspor`, `sebagai`.
  - Deklarasi modul: `modul matematika`.
  - Deklarasi penggunaan modul: `gunakan matematika`.
  - Penggunaan modul dengan alias ruang nama: `gunakan matematika sebagai mtk`.
  - Penggunaan destrukturisasi impor: `impor { tambah, kali } dari matematika`.
  - Deklarasi ekspor: `ekspor fungsi tambah(...)`, `ekspor tetap PI : desimal = 3.14`.
- **Integrasi AST & Parser:**
  - Simpul AST baru: `NodeDeklarasiModul`, `NodePernyataanImpor`, `NodePernyataanEkspor`, `NodeAksesAnggota`.
  - Pemanggilan fungsi beranggota modul: `modul.fungsi(argumen)` dengan simpul `NodePemanggilanFungsi` yang memiliki atribut `target`.
- **Integrasi Sistem Tipe (Type System):**
  - Pendaftaran tabel modul pada `PemeriksaTipe`.
  - Validasi statis fungsi anggota modul, parameter, dan nilai kembalian.
  - Penolakan akses ke simbol internal modul dari luar (`ANGGOTA_INTERNAL_TERLINDUNGI`).
- **Integrasi Interpreter & Konteks Galat Runtime:**
  - Evaluasi `NilaiModul` dan akses anggota titik `.`.
  - Pelacakan konteks modul aktif pada eksekusi fungsi modul.
  - Pelaporan galat runtime dengan informasi modul, baris, dan kolom (`Modul: matematika.nusantara`, `Baris: 8`, `Kolom: 15`).
  - Jejak tumpukan pemanggilan (*stack trace*) antar-modul.
- **Contoh Program Acuan:**
  - `contoh/contoh_matematika.nusantara` (modul contoh matematika).
  - `contoh/contoh_teks.nusantara` (modul contoh teks).
  - `contoh/07_modul.nusantara` (program utama penggunaan modul).
- **Dokumentasi Resmi Sistem Modul:**
  - `docs/referensi/modul.md`: Panduan referensi sintaksis resmi sistem modul.
  - `docs/pengembang/modul.md`: Dokumentasi arsitektur dan teknis pemuat modul dan resolver.
- **Rangkaian Pengujian Modul (`pengujian/modul/`):**
  - `pengujian/modul/uji_modul.ts`: 24 pengujian unit dan integrasi komprehensif (100% Lulus).
  - `pengujian/modul/README.md`: Panduan eksekusi pengujian modul.

#### Diubah:
- `src/lexer/jenisToken.ts` & `src/lexer/keyword.ts`: Menambahkan token kata kunci `KW_MODUL`, `KW_GUNAKAN`, `KW_EKSPOR`, `KW_SEBAGAI`.
- `src/interpreter/nilai.ts`: Menambahkan jenis runtime `JenisNilaiRuntime.MODUL` dan antarmuka `NilaiModul`.
- `src/interpreter/galat.ts`: Menambahkan dukungan nama modul dan format jejak tumpukan berkonteks modul pada `GalatRuntime`.
- `src/operator/evaluasi.ts`: Menambahkan parameter `namaModul` untuk pelaporan galat runtime pembagian dengan nol.
- `package.json`: Menambahkan skrip `"test:modul"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 13 berkas baru Phase 15 (total 167 berkas utuh).

---

## [v0.14.0] — 2026-10-17
### Phase 14: Struktur Data Dasar (Daftar & Peta) NUSANTARA

Fase ini mengimplementasikan struktur data dasar bahasa NUSANTARA, yaitu tipe `daftar` (koleksi terurut berindeks 0 / array-list) dan tipe `peta` (koleksi asosiatif pasangan kunci-nilai / dictionary-map) yang terintegrasi penuh ke dalam Lexer, Parser, AST, Sistem Tipe (Type System), Interpreter Runtime, fungsi bawaan `panjang()`, mutabilitas dan aturan konstanta `tetap`, serta operator kesetaraan mendalam (`==`, `!=`).

#### Ditambahkan:
- **Koleksi Terindeks `daftar`:**
  - Sintaks literal daftar `[10, 20, 30]`, `["merah", "putih"]`, dan daftar kosong `[]`.
  - Akses elemen berbasis indeks 0 (`angka[0]`, `angka[1]`).
  - Mutasi dan penugasan ulang elemen daftar (`angka[1] = 99`).
  - Dukungan daftar bersarang (*nested lists / multidimensional arrays*) seperti matriks 2D `[[1, 2], [3, 4]]` dan akses berantai `matriks[0][1]`.
  - Pemeriksaan batas indeks runtime (`0 <= indeks < panjang`) dengan diagnostik `BATAS_INDEKS_TERLAMPAUI`.
- **Koleksi Asosiatif `peta`:**
  - Sintaks literal peta dengan kunci teks `{"nama": "Ayu", "umur": 20}` dan kunci pengidentifikasi `{nama: "Budi", nilai: 95}`.
  - Sintaks peta kosong `{}`.
  - Akses nilai berdasarkan kunci teks (`siswa["nama"]`).
  - Pembaruan nilai kunci yang sudah ada dan penambahan pasangan kunci baru secara dinamis (`kamus["id"] = "NX-01"`).
  - Dukungan peta bersarang (*nested maps*) dan akses berantai `pegawai["identitas"]["nama"]`.
  - Pemeriksaan keberadaan kunci runtime dengan diagnostik `KUNCI_TIDAK_DITEMUKAN`.
- **Integrasi Sistem Tipe (Type System):**
  - Registrasi resmi `NamaTipe.DAFTAR` dan `NamaTipe.PETA` dengan status dukungan `LENGKAP`.
  - Validasi statis indeks daftar wajib bertipe `bilangan` dan kunci peta wajib bertipe `teks` (`INDEKS_TIDAK_SESUAI`).
  - Penolakan operasi pengindeksan `[...]` pada tipe skalar non-koleksi (`TIPE_BUKAN_KOLEKSI`).
  - Penegakan aturan mutabilitas: menolak pengubahan elemen daftar atau pasangan kunci peta pada koleksi yang dideklarasikan dengan `tetap` (`MODIFIKASI_TETAP`).
  - Penanganan kompatibilitas dua arah tipe dinamis `NamaTipe.APAPUN` untuk elemen koleksi.
- **Fungsi Bawaan `panjang(koleksi)`:**
  - Fungsi bawaan resmi untuk memeriksa jumlah elemen `daftar`, jumlah entri `peta`, dan panjang karakter `teks`.
- **Operator Kesetaraan Koleksi (Deep Equality):**
  - Implementasi kesetaraan rekursif mendalam untuk operator `==` dan `!=` pada daftar dan peta.
- **Contoh Program Acuan:**
  - Berkas contoh acuan baru `contoh/06_struktur_data.nusantara`.
- **Dokumentasi Resmi Struktur Data:**
  - `docs/referensi/struktur-data.md`: Panduan referensi lengkap pengguna untuk sintaks resmi daftar dan peta.
  - `docs/pengembang/struktur-data.md`: Dokumentasi teknis arsitektur kompilator, representasi runtime, dan pengujian.
- **Rangkaian Pengujian Struktur Data (`pengujian/struktur_data/`):**
  - `pengujian/struktur_data/uji_struktur_data.ts`: Rangkaian 31 pengujian unit dan integrasi komprehensif (100% Lulus).
  - `pengujian/struktur_data/README.md`: Panduan pengujian struktur data.

#### Diubah:
- `src/tipe/kompatibilitas.ts`: Mengizinkan kompatibilitas nilai `APAPUN` ke tipe target dan operasi biner.
- `src/operator/evaluasi.ts`: Menambahkan algoritma perbandingan kesetaraan rekursif mendalam `apakahNilaiSama` untuk koleksi daftar dan peta.
- `src/interpreter/nilai.ts`: Memperbarui `formatNilaiTeks` untuk mengutip string di dalam koleksi.
- `src/interpreter/environment.ts`: Menambahkan metode `apakahTetap` untuk memvalidasi mutabilitas konstanta.
- `src/interpreter/interpreter.ts`: Menambahkan eksekusi `PENUGASAN_INDEKS`, evaluasi `LITERAL_DAFTAR`, `LITERAL_PETA`, `AKSES_INDEKS`, dan registrasi fungsi bawaan `panjang`.
- `package.json`: Menambahkan skrip `"test:struktur-data"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 5 berkas baru Phase 14 (total 154 berkas utuh).

---

## [v0.13.0] — 2026-10-03
### Phase 13: Sistem Fungsi & Prosedur NUSANTARA

Fase ini meresmikan arsitektur sistem fungsi, prosedur, parameter, nilai kembali (`kembalikan`), lingkup variabel lokal leksikal, pemanggilan antar-fungsi, dan rekursi yang terintegrasi penuh di seluruh saluran pipa bahasa NUSANTARA.

#### Ditambahkan:
- **Konstruksi Fungsi Resmi:**
  - `fungsi namaFungsi(param1 : tipe, param2 : tipe) : tipeHasil mulai ... selesai` untuk deklarasi fungsi dengan nilai kembali.
  - Prosedur (fungsi tanpa anotasi tipe kembali atau bertipe `kosong`) yang dapat berjalan tanpa instruksi kembalikan.
  - Fungsi tanpa parameter dengan pasangan kurung kosong `()`.
- **Parameter & Evaluasi Argumen:**
  - Penerimaan parameter jamak dipisahkan koma dengan tipe data terikat.
  - Validasi jumlah dan kecocokan tipe argumen terhadap parameter secara statis di Type System dan runtime Interpreter.
  - Deteksi dan pencegahan deklarasi parameter ganda (`DEKLARASI_GANDA`) pada fungsi yang sama.
  - Proteksi terhadap konflik nama dengan fungsi bawaan resmi (`tampilkan`).
- **Instruksi `kembalikan` & Nilai Kembali:**
  - Pengembalian nilai ekspresi yang diverifikasi kesesuaian tipenya terhadap tipe hasil fungsi.
  - Pengembalian nilai awal (*early return*) di dalam blok percabangan `jika` atau perulangan.
  - Penegakan keharusan pengembalian nilai bagi fungsi non-kosong (`KEMBALIAN_TIDAK_SESUAI`).
  - Penolakan instruksi `kembalikan` di luar tubuh fungsi (`KENDALI_DI_LUAR_KONTEKS`).
- **Isolasi Lingkup & Pemanggilan Antar-Fungsi:**
  - Parameter dan variabel lokal terisolasi dalam lingkungan fungsi dan dibersihkan setelah pemanggilan selesai (*no variable leaking*).
  - Dukungan pembayangan (*shadowing*) variabel luar tanpa memodifikasi lingkungan luar.
  - Pemanggilan fungsi di dalam argumen atau ekspresi aritmatika lain (*nested call expressions*).
  - Pemanggilan rekursif dengan *stack frame* mandiri.
  - Proteksi rekursi tak terbatas (*Stack Overflow Protection*) dengan batas kedalaman maksimal 500 tingkat pemanggilan (`BATAS_ITERASI_TERLAMPAUI`).
- **Dokumentasi Sistem Fungsi:**
  - `docs/referensi/fungsi.md`: Panduan referensi sintaksis resmi, parameter, pemanggilan, rekursi, dan contoh kode.
  - `docs/pengembang/fungsi.md`: Arsitektur kompilator fungsi, representasi AST, pemeriksaan tipe, dan eksekusi runtime.
- **Rangkaian Pengujian Sistem Fungsi (`pengujian/fungsi/`):**
  - `pengujian/fungsi/uji_fungsi.ts`: 28 skenario pengujian komprehensif (Parser, Type System, Interpreter, Scope, Rekursi, Integrasi Pipeline - 100% Lulus).
  - `pengujian/fungsi/README.md`: Panduan eksekusi dan verifikasi uji fungsi.

#### Diubah:
- `src/parser/parser.ts`: Memperkuat parser deklarasi fungsi di tingkat teratas, pencegahan trailing comma, dan pendeteksian blok fungsi tidak ditutup.
- `src/tipe/pemeriksaTipe.ts`: Penegakan keunikan fungsi, parameter unik, proteksi nama built-in `tampilkan`, pemeriksaan kembalian wajib, dan validasi pemanggilan fungsi.
- `src/interpreter/interpreter.ts`: Penambahan proteksi batas tumpukan rekursi (500 tumpukan) dan verifikasi tipe kembalian runtime.
- `package.json`: Menambahkan skrip `"test:fungsi"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 4 berkas baru Phase 13 (total 149 berkas utuh).

---

## [v0.12.0] — 2026-10-03
### Phase 12: Sistem Perulangan NUSANTARA

Fase ini meresmikan arsitektur sistem perulangan (*loops*) dan kendali aliran iterasi (`selama`, `untuk`, `dari`, `sampai`, `lakukan`, `hentikan`, `lanjutkan`, `akhir`) yang terintegrasi penuh di seluruh saluran pipa bahasa NUSANTARA.

#### Ditambahkan:
- **Konstruksi Perulangan Resmi:**
  - `selama kondisi lakukan ... akhir` untuk perulangan bersyarat (*conditional while loop*).
  - `untuk var dari awal sampai akhir lakukan ... akhir` untuk perulangan rentang berpenghitung (*counted range loop*) dengan batas akhir inklusif.
  - Perilaku rentang kosong (*empty range* saat `awal > akhir`) yang dilewati 0 kali secara aman tanpa galat.
- **Kendali Aliran Iterasi:**
  - `hentikan` (*break*): Menghentikan paksa perulangan terdekat dan melompat ke baris setelah kata kunci `akhir`.
  - `lanjutkan` (*continue*): Melompati sisa instruksi iterasi saat ini dan langsung menuju putaran berikutnya (tetap mengeksekusi increment variabel penghitung pada `untuk`).
  - Penolakan instruksi `hentikan` dan `lanjutkan` di luar blok perulangan secara statis di Type System dan runtime Interpreter (`KENDALI_DI_LUAR_KONTEKS`).
- **Dukungan Perulangan Bertingkat & Integrasi Percabangan:**
  - Iterasi multi-dimensi (baris dan kolom) dengan state loop terisolasi.
  - Penempatan percabangan `jika` di dalam perulangan dan perulangan di dalam cabang `jika` dengan batas `akhir` berpasangan presisi.
- **Perlindungan Loop Tak Terbatas (*Infinite Loop Protection*):**
  - Parameter konfigurasi `maksimalIterasiPerulangan` pada Interpreter.
  - Runtime melempar `JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI` saat perulangan melebihi ambang batas keamanan yang ditentukan.
- **Dokumentasi Sistem Perulangan:**
  - `docs/referensi/perulangan.md`: Referensi sintaksis lengkap, aturan inklusivitas, rentang kosong, kendali aliran, dan contoh program.
  - `docs/pengembang/perulangan.md`: Dokumentasi teknis saluran pipa, recursive descent parser, node AST, sistem tipe, dan sinyal runtime.
- **Rangkaian Pengujian Sistem Perulangan (`pengujian/perulangan/`):**
  - `pengujian/perulangan/uji_perulangan.ts`: 25 skenario pengujian unit, integrasi, AST, type checking, dan runtime infinite loop protection (100% Lulus).
  - `pengujian/perulangan/README.md`: Panduan eksekusi pengujian perulangan.

#### Diubah:
- `src/interpreter/galat.ts`: Menambahkan enum `JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI`.
- `src/interpreter/interpreter.ts`: Menambahkan opsi `maksimalIterasiPerulangan` dan penanganan rentang kosong pada `for`.
- `src/tipe/galatTipe.ts`: Menambahkan enum `JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS`.
- `src/tipe/pemeriksaTipe.ts`: Menambahkan pelacakan `kedalamanPerulangan` untuk validasi `hentikan`/`lanjutkan`, serta validasi kondisi dan batas rentang.
- `src/parser/parser.ts`: Memperkuat validasi sintaksis kondisi/rentang kosong, pencegahan kata kunci nyasar (`lakukan`, `dari`, `sampai`), dan blok tidak ditutup.
- `package.json`: Menambahkan skrip `"test:perulangan"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 4 berkas baru Phase 12 (total 145 berkas utuh).

---

## [v0.11.0] — 2026-10-03
### Phase 11: Percabangan Kondisional NUSANTARA

Fase ini menghadirkan kemampuan pengambilan keputusan (*conditional branching*) melalui pasangan leksikal resmi bahasa Indonesia `jika` ... `maka` ... `selain` ... `akhir` yang terintegrasi penuh di seluruh saluran pipa kompilasi dan interpretasi.

#### Ditambahkan:
- **Konstruksi Percabangan Resmi:**
  - `jika kondisi maka ... akhir` untuk percabangan satu arah.
  - `jika kondisi maka ... selain ... akhir` untuk percabangan dua arah.
  - Dukungan percabangan bertingkat (*nested branching*) di dalam blok `maka` maupun `selain` dengan pembatas penutup `akhir` yang berpasangan deterministik.
- **Validasi Ketat Sistem Tipe (Type System):**
  - Kondisi percabangan wajib menghasilkan tipe data `logika` (`benar` / `salah`).
  - Penolakan tipe `bilangan`, `teks`, dan `desimal` dengan pesan kesalahan tipe bahasa Indonesia presisi.
  - Deteksi dan pencegahan penggunaan variabel yang belum dideklarasikan pada ekspresi kondisi percabangan (`VARIABEL_BELUM_DIDEKLARASIKAN`).
- **Isolasi Lingkup & Mutasi Terkendali (Scoping):**
  - Deklarasi variabel baru di dalam blok percabangan terisolasi secara leksikal (*block scope*).
  - Penugasan ulang ke variabel luar berhasil memutasi nilai variabel lingkungan induk.
- **Diagnostik Sintaksis Parser Ramah Pengembang:**
  - Penolakan kondisi kosong sebelum kata kunci `maka`.
  - Penolakan blok percabangan yang tidak ditutup dengan `akhir` sebelum akhir dokumen atau penutup program `selesai`.
  - Penolakan kemunculan kata kunci `selain` atau `akhir` di luar konteks percabangan.
- **Dokumentasi Percabangan:**
  - `docs/referensi/percabangan.md`: Panduan referensi sintaks, tabel aturan tipe, contoh bersarang, dan katalog kesalahan umum.
  - `docs/pengembang/percabangan.md`: Dokumentasi teknis arsitektur saluran pipa, recursive descent parser, node AST, sistem tipe, dan interpreter.
- **Rangkaian Pengujian Percabangan (`pengujian/percabangan/`):**
  - `pengujian/percabangan/uji_percabangan.ts`: 24 skenario pengujian komprehensif (100% Lulus).
  - `pengujian/percabangan/README.md`: Panduan eksekusi pengujian percabangan.

#### Diubah:
- `src/tipe/galatTipe.ts`: Menambahkan enum `JenisGalatTipe.VARIABEL_BELUM_DIDEKLARASIKAN`.
- `src/tipe/pemeriksaTipe.ts`: Menambahkan validasi variabel dan penguatan validasi tipe kondisi `jika`.
- `src/parser/parser.ts`: Memperkuat penanganan kesalahan sintaksis kondisi kosong, pasangan penutup `akhir`, dan token nyasar.
- `package.json`: Menambahkan skrip `"test:percabangan"` ke dalam perintah pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 4 berkas baru Phase 11 (total 141 berkas utuh).

---

## [v0.10.0] — 2026-10-02
### Phase 10: Sistem Operator & Presedensi NUSANTARA

Fase ini menghadirkan arsitektur operator terpadu yang konsisten, aman, dan selaras di seluruh saluran pipa (*Lexer -> Parser -> AST -> Type System -> Interpreter*).

#### Ditambahkan:
- **Modul Sistem Operator Terpusat (`src/operator/`):**
  - `src/operator/jenisOperator.ts`: Taksonomi kategori operator, arah asosiativitas (*left-to-right* vs *right-to-left*), serta `TABEL_PRESEDENSI_OPERATOR` 8 tingkat resmi.
  - `src/operator/evaluasi.ts`: Mesin evaluasi dan pemancar (*dispatch*) terpusat untuk operator unari (`-`, `tidak`) dan biner (`+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `dan`, `atau`).
  - `src/operator/index.ts`: Ekspor terpadu sistem operator.
- **Evaluasi Hubung Singkat (*Short-circuit Evaluation*):**
  - `dan`: jika sisi kiri bernilai `salah`, sisi kanan dilewati dan tidak dievaluasi (mencegah efek samping / pemanggilan fungsi yang tidak perlu).
  - `atau`: jika sisi kiri bernilai `benar`, sisi kanan dilewati dan tidak dievaluasi.
- **Proteksi Runtime Terstruktur:**
  - Pembagian dengan nol (`x / 0`) dan modulo dengan nol (`x % 0`) menghasilkan `GalatRuntime.PEMBAGIAN_NOL` dengan informasi baris dan kolom yang presisi tanpa menyebabkan crash aplikasi.
- **Dokumentasi Sistem Operator:**
  - `docs/referensi/operator.md`: Tabel 8 tingkat presedensi resmi, aturan tipe data, semantik hubung singkat, dan contoh program lengkap.
  - `docs/pengembang/operator.md`: Dokumentasi teknis arsitektur saluran pipa operator, recursive descent parser, evaluasi short-circuit, dan integrasi sistem tipe.
- **Rangkaian Pengujian Sistem Operator (`pengujian/operator/`):**
  - `pengujian/operator/uji_operator.ts`: 21 pengujian mencakup aritmatika, perbandingan, logika, unari, presedensi, asosiativitas, tanda kurung, type checking operator, short-circuit, proteksi bagi/modulo nol, penolakan simbol ilegal, presisi lokasi galat, dan program integrasi penuh kasir toko.
  - `pengujian/operator/README.md`: Panduan eksekusi pengujian operator.

#### Diubah:
- `src/tipe/kompatibilitas.ts`: Menambahkan fungsi `tentukanTipeOperasiUnari` dan menyelaraskan pemetaan tipe operasi.
- `src/tipe/pemeriksaTipe.ts`: Menyempurnakan pesan diagnostik galat tipe pada operator logika dan unari dalam Bahasa Indonesia.
- `src/interpreter/interpreter.ts`: Mendelegasikan evaluasi operator ke modul `src/operator/evaluasi.ts` guna menghilangkan duplikasi kode (*zero logic duplication*).
- `package.json`: Menambahkan skrip `"test:operator"` ke dalam pengujian utama `"npm test"`.
- `skrip/periksa_fondasi.js`: Menambahkan audit 6 berkas baru Phase 10 (total 137 berkas utuh).

---

## [v0.9.0] — 2026-10-02
### Phase 9: Variabel & Sistem Tipe Data NUSANTARA

Fase ini memperkuat sistem variabel dan tipe data NUSANTARA, menghadirkan modul **Pemeriksa Tipe (Type Checker & Semantic Analyzer)** statis sebelum eksekusi, serta menegakkan validasi tipe yang ketat dan aman (*type-safe*).

#### Ditambahkan:
- **Modul Sistem Tipe & Type Checker (`src/tipe/`):**
  - `src/tipe/jenisTipe.ts`: Taksonomi nama tipe resmi (`NamaTipe`) mencakup `teks`, `bilangan`, `desimal`, `logika`, `karakter`, `kosong`, `fungsi`, serta persiapan tipe majemuk `daftar`, `peta`, `tanggal`, dan `waktu`.
  - `src/tipe/kompatibilitas.ts`: Aturan kesetaraan (*type equality*), kompatibilitas penugasan (*type compatibility*), dan pemetaan tipe operasi biner.
  - `src/tipe/galatTipe.ts`: Sistem pelaporan kesalahan tipe terstruktur (`GalatTipe`) dengan koordinat kode sumber dan perbandingan tipe diharapkan vs aktual.
  - `src/tipe/pemeriksaTipe.ts`: Mesin pemeriksa tipe statis yang memvalidasi AST sebelum eksekusi, mendeteksi deklarasi ganda, pelanggaran konstanta tetap, ketidakcocokan tipe inisialisasi/penugasan, tipe parameter fungsi, serta tipe kembalian fungsi.
  - `src/tipe/index.ts`: Ekspor terpadu modul sistem tipe.
- **Dokumentasi Pengembang Sistem Tipe:**
  - `docs/pengembang/type-system.md`: Panduan teknis arsitektur sistem tipe, matriks tipe, dan aturan kompatibilitas.
- **Rangkaian Pengujian Sistem Tipe (`pengujian/tipe/`):**
  - `pengujian/tipe/uji_tipe.ts`: 12 pengujian mencakup tipe primitif valid, penolakan ketidakcocokan tipe, validasi penugasan, proteksi tetap, deklarasi ganda, lingkup/shadowing, validasi parameter & kembalian fungsi, serta aturan tipe operator.
  - `pengujian/tipe/README.md`: Panduan eksekusi pengujian sistem tipe.
- **Skrip Perintah:**
  - Menambahkan skrip `"test:tipe"` dan menyatukannya ke dalam `"npm test"`.

#### Diubah:
- `src/interpreter/environment.ts`: Menyimpan informasi tipe data pada setiap simbol dan memvalidasi kompatibilitas tipe saat penugasan nilai baru.
- `src/interpreter/interpreter.ts`: Mengintegrasikan pemeriksaan tipe statis sebelum eksekusi program serta validasi tipe kembalian fungsi saat runtime.
- `docs/referensi/tipe-data.md`: Diperbarui dengan tabel matriks tipe data aktual dan aturan kompatibilitas.

---

## [v0.8.0] — 2026-10-02
### Phase 8: Implementasi Interpreter NUSANTARA
- Modul Interpreter inti (`src/interpreter/`) yang mampu mengeksekusi pohon AST secara nyata.
- 15 pengujian Interpreter lulus 100%.

---

## [v0.7.0] — 2026-10-02
### Phase 7: Implementasi Parser NUSANTARA
- Modul Parser dan AST inti (`src/parser/`) dengan recursive descent dan precedence climbing 8 tingkat.
- 11 pengujian Parser lulus 100%.

---

## [v0.6.0] — 2026-10-02
### Phase 6: Implementasi Lexer NUSANTARA
- Modul Lexer inti (`src/lexer/`) dengan pemindaian UTF-8, pelacakan baris/kolom, literal, dan TokenStream.
- 21 pengujian Lexer lulus 100%.

---

## [v0.5.0] — 2026-10-02
### Phase 5: Dokumentasi Awal NUSANTARA
- Pusat dokumentasi terstruktur `docs/` dengan 28 panduan baru.

---

## [v0.4.0] — 2026-10-02
### Phase 4: Spesifikasi Sintaks NUSANTARA
- Menetapkan tata bahasa formal EBNF lengkap (ISO/IEC 14977).

---

## [v0.3.0] — 2026-10-02
### Phase 3: Lisensi & Tata Kelola NUSANTARA
- Menetapkan Apache License 2.0 lengkap pada `LISENSI`.

---

## [v0.2.0] — 2026-10-02
### Phase 2: Konstitusi Bahasa NUSANTARA
- Menetapkan Piagam 10 Prinsip Konstitusi Bahasa dan tabel 32 kata kunci.

---

## [v0.1.0] — 2026-10-02
### Phase 1: Identitas & Fondasi NUSANTARA
- Rilis fondasi awal, penetapan nama NUSANTARA, ekstensi `.nusantara`, dan NIP-0001.
