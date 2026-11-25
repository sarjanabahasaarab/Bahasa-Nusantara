# Phase 97 — Physical Memory Manager

Status: C allocator foundation and host contract tests added.

## Tujuan

Menyediakan pengelola frame fisik 4 KiB yang dapat menerima peta RAM sparse dari firmware/bootloader, menjaga rentang yang dicadangkan, dan mengalokasikan frame tanpa melintasi celah alamat fisik.

## Implementasi

- Bitmap caller-owned; allocator tidak memakai heap saat inisialisasi maupun alokasi.
- Daftar extent RAM harus berurutan, page-aligned, tidak tumpang tindih, dan tidak overflow.
- Reservasi frame untuk kernel, bootloader, firmware, dan page table sebelum alokasi umum.
- Alokasi satu frame dan beberapa frame berurutan secara fisik.
- Pembebasan memvalidasi bahwa frame dikelola dan sedang dialokasikan.
- Rentang reserve yang melintasi celah RAM ditolak sebelum perubahan bitmap.
- Tidak ada asumsi bahwa semua alamat fisik RAM membentuk satu rentang kontinu.

## Integrasi ARM64

Peta extent harus berasal dari firmware/device tree atau boot protocol yang sudah divalidasi. Caller wajib mengecualikan MMIO, secure/reserved memory, kernel image, initrd, dan area firmware yang tidak boleh dialokasikan. Bitmap harus ditempatkan pada memori yang sudah dipastikan dapat diakses dan area penyimpanannya sendiri harus di-reserve oleh caller.

Allocator ini merupakan fondasi frame fisik; belum mengelola cache maintenance, NUMA, SMP lock, DMA zone, buddy allocator, page-table backing, atau integrasi langsung dengan MMU/TTBR. Sebelum pemakaian bersamaan oleh beberapa CPU, caller harus menyediakan serialisasi eksternal.

## Validasi

Workflow Phase 97 menjalankan pengujian C11 host dengan `-Wall -Wextra -Werror -pedantic` dan cross-compile AArch64 freestanding. Pengujian mencakup sparse extents, reserve idempotent, allocate/free, contiguous allocation, hole rejection, overlap, dan bitmap capacity.
