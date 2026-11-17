# Dukungan Platform Phase 41 — Store Publishing & Digital Signing

| Target / Subsistem | Status Verifikasi Lokal | Catatan Pembuktian |
|---|---|---|
| **Signing & Verifikasi JWT (`RS256` & `ES256`) + Endpoint Loopback HTTP** | `TERVERIFIKASI (LULUS)` | Verifikasi kriptografis RSA-SHA256 & ECDSA IEEE-P1363 terhadap server HTTP loopback nyata (`[10]`, `[11]`), 107/107 uji lulus |
| **Workflow `ApprovalGate`, CLI `--setujui`, & Pipeline 11 Tahap** | `TERVERIFIKASI (LULUS)` | Blokade rilis produksi Play Store & App Store teruji |
| **Kredensial SecretProvider / Anti-Hardcode / Audit Trail Markdown** | `TERVERIFIKASI (LULUS)` | Penyamaran rahasia + laporan tersimpan di `dist/mobile/reports/` |
| **Publikasi Nyata ke Google Play Console Production API** | `BELUM DIVERIFIKASI` | Memerlukan akun Google Play Developer & berkas Service Account JSON produksi |
| **Publikasi Nyata ke App Store Connect / TestFlight (`xcrun altool` / Transporter)** | `BELUM DIVERIFIKASI` | Memerlukan akun Apple Developer, host macOS + Xcode, & kunci `.p8` produksi |
