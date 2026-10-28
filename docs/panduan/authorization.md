# Panduan: Otorisasi & Kontrol Akses (RBAC) di NUSANTARA

Panduan lengkap mengenai penerapan kontrol akses berbasis peran (*Role-Based Access Control / RBAC*) dan izin granular (*permission*) pada aplikasi web bahasa pemrograman **NUSANTARA**.

---

## 1. Konsep Otorisasi di NUSANTARA

Setelah identitas pengguna diverifikasi melalui tahap autentikasi, sistem otorisasi bertugas memastikan bahwa pengguna hanya dapat mengakses fitur dan data yang menjadi haknya.

### Model Hubungan:
```
Pengguna (User)  ───> Memiliki Peran (Role)  ───> Memiliki Izin-Izin (Permissions)
                                                           │
                                                           ▼
                                               Mengakses Rute / Operasi
```

---

## 2. Peran Bawaan (*Default Roles*)

Sistem otorisasi NUSANTARA menyediakan tiga tingkat peran standar:

| Peran | Ruang Lingkup Hak Akses | Contoh Izin yang Dimiliki |
|---|---|---|
| `pengguna` | Pengguna biasa aplikasi | `profil:baca`, `profil:sunting`, `artikel:baca` |
| `editor` | Pembuat dan pengelola konten | `profil:*`, `artikel:*`, `kategori:*`, `komentar:*` |
| `admin` | Administrator sistem penuh | `*` (seluruh izin dalam sistem) |

---

## 3. Sistem Izin Berbasis Namespace & Wildcard

Format penamaan izin menggunakan sintaks namespace `kategori:aksi`:
- `artikel:baca` : Mengizinkan membaca artikel.
- `artikel:buat` : Mengizinkan membuat artikel baru.
- `artikel:hapus` : Mengizinkan menghapus artikel.

### Dukungan Wildcard (`*`):
- `artikel:*` : Mencocokkan seluruh aksi pada kategori `artikel` (baca, buat, sunting, hapus).
- `*` : Mencocokkan seluruh izin tanpa batas (hak akses super-admin).

---

## 4. Perlindungan Rute Menggunakan Middleware

Framework web NUSANTARA memungkinkan pembatasan akses rute secara deklaratif melalui middleware:

```typescript
import {
  buatMiddlewareWajibAutentikasi,
  buatMiddlewareWajibPeran,
  buatMiddlewareWajibIzin,
} from 'nusantara/autentikasi';

// 1. Wajib Login (Semua peran yang valid diizinkan)
app.dapatkan('/dasbor', buatMiddlewareWajibAutentikasi(), tanganiDasbor);

// 2. Wajib Peran Tertentu (Hanya peran 'editor' atau 'admin')
app.dapatkan('/kelola-konten', buatMiddlewareWajibPeran(['editor', 'admin']), tanganiKelolaKonten);

// 3. Wajib Izin Tertentu (Periksa apakah pengguna punya izin spesifik)
app.hapus('/api/artikel/:id', buatMiddlewareWajibIzin('artikel:hapus'), tanganiHapusArtikel);
```

Jika permintaan tidak memenuhi syarat:
- Klien yang belum login menerima status HTTP `401 Unauthorized`.
- Klien yang sudah login namun tidak memiliki peran/izin yang memadai menerima status HTTP `403 Forbidden`.

---

## 5. Menambahkan Peran Kustom (*Custom Roles*)

Pengembang dapat menambahkan peran baru sesuai kebutuhan bisnis:

```typescript
const rbac = new ManajerRBAC();

// Daftarkan peran auditor
rbac.tambahPeran({
  nama: 'auditor',
  deskripsi: 'Petugas pemeriksa log dan transaksi',
  izin: ['laporan:baca', 'log:baca', 'transaksi:audit'],
});

// Verifikasi hak akses
const diizinkan = rbac.apakahDiizinkan('auditor', 'laporan:baca'); // benar
```
