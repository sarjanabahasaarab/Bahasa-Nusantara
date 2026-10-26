# Panduan Pengembang: Arsitektur Package Cache & Verifikasi Integritas — Phase 27

Dokumen ini menjelaskan rancangan internal, struktur penyimpanan, dan mekanisme integritas kriptografi dari subsistem cache paket (`ManajerCachePaket`) pada bahasa **NUSANTARA**.

Target Milestone: `v0.27.0`  
Komponen: `src/paket/cache.ts`, `src/paket/pengelolaPaket.ts`, `src/paket/lockfile.ts`

---

## 1. Motivasi & Tujuan Desain

Pemasangan dependensi berulang kali dari registri daring memakan waktu dan berisiko gagal jika jaringan terputus. Selain itu, ada risiko keamanan berupa manipulasi muatan paket (*supply chain tampering*).

Tujuan subsistem cache Phase 27:
1. **Performa Tinggi**: Unduh sekali, pasang instan untuk proyek-proyek berikutnya.
2. **Offline-First**: Pembangunan proyek dapat berjalan tanpa koneksi internet jika dependensi sudah ada di cache.
3. **Integritas Mutlak**: Setiap arsip paket yang disimpan dan dibaca divalidasi menggunakan hash SHA-256 standar.
4. **Isolasi Abstrak**: Mendukung lingkungan Node.js native (`fs`) dan lingkungan virtual peramban/memori (`PembacaBerkasMemori`) melalui antarmuka `PembacaBerkas`.

---

## 2. Struktur Direktori Cache

Pada filesystem fisik (Node.js), direktori cache default terletak di:
`~/.nusantara/cache/paket/` atau `./.nusantara_cache/paket/`.

Struktur hierarki:
```text
.nusantara_cache/paket/
├── matematika/
│   ├── 1.2.0/
│   │   ├── metadata.json
│   │   ├── isi.json
│   │   └── integritas.sha256
│   └── 1.2.3/
│       ├── metadata.json
│       ├── isi.json
│       └── integritas.sha256
└── kripto/
    └── 2.1.0/
        ├── metadata.json
        ├── isi.json
        └── integritas.sha256
```

Setiap entri cache menyimpan:
- `isi.json`: Peta berkas modul dan kode sumber (`Record<string, string>`).
- `metadata.json`: Informasi versi, lisensi, pembuat, dan cap waktu pembuatan cache.
- `integritas.sha256`: Hash kriptografis SHA-256 kanonis dari seluruh isi paket.

---

## 3. Spesifikasi Kelas `ManajerCachePaket`

Kelas `ManajerCachePaket` berada di `src/paket/cache.ts` dan mengekspos API berikut:

```typescript
export class ManajerCachePaket {
  constructor(
    direktoriCache: string = '.nusantara_cache/paket',
    pembacaBerkas?: PembacaBerkas
  );

  // Menyimpan paket ke dalam cache dengan verifikasi hash otomatis
  simpan(nama: string, versi: string, berkas: Record<string, string>, hashDiharapkan?: string): Promise<EntriCachePaket>;

  // Membaca paket dari cache
  ambil(nama: string, versi: string): Promise<EntriCachePaket | null>;

  // Memeriksa keberadaan paket di cache
  memiliki(nama: string, versi: string): Promise<boolean>;

  // Verifikasi hash SHA-256 terhadap data di cache
  verifikasiIntegritas(nama: string, versi: string, hashDiharapkan: string): Promise<boolean>;

  // Mendapatkan daftar seluruh paket yang tersimpan di cache
  daftarCache(): Promise<RingkasanCachePaket[]>;

  // Menghapus satu paket tertentu dari cache
  hapus(nama: string, versi: string): Promise<boolean>;

  // Mengosongkan seluruh isi cache
  bersihkan(): Promise<void>;
}
```

---

## 4. Mekanisme Verifikasi Integritas SHA-256

Kalkulasi checksum menggunakan algoritma kanonis:
1. Seluruh path berkas diurutkan secara leksikografis (`sort()`).
2. Pasangan `jalur:konten` digabungkan secara deterministik.
3. Hash SHA-256 dihitung menggunakan fungsi `hitungChecksum()` atau modul `crypto` bawaan.
4. Format checksum disimpan dengan awalan standar: `sha256-<hex-digest-64-karakter>`.

### Alur Deteksi Manipulasi (Tamper Detection):
```text
PengelolaPaket.pasang()
         │
         ▼
Ambil dari Cache (nama, versi)
         │
         ├─► Validasi: SHA-256 Cache == Hash Manifest / Lockfile?
         │         │
         │         ├─► Cocok: Gunakan berkas cache secara instan
         │         │
         │         └─► Tidak Cocok: Tandai 'CORRUPTED/TAMPERED'
         │                   │
         │                   ▼
         │             Hapus entri korup dari cache
         │             Unduh ulang paket segar dari Registri
         │             Validasi hash registri
         │             Simpan ulang ke cache
```

---

## 5. Mode Instalasi Terkunci (`--terkunci`)

Ketika opsi `terkunci: true` diberikan pada `PengelolaPaket.pasang({ terkunci: true })`:
1. Sistem tidak melakukan resolusi SemVer fleksibel baru.
2. Setiap dependensi wajib tercantum dalam `nusantara.lock`.
3. Hash integritas dari setiap paket yang diinstal dibandingkan secara tegas (*strict comparison*) terhadap `integritas` di lockfile.
4. Jika ditemukan perbedaan hash sekecil apa pun, instalasi langsung dihentikan dengan pesan galat `GalatIntegritasPaket` untuk mencegah serangan rantai pasok (*supply chain attack*).

---

## 6. Pengujian Mutu & Regresi

Unit test ekosistem cache berada di:
`pengujian/paket/uji_ekosistem_dependensi.ts`

Mencakup skenario pengujian:
- Simpan & ambil paket ke cache.
- Deteksi cache hit dan cache miss.
- Verifikasi hash SHA-256 berhasil pada paket valid.
- Deteksi kegagalan verifikasi pada paket yang dimanipulasi (*tampered payload*).
- Penghapusan spesifik dan pembersihan total cache (`bersihkan()`).
- Dukungan multi-versi paralel (`paket@1.0.0` dan `paket@2.0.0` berdampingan).
