# Arsitektur Phase 39 — Mobile Networking & Cloud Services

## 1. Gambaran Umum
Phase 39 menyediakan tumpukan jaringan mobile, autentikasi, antrean offline persisten, mesin sinkronisasi konflik, transfer berkas cloud, WebSocket waktu-nyata, basis data REST cloud, push notification, serta sinkronisasi latar belakang bagi aplikasi NUSANTARA Mobile (`src/mobile/networking/`), terhubung langsung dengan `std:mobile` dan CLI `nusantara mobile`.

## 2. Komponen Arsitektur (`/src/mobile/networking/`)
- **Core & Scheduling (`/core/`)**:
  - `api_client.ts` (`KlienAPIMobile`): Klien REST (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, dan `permintaanSinkron`), manajemen header `Authorization`, injeksi `Idempotency-Key`, validasi TLS dan kredensial URL pra-permintaan, integrasi antrean offline otomatis saat mutasi dilakukan ketika offline, serta propagasi galat koneksi nyata tanpa fallback `200 OK` palsu.
  - `request_manager.ts` (`ManajerPermintaanMobile`): Penjadwal prioritas (`tinggi`, `normal`, `rendah`), konkurensi terkontrol (`pengendaliAktif`), `batalkanSemua()`, deduplikasi idempotency (dibatasi 500 entri), dan retry exponential backoff + jitter yang merespons `AbortSignal`.
- **Connectivity & Offline Sync (`/connectivity/`, `/offline/`, `/sync/`, `/background/`)**:
  - `network_monitor.ts` (`PengawasJaringanMobile`): Pemantauan status `online` / `offline` / `terbatas`, tipe koneksi (`wifi`, `seluler`, `ethernet`, `tidak_ada`), serta probe keterjangkauan backend.
  - `offline_queue.ts` (`PengelolaOperasiOffline`): Antrean mutasi offline dengan persistensi disk atomik (`.tmp` + `renameSync`), validasi isi berkas JSON saat muat ulang, dan pelacakan status (`tertunda`, `diproses`, `gagal`, `sukses`).
  - `sync_engine.ts` (`MesinSinkronisasiMobile`): Flush antrean offline ke `KlienAPIMobile` dan resolusi konflik (`server_menang`, `klien_menang`, `tulis_terakhir_menang`, `manual`) termasuk penanganan HTTP `409 Conflict`.
  - `background_sync.ts` (`PengelolaTugasBackgroundMobile`): Pendaftaran dan pemfilteran tugas berkala berdasarkan batasan jaringan (`wajibWifi`) dan baterai (`minBaterai`).
- **Auth, Database, Storage, Realtime & Push**:
  - `auth/auth_client.ts` (`KlienAutentikasiMobile`): Masuk, penyegaran token, keluar, penyimpanan token via `PenyimpananAmanMobile` (AES-256-GCM Phase 38), dan generasi parameter OAuth 2.0 PKCE (`code_verifier` & `code_challenge` S256).
  - `database/cloud_database.ts` (`KlienDatabaseCloudMobile`): CRUD REST (`ambilSemua`, `ambilBerdasarkanId`, `tambah`, `ubah`, `hapus`) dengan sanitasi segmen path anti-traversal.
  - `storage/cloud_storage.ts` (`PengelolaTransferBerkasMobile`, `AdaptorStorageMock`, `AdaptorStorageS3`): Unggah/unduh berkas, pelacakan progres, batas ukuran 50 MB, serta cache sinkron untuk pemanggilan dari skrip `.nusantara`.
  - `realtime/websocket_client.ts` (`KlienWebSocketMobile`): Koneksi WebSocket (`ws:`/`wss:`), heartbeat, penangguhan latar belakang, pembersihan handler saat `tutup()`, serta filter anti-prototype-pollution pada payload JSON masuk.
  - `push/push_notification.ts` (`PengelolaNotifikasiPushMobile`): Manajemen token perangkat, handler notifikasi masuk, dan routing deep link.
- **Security, Providers & Config (`/security/`, `/providers/`, `/config/`)**:
  - `cloud_security.ts` (`LapisanKeamananMobile`), `provider_registry.ts` (`RegistriPenyediaCloud`), dan `cloud_config.ts` (`PengelolaKonfigurasiCloud`).
