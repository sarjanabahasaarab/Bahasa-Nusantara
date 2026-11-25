# Phase 95 — GICv3 interrupt-controller foundation

## Tujuan
Membuat driver GICv3 awal untuk distributor, redistributor lokal, dan CPU interface EL1. Implementasi memakai callback MMIO/system-register agar dapat diuji host-side tanpa menyentuh perangkat keras.

## Fitur
- Distributor: validasi base 64 KiB, deteksi jumlah INTID dari GICD_TYPER, disable SPI awal, set SPI ke Group 1 Non-secure, prioritas default, dan enable affinity routing + Group 1 NS.
- Redistributor: bangunkan PE dengan membersihkan ProcessorSleep dan polling ChildrenAsleep yang dibatasi.
- CPU interface: urutan ICC_SRE_EL1, ISB, ICC_PMR_EL1, ICC_BPR1_EL1, ICC_IGRPEN1_EL1, ISB melalui callback platform.
- Enable PPI dan SPI, routing SPI ke affinity target, acknowledge IAR1 dan EOI token.
- Polling terbatas dan status error eksplisit; INTID spurious 1020–1023 tidak dikirim ke EOIR.

## Batasan integrasi
Alamat GICD/GICR wajib berasal dari firmware/platform memory map yang tepercaya dan dipetakan sebagai Device memory. Fase ini belum melakukan discovery GICR frame/stride dari GICR_TYPER, belum mengirim SGI, belum mengatur trigger/edge level konfigurasi, belum mendukung multiple redistributor/CPU, dan belum membuka DAIF IRQ mask. Platform wajib menyediakan callback system register yang benar untuk ICC_* EL1. Jangan mengaktifkan IRQ global sebelum vector table Phase 94 dan dispatcher IRQ yang nyata siap.

## Validasi
```sh
gcc -std=c11 -Wall -Wextra -Werror -pedantic -I src/runtime/os/arch/arm64 \
  src/runtime/os/arch/arm64/gicv3.c pengujian/os/uji_arm64_gicv3_fase95.c -o /tmp/uji-gicv3
/tmp/uji-gicv3
clang --target=aarch64-none-elf -std=c11 -ffreestanding -Wall -Wextra -Werror -c \
  src/runtime/os/arch/arm64/gicv3.c -o /tmp/gicv3-arm64.o
```
