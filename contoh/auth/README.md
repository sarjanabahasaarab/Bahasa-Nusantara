# Contoh Autentikasi, Sesi & Otorisasi NUSANTARA (Phase 31 - v0.31.0)

Repositori ini menyertakan contoh lengkap implementasi sistem autentikasi, manajemen sesi berbasis CSPRNG, proteksi brute-force, dan kontrol akses berbasis peran (RBAC) menggunakan bahasa pemrograman **NUSANTARA** dan modul standar **`autentikasi`** (alias **`auth`**).

## Struktur Contoh

```
contoh/auth/
├── aplikasi.nusantara  # Program utama demonstrasi auth & session
└── README.md           # Panduan eksekusi dan dokumentasi alur
```

## Fitur yang Didemonstrasikan

1. **Inisialisasi Database & Skema Otomatis**:
   - Membuka database SQLite (`db.bukaMemori()`).
   - Membuat layanan autentikasi terpadu (`auth.buatLayanan(koneksi)`).
   - Menyiapkan tabel `pengguna`, `sesi`, dan `token_reset_password` via parameterized DDL (`layanan.inisialisasiSkema()`).
2. **Pendaftaran Pengguna Aman**:
   - Hashing password otomatis menggunakan **Scrypt KDF** (RFC 7914 memory-hard, N=16384, r=8, p=1).
   - Sanitasi profil tanpa membocorkan hash kata sandi.
3. **Login dengan Anti-Enumeration & Waktu Konstan**:
   - Mencegah kebocoran eksistensi username melalui timing verification konstan.
   - Mengembalikan pesan kesalahan seragam: `Kredensial login tidak valid.`
4. **Manajemen Sesi Berbasis CSPRNG**:
   - Token sesi 32-byte (256-bit) cryptographically secure random number generator.
   - Penyimpanan database hanya menyimpan hash token SHA-256 (perlindungan terhadap kebocoran database).
5. **Role-Based Access Control (RBAC)**:
   - Validasi peran bawaan: `pengguna`, `editor`, `admin`.
   - Pemeriksaan hak akses bawaan: `auth.apakahAdmin(pengguna)`.
6. **Perlindungan Session Fixation (Rotasi Sesi)**:
   - Mengganti ID sesi lama dengan sesi baru yang valid tanpa mengubah konteks pengguna (`layanan.rotasiSesi(token)`).
7. **Logout & Invalidation Sesi**:
   - Menghapus sesi secara tuntas dari tabel database.

## Cara Menjalankan

Jalankan program menggunakan runner interpreter NUSANTARA:

```bash
# Melalui script pengujian / runner interpreter
npx tsx -e '
import * as fs from "fs";
import { Interpreter } from "./src/interpreter/index";
const code = fs.readFileSync("contoh/auth/aplikasi.nusantara", "utf-8");
const interp = new Interpreter();
interp.jalankanKode(code);
'
```
