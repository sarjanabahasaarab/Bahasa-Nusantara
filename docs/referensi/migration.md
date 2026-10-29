# Panduan Referensi Migrasi Basis Data NUSANTARA (v0.32.0)

Sistem migrasi skema basis data NUSANTARA mengelola evolusi skema tabel, indeks, dan kekangan relasional secara bertahap, deterministik, dan dapat dibatalkan (*reversible*).

---

## 1. Arsitektur Pelari Migrasi

Setiap perubahan skema dicatat pada tabel internal `_migrasi_nusantara`:
```sql
CREATE TABLE IF NOT EXISTS "_migrasi_nusantara" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "nama_migrasi" TEXT UNIQUE NOT NULL,
  "batch" INTEGER NOT NULL,
  "diterapkan_pada" DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Setiap kali perintah migrasi dijalankan, migrasi yang belum diterapkan dikelompokkan ke dalam satu nomor **Batch** yang meningkat. Operasi rollback membatalkan migrasi per Batch terbalik.

---

## 2. Struktur Berkas Migrasi

```typescript
import { DefinisiMigrasi, SchemaBuilder } from './src/migration';

export const MigrasiPengguna: DefinisiMigrasi = {
  nama: '001_buat_tabel_pengguna',
  deskripsi: 'Membuat tabel pengguna resmi dan indeks email',
  naik: (skema: SchemaBuilder) => {
    skema.buatTabel('pengguna', (t) => {
      t.id();
      t.teks('username', 50, { unique: true });
      t.teks('email', 100, { unique: true });
      t.teks('password_hash', 255);
      t.teks('role', 20, { default: 'pengguna' });
      t.teks('status', 20, { default: 'aktif' });
      t.stempelWaktu();
      t.indeks('email');
    });
  },
  turun: (skema: SchemaBuilder) => {
    skema.hapusTabel('pengguna');
  },
};
```

---

## 3. Perintah CLI Migrasi

```bash
# Memeriksa status seluruh migrasi (diterapkan vs tertunda)
nusantara db status

# Menjalankan seluruh migrasi tertunda
nusantara db migrasi
nusantara db migrate

# Membatalkan batch migrasi terakhir
nusantara db rollback

# Membuat templat berkas migrasi baru
nusantara db buat-migrasi tambah_kolom_foto_profil
```
