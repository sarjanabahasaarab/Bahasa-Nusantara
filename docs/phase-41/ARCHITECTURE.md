# Arsitektur Phase 41 — Store Publishing & Digital Signing

## 1. Gambaran Umum
Phase 41 mengelola integrasi publikasi toko aplikasi, otentikasi API Google Play (RS256 JWT) dan App Store Connect (ES256 JWT), validasi metadata/aset toko, kepatuhan kebijakan privasi, gerbang persetujuan eksplisit, pipeline rilis 11 tahap, serta jejak audit publikasi (`src/mobile/publishing/`).

## 2. Komponen Arsitektur (`/src/mobile/publishing/`)
- **Core & Registry (`/core/`)**:
  - `PublishingManager.ts`: Fasad pengelola kesiapan, laporan rilis (`laporanPublikasi`), dan koordinasi klien Google Play & Apple App Store Connect.
  - `StoreRegistry.ts`: Registri target toko (`google_play`, `app_store`, `testflight`).
- **Google Play & Apple App Store Clients (`/android/`, `/ios/`)**:
  - `GooglePlayClient.ts`, `PlayTrackManager.ts`, `PlayListingManager.ts`, `PlayValidation.ts`, `PlayReleaseManager.ts`: Pembentukan assertion JWT `RS256`, verifikasi JWT, manajemen Edit ID & track (`internal`, `closed`, `open`, `production`), serta unggah `.aab` HTTP `application/octet-stream`.
  - `AppStoreConnectClient.ts`, `AppStoreReleaseManager.ts`, `TestFlightManager.ts`, `IOSValidation.ts`: Pembentukan dan verifikasi JWT `ES256` (`ieee-p1363`), cek `/apps`, kirim `/builds`, serta orkestrasi TestFlight beta.
- **Credentials & Security (`/credentials/`)**:
  - `SecretProvider.ts`: Penyamaran nilai sensitif, email service account, kunci PEM, Bearer token, dan query parameter token pada log.
  - `CredentialValidator.ts`: Validasi Google Service Account JSON, App Store Connect Issuer/Key ID/`.p8`, dan pemindai anti-hardcoded secret.
  - `CredentialManager.ts`: Pemuatan kredensial prioritas ENV (`GOOGLE_PLAY_KEY_JSON`, `APP_STORE_CONNECT_PRIVATE_KEY`) lalu berkas.
- **Automation, Metadata, Compliance & Reports**:
  - `ApprovalGate.ts`, `ReleasePipeline.ts` (11 tahap), `RollbackPlanner.ts`.
  - `AppMetadata.ts`, `StoreListing.ts`, `Localization.ts`, `ScreenshotManager.ts`, `ReleaseNotes.ts`.
  - `ComplianceValidator.ts`, `ReleaseReadiness.ts`, `StoreValidator.ts`, `PublishingHistory.ts`, `PublishingReport.ts`.
