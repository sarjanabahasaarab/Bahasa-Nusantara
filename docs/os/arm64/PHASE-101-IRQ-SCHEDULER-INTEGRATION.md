# Phase 101 — ARM64 IRQ, Timer, and Scheduler Integration

## Tujuan
Menyediakan pengatur alur interupsi EL1 yang menghubungkan pengakuan IRQ GICv3, Generic Timer, dan kebijakan tick scheduler tanpa melakukan operasi privileged pada pengujian host.

## Implementasi
- Mengakui satu Group-1 interrupt melalui callback CPU interface GICv3.
- Mengidentifikasi PPI timer yang dikonfigurasi platform (INTID 16–31; tidak mengasumsikan nomor universal).
- Memeriksa ISTATUS timer, menjalankan satu scheduler tick, melaporkan descriptor tugas terpilih melalui callback, dan mempersenjatai ulang one-shot timer.
- Mengirim EOI dengan token IAR asli untuk setiap interrupt non-spurious, termasuk IRQ yang belum ditangani.
- Tidak mengirim EOI untuk INTID spurious/reserved 1020–1023.
- Timer tetap dipersenjatai ulang ketika tidak ada tugas runnable.

## Batasan penting
- Callback pemilihan tugas hanya menerima descriptor; belum menyimpan/memulihkan register atau mengganti stack CPU.
- Belum mengubah DAIF, memasang dispatcher exception, mengatur prioritas/trigger IRQ, menemukan GIC Redistributor, atau mengaktifkan interrupt pada hardware.
- PPI timer harus sudah diaktifkan pada GIC dan CPU interface Group-1 harus sudah dikonfigurasi oleh platform.
- Callback IRQ non-timer hanya diberi tahu; driver perangkat masing-masing belum tersedia.
- Pemanggil wajib memastikan serialisasi scheduler terhadap IRQ dan task; implementasi saat ini single-core.

## Validasi
Workflow mengompilasi dan menjalankan kontrak C11 pada host, lalu melakukan cross-compile freestanding AArch64 untuk modul integrasi. Pengujian mock memverifikasi timer tick, re-arm, EOI token, IRQ tak dikenal, dan interrupt spurious. Kelulusan ini bukan bukti boot atau pengiriman IRQ pada perangkat ARM64 nyata.
