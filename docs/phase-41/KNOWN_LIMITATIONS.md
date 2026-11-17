# Keterbatasan yang Diketahui Phase 41 — Store Publishing & Digital Signing

1. **Tidak Ada Akses ke Akun Produksi Google Play & App Store Connect**:
   - Pengujian REST API dijalankan terhadap server HTTP loopback lokal menggunakan kunci RSA-2048 dan EC P-256 yang dibuat dinamis saat runtime; unggahan produksi nyata ke `androidpublisher.googleapis.com` maupun `api.appstoreconnect.apple.com` belum dijalankan tanpa kredensial resmi.
2. **Transporter / `xcrun altool` Membutuhkan macOS**:
   - Pada host non-macOS (`linux`), pengunggahan IPA langsung lewat `altool` memakai jalur REST atau laporan jembatan standalone, sehingga verifikasi akhir Apple TestFlight processing wajib dijalankan di macOS dengan Xcode/Transporter.
3. **Aset Grafis Toko**:
   - Validasi dimensi ikon & screenshot dalam unit test memeriksa struktur metadata aset (`ScreenshotManager`); verifikasi konten piksel PNG aktual bergantung pada berkas aset lokal proyek.
