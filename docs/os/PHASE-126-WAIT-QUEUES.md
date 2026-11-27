# Phase 126 — ARM64 Process Wait Queues and Wakeup

## Tujuan
Menyediakan primitive wait queue FIFO untuk proses yang menunggu event, lalu membangunkannya kembali melalui status READY scheduler.

## Perubahan
- Menambahkan src/runtime/os/scheduler/wait-queue.h dan wait-queue.c.
- Kanal tunggu berkapasitas 32 task, operasi sleep/block, wake-one FIFO, dan wake-all.
- Task yang sama tidak boleh didaftarkan dua kali. Wake mengubah BLOCKED menjadi READY melalui scheduler dan mengatur ulang kuantum.
- Pengujian kontrak mencakup FIFO, duplikasi, wake-one, wake-all, dan antrean kosong.

## Batasan sinkronisasi
Pemanggil kernel harus menjalankan pemeriksaan kondisi event dan operasi sleep dalam critical section yang sama (interrupt/preemption dinonaktifkan) agar tidak terjadi lost wakeup. Wake-up hanya membuat task READY; pemilihan konteks berikutnya tetap dilakukan scheduler/IRQ.

## Verifikasi
Workflow khusus mengompilasi dengan C11 ketat (-Wall -Wextra -Werror -pedantic) dan menjalankan kontrak host.
