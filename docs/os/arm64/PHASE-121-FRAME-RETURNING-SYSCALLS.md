# Phase 121 — Frame-returning EL0 syscalls

## Tujuan
Membuat jalur syscall mampu mengembalikan exception frame proses berikutnya,
bukan selalu melanjutkan frame proses pemanggil.

## Perubahan
- Menambahkan callback ops opsional `yield_frame` dan `exit_frame`.
- Callback menerima frame EL0 yang sedang tersimpan dan mengembalikan frame
  yang harus dipulihkan oleh jalur exception/ERET.
- Callback lama berbasis nilai balik tetap tersedia untuk integrasi terdahulu.
- Syscall write, validasi pointer, dan ENOSYS tetap memakai perilaku lama.

## Kontrak penting
Callback frame-aware bertanggung jawab menyimpan frame saat ini, memperbarui
status scheduler, mengaktifkan address-space proses terpilih, dan hanya
mengembalikan frame yang aman dipulihkan. Nilai NULL tetap menandakan kegagalan
dispatch pada router saat ini; implementasi idle-frame/kernel-return perlu
disediakan oleh integrasi scheduler.

## Batasan
Phase ini menguji kontrak dispatcher host. Belum membuktikan dua proses EL0
bergantian berjalan di QEMU, belum menambahkan timer preemption, dan bukan
sertifikasi perangkat fisik.
