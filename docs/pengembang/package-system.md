# Panduan Pengembang Sistem Paket & Registri NUSANTARA (Phase 22)

Panduan ini ditujukan bagi pengembang bahasa dan kontributor ekosistem NUSANTARA untuk memahami alur kerja internal, pembuatan bundle, pengujian paket, dan integrasi CLI.

---

## 1. Alur Kerja Penerbitan Paket (Publish Workflow)

```
Proyek Sumber
     │
     ▼
[ValidatorPaket] ───► GAGAL? ──► Batalkan rilis & Laporkan Galat
     │ LULUS
     ▼
[PelariUji] ────────► GAGAL? ──► Batalkan rilis (Uji harus 100% lulus)
     │ LULUS
     ▼
[buatArsipPaket]
     ├─ Filter berkas sensitif (.git, .env, .lock)
     ├─ Urutkan berkas secara deterministik
     └─ Hitung Checksum SHA-256
     │
     ▼
[RegistriLokal]
     ├─ Periksa apakah versi sudah ada (Penolakan Immutabilitas)
     ├─ Simpan arsip ke packages/<nama>/<nama>-<versi>.npk
     └─ Mutakhirkan metadata/<nama>.json & index.json
```

---

## 2. Mengembangkan Paket Baru

### Langkah 1: Buat Struktur Paket
```bash
nusantara paket buat nama-paketku
```

Struktur yang dibuat:
```
nama-paketku/
├── nusantara.toml
├── README.md
└── src/
    └── utama.nusantara
```

### Langkah 2: Menulis Kode & Pengujian
Tulis implementasi fungsi pada berkas `src/<nama>.nusantara` dan pengujian pada `tests/<nama>.uji.nusantara`.

```nusantara
// tests/fungsi.uji.nusantara
pastikan_sama(tambah(10, 20), 30)
```

### Langkah 3: Periksa Kelayakan Paket
```bash
nusantara paket cek .
```

### Langkah 4: Bangun dan Terbitkan
```bash
nusantara paket bangun
nusantara paket terbit
```

---

## 3. Resolusi Dependensi & Cache Offline

Saat paket dipasang:
1. Pemuat memeriksa direktori cache offline (`.nusantara/cache/paket/`).
2. Jika ada pada cache atau dalam mode `--offline`, paket diekstrak langsung tanpa unduh ulang.
3. Berkas `nusantara.lock` mencatat pasangan versi, sumber registri, dan hash SHA-256 integritas untuk memastikan reproduktibilitas build tim.
