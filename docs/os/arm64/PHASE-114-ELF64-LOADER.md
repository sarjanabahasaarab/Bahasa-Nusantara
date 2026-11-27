# Phase 114 — Validasi ELF64 AArch64 sebelum pemuatan

## Tujuan

Menyediakan gerbang validasi statis ELF64 untuk program pengguna AArch64. Tahap ini memisahkan pemeriksaan format dan rencana segmen dari alokasi frame serta perubahan address space, sehingga berkas rusak ditolak sebelum kernel mulai memetakan memori.

## Cakupan implementasi

- ELF64 little-endian, ET_EXEC, EM_AARCH64 (183), versi ELF saat ini.
- Pemeriksaan ukuran header, ukuran program header, jumlah header, dan batas tabel.
- Pemeriksaan setiap PT_LOAD: rentang berkas, p_filesz <= p_memsz, rentang virtual pengguna, overflow, alignment dan kesesuaian offset/alamat.
- Penolakan segmen W+X, flag tak dikenal, segmen yang bertumpang tindih, serta entry point yang tidak berada di segmen executable.
- Penolakan PT_INTERP dan PT_DYNAMIC; dynamic linker dan relocation belum didukung.
- Maksimum 32 segmen, tanpa alokasi memori di validator.

## Batas yang disengaja

Phase 114 menghasilkan load plan tervalidasi, belum menyalin data ke page frame atau mengaktifkan proses EL0. Integrasi pemetaan, zero-fill BSS, rollback alokasi, stack awal, dan eksekusi ELF di QEMU menjadi tahap lanjutan. Validator ini bukan klaim kompatibilitas ELF Linux umum.

## Pengujian

`pengujian/os/uji_arm64_elf64_loader_fase114.c` menguji image valid dan kasus rusak: format/arsitektur, truncation, overflow, batas file, W^X, alignment, overlap, entry point, serta dynamic segment.

## Integrasi pemetaan awal

Modul `elf64-load.c` menambahkan jalur pemuatan awal untuk address space baru yang belum aktif:

- Memvalidasi ulang berkas sebelum membuat address space.
- Memetakan halaman 4 KiB untuk setiap PT_LOAD, menyalin byte file ke offset virtual yang sesuai, dan mengosongkan seluruh halaman agar bagian BSS/tail bernilai nol.
- Menetapkan halaman writable sebagai EL0 RW + NX dan halaman executable sebagai EL0 RO + executable; kebijakan W^X tetap berlaku.
- Mengambil kepemilikan frame oleh address space sehingga penghancuran address space melepas frame program dan page table.
- Jika alokasi atau pemetaan gagal, address space yang baru dibuat dihancurkan sebagai rollback transaksi.

Batasan saat ini: loader menolak segmen yang berbagi halaman virtual dan memerlukan kesesuaian offset file dengan offset virtual pada batas 4 KiB. Ini sengaja konservatif agar satu halaman tidak menerima dua kebijakan izin. Jalur ini belum memasang TTBR0, membangun stack awal, menyiapkan register EL0, atau menjalankan instruksi ELF. Callback allocator wajib menyediakan frame zeroed dengan alias kernel writable yang valid.
