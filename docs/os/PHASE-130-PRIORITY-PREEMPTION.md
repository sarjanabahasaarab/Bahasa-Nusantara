# Phase 130 — Priority-Aware Immediate Preemption

## Tujuan
Task berprioritas efektif lebih tinggi yang berubah menjadi READY harus dapat mengambil CPU pada tick scheduler berikutnya tanpa menunggu quantum task yang sedang berjalan habis.

## Perilaku
- Scheduler memindai task READY pada setiap tick.
- Jika ada task READY dengan effective priority strictly greater daripada task RUNNING, scheduler segera melakukan pemilihan ulang.
- Jika prioritas sama, kebijakan round-robin dan quantum tetap berlaku.
- Priority inheritance tetap dihormati: task RUNNING yang memperoleh effective priority lebih tinggi tidak dipaksa menyerahkan CPU kepada waiter yang prioritasnya sama atau lebih rendah.
- Bila tidak ada task berprioritas lebih tinggi, penghitungan quantum lama tetap dipakai.

## Batasan
Pemindaian seluruh slot scheduler (maksimum 64 task) dilakukan pada tick; ini bounded tetapi O(64). Sinkronisasi perubahan READY/priority tetap menjadi tanggung jawab critical section scheduler/IRQ. Fase ini tidak mengubah mekanisme timer interrupt atau context switch arsitektur.

## Pengujian
Workflow Phase 130 mengompilasi dengan C11 ketat (-Wall -Wextra -Werror -pedantic) dan menguji:
1. preemption segera ketika task prioritas tinggi menjadi READY;
2. resume task prioritas rendah setelah task tinggi diblokir;
3. preemption kembali setelah task tinggi dibangunkan;
4. owner yang mendapat priority inheritance tetap berjalan;
5. prioritas sama tetap mengikuti round-robin setelah quantum habis.
