# Integrasi REST API & Pagination NUSANTARA (Phase 35)

Modul `KlienAPI` dirancang khusus untuk mempermudah integrasi dengan RESTful Web Services, mengotomatiskan serialisasi payload JSON, serta menangani paginasi data berskala besar.

## 1. Konfigurasi Klien API

```typescript
import { KlienAPI } from './src/http';

const api = new KlienAPI({
  baseUrl: 'https://api.github.com',
  headerBawaan: {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Nusantara-HTTP-Client/0.35.0'
  },
  batasWaktuMs: 10000,
  cobaUlang: {
    maksimalPercobaan: 3,
    jedaAwalMs: 500,
    faktorEksponensial: 2.0
  }
});
```

## 2. Operasi CRUD REST

`KlienAPI` menyediakan fungsi khusus yang langsung mengembalikan payload data bertipe typed atau objek terurai:

```typescript
// GET ke /pengguna/:id
const pengguna = await api.dapatkan('/pengguna/42');

// POST data baru ke /pengguna
const hasilBuat = await api.buat('/pengguna', {
  nama: 'Budi Santoso',
  surel: 'budi@nusantara.dev'
});

// PUT perbarui data lengkap
await api.perbarui('/pengguna/42', { nama: 'Budi S.' });

// PATCH perbarui parsial
await api.tambal('/pengguna/42', { status: 'aktif' });

// DELETE sumber daya
await api.hapus('/pengguna/42');
```

## 3. Strategi Paginasi Otomatis

`KlienAPI` mendukung tiga strategi paginasi populer:

### A. Berbasis Nomor Halaman (`halaman`)
```typescript
const iterator = api.iterasiPaginasi('/produk', {
  strategi: 'halaman',
  namaKunciHalaman: 'page',
  namaKunciBatas: 'limit',
  ekstraksiData: (res) => res.items,
  ekstraksiApakahHabis: (res) => res.items.length === 0,
}, { limit: 50 });

for await (const halaman of iterator) {
  console.log(`Mengambil ${halaman.length} data produk`);
}
```

### B. Berbasis Offset & Limit (`offset`)
```typescript
const iterator = api.iterasiPaginasi('/log', {
  strategi: 'offset',
  namaKunciHalaman: 'offset',
  namaKunciBatas: 'limit',
  ekstraksiData: (res) => res.logs,
}, { limit: 100 });
```

### C. Berbasis Kursor Token (`kursor`)
```typescript
const iterator = api.iterasiPaginasi('/aliran-aktivitas', {
  strategi: 'kursor',
  namaKunciKursor: 'cursor',
  ekstraksiKursorBerikutnya: (res) => res.next_cursor,
  ekstraksiData: (res) => res.data,
});
```
