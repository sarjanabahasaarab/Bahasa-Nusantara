# Arsitektur Kernel NUSANTARA OS (Phase 48)

NUSANTARA OS Minimal Kernel Interface dirancang sebagai kernel monolitik modular berkinerja tinggi yang berjalan di atas arsitektur 64-bit (`x86_64`) dalam mode freestanding tanpa ketergantungan pada runtime C standar (`-ffreestanding -nostdlib`).

## 1. Prinsip Desain
- **Freestanding Mode**: Tidak bergantung pada libc atau lingkungan sistem operasi induk host.
- **Higher-Half Memory Architecture**: Ruang alamat virtual kernel ditempatkan pada rentang negatif 2 GiB (`0xFFFFFFFF80000000` s/d `0xFFFFFFFFFFFFFFFF`), sementara ruang bawah dialokasikan khusus untuk proses pengguna (userspace).
- **Spesifikasi Multiboot2**: Kompatibel dengan bootloader standar modern seperti GRUB2 dan Limine menggunakan boot header berkode magic `0xE85250D6`.
- **Modular Hardware Abstraction Layer (HAL)**: Mengisolasi instruksi privileged CPU (`cli`, `sti`, `inb`, `outb`, manipulasi register `CR0/CR3/CR4`) di balik antarmuka I/O yang aman dan teruji.

## 2. Diagram Lapisan Arsitektur
```
+-------------------------------------------------------------+
|                Aplikasi Pengguna (Userspace)                |
+-------------------------------------------------------------+
                              │
                    Syscall Interface (sys_*)
                              │
+-------------------------------------------------------------+
|                      NUSANTARA KERNEL                       |
|                                                             |
|  [ VFS & RamFS ]     [ Penjadwal Scheduler ]   [ Heap Mgr ] |
|  [ Proses & Thread ] [ System Call Table ]     [ Paging ]   |
|  [ Interrupt Table ] [ Driver Registry ]       [ Logger ]   |
+-------------------------------------------------------------+
                              │
              Hardware Abstraction Layer (HAL)
                              │
+-------------------------------------------------------------+
|                     Perangkat Keras / QEMU                  |
|    CPU (x86_64), PIT 8254, PIC 8259, COM1 UART, VGA Text    |
+-------------------------------------------------------------+
```

## 3. Komponen Utama
1. **Kernel Core**: Inisialisasi awal, manajemen transisi keadaan (`UNINITIALIZED -> BOOTING -> RUNNING -> HALTED`), dan penanganan kondisi panik (`KernelPanic`).
2. **Kernel ABI**: Definisi register context 64-bit, batas pointer memori user/kernel, perataan stack 16-byte, dan konvensi pemanggilan System V x86-64.
3. **Syscall Dispatcher**: Penerjemah instruksi `syscall` dengan verifikasi pointer alamat memory untuk mencegah pelanggaran akses memory (`EFAULT`).
4. **Memory Management Subsystem**: PMM (bitmap frame allocator), VMM (4-level paging PML4), dan Kernel Heap (free-list recycling dengan pencegahan double-free).
5. **Scheduler & Multitasking**: Penjadwal preemptive berbasis kuantum waktu dan prioritas bertingkat 1..5.
