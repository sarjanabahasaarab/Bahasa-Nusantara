# Phase 91 — Fondasi Port ARM64 NUSANTARA OS

## Sasaran

Membuka jalur arsitektur AArch64 tanpa mengubah atau mengklaim bahwa kernel x86-64 telah menjadi kernel ARM64. Phase ini menetapkan kontrak boot, ABI fungsi, toolchain freestanding, dan target mesin QEMU untuk implementasi boot pada Phase 92.

## Target awal

- Arsitektur: AArch64 little-endian, ELF machine `EM_AARCH64 = 183`.
- Target toolchain: `aarch64-none-elf`, CPU baseline `cortex-a57`.
- QEMU: `qemu-system-aarch64 -machine virt,gic-version=3 -cpu cortex-a57 -m 256M`.
- Konsol perangkat: PL011 UART pada alamat fisik `0x09000000`.
- GICv3: distributor `0x08000000`, redistributor `0x080A0000`.
- Ukuran halaman dasar 4 KiB; alignment SP AAPCS64 16 byte.

## Kontrak entry boot

Mengikuti konvensi entry AArch64 Image yang dipakai QEMU direct boot:

1. PC menunjuk entry image yang sejajar 4 byte.
2. X0 menunjuk alamat fisik Device Tree Blob (DTB), sejajar 8 byte.
3. X1, X2, dan X3 bernilai nol.
4. Entry berjalan pada Non-secure EL1 atau EL2.
5. MMU dan data cache nonaktif saat entry.
6. Interrupt dimask dan eksekusi little-endian.
7. Kernel wajib menyiapkan stack dan menginisialisasi translation tables/cache sebelum mengaktifkan MMU.

Kontrak ini tidak berarti kernel memakai Linux. Format Image dan register handoff dipilih sebagai konvensi boot firmware/QEMU yang terdokumentasi agar port awal interoperabel.

## ABI internal

Mengikuti AAPCS64:
- Argumen pertama sampai kedelapan di X0–X7.
- Nilai balik di X0/X1; hasil tidak langsung melalui X8.
- X19–X29 callee-saved; X0–X17 dan X30 caller-saved sesuai aturan AAPCS64.
- X18 diperlakukan sebagai platform register dan tidak dipakai sembarangan.
- SP harus sejajar 16 byte pada batas pemanggilan; stack tumbuh ke alamat lebih rendah.

## Toolchain

`clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding`, `ld.lld -m aarch64elf -nostdlib`, `llvm-objcopy`, `llvm-readelf`, dan `qemu-system-aarch64`.

File `boot-smoke.S` hanya membuktikan assembler dapat menghasilkan objek AArch64. Itu bukan kernel bootable, bukan Image header, dan tidak boleh dilaporkan sebagai boot QEMU.

## Batas Phase 91

Belum ada entry kernel ARM64, Image header final, transisi EL2→EL1, setup stack, MMU/page tables, exception vectors, serial driver, atau boot sentinel. Semua itu menjadi kriteria Phase 92 dan harus dibuktikan dengan boot QEMU nyata. Tidak ada klaim dukungan perangkat ARM fisik pada fase ini.
