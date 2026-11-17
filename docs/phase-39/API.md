# Referensi API Phase 39 — Mobile Networking & Cloud Services

## 1. Standard Library NUSANTARA (`gunakan "std:mobile" sebagai seluler`)
- `seluler.statusJaringan() -> peta`
- `seluler.kirimPermintaan(endpoint : teks, opsi? : peta) -> peta`
- `seluler.autentikasiMasuk(kredensial : peta) -> peta` / `seluler.autentikasiKeluar() -> logika` / `seluler.tokenSekarang() -> teks | kosong`
- `seluler.buatPKCE(clientId, authUrl, tokenUrl, redirectUri, lingkup) -> peta`
- `seluler.tambahAntreanOffline(endpoint, metode, payload?) -> peta` / `seluler.jumlahAntreanOffline() -> bilangan`
- `seluler.sinkronkanData(strategi? : teks) -> peta`
- `seluler.unggahBerkasCloud(namaBerkas, konten, opsi?) -> peta` / `seluler.unduhBerkasCloud(berkasId : teks) -> peta`
- `seluler.simpanDataCloud(tabel, data) -> peta` / `seluler.ambilDataCloud(tabel, filter?) -> peta` / `seluler.hapusDataCloud(tabel, id) -> peta`
- `seluler.terhubungWebSocket(url : teks) -> peta` / `seluler.kirimWebSocket(pesan : teks) -> logika` / `seluler.tutupWebSocket() -> logika`
- `seluler.daftarPushNotifikasi() -> peta` / `seluler.daftarTugasBackground(id, intervalMenit, opsi?) -> logika`
- `seluler.pilihPenyediaCloud(id : teks) -> logika` / `seluler.daftarPenyediaCloud() -> daftar`

## 2. API TypeScript Utama (`src/mobile/networking/`)
- `KlienAPIMobile`: `dapatkan`, `kirim`, `perbarui`, `tambal`, `hapus`, `kepala`, `opsi`, `permintaan`, `permintaanSinkron`, `setTokenHeader`.
- `ManajerPermintaanMobile`: `jadwalkan`, `eksekusiDenganRetry`, `batalkanSemua`, `buatIdempotencyKey`.
- `PengawasJaringanMobile`: `dapatkanStatus`, `apakahOnline`, `aturSimulasiJaringan`, `pantauKeterjangkauan`.
- `PengelolaOperasiOffline`: `aturJalurPersistensi`, `tambah`, `ambilTertunda`, `tandaiStatus`, `dapatkanRingkasan`.
- `MesinSinkronisasiMobile`: `sinkronkanSemua`, `selesaikanKonflik`.
- `KlienAutentikasiMobile`: `masuk`, `keluar`, `perbaruiToken`, `dapatkanTokenAktif`, `buatParameterPKCE`.
- `KlienDatabaseCloudMobile`: `ambilSemua`, `ambilBerdasarkanId`, `tambah`, `ubah`, `hapus`.
- `PengelolaTransferBerkasMobile` / `AdaptorStorageMock` / `AdaptorStorageS3`: `unggah`, `unggahSinkron`, `unduh`, `unduhSinkron`.
- `KlienWebSocketMobile`: `hubungkan`, `kirim`, `tutup`, `tangguhkanLatarBelakang`.
- `LapisanKeamananMobile`: `validasiUrlAman`, `validasiUrlWebSocketAman`, `apakahHostLoopback`, `sanitasiHeader`, `periksaKlaimKlien`, `amankanNamaBerkas`.

## 3. Perintah CLI `nusantara mobile`
- `nusantara mobile jaringan periksa`
- `nusantara mobile cloud info | konfigurasi | validasi`
- `nusantara mobile sync periksa`
