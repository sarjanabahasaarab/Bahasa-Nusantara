# Fase 109 — Fondasi tabel halaman dan proteksi EL0 ARM64

## Tujuan
Menyediakan implementasi native C untuk membangun tabel translasi stage-1 AArch64 4 KiB dan menerapkan atribut halaman yang membedakan akses kernel EL1 dengan akses pengguna EL0.

## Implementasi
- Tabel empat tingkat L0–L3 dengan 512 entri per tabel.
- Pemetaan halaman 4 KiB pada rentang alamat virtual TTBR0 48-bit.
- Alokasi tabel lanjutan melalui callback caller-owned; callback yang sama juga harus dapat mengembalikan alias virtual writable berdasarkan alamat fisik tabel yang diminta.
- Descriptor halaman mengatur Access Flag, Inner Shareable, AP EL0/EL1, PXN, dan UXN.
- Halaman kernel tidak dapat diakses EL0; halaman pengguna dapat ditetapkan read-only atau read-write.
- Fungsi pemasangan TTBR0_EL1 memvalidasi EL1, menulis TTBR0, dan melakukan invalidasi TLB lokal.

## Batas keamanan yang wajib dipahami
Fase ini **belum mengaktifkan MMU** dan belum membuat address space terpisah yang siap dipakai. Menulis TTBR0 saja tidak cukup: kernel masih harus menyiapkan MAIR_EL1, TCR_EL1, tabel pemetaan seluruh image kernel, stack, RAM, dan MMIO, lalu mengatur SCTLR_EL1 dengan urutan arsitektural yang benar. Semua tabel harus memiliki backing fisik yang valid dan alias virtual yang dapat diakses saat konstruksi.

Pengujian C pada host hanya memeriksa struktur descriptor dan aturan pemetaan. Pengujian tersebut bukan bukti bahwa CPU menolak akses EL0. Bukti perangkat keras baru boleh diklaim setelah workflow QEMU mengaktifkan translasi, menjalankan payload EL0, dan memverifikasi Data Abort saat payload mencoba membaca/menulis halaman kernel.

Belum termasuk: allocator frame fisik yang terhubung langsung, teardown/reclaim tabel, shootdown TLB SMP, ASID, copyin/copyout lintas halaman, ELF loader, serta pembuktian QEMU/board untuk fault proteksi.
