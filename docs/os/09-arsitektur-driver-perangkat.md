# Arsitektur Driver Perangkat (Driver Model)

Driver dalam Kernel Nusantara dikelola melalui siklus hidup terpadu dan registri sentral (`DriverRegistry`).

## 1. Siklus Hidup Driver (Lifecycle)
Setiap driver mengimplementasikan siklus tahapan:
1. `UNINITIALIZED`: Driver terdaftar dalam sistem tetapi perangkat keras belum diinisialisasi.
2. `INITIALIZED`: Driver telah mengonfigurasi port I/O atau register MMIO awal.
3. `RUNNING`: Driver aktif memproses operasi baca/tulis dan merespons interupsi IRQ.
4. `SUSPENDED`: Driver diistirahatkan sementara (mode hemat energi atau transisi sistem).
5. `FAILED`: Driver mengalami galat perangkat keras dan terisolasi dari sistem utama.

## 2. DriverRegistry
- Menyimpan daftar driver berdasarkan nama unik dan kategori tipe perangkat (`CHAR`, `BLOCK`, `TIMER`, `DISPLAY`, `INPUT`).
- Mendukung metode `initAll()` untuk inisialisasi berurutan berdasarkan tingkat dependensi.
- Menyediakan metode `shutdownAll()` untuk mematikan perangkat keras secara aman saat kernel melakukan reboot atau halt.
