# Phase 116 — ARM64 ELF Process Bootstrap

## Tujuan

Menyatukan loader ELF64 statis Phase 114 dengan stack EL0 dan exception frame
awal Phase 115 menjadi satu operasi bootstrap proses yang transaksional.

## Perilaku

- Memuat segmen ELF64 AArch64 melalui `nusantara_arm64_elf64_load`.
- Memastikan entry point dan exit trampoline berada pada mapping executable.
- Mengalokasikan sejumlah halaman stack pengguna dan memetakannya sebagai
  EL0 read/write, non-executable (RW/NX).
- Mengosongkan setiap halaman stack sebelum dipakai.
- Membentuk exception frame awal dengan ELR_EL1, SPSR_EL1=EL0t, SP_EL0,
  argumen X0, dan alamat trampoline X30.
- Menghapus seluruh address space dan melepaskan frame milik proses bila
  alokasi stack atau persiapan konteks gagal.
- Menyediakan destroy untuk melepaskan mapping ELF, stack, dan page-table.

## Batasan yang disengaja

Helper ini mengembalikan address space dalam keadaan tidak aktif. Pemanggil
tetap harus mengaktifkan TTBR0/address space, memasang exception router dan
syscall service, lalu memulai frame melalui jalur exception restore/ERET.
ELF dynamic linking, relocations, scheduler, SMP/TLB shootdown, serta
sertifikasi perangkat keras fisik belum termasuk cakupan fase ini.

## Validasi

Workflow Phase 116 mengompilasi C11 dengan `-Wall -Wextra -Werror -pedantic`
dan menjalankan pengujian pemetaan RX, stack RW/NX, register bootstrap, destroy,
serta sweep batas alokasi untuk membuktikan rollback.
