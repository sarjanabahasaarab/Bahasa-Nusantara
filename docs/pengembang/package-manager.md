# Arsitektur & Dokumentasi Teknis Package Manager NUSANTARA (Phase 16)

Dokumen ini menjelaskan arsitektur sistem, rancangan kelas, saluran pipa resolusi dependensi, dan rincian implementasi teknis untuk Package Manager bahasa **NUSANTARA** (`nusantara`).

Target Milestone: `v0.16.0`

---

## 1. Saluran Pipa Arsitektur Package Manager

Package Manager NUSANTARA dirancang dengan pola modular berlapis untuk memisahkan penguraian manifest, algoritma grafik dependensi, abstraksi registri, dan integrasi modul:

```text
Perintah Pengguna ('nusantara pasang')
         │
         ▼
    NusantaraCLI (src/paket/cli.ts)
         │
         ▼
    PengelolaPaket (src/paket/pengelolaPaket.ts)
         │
         ├───► ManifestPaket ('nusantara.toml') via smol-toml
         │
         ├───► GrafDependensi (src/paket/graph.ts)
         │           ├── Deteksi Siklus (DFS Cycle Detection)
         │           ├── Validasi Konflik Versi (SemVer Resolver)
         │           └── Urutan Instalasi Topologis
         │
         ├───► PackageRegistry (src/paket/registry.ts)
         │           └── LocalRegistry (Direktori Paket Lokal & Path)
         │
         ├───► BerkasKunci ('nusantara.lock')
         │           └── Verifikasi Integritas SHA-256 Checksum
         │
         ▼
Instalasi Paket Fisik (.nusantara/paket/<nama>/)
         │
         ▼
ResolverModul (src/modul/resolverModul.ts - Phase 15)
         │
         ▼
PemuatModul & Runtime Interpreter NUSANTARA
```

---

## 2. Struktur Modul & Berkas Sumber

Seluruh kode implementasi subsistem package manager ditempatkan pada `src/paket/`:

| Berkas | Peran & Tanggung Jawab Utama |
|---|---|
| `src/paket/semver.ts` | Pengurai (*parser*) Semantic Versioning 2.0.0, komparator, dan evaluator rentang versi (`^`, `~`, `*`, `>=`). |
| `src/paket/keamanan.ts` | Validasi penamaan paket, sanitasi karakter berbahaya, dan pencegahan eskalasi direktori (*anti-path traversal*). |
| `src/paket/manifest.ts` | Pengurai dan serialisasi berkas manifest `nusantara.toml` dengan validasi skema ketat. |
| `src/paket/lockfile.ts` | Pengurai dan penghasil berkas `nusantara.lock` deterministik dengan checksum integritas SHA-256. |
| `src/paket/graph.ts` | Struktur data `GrafDependensi`, pendeteksi siklus dependensi melingkar (*circular dependency*), dan deteksi konflik versi multi-peminta. |
| `src/paket/registry.ts` | Antarmuka abstraksi `PackageRegistry`, implementasi `LocalRegistry` untuk paket lokal, dan kerangka `RemoteRegistry` untuk masa depan. |
| `src/paket/pengelolaPaket.ts` | Mesin inti pengelola paket yang mengorkestrasikan pembuatan, pemasangan, penghapusan, pembaruan, dan pencatatan status. |
| `src/paket/cli.ts` | Titik masuk antarmuka baris perintah (`nusantara`) dengan perutean sub-perintah dan format luaran Bahasa Indonesia. |
| `src/paket/index.ts` | Ekspor terpadu subsistem pengelola paket. |

---

## 3. Resolusi Grafik Dependensi & Deteksi Anomali

### A. Deteksi Ketergantungan Melingkar (Cycle Detection)
`GrafDependensi` menggunakan penelusuran mendalam (Depth-First Search) dengan penanda tumpukan aktif:
- Jika simpul yang sedang aktif dalam tumpukan pemanggilan kembali dikunjungi, siklus terdeteksi.
- Sistem mengekstrak rantai siklus (contoh: `A → B → C → A`) dan melemparkan `GalatKetergantunganMelingkar`.
- Mencegah infinite loop atau stack overflow secara deterministik.

### B. Deteksi Konflik Versi (Version Conflict Detection)
Jika modul A membutuhkan `matematika ^1.0.0` dan modul B membutuhkan `matematika ^2.0.0`:
- Sistem mengevaluasi seluruh permintaan versi terhadap kandidat versi yang tersedia.
- Jika tidak ada satu versi pun yang memenuhi seluruh konstrain yang diminta peminta, sistem menghentikan proses dan menyajikan daftar batasan yang saling bertentangan (`GalatKonflikVersi`).

---

## 4. Mekanisme Kunci Dependensi & Integritas

1. **Format Lockfile (`nusantara.lock`)**:
   - Format standar TOML.
   - Menyimpan `versi_format = 1`.
   - Tabel array `[[paket]]` memuat `nama`, `versi`, `sumber`, dan `integritas`.
2. **Perhitungan Integritas**:
   - Menggunakan hashing kriptografis SHA-256 (atau fallback deterministik FNV-1a pada lingkungan non-Node).
   - Menghitung sidik jari seluruh berkas paket untuk memastikan kode tidak dimodifikasi secara diam-diam.
3. **Instalasi Terkunci (`--terkunci`)**:
   - Membaca `nusantara.lock` sebagai acuan tunggal kebenaran.
   - Menolak instalasi jika berkas lock tidak ditemukan atau tidak sinkron dengan `nusantara.toml`.

---

## 5. Integrasi Terpadu dengan Sistem Modul Phase 15

Sebagaimana diamanatkan dalam spesifikasi bahasa NUSANTARA, subsistem package manager tidak membuat sistem pemuat modul baru (*no second module loader*). Integrasi dicapai dengan memperluas `ResolverModul` (`src/modul/resolverModul.ts`):

- `ResolverModul` secara otomatis menyertakan sub-direktori `.nusantara/paket/<nama>/` dan `paket/<nama>/` ke dalam kandidat pencarian modul fisik.
- Berkas modul di dalam paket dapat berupa:
  - `<basis>/.nusantara/paket/<nama>/src/<nama>.nusantara`
  - `<basis>/.nusantara/paket/<nama>/<nama>.nusantara`
  - `<basis>/.nusantara/paket/<nama>/src/utama.nusantara`
  - `<basis>/.nusantara/paket/<nama>/modul.nusantara`
- Dengan demikian, pengembang cukup menulis:
  ```nusantara
  gunakan matematika
  ```
  dan interpreter runtime langsung memuat serta mengisolasi modul dari paket yang terpasang tanpa konfigurasi tambahan.

---

## 6. Desain Lintas Platform (*Cross-Platform*) & Keamanan

- **Pemisah Jalur Mandiri OS**: Menggunakan abstraksi `PembacaBerkas` dengan metode `gabungJalur()` dan `normalisasiJalur()` sehingga aman dieksekusi di Windows (pemisah `\`), Linux, macOS (pemisah `/`), serta sistem berkas berbasis memori (in-memory test).
- **Isolasi Keamanan**:
  - Validasi nama paket menolak karakter kontrol, spasi, tanda titik traversal (`../`), dan simbol asing.
  - Jalur dependensi lokal divalidasi tidak boleh melompat ke direktori sistem yang tidak diizinkan.
  - Phase 16 tidak mengeksekusi skrip instalasi pihak ketiga (*post-install scripts*) secara arbitrer demi mencegah eksploitasi kode berbahaya saat pemasangan paket.
