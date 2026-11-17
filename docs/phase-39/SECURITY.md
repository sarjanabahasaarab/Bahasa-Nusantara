# Keamanan Phase 39 — Mobile Networking & Cloud Services

## 1. Kontrol Keamanan yang Diterapkan
- **Kebijakan TLS & Integritas URL (`periksaKebijakanTLS`, `validasiUrlAman`, `validasiUrlWebSocketAman`)**:
  - Memblokir koneksi HTTP tidak terenkripsi (`http://`) ke host eksternal ketika `validasiTLS === true` dan mewajibkan HTTPS pada profil `produksi`.
  - Menolak URL dengan kredensial tertanam (`user:pass@host`) dan skema selain `http:`/`https:` (REST) atau `ws:`/`wss:` (WebSocket).
- **Anti-CRLF Injection (`sanitasiHeader`, `setTokenHeader`)**:
  - Memeriksa nama dan nilai seluruh header HTTP terhadap karakter `\r`, `\n`, dan `\0` sebelum dikirim ke layer jaringan.
- **Anti-Path Traversal (`sanitasiSegmenPath`, `amankanNamaBerkas`)**:
  - Seluruh segmen `tabel` dan `id` pada `KlienDatabaseCloudMobile` menolak `..`, `/`, `\`, `?`, `#`, serta NUL byte dan di-*encode* dengan `encodeURIComponent`.
  - Nama berkas storage cloud (`AdaptorStorageMock` dan `AdaptorStorageS3`) menolak karakter pemisah jalur, `.`, `..`, NUL, dan membatasi ukuran unggahan hingga 50 MB.
- **Anti-Prototype Pollution & Validasi Klaim Rekusrif**:
  - Parsing payload JSON WebSocket membersihkan kunci `__proto__`, `constructor`, dan `prototype`.
  - `periksaKlaimKlien()` menelusuri objek/larik bersarang secara rekursif untuk memblokir injeksi klaim hak istimewa sisi klien.
- **Persistensi Offline Atomik (`PengelolaOperasiOffline`)**:
  - Penulisan antrean offline menggunakan berkas sementara `.tmp` lalu `renameSync`, disertai validasi tipe array dan field saat pemuatan ulang dari disk.
- **Kejujuran Kegagalan Jaringan**:
  - Menghilangkan respons `200 OK` palsu di blok penangkap galat jaringan agar lapisan atas (`MesinSinkronisasiMobile`, antrean offline, dan penangan galat aplikasi) memperoleh sinyal kegagalan yang akurat.
