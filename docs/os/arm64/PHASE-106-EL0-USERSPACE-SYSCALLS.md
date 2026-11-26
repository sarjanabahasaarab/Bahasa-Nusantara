# Phase 106 — EL0 Userspace dan System Call

Status: implementasi awal; validasi host dan cross-assembly melalui CI.

## Cakupan

- Menyediakan entry AArch64 EL1 → EL0t melalui `ERET`.
- Mengatur `SP_EL0`, `ELR_EL1`, dan `SPSR_EL1`; stack pengguna wajib non-null dan 16-byte aligned.
- Menetapkan ABI syscall AArch64: nomor layanan di `x8`, argumen di `x0-x2`, hasil di `x0`.
- Menangani SVC dari lower-EL AArch64 pada vector slot 8, hanya untuk EC `0x15` dan immediate `0`.
- Menyediakan syscall awal WRITE (1), EXIT (2), dan YIELD (3).
- WRITE wajib melewati callback validasi rentang alamat pengguna sebelum callback penulisan dipanggil.

## Batasan yang disengaja

Ini adalah fondasi EL0 dan SVC, bukan userspace lengkap. Pemanggil wajib menyediakan entry dan stack yang sudah dipetakan serta permission MMU yang benar. Modul syscall memasang satu exception handler global; karena itu integrasi dengan handler IRQ scheduler Phase 104 belum digabungkan. Belum ada pemetaan halaman per proses, isolasi address-space, salinan buffer aman, ELF loader, libc, atau proses EL0 yang dipreempt oleh timer. SP_EL0 tetap berada pada register arsitektural dan tidak disimpan dalam frame Phase 103/104; jangan melakukan context switch antar-proses EL0 sebelum dukungan penyimpanan SP_EL0 dan address-space ditambahkan.

## Pengujian

Pengujian host mencakup WRITE valid/ditolak, EXIT, YIELD, syscall tidak dikenal, dan penolakan vector selain SVC. CI juga meng-cross-assemble entry EL0 untuk AArch64. Keberhasilan pengujian host/assembly tidak dianggap sebagai bukti boot EL0 di QEMU atau perangkat fisik.
