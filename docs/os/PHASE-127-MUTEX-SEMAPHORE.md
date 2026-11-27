# Phase 127 — Mutex dan Semaphore

## Fitur
- Mutex eksklusif dengan pemilik task, try-lock, antrean FIFO, dan transfer kepemilikan langsung ke waiter pertama saat unlock.
- Semaphore penghitung dengan nilai awal/batas maksimum, wait/try-wait, post, dan wake FIFO tanpa kehilangan token saat waiter ada.
- Kontrak host menguji kepemilikan mutex, penolakan unlock non-pemilik, blocking/wakeup, batas semaphore, dan overflow.

## Batasan penting
Primitive ini adalah fondasi sinkronisasi kernel, belum mengimplementasikan priority inheritance, robust mutex, interrupt-safe spinlock, atau futex. Pemanggil wajib melindungi pemeriksaan kondisi dan operasi lock/wait/post dengan critical section yang sesuai agar bebas lost-wakeup dan race. Fungsi blocking mengembalikan WOULD_BLOCK setelah task dipindahkan ke BLOCKED; integrasi frame switch tetap menjadi tanggung jawab scheduler/IRQ.

## Verifikasi
Workflow mengompilasi C11 dengan -Wall -Wextra -Werror -pedantic dan menjalankan kontrak host.
