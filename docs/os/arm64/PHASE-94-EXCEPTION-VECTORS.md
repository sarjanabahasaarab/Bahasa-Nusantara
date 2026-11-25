# Phase 94 — ARM64 Exception Vector Table

## Tujuan
Menyediakan jalur masuk exception AArch64 pada EL1 yang memiliki layout tetap, menyimpan konteks register, dan menyerahkan diagnosis kepada dispatcher kernel.

## Implementasi
- Tabel 16 slot exception AArch64 pada `VBAR_EL1`, alignment 2 KiB, setiap slot 128 byte.
- Slot mencakup Current EL dengan SP0, Current EL dengan SPx, lower EL AArch64, dan lower EL AArch32; masing-masing synchronous, IRQ, FIQ, dan SError.
- Stub tiap slot mempertahankan x16/x17 sebelum memakai x16 untuk nomor vector.
- Frame 288 byte berisi x0–x30, ESR_EL1, FAR_EL1, ELR_EL1, SPSR_EL1, dan nomor vector.
- Dispatcher mengikuti AAPCS64 dengan pointer frame pada x0.
- Implementasi dispatcher default bersifat weak dan berhenti aman (WFE); kernel dapat menggantinya dengan dispatcher kuat.

## Integrasi dan batasan
Tabel dapat dipasang melalui `nusantara_arm64_install_exception_vectors()`. Fungsi ini hanya menulis `VBAR_EL1` saat dipanggil dari EL1, menjalankan `ISB`, dan mengembalikan 1; dari EL lain ia mengembalikan 0. **Prasyarat:** pemanggil sudah berada pada EL1 dengan stack 16-byte aligned yang valid, tabel dan dispatcher telah ikut ditautkan ke image kernel, dan interrupt masih dimask. Fungsi ini tidak mengatur stack atau membuka interrupt. Belum ada decoding ESR, panic logger, pemulihan page fault, atau penanganan interrupt GIC; itu masuk fase berikutnya. Jangan membuka mask IRQ/FIQ sebelum controller dan handler terkait siap.

Header C menetapkan ABI frame. Fungsi dispatcher tidak boleh mengembalikan kontrol untuk exception fatal; implementasi default mencegah return tanpa penanganan.

## Validasi
- `npm run lint`
- `npx tsx pengujian/os/uji_arm64_exception_vectors_fase94.ts`
- Cross-assemble dengan Clang target `aarch64-none-elf` dan verifikasi ELF machine AArch64.
