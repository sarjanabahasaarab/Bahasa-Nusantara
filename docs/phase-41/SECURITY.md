# Keamanan Phase 41 — Store Publishing & Digital Signing

## 1. Kontrol Keamanan yang Diterapkan
- **Penandatanganan Kriptografis JWT Asimetris**:
  - `GooglePlayClient` memakai RSA SHA-256 (`RS256`) untuk assertion OAuth Service Account; `AppStoreConnectClient` memakai ECDSA P-256 SHA-256 format IEEE P1363 (`ES256`, masa berlaku 20 menit).
  - Verifier `verifikasiAssertionJWTRS256` & `verifikasiJWTES256` menolak token ber-header `alg=none`, payload terubah, audience salah, atau kedaluwarsa (`exp`).
- **Gerbang Persetujuan Rilis Eksplisit (`ApprovalGate` + CLI `--setujui`)**:
  - Publikasi ke Google Play track `production` maupun Apple `appstore` diblokir secara default hingga disetujui secara eksplisit oleh pengguna; flag `otomatisSetujuiNonProduksi` dibatasi ketat pada track non-produksi.
- **Perlindungan Rahasia Tanpa Hardcoded Keys (`SecretProvider`, `CredentialValidator`, `CredentialManager`)**:
  - Kredensial dimuat dari environment variable atau jalur file bebas NUL byte, disamarkan pada seluruh log/laporan (PEM key, Bearer token, query `?token=`, email service account, dan field password JSON).
- **Kebijakan Endpoint HTTPS**:
  - Endpoint REST Google Play & App Store Connect menolak HTTP eksternal tidak terenkripsi dan URL berkredensial tertanam (`user:pass@host`).
