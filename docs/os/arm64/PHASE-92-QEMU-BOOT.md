# Phase 92 — Boot ARM64 awal melalui QEMU virt

## Sasaran

Phase ini menghasilkan AArch64 Image minimal yang dapat dimuat oleh QEMU `virt` dan membuktikan eksekusi kernel melalui keluaran serial PL011. Implementasi ini berdiri di atas kontrak ABI dan toolchain Phase 91.

## Isi implementasi

- Header Image AArch64 64-byte dengan magic `0x644d5241` pada offset byte 56.
- Entry code pada offset `0x800`, dengan text offset `0x80000`.
- Handoff EL2 ke EL1h dengan `HCR_EL2.RW`, `SPSR_EL2`, `ELR_EL2`, dan `ERET`.
- Stack kernel 16 KiB, sejajar 16 byte.
- Pemeriksaan pointer DTB pada X0: tidak nol dan sejajar 8 byte.
- Inisialisasi PL011 QEMU virt di `0x09000000`: divisor 115200, 8N1, UART dan TX enable.
- Builder freestanding memakai clang, LLD, dan llvm-objcopy.
- Workflow harus membangun Image dan menjalankannya pada `qemu-system-aarch64` sampai sentinel serial `NUSANTARA_ARM64_BOOT_OK` terlihat.

## Validasi

Kompilasi silang lokal dilakukan dengan clang target `aarch64-none-elf`, link `aarch64elf`, dan pemeriksaan header ELF/Image. Bukti boot runtime yang otoritatif tetap berasal dari workflow QEMU CI; tanpa sentinel serial, fase ini belum boleh dinyatakan berhasil.

## Batasan

Phase 92 belum mengimplementasikan translation tables/MMU, exception vectors, interrupt handling GICv3, timer, SMP, allocator fisik ARM64, scheduler, userspace, atau dukungan perangkat ARM fisik. Fitur tersebut harus masuk fase terpisah dengan pengujian yang sesuai.
