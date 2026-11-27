# Phase 118 — ELF EL0 User Syscalls

## Tujuan

Membuktikan program ELF64 AArch64 yang dimuat oleh process bootstrap dapat
memakai ABI syscall pengguna yang sudah tersedia, bukan hanya memicu SVC
khusus untuk tes.

## Skenario QEMU

Payload ELF memiliki dua segmen:
- kode RX pada VA `0x400000`;
- data hanya-baca pada VA `0x401000`.

Program masuk ke EL0, memanggil `write` melalui `x8=1` dan `SVC #0`, lalu
memanggil `exit` melalui `x8=2`. Data hanya-baca divalidasi terhadap rentang
alamat pengguna yang diizinkan sebelum kernel membacanya.

Callback exit mengaktifkan kembali address space kernel, menghancurkan
address space proses, dan memverifikasi seluruh frame proses telah dilepaskan.

## Batasan

Ini pengujian syscall write/exit satu proses pada QEMU `virt` Cortex-A57.
Belum mencakup scheduler multi-proses, filesystem, fork/exec, sinyal,
dynamic linker, SMP/TLB shootdown, atau sertifikasi perangkat fisik.
