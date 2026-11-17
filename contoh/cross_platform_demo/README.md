# NUSANTARA CROSS-PLATFORM DEMO

Demonstrasi dan pengujian E2E terpadu yang menghubungkan **Phase 23** serta **Phase 36–42** dalam satu skenario aplikasi lintas platform nyata:
- **Skrip Bahasa NUSANTARA (`demo_terpadu.nusantara`)**: Menggabungkan `std:gui` dan `std:mobile` (Desktop Window, Mobile UI, Native Device API, `PenyimpananAman`, Kesiapan Toko, & Pemeriksaan Pembaruan).
- **Pipeline TypeScript E2E (`pengujian/integrasi/uji_demo_terpadu.ts`)**:
  1. Mengeksekusi `demo_terpadu.nusantara` lewat `Interpreter` NUSANTARA.
  2. Merender framebuffer Desktop (`BMP` valid) & mengemas bundel Desktop terverifikasi `SHA256SUMS` (Phase 23 & 36).
  3. Membangun UI Mobile, memeriksa probe SDK, menyimpan token di `PenyimpananAmanMobile` AES-256-GCM, serta mengekspor plugin native Kotlin/Swift (Phase 37 & 38).
  4. Berkomunikasi dengan server HTTP REST & WebSocket loopback + antrean sinkronisasi offline persisten (Phase 39).
  5. Membangun paket Android `.apk`/`.aab` dan `.xcarchive` iOS lalu memvalidasi integritas SHA-256 & PKZIP CRC-32 nyata di disk (Phase 40).
  6. Mengunggah bundel ke Store API loopback dengan JWT RS256 & ES256 terverifikasi `node:crypto` + validasi gerbang persetujuan rilis (Phase 41).
  7. Menerapkan pembaruan resource OTA bertanda tangan Ed25519 lewat server HTTP loopback & memverifikasi rollback otomatis `aktivasiDenganHealthCheck` (Phase 42).

## Cara Menjalankan
```bash
npm run test:demo-terpadu
```
