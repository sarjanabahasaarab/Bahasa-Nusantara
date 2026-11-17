# Pengujian Phase 41 — Store Publishing & Digital Signing

## 1. Perintah Verifikasi
- TypeScript lint: `npm run lint` (`tsc --noEmit`) — exit `0`
- Suite Fase 41: `npm run test:publikasi-v41` (`tsx pengujian/mobile/uji_publikasi_fase41.ts`) — **107/107 LULUS**

## 2. Cakupan Suite `uji_publikasi_fase41.ts`
- `[1]` `SecretProvider` & `CredentialValidator` (penyamaran PEM/Bearer/email, validasi Service Account & ASC `.p8`, anti-hardcode scanner).
- `[2]` `GooglePlayClient`, `PlayValidation`, & `PlayTrackManager` (mode sandbox, penolakan SDK < 34, penolakan downgrade versionCode, 4 track resmi).
- `[3]` `AppStoreConnectClient`, `TestFlightManager`, & `IOSValidation` (JWT ES256 header/payload, TestFlight 90 hari, penolakan Bundle ID/build 0).
- `[4]` `AppMetadataManager`, `LocalizationManager` (7 bahasa), `ScreenshotManager`, & `ReleaseNotesManager`.
- `[5]` `ApprovalGate`, `ReleasePipeline` 11 tahap, & `RollbackPlanner` (penolakan downgrade langsung).
- `[6]` `ComplianceValidator`, `ReleaseReadiness`, & `StoreValidator`.
- `[7]` `PublishingHistoryManager` & `PublishingReportGenerator` (`publishing-report-*.md/json` tanpa leak rahasia).
- `[8]` Seluruh perintah CLI `nusantara mobile store` termasuk kewajiban flag `--setujui` pada `release production`.
- `[9]` Eksekusi program `.nusantara` lewat `std:mobile`.
- `[10]` Loopback HTTP REST Store API nyata dengan verifikasi kriptografis tanda tangan **RS256** (Google Play) & **ES256** (`ieee-p1363` Apple) + unggahan `.aab` `octet-stream`.
- `[11]` Pengujian Keamanan Baru:
  - Penolakan URL HTTP eksternal non-loopback & URL berkredensial tertanam.
  - Verifikasi RS256 & ES256 terhadap serangan `alg=none`, audience mismatch, dan payload tampering.
  - Verifikasi `ReleasePipeline` mewajibkan persetujuan eksplisit saat `channelIOS === 'appstore'`.
  - Kegagalan jujur `GooglePlayClient.dapatkanStatusTrack` pada HTTP 500 + penyensoran `?token=` di log.
