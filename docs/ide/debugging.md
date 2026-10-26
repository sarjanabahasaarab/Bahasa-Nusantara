# Panduan Penelusuran (Debugging) di IDE NUSANTARA

IDE NUSANTARA mengintegrasikan langsung subsistem penelusuran dari **Phase 25 (Debugger & Profiler)**.

---

## 1. Menetapkan Titik Henti (Breakpoints)

- **Gutter Klik**: Klik pada area di samping nomor baris di sisi kiri editor untuk memasang titik henti (lingkaran merah).
- **Pintasan Keyboard**: Letakkan kursor pada baris yang diinginkan lalu tekan `F9`.
- **Daftar Breakpoint**: Buka panel **Penelusur (Debugger)** di bilah sisi kiri untuk melihat seluruh titik henti aktif dan menghapusnya secara selektif.

---

## 2. Memulai Sesi Debug

1. Buka berkas `.nusantara` yang ingin ditelusuri.
2. Pasang minimal satu titik henti pada baris instruksi yang valid.
3. Klik tombol **Mulai Penelusuran** (ikon serangga) di bilah atas atau tekan `Shift + F5`.
4. Interpreter akan mengeksekusi program hingga mencapai breakpoint yang ditentukan.

---

## 3. Panel Penelusur (Debug Panels)

- **Variabel Lokal & Global**: Menampilkan nilai mutakhir dan tipe data dari setiap identifier yang berada di lingkup aktif.
- **Tumpukan Panggilan (Call Stack)**: Menampilkan rantai pemanggilan bingkai fungsi (`Frame 0`, `Frame 1`, dst.).
- **Konsol Debug & Evaluator Dinamis**: Menguji ekspresi matematika atau memeriksa variabel langsung saat program dalam kondisi jeda.
