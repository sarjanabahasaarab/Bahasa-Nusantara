# Phase 119 — Validasi Rentang Memori EL0

## Tujuan

Memastikan syscall yang menerima pointer pengguna tidak langsung melakukan
dereference. Kernel memeriksa seluruh halaman yang disentuh rentang alamat dan
hak aksesnya terlebih dahulu.

## Implementasi

- Memvalidasi rentang alamat 48-bit dan mendeteksi overflow.
- Memeriksa semua halaman 4 KiB yang dilewati, termasuk rentang lintas halaman.
- Membatasi akses baca/tulis/eksekusi sesuai metadata mapping EL0.
- Menolak halaman yang tidak dipetakan dan halaman dengan permission salah.
- Memakai validator generik ini pada syscall `write`.

## Bukti yang diminta

Tes host memeriksa permission RX/RO/RW, akses lintas halaman, halaman kosong,
rentang di luar batas, dan overflow.

Tes QEMU menjalankan ELF yang:
1. memanggil `write` dengan pointer yang tidak dipetakan dan harus menerima
   EFAULT tanpa dereference;
2. memanggil `write` dengan pointer data valid dan menghasilkan output UART;
3. memanggil `exit`, mengembalikan address space kernel, dan membebaskan
   seluruh frame proses.

## Batasan

Validasi memeriksa metadata mapping pada model single-CPU. Pinning halaman,
copy-on-write, demand paging, SMP/TLB shootdown, dan mitigasi race antar-CPU
belum termasuk.
