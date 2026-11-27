# Phase 120 — ARM64 EL0 Process Scheduler Binding

## Tujuan
Menghubungkan task scheduler kernel dengan process bootstrap dan address-space ARM64. Setiap task EL0 memiliki binding eksplisit ke satu process, exception frame tersimpan, dan root TTBR0 miliknya sendiri.

## Implementasi
- Attach hanya menerima task READY/RUNNING dan process bootstrap yang valid.
- Frame exception EL0 disimpan kembali pada task yang sedang berjalan.
- Start/yield memilih task melalui scheduler yang sudah ada, mengaktifkan address-space proses terpilih, lalu mengembalikan frame untuk dipulihkan ERET.
- Exit menandai task TERMINATED, memilih proses berikutnya, dan berpindah ke kernel root jika tidak ada task runnable.
- Reap memisahkan penghentian dari pelepasan memori: hanya task TERMINATED yang tidak aktif yang boleh dihancurkan.

## Batasan
Ini adalah binding scheduler dan kontrak host, belum integrasi end-to-end syscall yield/exit. Belum ada preemption QEMU dua proses EL0, demand paging/COW, SMP/TLB shootdown, atau save FP/SIMD/SVE. Hasil host test bukan sertifikasi perangkat fisik.

## Validasi
Workflow arm64-process-scheduler-phase120.yml mengompilasi dengan C11 ketat dan menjalankan kontrak dua task dengan dua root address-space berbeda.
