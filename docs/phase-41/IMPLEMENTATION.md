# Implementasi Phase 41 — Store Publishing & Digital Signing

## 1. Perbaikan & Penguatan Terimplementasi
1. **Validasi Endpoint TLS & Verifier Kriptografis JWT (`GooglePlayClient.ts`, `AppStoreConnectClient.ts`)**:
   - Menambahkan validasi URL endpoint pada konstruktor kedua klien toko: hanya mengizinkan `https://` atau `http://` loopback lokal (`127.0.0.1` / `localhost` / `::1`) dan menolak kredensial URL tertanam (`user:pass@host`).
   - Menambahkan verifier statis `GooglePlayClient.verifikasiAssertionJWTRS256()` dan `AppStoreConnectClient.verifikasiJWTES256()` yang memverifikasi algoritma (`RS256`/`ES256`, menolak `alg=none`), masa berlaku `exp`, kesesuaian audience `aud`, serta tanda tangan RSA/ECDSA IEEE-P1363.
   - Memeriksa respons HTTP `PUT /tracks/{track}` saat `unggahAAB()` dan melempar galat jujur pada `dapatkanStatusTrack()` mode live bila endpoint toko mengembalikan HTTP error.
2. **Penutupan Celah Persetujuan App Store (`src/mobile/publishing/automation/ReleasePipeline.ts`)**:
   - Memperbaiki kondisi tahap `persetujuan_pengguna` sehingga rilis iOS ke saluran `'appstore'` juga diperlakukan sebagai rilis produksi yang mewajibkan persetujuan manual (tidak bisa dilewati meskipun `otomatisSetujuiNonProduksi: true`).
3. **Pengetatan Penyamaran & Validasi Kredensial (`SecretProvider.ts`, `CredentialValidator.ts`, `CredentialManager.ts`)**:
   - Memperluas penyamaran log untuk query string `?token=` / `?key=` / `?secret=` dan kunci PEM `EC`/`OPENSSH`/`ENCRYPTED`.
   - Memverifikasi pasangan lengkap marker `-----BEGIN ... PRIVATE KEY-----` dan `-----END ... PRIVATE KEY-----` di `CredentialValidator` serta menolak karakter NUL pada jalur berkas kredensial di `CredentialManager`.
