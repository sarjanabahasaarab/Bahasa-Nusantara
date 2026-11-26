# Phase 113 — Isolasi ruang alamat proses ARM64 melalui QEMU

## Sasaran

Membuktikan bahwa dua konteks EL0 benar-benar berjalan dengan root TTBR0_EL1 berbeda, bukan hanya bahwa pengelola ruang alamat lolos uji host.

## Implementasi

- Memakai pengelola ruang alamat Phase 112 dan callback nusantara_arm64_mmu_install_ttbr0 untuk pergantian root.
- Kedua proses mengeksekusi kode fisik yang sama pada virtual address yang sama.
- Virtual address data yang sama dipetakan ke dua physical frame berbeda.
- Satu halaman tambahan pada VA `0x10003000` hanya dipetakan ke proses A; proses B mencoba membaca VA yang sama dan harus menerima translation fault.
- Perpindahan dari proses A ke B dilakukan pada jalur exception SVC; frame EL0 proses B dipulihkan setelah root TTBR0_EL1 B dipasang.
- Proses B mencoba membaca halaman privat proses A; uji hanya lulus bila CPU menghasilkan lower-EL data abort pada FAR yang diharapkan.
- Kernel memeriksa isi kedua frame data untuk membuktikan bahwa store masing-masing proses tetap terpisah.
- Jika terjadi fault tak terduga, serial juga mencetak X9 dari exception frame agar alamat efektif instruksi EL0 dapat dibandingkan langsung dengan FAR_EL1.

## Bukti CI yang diwajibkan

Workflow arm64-qemu-process-isolation-phase113.yml membangun image freestanding AArch64, menjalankannya pada QEMU virt dengan Cortex-A57, lalu memeriksa marker serial sampai NUSANTARA_PHASE113_PASS.

Marker utama:
- NUSANTARA_PHASE113_ADDRESS_SPACE_SWITCH_OK
- NUSANTARA_PHASE113_CROSS_PROCESS_ACCESS_BLOCKED
- NUSANTARA_PHASE113_SAME_VA_PRIVATE_FRAMES_OK
- NUSANTARA_PHASE113_PASS

## Batas

- Ini adalah uji QEMU satu CPU untuk pergantian ruang alamat dan isolasi EL0; belum membuktikan preemption timer yang memilih proses berbeda melalui scheduler umum.
- Belum ada ASID, SMP TLB shootdown, demand paging, copy-on-write, ELF loader, atau uji perangkat fisik.
- Pool frame pada image uji adalah allocator statis khusus QEMU, bukan allocator produksi.
- UART PL011 dipetakan sebagai Device-nGnRE; kernel dan tabel halaman tetap dapat diakses melalui pemetaan EL1.

## Catatan build

Build script menerima path image sebagai argumen wajib agar output CI selalu eksplisit; compile memakai Clang freestanding untuk target AArch64.
