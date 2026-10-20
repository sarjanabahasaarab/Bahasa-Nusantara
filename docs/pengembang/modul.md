# Arsitektur & Dokumentasi Teknis Sistem Modul NUSANTARA (Phase 15)

Dokumen ini menjelaskan perancangan arsitektur dan rincian implementasi teknis untuk subsistem modul bahasa **NUSANTARA** (Phase 15), meliputi siklus hidup pemuatan berkas, abstraksi sistem berkas (*file system abstraction*), pencegahan eksploitasi jalur direktori, parsing AST, integrasi analisis tipe statis, isolasi scope runtime, dan pelacakan jejak kesalahan konteks modul.

Target Milestone: `v0.15.0`

---

## 1. Saluran Pipa Arsitektur Subsistem Modul

Subsistem modul mengorkestrasi pemuatan kode program secara berlapis dan modular:

```text
Program Utama (.nusantara)
         │
         ▼
    PemuatModul (Module Loader & Cache)
         │
         ├───► ResolverModul (Validasi Path Aman & Pencarian Berkas)
         │           │
         │           ▼
         │     PembacaBerkas (PembacaBerkasMemori / PembacaBerkasNode)
         │
         ├───► Parser (Membangun NodeDeklarasiModul, NodePernyataanImpor, NodePernyataanEkspor)
         │
         ├───► PemeriksaTipe (Validasi Tipe Simbol Ekspor, Parameter, & Return Value)
         │
         └───► Lingkungan Modul (Isolasi Scope, Ekstraksi Ekspor, Penyimpanan Simbol Internal)
                     │
                     ▼
             NilaiModul Runtime
```

---

## 2. Struktur Modul & Berkas Sumber

Kode implementasi sistem modul ditempatkan pada `src/modul/`:

| Berkas | Peran & Tanggung Jawab Utama |
|---|---|
| `src/modul/jenisModul.ts` | Tipe data, antarmuka `CatatanModul`, `StatusPemuatanModul`, dan `InfoSimbolModul`. |
| `src/modul/galatModul.ts` | Kelas `GalatModul` dan enumerasi `JenisGalatModul` dengan pesan Bahasa Indonesia. |
| `src/modul/pembacaBerkas.ts` | Abstraksi `PembacaBerkas`, implementasi in-memory (`PembacaBerkasMemori`), dan Node.js fs (`PembacaBerkasNode`). |
| `src/modul/resolverModul.ts` | Resolver lokasi berkas, proteksi anti-path-traversal, dan pemetaan nama ke berkas fisik. |
| `src/modul/pemuatModul.ts` | Pengelola cache modul, deteksi siklus dependensi (*circular dependency*), ekstraksi ekspor, dan isolasi lingkungan. |
| `src/modul/index.ts` | Titik ekspor terpadu subsistem modul. |

---

## 3. Simpul AST Sistem Modul

Simpul AST didefinisikan pada `src/parser/ast.ts`:

### A. `NodeDeklarasiModul`
```typescript
export interface NodeDeklarasiModul extends NodeAST {
  jenis: JenisNodeAST.DEKLARASI_MODUL;
  namaModul: string;
}
```

### B. `NodePernyataanImpor`
```typescript
export interface ItemImpor {
  nama: string;
  alias?: string;
  posisi: RentangPosisi;
}

export interface NodePernyataanImpor extends NodeAST {
  jenis: JenisNodeAST.PERNYATAAN_IMPOR;
  sumberModul: string;
  aliasModul?: string;
  itemImpor?: ItemImpor[];
}
```

### C. `NodePernyataanEkspor`
```typescript
export interface NodePernyataanEkspor extends NodeAST {
  jenis: JenisNodeAST.PERNYATAAN_EKSPOR;
  deklarasi?: NodeDeklarasiFungsi | NodeDeklarasiVariabel | NodeDeklarasiTetap;
  namaEkspor?: string[];
}
```

### D. `NodeAksesAnggota`
```typescript
export interface NodeAksesAnggota extends NodeAST {
  jenis: JenisNodeAST.AKSES_ANGGOTA;
  target: EkspresiAST;
  anggota: string;
}
```

---

## 4. Mekanisme Cache & Deteksi Ketergantungan Melingkar

Siklus hidup pemuatan berkas dikelola dengan status eksplisit:
```typescript
export enum StatusPemuatanModul {
  BELUM_DIMUAT = 'BELUM_DIMUAT',
  SEDANG_DIMUAT = 'SEDANG_DIMUAT',
  SUDAH_DIMUAT = 'SUDAH_DIMUAT',
  GAGAL_DIMUAT = 'GAGAL_DIMUAT',
}
```

1. **Pencegahan Pemuatan Berulang**: Modul yang telah berada dalam status `SUDAH_DIMUAT` langsung mengembalikan entri dari cache tanpa mem-parsing atau mengeksekusi ulang.
2. **Deteksi Ketergantungan Melingkar (A → B → A)**: Saat sebuah modul yang sedang berstatus `SEDANG_DIMUAT` kembali diminta, sistem menghentikan proses dengan melempar `GalatModul` bertipe `KETERGANTUNGAN_MELINGKAR` dan menyajikan rantai dependensi lengkap kepada pengguna.

---

## 5. Integrasi Sistem Tipe (Type System)

Kelas `PemeriksaTipe` (`src/tipe/pemeriksaTipe.ts`) diintegrasikan dengan pemuat modul:
- Modul yang diimpor didaftarkan ke tabel modul internal (`tabelModul`).
- Akses fungsi modul `modul.fungsi(arg)` memvalidasi keberadaan modul, keberadaan fungsi yang diekspor, jumlah argumen, serta kompatibilitas tipe setiap parameter.
- Upaya mengakses simbol internal yang tidak diekspor ditolak secara statis dengan `JenisGalatTipe.ANGGOTA_INTERNAL_TERLINDUNGI`.

---

## 6. Integrasi Interpreter & Konteks Galat Runtime

Mesin `Interpreter` (`src/interpreter/interpreter.ts`) mengevaluasi modul dalam lingkungan lingkup terisolasi:
- Simbol modul yang diekspor dibungkus dalam tipe `NilaiModul` (`JenisNilaiRuntime.MODUL`).
- Objek `NilaiModul` menyimpan peta nilai `ekspor` yang dapat diakses melalui operator titik `.`.
- Saat fungsi anggota modul dipanggil, interpreter beralih ke lingkungan modul terkait, mencatat frame tumpukan (`BingkaiTumpukan`) dengan atribut nama modul dan berkas sumber.
- Jika terjadi galat runtime di dalam modul (misalnya pembagian dengan nol), pesan kesalahan memuat informasi nama modul, nomor baris, dan nomor kolom sumber secara presisi.
