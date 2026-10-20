# Arsitektur & Dokumentasi Teknis Struktur Data NUSANTARA (Phase 14)

Dokumen ini menjelaskan rancangan arsitektur dan implementasi teknis untuk struktur data dasar `daftar` dan `peta` pada bahasa **NUSANTARA**, meliputi alur kompilasi, pohon sintaksis abstrak (AST), representasi memori runtime, integrasi sistem tipe, dan pengujian.

Target Milestone: `v0.14.0`

---

## 1. Saluran Pipa (*Compiler & Runtime Pipeline*)

Struktur data terintegrasi secara menyeluruh pada setiap tahapan arsitektur bahasa NUSANTARA:

```text
Kode Sumber (.nusantara)
         │
         ▼
       Lexer           (Tokenisasi: SIKU_BUKA '[', SIKU_TUTUP ']', KURAWAL_BUKA '{', KURAWAL_TUTUP '}')
         │
         ▼
       Parser          (Membangun NodeLiteralDaftar, NodeLiteralPeta, NodeAksesIndeks, NodePenugasanIndeks)
         │
         ▼
   Pemeriksa Tipe      (Validasi indeks bilangan, kunci teks, perlindungan konstanta tetap)
         │
         ▼
    Interpreter        (Evaluasi runtime, referensi array JS & Map JS, deep equality, fungsi panjang)
         │
         ▼
    Luaran Program
```

---

## 2. Struktur Simpul AST (Pohon Sintaksis Abstrak)

Simpul AST didefinisikan pada `src/parser/ast.ts`:

### A. `NodeLiteralDaftar`
```typescript
export interface NodeLiteralDaftar extends NodeAST {
  jenis: JenisNodeAST.LITERAL_DAFTAR;
  elemen: EkspresiAST[];
}
```

### B. `NodeLiteralPeta`
```typescript
export interface PasanganKunciNilaiPeta {
  kunci: string;
  nilai: EkspresiAST;
  posisi: RentangPosisi;
}

export interface NodeLiteralPeta extends NodeAST {
  jenis: JenisNodeAST.LITERAL_PETA;
  pasangan: PasanganKunciNilaiPeta[];
}
```

### C. `NodeAksesIndeks`
```typescript
export interface NodeAksesIndeks extends NodeAST {
  jenis: JenisNodeAST.AKSES_INDEKS;
  koleksi: EkspresiAST;
  indeks: EkspresiAST;
}
```

### D. `NodePenugasanIndeks`
```typescript
export interface NodePenugasanIndeks extends NodeAST {
  jenis: JenisNodeAST.PENUGASAN_INDEKS;
  koleksi: EkspresiAST;
  indeks: EkspresiAST;
  nilai: EkspresiAST;
}
```

---

## 3. Representasi Memori Runtime (`src/interpreter/nilai.ts`)

Di dalam interpreter, nilai runtime koleksi direpresentasikan menggunakan struktur data asli JavaScript berkinerja tinggi:

```typescript
export interface NilaiDaftar {
  jenis: JenisNilaiRuntime.DAFTAR;
  elemen: NilaiRuntime[];
}

export interface NilaiPeta {
  jenis: JenisNilaiRuntime.PETA;
  nilai: Map<string, NilaiRuntime>;
}
```

- **Semantik Referensi (*Reference Semantics*):** Koleksi diteruskan antar-fungsi dan penugasan sebagai referensi objek memori bersama, sehingga mutasi pada sub-elemen merefleksikan perubahan pada seluruh rujukan aktif.
- **Format Luaran Bersih:** `formatNilaiTeks(...)` memformat string di dalam koleksi dengan tanda kutip ganda `["A", "B"]` untuk membedakannya secara visual dari identifier atau angka.

---

## 4. Sistem Tipe Statis & Semantik (`src/tipe/`)

Pemeriksaan tipe statis dijalankan oleh `PemeriksaTipe` sebelum eksekusi program:

1. **Validasi Indeks Akses & Penugasan:**
   - Indeks `daftar` wajib bertipe `NamaTipe.BILANGAN` atau `NamaTipe.APAPUN`.
   - Kunci `peta` wajib bertipe `NamaTipe.TEKS` atau `NamaTipe.APAPUN`.
   - Mencegah penggunaan operator indeks `[...]` pada tipe skalar (`TIPE_BUKAN_KOLEKSI`).
2. **Kompatibilitas Nilai Elemen (`apakahKompatibel`):**
   - Hasil akses indeks koleksi menghasilkan tipe dinamis `NamaTipe.APAPUN`.
   - Tipe `NamaTipe.APAPUN` kompatibel dua arah dengan seluruh tipe variabel dan kembalian fungsi, memungkinkan penerimaan nilai elemen tanpa memerlukan casting manual.
3. **Perlindungan Mutabilitas Konstanta `tetap`:**
   - Pemeriksa tipe memeriksa apakah target koleksi berasal dari pengenal berstatus `tetap: true`.
   - Jika ya, melempar `JenisGalatTipe.MODIFIKASI_TETAP`.

---

## 5. Evaluasi Interpreter & Penanganan Runtime

1. **Akses Indeks (`AKSES_INDEKS`):**
   - `daftar`: Memeriksa rentang `0 <= indeks < panjang`. Jika melanggar, melempar `JenisGalatRuntime.BATAS_INDEKS_TERLAMPAUI`.
   - `peta`: Memeriksa `map.has(kunci)`. Jika tidak ada, melempar `JenisGalatRuntime.KUNCI_TIDAK_DITEMUKAN`.
2. **Penugasan Indeks (`PENUGASAN_INDEKS`):**
   - Memastikan variabel tidak ditandai sebagai `tetap` melalui `lingkungan.apakahTetap(nama)`.
   - Memutasi elemen array pada indeks target atau memasukkan pasangan baru via `map.set(kunci, nilai)`.
3. **Kesetaraan Struktural Mendalam (`apakahNilaiSama`):**
   - Operator `==` dan `!=` pada `src/operator/evaluasi.ts` mengevaluasi kesetaraan seluruh elemen rekursif, mendukung perbandingan daftar bersarang dan peta bertingkat.
4. **Fungsi Bawaan `panjang(...)`:**
   - Mengembalikan `target.elemen.length` untuk daftar dan `target.nilai.size` untuk peta.

---

## 6. Pengujian & Verifikasi

Rangkaian pengujian unit dan integrasi Phase 14 tersimpan di `pengujian/struktur_data/uji_struktur_data.ts` dengan 31 kasus uji mandiri:

```bash
# Menjalankan pengujian struktur data saja
npm run test:struktur-data

# Menjalankan seluruh pengujian kompilator dan regresi (Phase 1–14)
npm test
```
