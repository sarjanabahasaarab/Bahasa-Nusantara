# Phase 103 — AArch64 Exception-Frame Dispatch Contract

## Tujuan
Menghubungkan jalur exception assembly dengan kontrak pemilihan frame yang
akan dipulihkan. Dispatcher mengembalikan pointer frame, bukan fungsi void.
Epilog assembly berpindah ke frame terpilih sebelum memulihkan register,
ELR_EL1, SPSR_EL1, lalu menjalankan eret.

## Implementasi
- ABI frame 288 byte: x0–x30, ESR_EL1, FAR_EL1, ELR_EL1, SPSR_EL1, vector.
- Setiap frame harus diikuti scratch pair x16/x17 sebesar 16 byte.
- Total ruang konteks awal 304 byte dengan alignment 16 byte.
- Helper membuat frame awal EL1h pada stack pemanggil, argumen di x0,
  entry di ELR_EL1, alamat kembali di x30.
- SPSR_EL1 awal 0x3c5 (EL1h, DAIF termask), agar task tidak menerima IRQ
  sebelum platform menyiapkan GIC, timer, dan dispatcher.
- Handler terdaftar sebelum IRQ dibuka. Default mempertahankan frame aktif.
- Pointer hasil handler yang null/tidak aligned ditolak; frame aktif dipakai.

## Batasan
Ini kontrak pemulihan exception frame EL1h, bukan bukti preemption berjalan
pada perangkat. Belum mengaktifkan DAIF, GIC/timer, address space, SIMD/FP/SVE,
EL0, atau AArch32. Handler hanya boleh memilih frame valid, hidup, writable,
dan memiliki scratch pair 16 byte setelah frame.

## Validasi
CI menguji persiapan frame, ukuran/alignment stack, nilai register awal,
dispatcher default, redirect ke frame lain, input invalid, serta cross-assembly
AArch64. Host tidak mengeksekusi eret atau register system AArch64.
