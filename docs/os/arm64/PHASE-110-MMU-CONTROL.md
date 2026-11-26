# Fase 110 — Kontrol MMU ARM64 dan dekode Data Abort

## Yang ditambahkan
- Nilai TCR_EL1 untuk TTBR0 48-bit, translasi 4 KiB, inner-shareable, WBWA, dan IPS 40-bit.
- MAIR_EL1 dengan AttrIdx 0 = Normal WBWA dan AttrIdx 1 = Device-nGnRE.
- Jalur aktivasi EL1 yang memeriksa CurrentEL, menolak root tidak sejajar, menolak MMU yang sudah aktif, memasang MAIR/TCR/TTBR0, membersihkan TLB lokal, menginvalidasi instruction cache, lalu mengaktifkan SCTLR_EL1.M dan I.
- Dekoder ESR_EL1 untuk translation/access-flag/permission fault, level, arah tulis, dan instruction abort.
- Host contract test dan kompilasi silang AArch64.

## Syarat sebelum aktivasi
Fungsi aktivasi adalah primitive tingkat rendah, bukan boot policy. Pemanggil wajib memastikan tabel root dan semua tabel turunannya berada di RAM valid, identitas pemetaan mencakup kode yang sedang berjalan, stack aktif, vector table, data/BSS, tabel halaman, serta semua MMIO yang akan disentuh. MAIR AttrIdx harus konsisten dengan setiap descriptor. TTBR0 juga harus menunjuk root yang sesuai dengan TCR.

Fungsi ini sengaja belum mengaktifkan SCTLR_EL1.C (D-cache). Mengaktifkan D-cache secara aman membutuhkan prosedur clean/invalidate cache dan pemetaan atribut yang benar; tidak boleh dilakukan dengan sekadar mengubah satu bit. Primitive ini belum mengatur ASID, TCR.HA/HD, TBI, atau SMP TLB shootdown.

## Batas bukti
Host test hanya memverifikasi konstanta register dan dekode ESR. Kompilasi silang hanya membuktikan assembler/compiler menerima implementasi. Belum ada klaim bahwa kernel NUSANTARA sudah menjalankan MMU di QEMU atau bahwa akses EL0 ke halaman kernel sudah ditolak. Pengujian QEMU perlu boot image khusus dengan pemetaan identity lengkap, pemetaan user terpisah, Data Abort vector yang merekam ESR/FAR, dan sentinel serial setelah fault yang diharapkan.
