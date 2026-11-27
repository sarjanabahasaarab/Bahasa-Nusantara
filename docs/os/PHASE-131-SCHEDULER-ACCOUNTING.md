# Phase 131 — Scheduler Runtime Accounting

## Tujuan
Menyediakan pencatatan runtime scheduler yang deterministik untuk membantu diagnosis starvation, evaluasi fairness, dan observabilitas kernel tanpa bergantung pada wall clock.

## Metrik
- `total_ticks`: jumlah tick scheduler yang diterima.
- `context_switches`: perpindahan dari task RUNNING ke task lain melalui pemilihan scheduler.
- `total_preemptions`: preemption paksa karena task READY memiliki effective priority lebih tinggi.
- Per task: `cpu_ticks`, `dispatches`, dan `preemptions`.

Counter menggunakan saturating increment sehingga tidak berputar ke nol saat mencapai UINT64_MAX. Tick CPU dihitung untuk task yang sedang RUNNING saat tick diproses; idle tick tetap masuk `total_ticks` tetapi tidak dibebankan ke task.

## Batasan
Metrik ini bukan pengukur waktu nyata atau nanodetik. Nilainya merepresentasikan tick scheduler, sehingga frekuensi timer harus diketahui oleh lapisan platform untuk mengubahnya menjadi durasi. Akses dan pembacaan counter harus disinkronkan oleh pemanggil jika dilakukan lintas CPU/IRQ.

## Validasi
Workflow Phase 131 menggunakan C11 ketat (`-Wall -Wextra -Werror -pedantic`) dan memeriksa inisialisasi, CPU tick, dispatch, context switch, preemption prioritas tinggi, serta saturasi counter.
