# Phase 107 — EL0 Exception Context dan Context Switching

## Implementasi

- Memperluas exception frame ARM64 dari 288 menjadi 304 byte dengan field `sp_el0` pada offset 288.
- Memperluas konteks awal dari 304 menjadi 320 byte (frame 304 byte + scratch x16/x17 16 byte).
- Vector assembly menyimpan `SP_EL0` pada setiap exception dan memulihkannya dari frame yang dipilih sebelum `ERET`.
- Menambahkan pembentuk frame awal EL0: `ELR_EL1=user_entry`, `SPSR_EL1=EL0t`, `SP_EL0=user_stack_top`.
- IRQ scheduler menerima vector slot 5 (IRQ EL1h) dan slot 9 (IRQ dari EL0 AArch64).
- Menambahkan exception router tunggal untuk mengarahkan slot 5/9 ke IRQ scheduler dan slot 8 ke syscall handler.

## Urutan integrasi

1. Siapkan pemetaan MMU untuk kode dan stack pengguna, serta kernel stack per task.
2. Siapkan scheduler dan timer/GIC seperti Phase 104.
3. Inisialisasi syscall services dan IRQ scheduler.
4. Pasang `nusantara_arm64_exception_router_init` paling akhir agar menjadi satu-satunya exception handler global.
5. Masukkan frame EL0 yang dibangun oleh `nusantara_arm64_exception_user_context_prepare` sebagai saved context task.
6. Mulai task melalui jalur `nusantara_arm64_exception_start_first_task`.

Router diperlukan karena hanya ada satu handler global di exception dispatcher. Jangan memanggil dua init lama yang saling menimpa sebagai pengganti router.

## Invarian dan batasan

- Task EL0 harus memiliki kernel stack terpetakan sendiri; exception dari EL0 menggunakan SP_EL1 sebagai stack masuk.
- User stack wajib non-null dan 16-byte aligned. Entry harus sudah executable dan termapping; helper ini tidak membuat page table.
- Saat IRQ vector 9 datang, frame menyimpan register pengguna dan SP_EL0; scheduler dapat menyimpan pointer frame tersebut sebagai saved_stack_pointer lalu memilih frame task lain. Restore menulis SP_EL0 task terpilih sebelum ERET.
- Context switching address-space belum tersedia. Semua task yang dijadwalkan harus berada pada address-space yang kompatibel dan sudah dipetakan.
- Belum ada ELF loader, demand paging, page fault recovery, safe copy buffer lintas page, FP/SIMD/SVE context, SMP, nested IRQ, atau validasi hardware QEMU khusus EL0.

## Validasi

Host test memeriksa ukuran/offset frame, pembuatan frame EL0/EL1, validasi alignment stack, serta routing IRQ EL1/EL0 dan SVC. CI cross-assembles vector table dan entry assembly. Hasil ini belum menjadi bukti boot EL0 di QEMU.
