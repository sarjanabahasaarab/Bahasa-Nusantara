# Dukungan Platform Phase 42 — OTA Updates & Secure Update System

| Kemampuan | Lingkungan Uji Linux (Saat Ini) | Target Produksi Mobile | Status |
|---|---|---|---|
| Parsing & Validasi Skema Manifest OTA | Node.js TypeScript Runtime | Android / iOS / CLI | **TERVERIFIKASI** |
| Kriptografi Tanda Tangan Ed25519 & SHA-256 | `node:crypto` nyata | Node / Mobile Native | **TERVERIFIKASI** |
| Pengunduhan Manifest & Payload HTTP Loopback | Server HTTP `127.0.0.1` nyata | HTTPS CDN Produksi | **TERVERIFIKASI (Loopback)** |
| Aktivasi Atomik & Rollback Resource Memori + Health Check | Runtime TypeScript | Runtime Aplikasi Mobile | **TERVERIFIKASI** |
| Google Play Core In-App Updates (`AppUpdateManager`) | Bridge kontrak & simulasi status | Perangkat Android + Play Store | **BELUM DIVERIFIKASI** |
| Apple App Store Update Check (iTunes Lookup / StoreKit) | Bridge deep-link & kontrak | Perangkat iOS + App Store | **BELUM DIVERIFIKASI** |
