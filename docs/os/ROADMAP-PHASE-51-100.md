# Peta Jalan Produk NUSANTARA OS — Phase 51–100

> Status dokumen: **arah kerja yang disetujui untuk pengembangan berikutnya**. Nama fase dan urutan dapat disesuaikan berdasarkan audit dependensi, tetapi tidak boleh mengubah status implementasi tanpa bukti.

## Aturan pelaksanaan

- Phase 1–50 adalah fondasi historis yang harus diaudit ulang; jangan menganggap seluruhnya tersertifikasi hanya karena tabel lama menyebut selesai.
- Phase 51 (Kernel–Userland ABI) sudah digabung melalui PR #68. Phase 23 build pipeline dipulihkan melalui PR #69. Keduanya tetap harus melewati gerbang regresi repositori saat ini.
- Jangan memulai fitur lanjutan yang bergantung pada ABI/syscall sebelum jalur assembly entry/return, MSR, context preservation, dan uji QEMU aktual dibuktikan.
- Setiap fase harus menghasilkan kode, uji otomatis, bukti CI, dan dokumentasi. Jika hanya rancangan, beri status RENCANA.
- Satu kelompok fase harus dapat di-boot atau didemokan sebelum kelompok berikutnya diperluas.

## Kelompok 1 — Menstabilkan kernel dan ABI (Phase 51–60)

| Phase | Target hasil |
|---:|---|
| 51 | Kernel–Userland ABI v1: kontrak ABI, syscall manifest, validasi argumen, versi ABI. Implementasi helper yang sudah ada harus disambungkan ke jalur CPU nyata. |
| 52 | Generalisasi jalur syscall x86-64 yang sudah terbukti pada bootstrap: stub ABI reusable, penyimpanan state per-thread/per-CPU, validasi privilege transition, dispatcher syscall bersama dan copyin/copyout berbasis page table. |
| 53 | Init process dan urutan boot layanan: kernel memulai proses pertama, kegagalan init ditangani secara aman. |
| 54 | Interrupt controller dan timer yang dapat dipilih: PIC/APIC, timer, interrupt routing, pengujian interrupt nyata pada QEMU. |
| 55 | Context switch dan scheduler: pergantian proses/thread nyata, preemption terukur, uji starvation dan fault. |
| 56 | IPC dan sinkronisasi kernel: kanal pesan, mutex/semaphore/event, batas hak akses dan uji deadlock. |
| 57 | Manajemen memori fisik: peta memori firmware, allocator frame, reservasi wilayah kernel/perangkat. |
| 58 | Memori virtual dan isolasi: page permission, guard page, copyin/copyout aman, ASLR bila siap. |
| 59 | Kernel allocator dan diagnostik: heap, deteksi korupsi, stack guard, dump panic dan jejak serial. |
| 60 | Gerbang kernel minimum: boot berulang, proses pengguna, syscall, timer, IPC, memori, dan laporan regresi terintegrasi. |

**Hasil demo kelompok:** NUSANTARA boot pada QEMU, memulai init, menjalankan setidaknya satu proses pengguna, melayani syscall melalui jalur CPU, dan mengisolasi fault proses tanpa menjatuhkan kernel.

## Kelompok 2 — Firmware, perangkat dan penyimpanan (Phase 61–70)

| Phase | Target hasil |
|---:|---|
| 61 | Boot firmware dan konfigurasi perangkat: UEFI memory map, ACPI dasar, tabel perangkat dan validasi input firmware. |
| 62 | Bus dan enumerasi perangkat: PCI/PCIe, identitas vendor/device, resource mapping yang aman. |
| 63 | Kerangka driver dan DMA: lifecycle driver, interrupt, DMA mapping, IOMMU jika perangkat mendukung. |
| 64 | Penyimpanan blok: driver awal untuk perangkat virtual QEMU, antrean I/O, timeout dan error recovery. |
| 65 | Partisi dan sistem berkas persisten: GPT dan implementasi sistem berkas awal dengan pemeriksaan integritas. |
| 66 | USB host dan perangkat input: xHCI bertahap, keyboard dan mouse USB pada target yang didukung. |
| 67 | Input perangkat dan HID: keyboard, pointer, touch abstraction, tata letak papan ketik Indonesia. |
| 68 | Jaringan lapisan dasar: Ethernet, buffer paket, perangkat jaringan virtual, pengujian kehilangan paket. |
| 69 | Protokol jaringan: IPv4/IPv6 bertahap, ARP/NDP, UDP/TCP, DHCP dan DNS dengan pengujian interoperabilitas. |
| 70 | Gerbang perangkat dan penyimpanan: boot dari image, baca/tulis persisten, input fisik/virtual, dan jaringan dasar. |

**Hasil demo kelompok:** sistem dapat membaca/menulis penyimpanan persisten, menerima input, serta berkomunikasi melalui jaringan pada perangkat yang tercantum di matriks dukungan.

## Kelompok 3 — Grafis dan pengalaman desktop (Phase 71–80)

| Phase | Target hasil |
|---:|---|
| 71 | Mode grafis framebuffer melalui firmware/driver yang didukung, mode teks pemulihan tetap tersedia. |
| 72 | Driver tampilan awal dan pengelolaan buffer layar; jangan mengklaim akselerasi GPU sebelum ada driver nyata. |
| 73 | Sistem jendela dan compositor: permukaan, clipping, damage tracking, input routing. |
| 74 | Window manager: jendela, fokus, pemindahan, pengubahan ukuran, workspace. |
| 75 | Desktop shell: panel, menu aplikasi, notifikasi, task switcher dan sesi pengguna. |
| 76 | Toolkit GUI asli: tombol, teks, daftar, formulir, tata letak, aksesibilitas dan tema. |
| 77 | Font, teks dan lokalisasi: Unicode, font fallback, IME, format tanggal/angka Indonesia. |
| 78 | Audio framework: perangkat audio target, mixer, layanan audio dan uji latensi dasar. |
| 79 | Pengelola daya: shutdown/reboot, idle, baterai dan suspend/resume sesuai dukungan firmware. |
| 80 | Gerbang Desktop Alpha: boot ke desktop grafis, login/sesi sederhana, input, audio dasar dan pemulihan. |

**Hasil demo kelompok:** pengguna dapat boot ke lingkungan grafis NUSANTARA dan berinteraksi dengan jendela serta aplikasi asli.

## Kelompok 4 — Layanan sistem dan aplikasi inti (Phase 81–90)

| Phase | Target hasil |
|---:|---|
| 81 | Sistem akun, identitas pengguna, grup, izin dan pengelolaan sesi. |
| 82 | Sistem layanan/init manager, konfigurasi layanan, dependensi dan pencatatan log. |
| 83 | NUSANTARA Shell dan terminal: perintah Bahasa Indonesia, pipeline, pekerjaan, skrip dan hak akses. |
| 84 | Pengelola berkas: direktori, salin/pindah, pencarian, metadata dan operasi aman. |
| 85 | Pengaturan sistem: tampilan, input, jaringan, suara, daya, akun dan bahasa. |
| 86 | Pengelola paket: format paket bertanda tangan, dependensi, repositori dan rollback. |
| 87 | Model keamanan aplikasi: sandbox, capability permissions, isolasi proses, audit dan kebijakan. |
| 88 | Runtime dan API aplikasi asli NUSANTARA: ABI stabil, pustaka sistem, layanan GUI dan contoh aplikasi. |
| 89 | Aplikasi produktivitas awal: editor teks, penampil dokumen/gambar, kalkulator dan pengarsip. |
| 90 | Gerbang OS Preview: installer, akun, desktop, shell, berkas, pengaturan, paket dan aplikasi inti. |

**Hasil demo kelompok:** NUSANTARA OS dapat dipakai untuk tugas desktop dasar tanpa sistem operasi induk.

## Kelompok 5 — Multi-arsitektur, integrasi perangkat dan kesiapan rilis awal (Phase 91–100)

| Phase | Target hasil |
|---:|---|
| 91 | Kerangka port ARM64: toolchain, ABI, boot protocol dan target QEMU ARM64. |
| 92 | Boot kernel ARM64 dan serial console pada target virtual yang didukung. |
| 93 | HAL lintas arsitektur: pemisahan kode CPU x86-64/ARM64 dari subsistem generik. |
| 94 | Antarmuka adaptif desktop/tablet/telepon; tata letak responsif dan navigasi sentuh. |
| 95 | Integrasi smartphone fisik melalui USB/Wi-Fi: transfer berkas, notifikasi dan kontrol berizin; bukan emulator. |
| 96 | Driver/perangkat seluler awal pada satu papan atau perangkat ARM64 yang terdokumentasi dan dapat diuji. |
| 97 | Instalasi, pemulihan dan pembaruan sistem bertanda tangan dengan rollback aman. |
| 98 | Hardening keamanan: threat model, secure boot design, fuzzing parser/protokol, audit privilege dan respons kerentanan. |
| 99 | Matriks perangkat keras: daftar model/konfigurasi yang benar-benar boot, driver yang bekerja, dan fitur yang belum didukung. |
| 100 | NUSANTARA OS Developer Preview: image bootable, SDK awal, dokumentasi Bahasa Indonesia, laporan uji, daftar keterbatasan dan proses kontribusi. |

**Hasil demo kelompok:** Developer Preview yang dapat diunduh dan diuji pada target x86-64, dengan port ARM64 yang dibuktikan pada target yang dinyatakan. Dukungan telepon fisik dibatasi pada perangkat yang benar-benar sudah diport.

## Phase 101–150: peta arah setelah Developer Preview

Fase 101–150 tidak boleh dimulai sebagai janji kompatibilitas tanpa dasar. Setelah Phase 100, rencana tingkat tinggi adalah:

- **101–115 — Kompatibilitas Linux:** ELF, syscall ABI yang diperlukan, pustaka dan aplikasi prioritas, pengujian aplikasi nyata.
- **116–130 — Kompatibilitas Windows:** PE/COFF, loader, Win32 API prioritas, layanan kompatibilitas, aplikasi nyata dan batasan DRM/anti-cheat.
- **131–140 — Runtime Android native:** DEX/APK, ART, Bionic, Android Framework services, HAL bridge, aplikasi uji pada perangkat target tanpa emulator.
- **141–145 — Integrasi dan port perangkat seluler:** boot chain, driver SoC, GPU, modem, kamera, sensor dan daya pada model yang dapat didukung.
- **146–150 — Riset kompatibilitas macOS dan kesiapan produksi:** analisis Mach-O/Darwin/framework, kajian lisensi, audit keamanan, kinerja, sertifikasi, dokumentasi dan rilis stabil bertahap.

Urutan dan cakupan Phase 101–150 akan disusun ulang setelah hasil Developer Preview dan riset lisensi/teknis tersedia. Kompatibilitas macOS merupakan sasaran riset jangka panjang, bukan janji bahwa seluruh aplikasi macOS akan dapat dijalankan.

## Gerbang penerimaan wajib untuk setiap Phase

1. Kode produksi ada pada jalur yang benar dan tidak hanya berupa mock.
2. Typecheck, build, dan seluruh suite terkait lulus.
3. Pengujian negatif mencakup input rusak, kegagalan perangkat, privilege boundary, dan pemulihan.
4. Uji integrasi dilakukan pada QEMU atau target perangkat yang sesuai.
5. Log, artefak, versi toolchain, dan checksum tersedia.
6. Dokumentasi menyatakan apa yang sudah dan belum didukung.
7. Tidak ada penghapusan pengujian, pelemahan pemeriksaan tipe, atau klaim perangkat fisik tanpa bukti.

## Perintah kerja berkelanjutan

Instruksi "Lanjutkan dan kerjakan" berarti: periksa status GitHub terkini, lanjutkan tugas terdekat yang belum selesai menurut dependensi dan gerbang, lakukan perubahan pada branch khusus, jalankan pengujian yang tersedia, perbaiki kegagalan yang terbukti, dan laporkan commit/PR serta bukti. Jangan membuat Phase baru jika penghambat fondasi yang lebih awal masih terbuka. Jangan merge PR tanpa persetujuan eksplisit pemilik proyek.
