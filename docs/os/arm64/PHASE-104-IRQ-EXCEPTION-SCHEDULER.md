# Phase 104 — IRQ, Timer, Scheduler, and Exception-Frame Switching

## Tujuan
Menghubungkan timer PPI EL1 dengan scheduler round-robin dan jalur pemulihan
exception frame Phase 103. Saat IRQ timer datang dari EL1h/SP_EL1, kernel
menyimpan frame task yang terinterupsi, menjalankan satu langkah scheduler,
dan mengembalikan frame task berikutnya untuk dipulihkan oleh ERET.

## Jalur eksekusi
1. VBAR_EL1 slot 5 menerima IRQ pada Current EL dengan SP_EL1.
2. Vector assembly menyimpan x0–x30, ESR_EL1, FAR_EL1, ELR_EL1, SPSR_EL1.
3. Dispatcher Phase 103 memanggil handler Phase 104.
4. Handler menyimpan pointer frame ke saved_stack_pointer task aktif.
5. IRQ runtime membaca IAR1, memeriksa status Generic Timer, melakukan tick
   scheduler, memasang ulang one-shot timer, lalu menulis EOI token.
6. Bila task lain dipilih, dispatcher mengembalikan saved_stack_pointer task
   tersebut; assembly memulihkan frame dan menjalankan ERET.

## Memulai task pertama
API start_first_task memerlukan:
- satu task RUNNING dengan frame EL1h awal yang valid dan stack kernel terpetakan;
- exception vector telah dipasang dan handler Phase 104 telah didaftarkan;
- distributor, redistributor, CPU interface GICv3, serta timer PPI sudah dikonfigurasi;
- Generic Timer sudah di-arm dan perangkat memori/MMIO sudah dipetakan dengan benar.

Assembly bootstrap menghapus mask IRQ (bit I) dari SPSR_EL1 frame pertama tepat
sebelum ERET. Dengan begitu IRQ baru dapat diterima setelah transisi ke task
pertama, bukan saat kernel masih menyiapkan state.

## Invarian dan batasan
- Jalur ini hanya untuk single-core EL1h dan IRQ timer PPI.
- Scheduler harus selalu memiliki idle task READY/RUNNING. Bila tick membuat
  tidak ada task runnable, handler fail-stop; ia tidak pernah melanjutkan task
  yang sudah BLOCKED.
- Handler hanya menerima vector 5. Exception lain tidak boleh disamarkan
  sebagai IRQ dan akan masuk fail-stop melalui dispatcher.
- GIC meng-EOI setiap token non-spurious; token spurious tidak di-EOI.
- Handler berjalan dengan IRQ termask secara arsitektural selama exception.
- Belum mendukung EL0 frame, SMP, lazy FP/SIMD/SVE save, FIQ, nested IRQ,
  per-task address-space switching, ataupun stack guard/page fault recovery.
- Host test memakai fake MMIO/system-register callbacks; ia membuktikan
  kontrak frame selection dan scheduler integration, bukan interrupt fisik
  atau QEMU preemption.

## Validasi
Workflow menjalankan host test terhadap exception.c, irq-runtime.c,
irq-scheduler.c, generic_timer.c, scheduler.c; kemudian cross-compiles C dan
cross-assembles exception vectors untuk AArch64.
