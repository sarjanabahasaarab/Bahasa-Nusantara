# Phase 111 — QEMU MMU dan penolakan akses kernel dari EL0

## Sasaran
Membuktikan dengan eksekusi AArch64 di QEMU bahwa kode yang berjalan pada EL0 tidak dapat menulis pemetaan kernel yang hanya boleh diakses EL1.

## Desain image uji
- Boot QEMU virt pada EL2/EL1, pindah ke EL1h, siapkan PL011 dan stack, lalu bersihkan BSS.
- Bangun tabel translasi TTBR0 4-level, granule 4 KiB, rentang VA 48-bit.
- Pemetaan identitas RAM kernel pada blok 2 MiB menggunakan AP=EL1-only dan UXN.
- Pemetaan PL011 0x09000000 sebagai Device-nGnRE (AttrIdx 1).
- Dua halaman fisik khusus di 0x40200000 dan 0x40201000 dipetakan pula melalui alias EL0 0x50000000 dan 0x50001000. Halaman kode dapat dieksekusi dari EL0; halaman stack UXN.
- Aktifkan MAIR/TCR/TTBR0 dan SCTLR.M melalui primitive Phase 110.
- Masuk EL0 dengan ERET. Payload mencoba STR ke 0x40080000, yaitu alamat identitas image kernel yang AP-nya EL1-only.
- Vector lower-EL AArch64 synchronous exception (slot 8) memeriksa EC=0x24, FSC=0x0e (permission fault level 2), WnR=1, dan FAR_EL1=0x40080000.

## Bukti serial yang diwajibkan CI
```text
NUSANTARA_PHASE111_BOOT
NUSANTARA_PHASE111_MMU_ENABLED
NUSANTARA_PHASE111_EL0_ENTER
NUSANTARA_PHASE111_KERNEL_ACCESS_BLOCKED
NUSANTARA_PHASE111_PERMISSION_FAULT_OK
NUSANTARA_PHASE111_PASS
```

Workflow wajib membangun image freestanding, menjalankan QEMU, dan memeriksa seluruh marker. Marker di atas adalah kriteria yang diharapkan, bukan klaim hasil sebelum workflow selesai.

## Batas
- Bukti berlaku untuk satu CPU QEMU virt dengan Cortex-A57 dan konfigurasi tabel yang dibuat image demo.
- Tidak membuktikan boot pada perangkat fisik, SMP/TLB shootdown, ASID, cache D, DMA, ELF loader, atau keamanan penuh seluruh kernel.
- Pemetaan uji memakai blok 2 MiB untuk area kernel; ini membuktikan larangan akses EL0 pada region tersebut, bukan granularitas proteksi setiap halaman kernel.
- Ini adalah image demonstrasi mandiri, belum mengaktifkan MMU pada seluruh boot path produksi NUSANTARA.
