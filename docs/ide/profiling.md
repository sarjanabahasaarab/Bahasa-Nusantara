# Panduan Pengukuran Kinerja (Profiling) di IDE NUSANTARA

IDE NUSANTARA menyediakan panel visualisasi kinerja yang terhubung dengan **Profiler Runtime Phase 25**.

---

## 1. Menjalankan Profiling

1. Buka berkas kode sumber yang memiliki fungsi iteratif atau komputasi intensif.
2. Klik tombol **Pengukur Kinerja** (ikon grafik aktivitas) di bilah navigasi atas atau ketik `cmd.profiler` di Command Palette (`Ctrl+Shift+P`).
3. IDE akan menjalankan eksekusi dan mengumpulkan metrik waktu secara otomatis.

---

## 2. Metrik yang Ditampilkan

- **Waktu Eksekusi Total (Total Time)**: Durasi keseluruhan berjalannya program dalam satuan milidetik (`ms`).
- **Frekuensi Pemanggilan (Call Count)**: Jumlah berapa kali suatu fungsi dipanggil selama siklus eksekusi.
- **Rata-rata Waktu per Panggilan (Average Time)**: Rasio antara total waktu fungsi dibagi jumlah pemanggilannya.
- **Estimasi Memori Runtime**: Penggunaan memori heap dan alokasi objek selama eksekusi program.
