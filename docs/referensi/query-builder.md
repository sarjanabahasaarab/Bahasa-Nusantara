# Panduan Referensi Query Builder NUSANTARA (v0.32.0)

Query Builder NUSANTARA menyediakan antarmuka berantai (*fluent interface*) untuk menyusun kueri SQL dengan jaminan keamanan injeksi SQL, pembersihan identifier, dan parameter binding otomatis.

---

## 1. Operasi SELECT Dasar

```typescript
import { QueryBuilder } from './src/database/queryBuilder';
import { AdaptorSQLite } from './src/database/sqlite';

const db = new AdaptorSQLite();
db.buka({ jalur: ':memory:' });

const qb = new QueryBuilder(db, 'pengguna');

// 1. Pemilihan Kolom & Filter Dasar
const penggunaAktif = qb
  .select('id', 'username', 'email')
  .where('status', '=', 'aktif')
  .where('role', 'admin')
  .orderBy('id', 'DESC')
  .limit(5)
  .get();

// 2. Mengambil Satu Baris Pertama
const penggunaPertama = qb
  .where('username', 'budi')
  .first();

// 3. Menghitung Jumlah Baris
const total = qb.where('status', 'aktif').count();

// 4. Memeriksa Keberadaan Baris
const apakahAda = qb.where('email', 'admin@nusantara.id').exists();
```

---

## 2. Klausul WHERE Tingkat Lanjut

- `where(kolom, operator, nilai)` atau `where(kolom, nilai)`: filter dengan operator (`=`, `!=`, `<`, `<=`, `>`, `>=`, `LIKE`, `NOT LIKE`).
- `orWhere(kolom, operator, nilai)`: filter dengan penghubung `OR`.
- `whereIn(kolom, array)`: filter `IN (?, ?, ...)`.
- `whereNotIn(kolom, array)`: filter `NOT IN (?, ?, ...)`.
- `whereNull(kolom)`: filter `IS NULL`.
- `whereNotNull(kolom)`: filter `IS NOT NULL`.
- `whereBetween(kolom, awal, akhir)`: filter `BETWEEN ? AND ?`.

---

## 3. Paginasi Otomatis

```typescript
const halamanSatu = qb.paginate(1, 15);
// Menghasilkan:
// {
//   data: [...],
//   total: 150,
//   halaman: 1,
//   perHalaman: 15,
//   totalHalaman: 10
// }
```

---

## 4. Keamanan Identifier & Proteksi Kerusakan Massal

1. Semua identifier tabel dan kolom divalidasi terhadap regex alfanumerik `[a-zA-Z_][a-zA-Z0-9_]*` dan dikutip dengan tanda kutip ganda `""`.
2. Operasi `update` dan `delete` **wajib** memiliki klausa `where`. Jika tidak ada `where`, Query Builder akan melempar `GalatBasisdata` kecuali opsi `{ izinkanMassal: true }` diberikan secara eksplisit.
