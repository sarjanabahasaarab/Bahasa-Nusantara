# Panduan Referensi Database Seeder NUSANTARA (v0.32.0)

Database Seeder NUSANTARA digunakan untuk mengisi data awal, master data referensi, serta mock data pengujian ke dalam basis data secara terkontrol, idempoten, dan atomik dalam transaksi.

---

## 1. Menulis Seeder Idempoten

Untuk menjaga agar seeder aman dijalankan berulang kali tanpa membuat rekaman ganda (*duplicate key error*), selalu gunakan pengecekan keberadaan atau perintah upsert:

```typescript
import { DefinisiSeeder } from './src/seeder';
import { AdaptorBasisdata } from './src/database/jenis';

export const PenggunaAwalSeeder: DefinisiSeeder = {
  nama: 'PenggunaAwalSeeder',
  deskripsi: 'Menyemai akun administrator awal',
  jalankan: (db: AdaptorBasisdata) => {
    // Cek apakah admin sudah ada sebelum insert
    const ada = db.ambilSatu('SELECT id FROM "pengguna" WHERE "username" = ?', ['admin']);
    if (!ada) {
      db.eksekusi(
        'INSERT INTO "pengguna" ("username", "email", "password_hash", "role", "status") VALUES (?, ?, ?, ?, ?)',
        ['admin', 'admin@nusantara.id', 'scrypt_seed_hash', 'admin', 'aktif']
      );
    }
  },
};
```

---

## 2. Menjalankan Seeder via CLI

```bash
# Menjalankan seluruh seeder terdaftar
nusantara db seed

# Menjalankan seeder tertentu saja
nusantara db seed PenggunaAwalSeeder
```
