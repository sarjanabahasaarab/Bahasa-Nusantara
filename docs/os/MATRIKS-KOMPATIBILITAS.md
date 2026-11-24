# Matriks Kompatibilitas Aplikasi NUSANTARA OS

Dokumen ini mencegah istilah "kompatibel" digunakan tanpa definisi dan bukti.

## Tingkat kompatibilitas

| Tingkat | Makna |
|---|---|
| K0 — Belum dimulai | Belum ada loader/runtime yang dapat diuji. |
| K1 — Format dikenali | Header/manifest dapat dibaca dan ditolak dengan aman jika rusak. |
| K2 — Loader berjalan | Program dapat dimuat pada arsitektur target, belum tentu API-nya lengkap. |
| K3 — API dasar | Sejumlah API dan syscall prioritas berfungsi. |
| K4 — Aplikasi terpilih | Aplikasi nyata dari daftar uji berjalan dengan fitur yang dinyatakan. |
| K5 — Profil luas | Kumpulan aplikasi/versi yang dipublikasikan lulus uji regresi berulang. |

Tingkat ini berlaku per arsitektur, versi aplikasi, versi API, dan perangkat. Tidak ada satu angka kompatibilitas universal.

## Kolom wajib setiap laporan

- Nama aplikasi dan penerbit.
- Versi aplikasi dan hash artefak.
- Format biner dan arsitektur CPU.
- API, pustaka, runtime, layanan dan driver yang diperlukan.
- Versi NUSANTARA OS dan commit kernel.
- Perangkat/mesin virtual dan firmware.
- Langkah pengujian dan fitur yang dicoba.
- Status: PASS, PARTIAL, FAIL, BLOCKED atau NOT_TESTED.
- Log, screenshot/video bila relevan, dan bug yang diketahui.
- Batasan keamanan, DRM, anti-cheat, akun, dan layanan daring.

## Strategi tiap ekosistem

### Aplikasi asli NUSANTARA
Jalur utama. Gunakan format executable, ABI, SDK, API GUI, paket bertanda tangan, dan dokumentasi resmi yang dikendalikan proyek.

### Linux
Implementasikan ELF loader dan ABI yang dibutuhkan aplikasi prioritas. Kompatibilitas syscall dan pustaka harus dibatasi pada daftar yang didukung. Jangan menjalankan atau mengandalkan kernel Linux sebagai kernel NUSANTARA.

### Windows
Mulai dari PE/COFF loader, pemetaan memori, thread, exception, file, registry compatibility layer, dan subset Win32 yang ditentukan. Aplikasi yang memerlukan driver kernel Windows, DRM, anti-cheat, atau layanan proprietary mungkin tidak dapat dijalankan.

### Android
Jalur native memerlukan APK/DEX, ART, Bionic, Android Framework API, Binder-compatible service model, permission model, graphics/input/audio bridge, dan HAL integration. Menjalankan APK tanpa emulator tetap memerlukan runtime Android; itu bukan berarti aplikasi dapat berjalan tanpa lapisan kompatibilitas. Dukungan harus dibuktikan pada perangkat/arsitektur yang dinyatakan.

### macOS
Mach-O saja tidak cukup. Diperlukan ABI Darwin, framework, runtime, layanan dan perilaku sistem terkait. Komponen proprietary, tanda tangan aplikasi, entitlement, DRM, dan ketentuan lisensi menjadi penghambat. Lakukan kajian hukum dan teknis sebelum menjanjikan dukungan.

## Integrasi smartphone Android eksternal

Koneksi USB/Wi-Fi untuk transfer berkas, notifikasi, debugging, clipboard, dan kendali jarak jauh merupakan fitur integrasi perangkat. Catat sebagai fitur terpisah dari menjalankan aplikasi Android secara native pada NUSANTARA OS.

## Kebijakan klaim

Gunakan kalimat "direncanakan" untuk desain, "prototipe" untuk implementasi awal, "teruji pada QEMU" untuk bukti mesin virtual, dan "teruji pada perangkat [model]" untuk bukti perangkat fisik. Jangan gunakan "mendukung semua aplikasi" tanpa matriks aplikasi dan pengujian yang dapat direproduksi.
