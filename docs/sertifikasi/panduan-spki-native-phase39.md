# Panduan SPKI Pinning Native — Phase 39

Dokumen ini menjelaskan konfigurasi pin native yang baru ditambahkan. Pin tidak boleh diisi dengan contoh, fingerprint palsu, atau nilai yang ditebak.

## Membuat pin SPKI dari sertifikat server

Gunakan hostname dan sertifikat yang benar-benar dipakai layanan produksi:

```bash
HOST=api.domain-anda.example
openssl s_client -connect "$HOST:443" -servername "$HOST" </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | openssl base64 -A
```

Tambahkan awalan `sha256/` pada hasil Base64. Verifikasi hasil dari dua jaringan dan siapkan minimal satu pin cadangan untuk rotasi sertifikat sebelum rilis.

## Android

Implementasi: `native/android/app/src/main/java/id/nusantara/mobile/security/NativeNetworkSecurity.java`

Gunakan hostname DNS persis (wildcard, port, dan URL path ditolak):

```java
OkHttpClient client = NativeNetworkSecurity.createPinnedClient(
    "api.domain-anda.example",
    Arrays.asList("sha256/BASE64_SPki_DIGEST", "sha256/ROTATION_BACKUP_DIGEST")
);
```

OkHttp tetap menjalankan validasi rantai sertifikat TLS dan hostname verification sistem; pinning menambahkan pemeriksaan SPKI.

## iOS

Implementasi: `native/ios/NusantaraMobile/NativeNetworkSecurity.swift`

```swift
let security = try NativeNetworkSecurity(hostPins: [
    "api.domain-anda.example": [
        "sha256/BASE64_SPki_DIGEST",
        "sha256/ROTATION_BACKUP_DIGEST"
    ]
])
let session = security.session
```

Delegate mengevaluasi trust sistem terlebih dahulu, kemudian membangun DER SubjectPublicKeyInfo dari public key RSA atau EC P-256/P-384 dan membandingkan SHA-256 pin. Host yang tidak dikonfigurasi tetap mendapat validasi TLS sistem biasa; host yang dipin akan dibatalkan jika tidak ada pin yang cocok.

## Batas verifikasi

- Build Android/iOS pada CI membuktikan source native terkompilasi, bukan bahwa aplikasi produksi sudah memakai client tersebut.
- Pengujian jaringan harus dilakukan pada perangkat Android dan iPhone nyata melalui Wi-Fi dan jaringan seluler.
- Uji sertifikat salah, expired, hostname salah, pin lama, pin cadangan, rotasi key, captive portal, dan kondisi offline.
- Jangan menonaktifkan TLS trust evaluation untuk membuat pinning test lulus.
- Phase 39 tetap NOT_VERIFIED untuk perangkat fisik sampai evidence perangkat dan log pengujian disimpan.
