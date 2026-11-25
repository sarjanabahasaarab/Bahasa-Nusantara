# Phase 105 — Real ARM64 Timer Preemption in QEMU

## Tujuan

Membuktikan jalur interrupt perangkat keras virtual end-to-end pada mesin
QEMU virt AArch64: Generic Timer EL1 fisik menghasilkan PPI, GICv3
mengirimkan Group-1 IRQ, exception vector menyimpan frame, Phase 104 memilih
frame task lain, dan ERET melanjutkan task yang dipilih.

## Platform uji

- QEMU virt, CPU Cortex-A57, satu vCPU.
- GICv3 distributor: 0x08000000.
- GICv3 redistributor CPU0: 0x080a0000.
- PL011 UART: 0x09000000.
- EL1 physical timer PPI: INTID 30.
- Interval timer: 10 ms.
- Dua task EL1h dengan stack kernel terpisah dan exception frame awal. Setiap
frame awal task harus memiliki bit SPSR_EL1.I = 0 sebelum dapat dipilih oleh
scheduler; trampoline first-task Phase 104 hanya membuka IRQ untuk task pertama,
sehingga platform juga harus menyiapkan task READY lainnya dengan IRQ terbuka.

Image Phase 105 berdiri sendiri dan tidak mengubah jalur boot Phase 92.
Kode OS yang diuji tetap memakai exception dispatcher, GICv3, Generic Timer,
IRQ runtime, IRQ scheduler, dan scheduler yang sudah ada.

## Bukti serial yang diwajibkan

1. NUSANTARA_PHASE105_BOOT
2. NUSANTARA_PHASE105_TIMER_ARMED
3. NUSANTARA_PHASE105_TIMER_IRQ_SEEN
4. NUSANTARA_PHASE105_TASK_A_START dan NUSANTARA_PHASE105_TASK_B_START
5. NUSANTARA_PHASE105_PREEMPTION_OK

Sentinel terakhir hanya dicetak dari task setelah kedua task melewati ambang
progres dan callback pemilihan task mencatat sedikitnya enam pemilihan akibat
tick scheduler. Workflow gagal jika sentinel tidak muncul, jika kernel
mencetak NUSANTARA_PHASE105_FAIL, atau jika QEMU keluar dengan status yang
tidak diharapkan.

## Build dan jalankan lokal

~~~sh
chmod +x scripts/build-arm64-phase105-qemu.sh
scripts/build-arm64-phase105-qemu.sh /tmp/nusantara-phase105/Image
timeout 12s qemu-system-aarch64 \
  -machine virt,gic-version=3 -cpu cortex-a57 -smp 1 -m 256M \
  -nographic -serial stdio -monitor none -nic none \
  -kernel /tmp/nusantara-phase105/Image -no-reboot -no-shutdown
~~~

## Batasan

Ini adalah bukti eksekusi ARM64 di emulator QEMU, bukan sertifikasi perangkat
fisik. Pengujian ini memakai satu CPU, EL1h, timer PPI, tanpa EL0, SMP, FIQ,
nested IRQ, FP/SIMD/SVE save, atau pergantian address-space. QEMU yang lolos
tidak otomatis membuktikan dukungan semua perangkat ARM64.
