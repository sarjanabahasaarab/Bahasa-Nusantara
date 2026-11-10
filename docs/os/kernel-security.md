# Keamanan Arsitektur Kernel NUSANTARA OS

## 1. Isolasi Batas Memori Pengguna & Kernel
NUSANTARA OS menegakkan isolasi batas memori mutlak:
- **Ruang Pengguna (User Space)**: `0x0000_0000_0000_0000` s.d. `0x0000_7FFF_FFFF_FFFF`.
- **Ruang Kernel (Higher-Half Kernel Space)**: `0xFFFF_8000_0000_0000` s.d. `0xFFFF_FFFF_FFFF_FFFF`.

Fungsi `KernelABI.isUserPointer(ptr)` dan `KernelABI.isKernelPointer(ptr)` memeriksa integritas setiap pointer sebelum dereferensi.

## 2. Validasi System Call & Proteksi EFAULT
Pada `SyscallDispatcher`:
- Semua pointer argumen yang diteruskan oleh proses pengguna ke system call (seperti `SYS_CONSOLE_WRITE`, `SYS_FILE_READ`, `SYS_FILE_WRITE`) divalidasi.
- Jika pengguna mencoba meneruskan pointer yang berada di ruang memori kernel (`ptr >= 0xFFFF_8000_0000_0000n`) atau pointer tidak sah (alignment violation / null), dispatcher langsung menggagalkan syscall dan mengembalikan status `-14` (`-EFAULT`).

## 3. Mitigasi Eksploitasi Bare-Metal
- **No-Execute (NX bit)** pada halaman data dan stack untuk mencegah eksekusi shellcode.
- **Supervisor-only bit** pada semua tabel halaman kernel sehingga kode ring 3 pengguna ditolak oleh MMU jika mencoba mengakses struktur internal OS.
- **Perataan Stack 16-Byte** memenuhi standar System V AMD64 ABI untuk instruksi vektor SSE/AVX.
