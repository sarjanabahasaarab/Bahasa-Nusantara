# Phase 132 — Task Ready-Wait and Starvation Accounting

## Tujuan
Mencatat lamanya task berada pada status READY agar gejala starvation dapat diukur tanpa mengubah kebijakan pemilihan task.

## Metrik per task
- `ready_wait_ticks`: tick yang terakumulasi sejak task terakhir menjadi READY atau sejak dispatch terakhir.
- `max_ready_wait_ticks`: interval READY terpanjang yang selesai dan tercatat.
- `ready_wait_events`: jumlah interval READY yang berakhir dengan dispatch.

Setiap tick scheduler menambah penghitung untuk semua task READY. Ketika task dipilih untuk berjalan, interval tersebut dicatat ke nilai maksimum, jumlah event ditambah, dan penghitung interval berjalan direset. Semua counter menggunakan saturating increment.

## Batasan
Metrik ini mengukur tick scheduler, bukan waktu kalender atau nanodetik. Metrik tidak otomatis mengatasi starvation dan tidak mengubah prioritas; task berprioritas rendah dapat tetap menunggu selama task berprioritas tinggi terus READY/RUNNING. Pengukuran lintas CPU harus dilindungi sinkronisasi scheduler.

## Validasi
Workflow Phase 132 menguji akumulasi waktu tunggu, pencatatan saat dispatch, reset interval, dan saturasi UINT64_MAX dengan kompilasi C11 ketat.
