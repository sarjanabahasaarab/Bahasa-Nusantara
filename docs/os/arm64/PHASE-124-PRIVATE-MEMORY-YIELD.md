# Phase 124 — Memori privat proses tetap terisolasi setelah yield

## Sasaran

Membuktikan bahwa dua proses EL0 yang memakai virtual address data yang sama tetap memiliki halaman writable privat setelah scheduler melakukan pergantian A→B→A→B.

## Uji QEMU

- Proses A dan B memiliki ELF statis dan address space berbeda.
- Keduanya memetakan halaman data pada VA yang sama, `0x401000`.
- Masing-masing menulis marker 64-bit yang berbeda pada offset +16 di halaman tersebut sebelum melakukan yield.
- Setelah proses kembali berjalan dan melakukan syscall write kedua, kernel memeriksa marker melalui VA aktif.
- Pengujian hanya lulus bila marker A dan B tetap sesuai setelah pergantian konteks, tanpa tertukar atau hilang.
- Kedua proses kemudian exit dan frame direklamasi setelah address space tidak aktif.

## Batas

Ini adalah bukti QEMU satu CPU untuk writable user page yang privat dan bertahan melewati yield. Belum membuktikan SMP/TLB shootdown, ASID, demand paging, copy-on-write, atau perangkat fisik.
