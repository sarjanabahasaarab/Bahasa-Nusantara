# Antarmuka System Call (Syscall) Kernel Nusantara (Phase 48)

Panggilan sistem adalah mekanisme resmi bagi program ruang pengguna untuk meminta layanan berhak istimewa kepada kernel.

## 1. Mekanisme Dispatch
- Pada CPU x86_64, panggilan sistem dieksekusi melalui instruksi `SYSCALL`.
- Nomor syscall dimuat ke dalam register `RAX`.
- Argumen dimuat ke register: `RDI`, `RSI`, `RDX`, `R10`, `R8`, `R9`.
- Nilai status hasil panggilan dikembalikan pada register `RAX`.

## 2. Tabel System Call Resmi Fase 48
| No | Nama Syscall | Argumen | Return | Keterangan |
|---|---|---|---|---|
| 1 | `sys_process_exit` | `exit_code: int` | `void` | Menghentikan eksekusi proses saat ini |
| 2 | `sys_process_id` | `none` | `pid: uint64` | Mengambil ID proses yang memanggil |
| 3 | `sys_thread_yield` | `none` | `0` | Melepaskan sisa kuantum CPU secara sukarela |
| 4 | `sys_memory_allocate` | `size: uint64, align: uint64` | `ptr: uint64` | Mengalokasikan blok memori virtual |
| 5 | `sys_memory_release` | `ptr: uint64, size: uint64` | `0` | Membebaskan blok memori virtual |
| 6 | `sys_console_write` | `ptr: uint64, len: uint64` | `written: uint64` | Menulis teks ke konsol/serial kernel |
| 7 | `sys_clock_get` | `none` | `ticks: uint64` | Mengambil stempel waktu atau ticks saat ini |
| 8 | `sys_file_open` | `path: ptr, flags: uint64` | `fd: int` | Membuka berkas pada Virtual File System |
| 9 | `sys_file_read` | `fd: int, buf: ptr, count: uint64` | `read: uint64` | Membaca data dari deskriptor berkas |
| 10 | `sys_file_write` | `fd: int, buf: ptr, count: uint64` | `written: uint64` | Menulis data ke deskriptor berkas |
| 11 | `sys_file_close` | `fd: int` | `0` | Menutup deskriptor berkas |

## 3. Penanganan Kesalahan (Error Codes)
Nilai negatif menandakan kegagalan:
- `K_EPERM` (-1): Operasi tidak diizinkan.
- `K_ENOENT` (-2): Berkas atau entitas tidak ditemukan.
- `K_EBADF` (-9): Deskriptor berkas tidak sah.
- `K_ENOMEM` (-12): Kehabisan memori.
- `K_EFAULT` (-14): Alamat memori pointer buruk / tidak valid.
- `K_EINVAL` (-22): Argumen tidak valid.
