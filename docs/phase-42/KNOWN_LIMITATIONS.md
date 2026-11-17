# Keterbatasan yang Diketahui Phase 42 — OTA Updates & Secure Update System

1. **Google Play In-App Updates & Apple App Store Native SDK**: Kelas `GooglePlayInAppUpdate` dan `AppleAppStoreUpdate` saat ini menyediakan evaluasi kontrak dan deep-link/simulasi ketersediaan; pengujian terhadap library Play Core Android atau SKStoreProductViewController iOS nyata berstatus `BELUM DIVERIFIKASI`.
2. **Penyimpanan Persisten Perangkat**: `ActivationManager` dan `RollbackManager` mengelola state berkas aktif dan cadangan rollback di memori selama proses runtime; persistensi disk terenkripsi per perangkat bergantung pada jembatan runtime target.
3. **Distribusi CDN HTTPS Produksi**: Uji pengunduhan nyata (`[10]`, `[11]`) menggunakan server HTTP loopback `127.0.0.1` dengan payload & tanda tangan Ed25519 nyata; pengujian sertifikat TLS CDN eksternal bergantung pada jaringan produksi.
