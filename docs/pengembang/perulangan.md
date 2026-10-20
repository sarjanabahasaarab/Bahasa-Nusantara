# Arsitektur & Dokumentasi Teknis Sistem Perulangan NUSANTARA

Dokumen ini menjelaskan perancangan arsitektur, cara kerja internal, dan integrasi modul **Sistem Perulangan (*Loops*)** bahasa **NUSANTARA** yang diselesaikan pada **Phase 12 (Milestone v0.12.0)**.

---

## 1. Saluran Pipa (*Pipeline*) Perulangan

Struktur perulangan dieksekusi secara mulus melalui saluran pipa terpadu:

```text
Kode Sumber (.nusantara)
         │
         ▼
 ┌───────────────┐
 │     Lexer     │  --> Mengenali KW_SELAMA, KW_UNTUK, KW_DARI, KW_SAMPAI, KW_LAKUKAN, KW_HENTIKAN, KW_LANJUTKAN, KW_AKHIR
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │    Parser     │  --> Membangun NodePerulanganSelama, NodePerulanganUntuk, NodeInstruksiHentikan, NodeInstruksiLanjutkan
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  Type Checker │  --> Validasi kondisi logika, rentang bilangan bulat, pelacakan kedalaman loop untuk hentikan/lanjutkan
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  Interpreter  │  --> Menjalankan loop iteratif, menangani SinyalHentikan / SinyalLanjutkan, dan batas keamanan iterasi
 └───────────────┘
```

---

## 2. Penganalisis Leksikal (Lexer)

Kata kunci yang berkaitan dengan perulangan:
- `selama` (`JenisToken.KW_SELAMA`)
- `untuk` (`JenisToken.KW_UNTUK`)
- `dari` (`JenisToken.KW_DARI`)
- `sampai` (`JenisToken.KW_SAMPAI`)
- `lakukan` (`JenisToken.KW_LAKUKAN`)
- `hentikan` (`JenisToken.KW_HENTIKAN`)
- `lanjutkan` (`JenisToken.KW_LANJUTKAN`)
- `akhir` (`JenisToken.KW_AKHIR`)

Semua token ini telah didefinisikan secara resmi di `src/lexer/jenisToken.ts` dan dipetakan di `src/lexer/keyword.ts`.

---

## 3. Penganalisis Sintaksis (Parser) & Node AST

Modul `src/parser/parser.ts` menguraikan konstruksi perulangan dengan metode:
1. `parsePerulanganSelama(tokenAwal: Token)`:
   - Memvalidasi keberadaan ekspresi kondisi sebelum `lakukan`.
   - Menuntut kemunculan token `KW_LAKUKAN`.
   - Mengumpulkan daftar pernyataan dalam `tubuh` hingga bertemu `KW_AKHIR`.
   - Mendeteksi galat jika ditemui `KW_SELESAI` atau EOF tanpa `KW_AKHIR`.
2. `parsePerulanganUntuk(tokenAwal: Token)`:
   - Membaca nama variabel penghitung (`IDENTIFIER`).
   - Menuntut `KW_DARI` dan mengurai `nilaiAwal`.
   - Menuntut `KW_SAMPAI` dan mengurai `nilaiAkhir`.
   - Menuntut `KW_LAKUKAN`.
   - Mengumpulkan daftar pernyataan dalam `tubuh` hingga bertemu `KW_AKHIR`.
3. Pencegahan Token Nyasar:
   - `parsePernyataan` menolak kemunculan `lakukan`, `dari`, atau `sampai` di luar konteks loop.

### Struktur Node AST (`src/parser/ast.ts`):
```typescript
export interface NodePerulanganSelama extends NodeAST {
  jenis: JenisNodeAST.PERULANGAN_SELAMA;
  kondisi: EkspresiAST;
  tubuh: PernyataanAST[];
}

export interface NodePerulanganUntuk extends NodeAST {
  jenis: JenisNodeAST.PERULANGAN_UNTUK;
  variabelPenghitung: string;
  nilaiAwal: EkspresiAST;
  nilaiAkhir: EkspresiAST;
  tubuh: PernyataanAST[];
}

export interface NodeInstruksiHentikan extends NodeAST {
  jenis: JenisNodeAST.INSTRUKSI_HENTIKAN;
}

export interface NodeInstruksiLanjutkan extends NodeAST {
  jenis: JenisNodeAST.INSTRUKSI_LANJUTKAN;
}
```

---

## 4. Analisis Semantik & Sistem Tipe (Type System)

Pemeriksaan tipe statis pada `src/tipe/pemeriksaTipe.ts`:
1. **Pelacakan Kedalaman Perulangan (`kedalamanPerulangan`):**
   - Diinisialisasi dengan `0`.
   - Dinaikkan (*increment*) saat memeriksa tubuh loop `selama` atau `untuk`, dan diturunkan (*decrement*) di blok `finally`.
   - Memvalidasi penggunaan `hentikan` dan `lanjutkan`: jika `kedalamanPerulangan === 0`, melempar `JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS`.
2. **Validasi Kondisi `selama`:**
   - Memeriksa variabel kondisi terdefinisi (`validasiVariabelKondisi`).
   - Menuntut hasil evaluasi kondisi bertipe `NamaTipe.LOGIKA`.
3. **Validasi Rentang `untuk`:**
   - Memeriksa variabel pada `nilaiAwal` dan `nilaiAkhir`.
   - Menuntut `nilaiAwal` dan `nilaiAkhir` bertipe `NamaTipe.BILANGAN`.
   - Mendefinisikan variabel penghitung sebagai simbol bertipe `NamaTipe.BILANGAN` pada tabel simbol lokal loop (`LingkupTipe`).

---

## 5. Mesin Eksekusi Runtime (Interpreter)

Eksekusi perulangan diatur di `src/interpreter/interpreter.ts`:
1. **Sinyal Kontrol Alur Non-Lokal:**
   - `hentikan` melempar `SinyalHentikan`.
   - `lanjutkan` melempar `SinyalLanjutkan`.
   - Blok `try ... catch` pada perulangan menangkap sinyal ini untuk melakukan `break` atau `continue`.
   - Pada perulangan bersarang, penangkapan sinyal terjadi di tingkat terdalam sehingga perulangan luar tetap berjalan normal.
2. **Semantik Rentang Kosong:**
   - Pada perulangan `untuk`, jika `awal.nilai > akhir.nilai`, perulangan dilewati 0 kali tanpa galat (*safe early break*).
3. **Perlindungan Loop Tak Terbatas (*Infinite Loop Protection*):**
   - Interpreter menerima opsi `maksimalIterasiPerulangan` (default: 1.000.000 iterasi).
   - Jika jumlah iterasi loop melebihi ambang batas, dilempar `JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI`.

---

## 6. Pengujian & Kualitas Perangkat Lunak

Suite pengujian khusus terletak pada `pengujian/perulangan/uji_perulangan.ts` mencakup 25 skenario pengujian:
- Perulangan `selama` normal dan kondisi awal salah
- Perulangan `untuk` rentang inklusif, batas tunggal, dan rentang kosong
- Kendali aliran `hentikan` pada `selama` dan `untuk`
- Kendali aliran `lanjutkan` dengan verifikasi inkremen variabel penghitung
- Kombinasi percabangan di dalam loop dan loop di dalam percabangan
- Perulangan bersarang multi-dimensi (baris x kolom)
- Struktur AST dan kelengkapan properti node
- Validasi tipe statis (kondisi logika, batas bilangan bulat, deteksi variabel gaib)
- Penolakan `hentikan` dan `lanjutkan` di luar loop
- Diagnostik kesalahan sintaksis parser (lupa `lakukan`, lupa `akhir`, token nyasar)
- Deteksi perlindungan runtime terhadap infinite loop
