# Referensi Resmi: Autentikasi, Sesi & Kontrol Akses NUSANTARA (Modul `autentikasi` & `auth`)

Bahasa Pemrograman NUSANTARA — Target Versi `v0.31.0` (Phase 31)

---

## 1. Pengantar & Prinsip Desain

Modul **`autentikasi`** (alias **`auth`**) dirancang untuk menyediakan fondasi keamanan identitas pengguna, manajemen sesi terproteksi, dan kontrol akses berbasis peran (*Role-Based Access Control / RBAC*) untuk aplikasi web dan REST API NUSANTARA.

### Prinsip Keamanan Inti (Secure-by-Default):
1. **Pemisahan Konsep Autentikasi vs Otorisasi**:
   - *Autentikasi* ("Siapa Anda?"): Memvalidasi identitas pengguna berdasarkan kredensial (username/email dan password ter-hash).
   - *Otorisasi* ("Apa hak akses Anda?"): Menentukan izin (*permission*) atau peran (*role*) pengguna atas suatu rute atau sumber daya.
2. **Password Hashing Modern (Scrypt KDF)**:
   - Menggunakan algoritma **Scrypt** (RFC 7914) dengan parameter memory-hard `N=16384, r=8, p=1, dkLen=64`.
   - Menggunakan salt acak 16 byte dari CSPRNG (*Cryptographically Secure Pseudo-Random Number Generator*) untuk setiap password.
   - Verifikasi kata sandi dijalankan dalam waktu konstan (`crypto.timingSafeEqual`) guna menangkis serangan *timing side-channel*.
   - Plaintext kata sandi tidak pernah disimpan, dicatat dalam log, atau dikembalikan dalam respons API.
3. **Anti-Enumeration Login**:
   - Jika akun tidak ditemukan saat login, sistem tetap mengeksekusi komputasi hash dummy dengan latensi setara sehingga penyerang tidak dapat menebak keberadaan username melalui analisis waktu respons.
   - Pesan kegagalan seragam: `"Kredensial login tidak valid."`
4. **Token Hashing pada Penyimpanan Sesi**:
   - Token sesi publik (32 byte CSPRNG heksadesimal) hanya dikirimkan kepada klien via cookie `HttpOnly; SameSite=Lax`.
   - Basis data hanya menyimpan representasi hash SHA-256 dari token (`token_hash`). Jika basis data bocor, penyerang tidak dapat langsung membajak sesi aktif pengguna.
5. **Session Fixation Guard & Rotasi Sesi**:
   - Menyediakan fitur rotasi token sesi saat eskalasi hak istimewa atau setelah proses login berhasil.
   - Mendukung batas kedaluwarsa absolut (*absolute timeout*) dan batas kedaluwarsa tidak aktif (*idle timeout*).
6. **Proteksi Brute-Force Bawaan**:
   - Penguncian sementara akun/IP setelah batas kegagalan percobaan login tercapai (default: 5 kali gagal = kunci 15 menit).
7. **Perlindungan Pemalsuan Permintaan Antar-Situs (CSRF)**:
   - Token kriptografis acak yang diverifikasi pada metode mutasi HTTP (`POST`, `PUT`, `PATCH`, `DELETE`).

---

## 2. Mengimpor Modul

Modul autentikasi dapat diimpor ke dalam program NUSANTARA dengan variasi berikut:

```nusantara
// Bentuk standar
gunakan "autentikasi" sebagai auth

// Bentuk alias
gunakan "auth" sebagai auth

// Bentuk prefix standar
gunakan "std:autentikasi" sebagai auth
gunakan "std:auth" sebagai auth
```

---

## 3. Ekspor Modul `autentikasi`

### A. `auth.hashPassword(password: teks) -> teks`
Menghasilkan string hash berformat `$scrypt$N=16384,r=8,p=1$salt$hash`.

### B. `auth.verifikasiPassword(password: teks, hashTersimpan: teks) -> logika`
Memeriksa kecocokan kata sandi dengan hash tersimpan menggunakan perbandingan waktu konstan.

### C. `auth.buatLayanan(koneksiDb: peta, opsi?: peta) -> peta`
Membuat instans `LayananAutentikasi` terintegrasi yang terhubung dengan adaptor basis data relasional.

### D. `auth.apakahTerautentikasi(req: peta) -> logika`
Memeriksa apakah objek permintaan HTTP memiliki data pengguna aktif yang terverifikasi.

### E. `auth.dapatkanPenggunaSaatIni(req: peta) -> peta | kosong`
Mengembalikan profil pengguna terautentikasi saat ini atau nilai `kosong`.

### F. `auth.apakahAdmin(pengguna: peta) -> logika`
Memeriksa apakah profil pengguna memiliki peran `admin` atau `administrator`.

---

## 4. Metode Instans Layanan (`layanan`)

| Metode | Parameter | Tipe Kembalian | Keterangan |
|---|---|---|---|
| `inisialisasiSkema()` | - | `logika` | Membuat tabel `pengguna`, `sesi`, dan `token_reset_password` otomatis |
| `registrasi(username, email, password, role?)` | `teks, teks, teks, teks?` | `peta` | Mendaftarkan pengguna baru dengan Scrypt KDF |
| `daftar(...)` | - | `peta` | Alias untuk `registrasi` |
| `login(pengenal, password, ip?)` | `teks, teks, teks?` | `peta` | Melakukan proses login anti-enumeration |
| `masuk(...)` | - | `peta` | Alias untuk `login` |
| `logout(tokenSesi)` | `teks` | `logika` | Menghapus sesi aktif dari database |
| `keluar(...)` | - | `logika` | Alias untuk `logout` |
| `validasiSesi(tokenSesi)` | `teks` | `peta \| kosong` | Memvalidasi keabsahan token sesi dan masa aktifnya |
| `rotasiSesi(tokenSesi)` | `teks` | `peta` | Merotasi token sesi aktif untuk mencegah session fixation |
| `ubahPassword(id, sandiLama, sandiBaru)` | `bilangan, teks, teks` | `logika` | Mengubah kata sandi dan menginvalidasi sesi lain |

---

## 5. Model Tabel Basis Data

### 1. Tabel `pengguna`
```sql
CREATE TABLE IF NOT EXISTS pengguna (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pengguna',
  status TEXT NOT NULL DEFAULT 'aktif',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pengguna_username ON pengguna (username);
CREATE INDEX IF NOT EXISTS idx_pengguna_email ON pengguna (email);
```

### 2. Tabel `sesi`
```sql
CREATE TABLE IF NOT EXISTS sesi (
  id TEXT PRIMARY KEY,
  pengguna_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_activity TEXT NOT NULL,
  ip_klien TEXT,
  user_agent TEXT,
  FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sesi_token_hash ON sesi (token_hash);
CREATE INDEX IF NOT EXISTS idx_sesi_pengguna_id ON sesi (pengguna_id);
```

### 3. Tabel `token_reset_password`
```sql
CREATE TABLE IF NOT EXISTS token_reset_password (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pengguna_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  digunakan INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE
);
```

---

## 6. Role-Based Access Control (RBAC)

Modul autentikasi menyediakan hierarki peran dan izin berbasis namespace yang mendukung wildcard:

- **Peran Bawaan**:
  - `pengguna`: Hak baca profil dasar (`profil:baca`, `artikel:baca`).
  - `editor`: Hak baca dan tulis konten (`artikel:*`, `komentar:*`).
  - `admin`: Hak administratif penuh (`*`).

Pencocokan izin mendukung pola:
- `artikel:*` mencakup `artikel:buat`, `artikel:sunting`, `artikel:hapus`.
- `*` mencakup seluruh aksi di sistem.

---

## 7. Middleware Web Framework

Framework web NUSANTARA menyediakan middleware keamanan siap pakai:

```typescript
import {
  buatMiddlewareWajibAutentikasi,
  buatMiddlewareWajibPeran,
  buatMiddlewareWajibIzin,
  buatMiddlewareSesi,
  buatMiddlewareCSRF,
} from 'nusantara/autentikasi';

// Pasang middleware pemeriksaan sesi pada semua permintaan
app.gunakan(buatMiddlewareSesi(layananAuth));

// Lindungi rute khusus pengguna yang login
app.dapatkan('/dasbor', buatMiddlewareWajibAutentikasi(), tanganiDasbor);

// Lindungi rute khusus admin
app.dapatkan('/admin', buatMiddlewareWajibPeran('admin'), tanganiAdmin);

// Lindungi rute mutasi dengan token CSRF
app.kirimkan('/artikel', buatMiddlewareCSRF(), tanganiBuatArtikel);
```
