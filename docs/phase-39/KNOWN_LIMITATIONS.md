# Keterbatasan yang Diketahui Phase 39 — Mobile Networking & Cloud Services

1. **Domain Testing `.test` / `.internal` / `*mock*`**:
   - Permintaan HTTP ke hostname berakhiran `.test`, `.internal`, atau mengandung `mock` diselesaikan secara lokal di memori untuk unit testing tanpa koneksi eksternal; semua host lain termasuk `127.0.0.1` / `localhost` melewati `fetch()` nyata dan gagal secara jujur bila server tidak aktif.
2. **Eksekusi Sinkron `permintaanSinkron` pada Skrip `.nusantara`**:
   - Interpreter NUSANTARA saat ini bersifat sinkron; oleh karena itu `seluler.kirimPermintaan` memakai jalur sinkron (`permintaanSinkron`) serta cache sinkron pada transfer berkas, sedangkan soket HTTP/WebSocket TCP asinkron berjalan lewat API TypeScript `async`/`await`.
3. **Layanan Cloud Eksternal & Push Gateway Fisik**:
   - Integrasi langsung dengan akun produksi Supabase, Firebase, AWS S3, Apple APNs, dan Google FCM belum dijalankan secara end-to-end karena tidak adanya kredensial layanan dan perangkat Android/iOS fisik di lingkungan pengujian.
4. **Pembatasan Certificate Pinning Native**:
   - Kebijakan `validasiTLS` di runtime Node.js memverifikasi skema `https://` dan menolak host eksternal HTTP polos; implementasi *SPKI SHA-256 certificate pinning* tingkat sistem operasi bergantung pada runtime native OkHttp (Android) dan `URLSession` (iOS).
