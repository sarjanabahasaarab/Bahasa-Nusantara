# Phase 93 — ARM64 MMU dan translation-table foundation

## Tujuan

Menyediakan model deterministik untuk membangun tabel translasi stage-1 AArch64 dengan granule 4 KiB dan rentang virtual TTBR0 48-bit. Fase ini menyiapkan fondasi sebelum MMU diaktifkan oleh kode kernel.

## Implementasi

- Empat level tabel dengan indeks VA pada bit shift 39, 30, 21, dan 12.
- 512 entri per tabel, setiap tabel menempati satu halaman 4 KiB.
- Encoder descriptor tabel dan page descriptor level 3.
- Access Flag, AP permissions EL1/EL0, shareability, AttrIndx, PXN, dan UXN.
- Slot MAIR awal untuk Device-nGnRnE dan Normal-WriteBack.
- Builder sparse page-table plan dengan allocator callback, pemeriksaan alignment, rentang alamat, duplikasi VA, dan alamat tabel yang berulang.
- Contoh kebijakan pemetaan kernel RAM sebagai Normal-WB dan PL011 sebagai Device-nGnRnE diuji.

## Batasan keselamatan

Implementasi ini adalah **model dan builder descriptor**, bukan aktivasi MMU. Belum ada allocator halaman fisik yang mengembalikan tabel siap pakai, penulisan descriptor ke RAM, konfigurasi TCR_EL1/TTBR0_EL1/MAIR_EL1, clean data cache, invalidasi TLB, atau pengaturan SCTLR_EL1.M. Kernel tidak boleh mengaktifkan MMU hanya dengan memanggil builder ini.

Hanya rentang TTBR0 bawah 48-bit dan pemetaan halaman 4 KiB yang didukung. Block mapping, TTBR1 high-half, ASID, user/kernel address-space isolation, dan SMP shootdown ditunda ke fase berikutnya.

## Validasi

Jalankan:

```sh
npm run lint
npx tsx pengujian/os/uji_arm64_mmu_fase93.ts
```

Tes memeriksa encoding descriptor, permission bits, MAIR slots, alignment, rentang alamat, konflik pemetaan, dan struktur sparse table.
