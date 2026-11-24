# Visi dan Arsitektur Induk NUSANTARA OS

> Dokumen arah produk dan arsitektur. Dokumen ini menetapkan sasaran, bukan menyatakan seluruh kemampuan telah tersedia.

## 1. Identitas produk

**NUSANTARA OS** adalah sistem operasi mandiri yang dibangun dengan kernel sendiri, sistem inti sendiri, antarmuka pengguna berbahasa Indonesia, serta ekosistem aplikasi dan perangkat yang dikembangkan secara terbuka.

Bahasa pemrograman NUSANTARA tetap menjadi bahasa resmi untuk membangun perangkat lunak NUSANTARA, tetapi bahasa tersebut merupakan salah satu komponen dari produk yang lebih besar: sistem operasi.

### Tujuan utama

1. Kernel NUSANTARA tidak menjadikan Linux, Windows, atau XNU/macOS sebagai kernel induk.
2. Sistem dapat dikembangkan untuk komputer x86-64 dan perangkat ARM64.
3. Antarmuka, dokumentasi pengguna, pesan sistem, pengaturan, dan aplikasi resmi mengutamakan Bahasa Indonesia.
4. Aplikasi asli NUSANTARA memperoleh API stabil, SDK, paket aplikasi, dan model keamanan.
5. Aplikasi dari ekosistem lain dapat dijalankan melalui lapisan kompatibilitas yang dibangun dan diuji terpisah.
6. Komputer dan smartphone fisik dapat saling terhubung tanpa mengharuskan emulator perangkat.

## 2. Batasan istilah "mandiri"

Mandiri berarti kernel dan layanan inti NUSANTARA dikembangkan sebagai sistem operasi sendiri. Mandiri **tidak** berarti harus menulis ulang setiap protokol, standar, compiler, driver, atau pustaka dari nol. Standar terbuka dan komponen pihak ketiga yang lisensinya sesuai boleh digunakan setelah audit keamanan, lisensi, dan pemeliharaan.

Kernel tidak boleh diam-diam bergantung pada kernel Linux/BSD/Windows/macOS sebagai host. Lingkungan pengembangan dan alat pembangun boleh dijalankan pada sistem operasi lain, tetapi hasil boot NUSANTARA harus berjalan langsung pada perangkat keras atau mesin virtual untuk pengujian.

## 3. Arsitektur berlapis

```
Aplikasi NUSANTARA dan aplikasi kompatibel
                 |
SDK, GUI Toolkit, Runtime, Compatibility Services
                 |
Layanan OS: proses, berkas, jaringan, audio, grafis,
keamanan, akun, paket, pembaruan, perangkat
                 |
System Call ABI dan Kernel–Userland ABI
                 |
NUSANTARA KERNEL
                 |
HAL, firmware interface, driver, interrupt, DMA
                 |
x86-64 / ARM64 / perangkat keras yang didukung
```

### Komponen inti

- **Boot dan firmware:** UEFI/firmware, pemuat kernel, verifikasi image boot, dan pemulihan.
- **Kernel:** memori fisik/virtual, proses, thread, scheduler, interrupt, syscall, IPC, sinkronisasi, dan keamanan.
- **HAL dan driver:** abstraksi perangkat, enumerasi bus, penyimpanan, USB, input, tampilan, audio, jaringan, daya.
- **Layanan ruang pengguna:** init, pengelola layanan, sistem berkas, jaringan, akun, pencatatan, dan konfigurasi.
- **Grafis:** framebuffer, driver display, compositor, window manager, desktop shell, dan toolkit antarmuka.
- **Aplikasi:** terminal, pengelola berkas, pengaturan, peramban, aplikasi produktivitas, media, dan toko aplikasi.
- **Bahasa dan pengembang:** compiler, runtime, pustaka standar, SDK, debugger, dokumentasi, dan alat pembangun.
- **Kompatibilitas:** loader format biner, ABI, pustaka API, runtime dan layanan kompatibilitas untuk setiap ekosistem.

## 4. Strategi kernel

Fondasi yang sudah ada pada Phase 48–51 menjadi titik awal audit, bukan alasan untuk menganggap kernel siap produksi. Implementasi kernel saat ini harus diverifikasi terhadap source code, build freestanding, artefak ELF, boot QEMU, log serial, serta pengujian negatif.

Strategi awal adalah kernel modular dengan batas subsistem yang tegas. Keputusan monolitik modular atau pemisahan layanan dapat dievaluasi setelah kebutuhan driver, keamanan, dan kinerja terukur. Jangan mengunci desain hanya berdasarkan nama arsitektur.

## 5. Strategi multi-arsitektur dan multi-perangkat

- **Tahap awal:** x86-64 pada QEMU dan perangkat PC yang dokumentasi hardwarenya tersedia.
- **Tahap berikutnya:** ARM64 melalui papan pengembangan yang spesifik dan terdokumentasi.
- **Perangkat seluler:** memerlukan boot chain yang dapat dibuka, device tree/ACPI yang sesuai, driver SoC, layar, sentuh, penyimpanan, modem, Wi-Fi, kamera, audio, sensor, dan manajemen daya. Dukungan satu model ponsel tidak berarti semua ponsel didukung.
- **Antarmuka adaptif:** satu kerangka pengalaman pengguna dengan mode desktop, tablet, dan telepon; bukan janji bahwa satu image biner akan berjalan pada semua perangkat.

## 6. Strategi kompatibilitas aplikasi

Kompatibilitas bukan satu fitur tunggal. Setiap ekosistem memerlukan loader, ABI, API, pustaka, runtime, layanan, model keamanan, dan pengujian aplikasi nyata.

| Ekosistem | Jalur teknis | Catatan |
|---|---|---|
| Aplikasi asli NUSANTARA | format executable dan API resmi | Prioritas pertama dan jalur terbaik |
| Linux | ELF + ABI syscall/pustaka kompatibel | Tidak berarti menjalankan kernel Linux |
| Windows | PE/COFF + Win32/NT API yang diperlukan | Implementasi bertahap; aplikasi tertentu dapat gagal |
| Android | APK, DEX, ART, Bionic, Android Framework dan HAL bridge | Runtime langsung, bukan emulator perangkat; layanan dan API perlu dipenuhi |
| macOS | Mach-O, ABI Darwin, framework dan layanan terkait | Riset jangka panjang; batas lisensi dan komponen tertutup harus ditinjau |

**Tidak ada janji bahwa semua aplikasi akan berjalan.** Sasaran kompatibilitas ditentukan per aplikasi, versi API, arsitektur CPU, ketergantungan driver, DRM, anti-cheat, dan layanan daring. Setiap klaim kompatibilitas harus disertai daftar aplikasi dan hasil pengujian.

## 7. Integrasi smartphone fisik tanpa emulator

Dua kemampuan harus dibedakan:

1. **NUSANTARA mengelola smartphone Android eksternal:** koneksi USB/Wi-Fi, transfer berkas, notifikasi, clipboard, debugging, dan kendali jarak jauh dengan izin pengguna. Ini adalah integrasi perangkat, bukan menjalankan APK pada kernel NUSANTARA.
2. **NUSANTARA menjalankan aplikasi Android secara native pada perangkat NUSANTARA:** membutuhkan port runtime ART dan Android Framework compatibility services ke kernel/layanan NUSANTARA. Tidak menggunakan emulator Android, tetapi tetap memerlukan runtime kompatibilitas.

Dukungan kedua tidak dapat dijanjikan sebelum runtime, layanan, driver, dan aplikasi uji berhasil berjalan di perangkat target. Bootloader terkunci, firmware vendor, modem, GPU, dan driver tertutup menjadi hambatan nyata.

## 8. Bahasa Indonesia sebagai pengalaman utama

Target 100% Bahasa Indonesia berlaku pada antarmuka resmi dan pengalaman pengguna: menu, pengaturan, pesan kesalahan, dokumentasi, bantuan, aplikasi bawaan, installer, dan alat pengembang.

Nama standar, protokol, simbol ABI, instruksi CPU, format berkas, serta istilah interoperabilitas internasional dapat dipertahankan pada lapisan teknis. Setiap istilah teknis harus diberi penjelasan Bahasa Indonesia. Jangan menerjemahkan token protokol atau nama API standar sehingga merusak kompatibilitas.

## 9. Prinsip rekayasa

- Tidak mengklaim fitur selesai hanya karena dokumentasi, mock, atau simulator tersedia.
- Setiap Phase memiliki kriteria penerimaan, bukti build, pengujian positif dan negatif, serta batasan yang dinyatakan.
- Integrasi dilakukan setiap Phase; audit menyeluruh dilakukan per kelompok.
- Jangan menonaktifkan pengujian atau menurunkan strictness untuk membuat CI hijau.
- Jangan menghapus komponen lama sebelum dependensi dan penggantinya diverifikasi.
- Semua perubahan besar melalui branch dan Pull Request; jangan menggabungkan PR tanpa persetujuan pemilik.
- Uji QEMU tidak disamakan dengan uji perangkat keras fisik.
- Uji Android Emulator tidak disamakan dengan menjalankan APK langsung pada kernel NUSANTARA.

## 10. Definisi keberhasilan produk

NUSANTARA OS belum disebut siap rilis sampai minimal tersedia: boot yang dapat diulang, kernel dan layanan inti stabil, login/sesi, penyimpanan persisten, driver untuk perangkat target yang dinyatakan, antarmuka grafis, aplikasi bawaan, mekanisme instalasi/pembaruan/pemulihan, model keamanan, dokumentasi Bahasa Indonesia, serta hasil uji regresi dan perangkat nyata yang dapat direproduksi.

Kompatibilitas aplikasi lintas ekosistem dinilai terpisah melalui matriks aplikasi nyata. Rilis awal boleh memiliki daftar kompatibilitas terbatas yang jujur, lalu diperluas dari waktu ke waktu.
