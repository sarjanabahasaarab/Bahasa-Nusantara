# Penjadwal Kernel (Kernel Scheduler)

Penjadwal bertanggung jawab memutuskan thread mana yang berhak mendapatkan alokasi waktu pemrosesan CPU berikutnya.

## 1. Antrean Siap Bertingkat (Multi-Level Ready Queue)
Kernel Nusantara mengimplementasikan antrean terpisah untuk setiap tingkatan prioritas (1..5):
- **Level 5**: Prioritas Kritis / Kernel Real-time tasks.
- **Level 4**: Prioritas Interaktif / UI & Keyboard Input.
- **Level 3**: Prioritas Standar (Default thread aplikasi pengguna).
- **Level 2**: Prioritas Rendah / Background worker.
- **Level 1**: Prioritas Terendah / Idle task.

Setiap antrean diimplementasikan dengan struktur FIFO (First-In-First-Out). Penjadwal selalu memilih thread dari antrean non-kosong dengan prioritas tertinggi.

## 2. Kebijakan Penjadwalan (Scheduling Policies)
- **`PRIORITY_PREEMPTIVE`**: Thread dengan prioritas lebih tinggi akan langsung merebut (preempt) eksekusi thread yang sedang berjalan. Interupsi pewaktu (PIT tick) mengurangi sisa kuantum thread saat ini; jika kuantum habis, thread dikembalikan ke ekor antrean.
- **`ROUND_ROBIN`**: Seluruh thread dalam antrean yang sama mendapatkan porsi kuantum waktu yang sama secara bergilir.
- **`COOPERATIVE`**: Thread berjalan sampai secara sukarela memanggil `sys_thread_yield()` atau meminta operasi I/O yang memblokir.

## 3. Pencegahan Kelaparan (Starvation Prevention / Priority Boosting)
Setiap 1000 ticks kernel, scheduler menaikkan skor prioritas sementara untuk thread yang telah lama menunggu di antrean rendah agar tetap memperoleh kesempatan eksekusi.
