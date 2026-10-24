# Referensi Registri Paket NUSANTARA (Phase 22)

Registri NUSANTARA adalah pusat katalog distribusi dan penerbitan paket untuk ekosistem bahasa pemrograman NUSANTARA.

---

## 1. Arsitektur Registri

Ekosistem NUSANTARA mengadopsi antarmuka terpadu `AntarmukaRegistri` yang diimplementasikan oleh dua mode:
1. **Registri Lokal (`RegistriLokal`)**: Registri berkas lokal di direktori proyek (`registri/`), digunakan untuk pengembangan, pengujian offline, dan lingkungan enterprise tertutup.
2. **Registri Jarak Jauh (`RegistriJarakJauh`)**: Klien registri berbasis HTTP REST API dengan otentikasi token Bearer untuk distribusi publik atau tim.

```
                  +---------------------+
                  |  AntarmukaRegistri  |
                  +----------+----------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+         +---------v---------+
    |   RegistriLokal   |         | RegistriJarakJauh |
    |   (Filesystem)    |         |   (REST Client)   |
    +-------------------+         +-------------------+
```

---

## 2. Struktur Registri Lokal

Struktur penyimpanan fisik Registri Lokal:
```
registri/
├── index.json                        # Indeks pencarian dan katalog seluruh paket
├── metadata/
│   ├── matematika.json               # Metadata publik lengkap paket
│   └── utilitas-string.json
└── packages/
    ├── matematika/
    │   ├── matematika-1.0.0.npk      # Bundle arsip rilis immutable
    │   └── matematika-1.1.0.npk
    └── utilitas-string/
        └── utilitas-string-1.0.0.npk
```

---

## 3. Aturan Immutabilitas Rilis (Release Immutability)

Untuk menjaga reproduktibilitas build dan keamanan dependensi:
- Setiap rilis paket dengan pasangan `(nama, versi)` bersifat **immutable (tidak dapat diubah)**.
- Jika versi `1.0.0` dari sebuah paket sudah pernah dipublikasikan, registri **menolak keras** usaha publikasi ulang dengan versi yang sama (`GalatImmutabilitasPaket`).
- Setiap perubahan kode harus dirilis dengan nomor versi baru sesuai aturan SemVer.

---

## 4. Integritas Checksum Kriptografis (SHA-256)

Setiap arsip `.npk` memiliki hash SHA-256 yang dihitung secara deterministik dari konten berkas terurut:
- Registri memverifikasi checksum saat penerbitan paket.
- Checksum disimpan di `metadata/<nama>.json`.
- Saat klien menginstal paket (`nusantara paket pasang`), klien menghitung ulang checksum dan membandingkannya dengan metadata registri.
- Jika checksum tidak cocok, instalasi langsung dibatalkan demi keamanan.

---

## 5. Antarmuka Baris Perintah Registri (CLI)

| Perintah | Deskripsi |
|---|---|
| `nusantara paket bangun` | Mengemas proyek menjadi arsip `.npk` dengan pengujian otomatis |
| `nusantara paket cek` | Memvalidasi kepatuhan manifest, semver, sintaks, dan pengujian |
| `nusantara paket terbit` | Menerbitkan paket ke registri lokal (rilis immutable) |
| `nusantara paket cari <kueri>` | Mencari paket di registri berdasarkan nama/deskripsi/tag |
| `nusantara paket info <nama>` | Menampilkan rincian metadata paket dan versi tersedia |
| `nusantara paket pasang <nama>` | Memasang paket dari registri dan memperbarui `nusantara.toml` & `nusantara.lock` |
