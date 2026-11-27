# Phase 125 — Preemption timer untuk proses EL0 ARM64

## Sasaran

Membuktikan bahwa timer fisik EL1 pada QEMU virt menghasilkan IRQ GICv3 yang mengganti dua proses EL0 yang sedang berjalan tanpa syscall yield. Setiap proses mempunyai address space, exception frame, dan kernel stack sendiri.

## Jalur eksekusi

1. Kernel membuat dua ELF64 AArch64 ET_EXEC dengan alamat virtual kode/data yang sama.
2. Setiap image menjalankan loop EL0 tanpa menyerahkan CPU secara sukarela.
3. Generic Timer EL1 menghasilkan PPI 30; GICv3 mengirim IRQ.
4. IRQ scheduler menyimpan exception frame proses yang terinterupsi.
5. Scheduler menghabiskan quantum dan memilih proses berikutnya.
6. Pengait process scheduler mengaktifkan address space proses terpilih dan mengembalikan exception frame miliknya untuk dipulihkan oleh ERET.
7. Kernel memverifikasi marker data privat A (0xA123) dan B (0xB456) pada VA data yang sama setelah pergantian konteks berulang.

## Perubahan

- process_scheduler_activate_task menyediakan aktivasi proses terpilih dari jalur IRQ, dengan validasi status task dan pergantian root address space.
- irq_scheduler_bind_processes menghubungkan IRQ scheduler dengan process scheduler. Handler menyimpan frame proses aktif sebelum tick, lalu callback mengaktifkan address space dan frame proses hasil pemilihan.
- QEMU harness menjalankan dua loop EL0 yang tidak melakukan yield, lalu menuntut beberapa pergantian timer dan pemeriksaan marker privat.
- Test Phase 120 diperluas untuk mensimulasikan tick A→B→A dan memastikan root address space serta frame yang dikembalikan sesuai.

## Kriteria lulus QEMU

- NUSANTARA_PHASE125_BOOT
- NUSANTARA_PHASE125_TIMER_ARMED
- NUSANTARA_PHASE125_TIMER_PREEMPTION_OK
- NUSANTARA_PHASE125_ADDRESS_SPACE_SWITCH_OK
- NUSANTARA_PHASE125_PASS

## Batas pembuktian

Validasi ini menggunakan emulasi QEMU satu CPU (-smp 1), bukan sertifikasi perangkat fisik atau SMP. Belum mencakup FIQ, nested IRQ, lazy FP/SIMD, atau interrupt routing multi-core.
