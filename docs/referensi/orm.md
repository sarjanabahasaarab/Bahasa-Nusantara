# Panduan Referensi ORM NUSANTARA (v0.32.0)

Dokumen ini memuat spesifikasi teknis dan panduan operasional Object-Relational Mapping (ORM) resmi Bahasa Pemrograman NUSANTARA.

---

## 1. Ikhtisar ORM NUSANTARA

ORM NUSANTARA dirancang untuk menyediakan pemetaan terstruktur dan aman antara objek entitas program dan tabel basis data relasional. Seluruh eksekusi query SQL menggunakan *parameter binding* deterministik untuk mencegah serangan SQL Injection, dilengkapi dengan validasi identifier ketat (*allowlist/quoting*).

### Fitur Utama:
- **Definisi Model Deklaratif**: Pemetaan tabel, primary key, dan kolom dengan validasi tipe.
- **Siklus Hidup CRUD**: Operasi `buat`, `temukan`, `semua`, `simpan`, `hapus`, `hitung`, `ada`, dan `halaman`.
- **Relasi Antarmodel**: `memilikiSatu` (HasOne), `memilikiBanyak` (HasMany), `milikDari` (BelongsTo), dan `banyakKeBanyak` (ManyToMany).
- **Proteksi Mutasi Massal**: Menolak `update` atau `delete` tanpa klausul `WHERE` kecuali opsi `izinkanMassal: true` ditentukan secara eksplisit.
- **Pola Repositori (Repository Pattern)**: Menyediakan lapisan abstraksi entitas dengan lifecycle hooks (`sebelumSimpan`, `setelahSimpan`, `sebelumHapus`, `setelahHapus`).

---

## 2. Contoh Penggunaan Model ORM

```typescript
import {
  definisiModel,
  kolomId,
  kolomTeks,
  kolomBilangan,
  kolomLogika,
  kolomWaktu,
  tetapkanAdaptorGlobalORM,
} from './src/orm';
import { AdaptorSQLite } from './src/database/sqlite';

// 1. Hubungkan koneksi database
const db = new AdaptorSQLite();
db.buka({ jalur: 'data.sqlite' });
tetapkanAdaptorGlobalORM(db);

// 2. Definisikan Model Produk
export const ProdukModel = definisiModel({
  namaTabel: 'produk',
  fields: {
    id: kolomId(),
    nama: kolomTeks('nama', { panjangMaksimal: 100 }),
    harga: kolomBilangan('harga'),
    stok: kolomBilangan('stok', { default: 0 }),
    aktif: kolomLogika('aktif', { default: true }),
  },
  timestamps: true, // Otomatis mengelola dibuat_pada & diperbarui_pada
});

// 3. Buat dan Simpan Record Baru
const produk = ProdukModel.buat({
  nama: 'Kopi Nusantara',
  harga: 25000,
  stok: 50,
});
console.log('ID Produk Baru:', produk.id);

// 4. Temukan Berdasarkan Primary Key
const p = ProdukModel.temukan(produk.id);
if (p) {
  p.harga = 27000;
  p.simpan(); // UPDATE hanya kolom yang berubah
}

// 5. Query dengan Filter dan Paginasi
const hasil = ProdukModel.kueri()
  .where('harga', '>=', 20000)
  .orderBy('harga', 'DESC')
  .paginate(1, 10);
```

---

## 3. Relasi Antarmodel

```typescript
import {
  definisiModel,
  kolomId,
  kolomTeks,
  kolomBilangan,
  memilikiBanyak,
  milikDari,
} from './src/orm';

export const PenggunaModel = definisiModel({
  namaTabel: 'pengguna',
  fields: {
    id: kolomId(),
    nama: kolomTeks('nama'),
  },
  relasi: {
    pesanan: memilikiBanyak('pesanan', () => PesananModel, 'pengguna_id'),
  },
});

export const PesananModel = definisiModel({
  namaTabel: 'pesanan',
  fields: {
    id: kolomId(),
    nomor: kolomTeks('nomor'),
    pengguna_id: kolomBilangan('pengguna_id'),
    total: kolomBilangan('total'),
  },
  relasi: {
    pengguna: milikDari('pengguna', () => PenggunaModel, 'pengguna_id'),
  },
});

// Memuat relasi
const user = PenggunaModel.temukan(1);
const daftarPesanan = user?.muat('pesanan');
```
