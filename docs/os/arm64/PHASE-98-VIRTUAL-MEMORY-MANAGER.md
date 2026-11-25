# Phase 98 — Virtual Memory Manager (AArch64)

Status: implementation and host contract tests proposed in PR.

## Tujuan
Fondasi pemetaan virtual-ke-fisik ARM64, granule 4 KiB, empat tingkat tabel translasi L0–L3, diuji di host tanpa mengaktifkan MMU.

## Implementasi
- Root table disediakan caller; backing tabel tambahan diperoleh melalui callback allocator.
- Callback pemetaan memberi alias virtual writable untuk mengubah tabel fisik.
- Membuat tabel perantara L0/L1/L2 dan descriptor halaman L3.
- API map, lookup (termasuk offset halaman), dan unmap.
- Atribut leaf: normal/device memory (AttrIdx 0/1), inner-shareable, access flag, EL0/EL1, read-only/read-write, PXN/UXN, dan non-global.
- Hook invalidasi opsional dipanggil setelah map/unmap.
- Tidak memakai heap atau instruksi arsitektur langsung.

## Kontrak platform
1. MAIR_EL1 harus mendefinisikan AttrIdx 0 sebagai normal write-back dan AttrIdx 1 sebagai device.
2. TCR_EL1 harus cocok dengan empat tingkat, granule 4 KiB, dan VA 48-bit.
3. Root table harus 4 KiB-aligned dan sudah zeroed.
4. Callback allocator harus menghasilkan frame 4 KiB-aligned yang dapat diakses oleh callback map; frame tabel wajib di-reserve dari allocator umum.
5. Callback invalidasi harus menjalankan urutan TLBI/DSB/ISB sesuai ASID dan ruang alamat; hook ini bukan SMP shootdown.
6. MMIO hanya boleh dipetakan sebagai Device berdasarkan peta memori platform.

## Batasan
- Tidak menulis TTBR0/TTBR1, TCR, MAIR, SCTLR, atau mengaktifkan MMU.
- Belum mendukung high-half VA, block descriptors, ASID, COW, guard pages, demand paging, page-fault handler, atau SMP shootdown.
- Unmap hanya menghapus leaf; backing tabel tidak otomatis dibebaskan karena tabel dapat memiliki mapping lain.
- API tidak mengambil alih kepemilikan frame data yang dipetakan.
- Integrasi PMM Phase 97 dilakukan melalui callback.

Sebelum memasang tabel ke TTBR, konfigurasi MAIR/TCR, identitas pemetaan boot, cache/TLB maintenance, dan uji QEMU/hardware harus dibuktikan terlebih dahulu.
