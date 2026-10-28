# Arsitektur Internal: Autentikasi, Sesi & Kontrol Akses NUSANTARA

Dokumentasi arsitektur internal, model ancaman (*threat model*), dan mitigasi keamanan sistem autentikasi serta kontrol akses bahasa pemrograman **NUSANTARA** (`v0.31.0` - Phase 31).

---

## 1. Diagram Arsitektur Sistem Autentikasi

```
                                  [ Permintaan HTTP Klien ]
                                              │
                                              ▼
                    [ Middleware Sesi / Header Authorization / Cookie ]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
             (Token Sesi Ditemukan)                         (Permintaan Publik)
                      │                                               │
                      ▼                                               ▼
         [ SHA-256 Hashing Token ]                              [ Rute Publik ]
                      │
                      ▼
            [ Query Tabel `sesi` ]
                      │
     ┌────────────────┴────────────────┐
     │                                 │
(Sesi Valid & Aktif)       (Kedaluwarsa / Tidak Ditemukan)
     │                                 │
     ▼                                 ▼
[ Muat Profil Pengguna ]       [ Hapus Sesi / Reset Cookie ]
     │                                 │
     ▼                                 ▼
[ Injeksi ke `req.pengguna` ]   [ Status 401 Unauthorized ]
     │
     ▼
[ Evaluasi Hak Akses (RBAC) ]
     │
 ┌───┴───┐
 │       │
(Izin) (Ditolak)
 │       │
 ▼       ▼
[ Handler ] [ 403 Forbidden ]
```

---

## 2. Struktur Modul & Pemisahan Komponen

| Komponen | Berkas Sumber | Tanggung Jawab Utama |
|---|---|---|
| `jenis.ts` | `src/autentikasi/jenis.ts` | Definisi tipe TypeScript: `Pengguna`, `Sesi`, `OpsiAutentikasi`, `GalatAutentikasi`, dll. |
| `password.ts` | `src/autentikasi/password.ts` | Scrypt KDF hashing, verifikasi waktu konstan, dan penegakan kebijakan password. |
| `pengguna.ts` | `src/autentikasi/pengguna.ts` | Repositori akun pengguna, validasi integritas unik, parameterized queries, dan sanitasi profil aman. |
| `sesi.ts` | `src/autentikasi/sesi.ts` | Generator token CSPRNG 256-bit, token hashing SHA-256, rotasi sesi, dan evaluasi masa aktif (idle/absolut). |
| `rbac.ts` | `src/autentikasi/rbac.ts` | Mesin kontrol akses berbasis peran (*Role-Based Access Control*) dan pencocokan izin wildcard berbasis namespace. |
| `csrf.ts` | `src/autentikasi/csrf.ts` | Pembuatan token CSRF kriptografis, penyematan cookie, dan middleware verifikasi konstan pada metode mutasi HTTP. |
| `layanan.ts` | `src/autentikasi/layanan.ts` | Orkestrator terpadu `LayananAutentikasi` yang menyatukan alur registrasi, anti-enumeration login, dan brute-force guard. |
| `middleware.ts` | `src/autentikasi/middleware.ts` | Integrasi middleware web NUSANTARA (`wajibAutentikasi`, `wajibPeran`, `wajibIzin`, `sesi`, `csrf`). |
| `autentikasi.ts` | `src/stdlib/autentikasi.ts` | Jembatan pustaka standar yang mengekspos fungsi modul `autentikasi` dan alias `auth` ke runtime interpreter. |

---

## 3. Model Ancaman (Threat Model) & Strategi Mitigasi

### 1. Kebocoran Eksistensi Akun (Account Enumeration)
- **Vektor**: Penyerang memasukkan username berbeda dan mengukur perbedaan waktu respons atau pesan kesalahan untuk mengetahui apakah username terdaftar.
- **Mitigasi**:
  1. Jika pengguna tidak ditemukan di database, sistem menjalankan *dummy password verification* dengan salt dan hash sintetis berbobot komputasi identik.
  2. Pesan kesalahan seragam: `"Kredensial login tidak valid."` (HTTP 401).

### 2. Serangan Brute-Force & Credential Stuffing
- **Vektor**: Penyerang mencoba ribuan kombinasi kata sandi secara berulang.
- **Mitigasi**:
  1. Sistem melacak jumlah kegagalan login per pengenal/IP.
  2. Akun/IP dikunci sementara secara otomatis setelah 5 kali kegagalan berturut-turut selama 15 menit.
  3. Status HTTP `429 Too Many Requests` dikembalikan saat akun terkunci.

### 3. Kebocoran Basis Data (Database Dump Leak)
- **Vektor**: Basis data SQLite bocor akibat celah backup atau server intrusion.
- **Mitigasi**:
  1. Kata sandi di-hash dengan **Scrypt KDF** berbobot memori (memory-hard), mempersulit serangan cracking GPU/ASIC secara masif.
  2. Token sesi disimpan dalam format **hash SHA-256**, bukan plaintext. Penyerang yang memiliki salinan database tidak dapat menggunakan hash tersebut untuk menyamar sebagai pengguna aktif.

### 4. Serangan Pembajakan Sesi & Session Fixation
- **Vektor**: Penyerang menanamkan session ID sebelum korban login, atau mencuri token sesi dari kanal jaringan atau XSS.
- **Mitigasi**:
  1. Token sesi dibuat dari sumber entropi tinggi (`crypto.randomBytes(32)`).
  2. Dukungan rotasi token sesi segera setelah login berhasil atau saat eskalasi privilese.
  3. Atribut cookie: `HttpOnly` (skrip klien tidak dapat membaca cookie), `SameSite=Lax` (cookie tidak terkirim otomatis pada tautan pihak ketiga), dan `Path=/`.

### 5. Cross-Site Request Forgery (CSRF)
- **Vektor**: Situs jahat mengeksekusi aksi mutasi data atas nama pengguna yang sedang terautentikasi tanpa sepengetahuan pengguna.
- **Mitigasi**:
  1. Middleware CSRF menolak permintaan ber-metode `POST`, `PUT`, `PATCH`, atau `DELETE` jika tidak menyertakan token CSRF yang cocok pada tajuk `X-CSRF-Token` atau payload formulir.
  2. Verifikasi token CSRF dilakukan dengan perbandingan waktu konstan.
