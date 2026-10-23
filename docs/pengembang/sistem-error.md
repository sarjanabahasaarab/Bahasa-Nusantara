# Panduan Pengembang: Sistem Diagnostik & Error NUSANTARA (Phase 18)

**Target Versi**: v0.18.0  
**Audiens**: Pengembang Inti Kompilator & Kontributor NUSANTARA

---

## 1. Arsitektur Mesin Diagnostik

Mesin diagnostik Bahasa NUSANTARA terletak pada direktori `src/diagnostik/`. Arsitektur ini memisahkan pemodelan data galat (*domain model*), logika inferensi (*engine*), algoritma pencocokan saran (*Levenshtein distance*), dan pemformat tampilan (*renderers*):

```
src/diagnostik/
├── jenis.ts       # Definisi model data Diagnostik, Kategori, Tingkat, Frame
├── kode.ts        # Enumerasi KodeGalat & tabel kamus METADATA_KODE_GALAT
├── cuplikan.ts    # Ekstraksi baris kode & perhitungan tanda penunjuk visual caret
├── saran.ts       # Algoritma jarak Levenshtein & inferensi nama kandidat
├── mesin.ts       # Mesin Diagnostik pusat (MesinDiagnostik) & konverter galat
├── renderer.ts    # Format teks konsol ANSI & generator JSON
└── index.ts       # Pintu masuk ekspor publik modul diagnostik
```

---

## 2. Model Data Diagnostik Terpusat (`Diagnostik`)

Objek `Diagnostik` memuat informasi lengkap tanpa bergantung pada format keluaran:

```typescript
export interface Diagnostik {
  tingkat: TingkatDiagnostik;          // INFORMASI, PERINGATAN, KESALAHAN, FATAL
  kategori: KategoriDiagnostik;        // LEXER, PARSER, TIPE, NAMA, MODUL, PAKET, RUNTIME, ...
  kode: KodeGalat;                     // Contoh: NUS-TYP-001
  pesan: string;                       // Pesan deskriptif utama
  penyebabRinci?: string;              // Penjelasan teknis tambahan
  lokasi?: LokasiSumberKaya;           // Berkas, baris, kolom, panjang
  potonganKode?: PotonganKode;         // Cuplikan teks & baris caret (^^^^)
  saran?: string;                      // Rekomendasi solusi / saran perbaikan
  konteks?: KonteksEksekusi;           // Modul, Paket, Fungsi aktif
  jejakTumpukan?: BingkaiJejak[];      // Frame riwayat panggilan
  penyebabAsal?: Diagnostik;           // Rantai galat (Error chain)
  metadata?: Record<string, any>;      // Informasi debug
  waktu?: Date;
}
```

---

## 3. Cara Menambahkan Kode Error Baru

Ketika Anda menambahkan fitur baru atau aturan validasi baru di kompilator:

1. **Tambahkan enum pada `src/diagnostik/kode.ts`**:
   ```typescript
   export enum KodeGalat {
     // ...
     CON_FORMAT_TIDAK_VALID = 'NUS-CON-004',
   }
   ```
2. **Daftarkan metadata pada tabel `METADATA_KODE_GALAT`**:
   ```typescript
   [KodeGalat.CON_FORMAT_TIDAK_VALID]: {
     kode: KodeGalat.CON_FORMAT_TIDAK_VALID,
     kategori: 'Konversi',
     judul: 'Format Konversi Tidak Sah',
     penjelasan: 'Nilai masukan tidak sesuai format yang diharapkan oleh fungsi konversi.',
     saranStandar: 'Gunakan masukan teks yang memenuhi format standar.',
   },
   ```
3. **Hubungkan pemetaan pada `MesinDiagnostik` (`src/diagnostik/mesin.ts`)** agar pengecualian yang dilempar diterjemahkan menjadi kode baru tersebut.
4. **Perbarui dokumentasi resmi** pada `docs/referensi/sistem-error.md`.
5. **Tambahkan unit test** pada `pengujian/diagnostik/uji_diagnostik.ts`.

---

## 4. Pola Pelemparan Kesalahan (Error Throwing Guidelines)

- **Jangan pernah melempar string mentah** seperti `throw "Galat"`.
- Selalu gunakan kelas galat domain spesifik:
  - `GalatLexer` untuk tahapan pemindaian token.
  - `GalatParser` untuk ketidaksesuaian tata bahasa.
  - `GalatTipe` untuk anomali tipe data dan deklarasi.
  - `GalatModul` untuk resolusi berkas pustaka.
  - `GalatRuntime` untuk pelanggaran komputasi saat eksekusi.
- Pastikan selalu menyertakan `PosisiSumber` (`baris` dan `kolom`) jika tersedia, agar penunjuk visual caret `^^^^` dapat dibangun dengan tepat.

---

## 5. Algoritma Jarak Levenshtein untuk Saran Kesalahan

Fungsi `cariSaranTerdekat(namaDicari, daftarKandidat, batasMaksimalJarak)` menggunakan matriks pemrograman dinamis 2-baris dengan kompleksitas memori $O(\min(M, N))$:
- Kata pendek ($\le 3$ karakter) hanya menerima toleransi jarak $\le 1$.
- Kata yang memiliki perbedaan panjang ekstrem diabaikan secara langsung (*early prune*).
- Jika jarak terkecil melampaui batas keyakinan, sistem tidak akan menampilkan saran palsu.

---

## 6. Pengujian Sistem Diagnostik

Jalankan pengujian diagnostik secara mandiri menggunakan perintah:

```bash
npm run test:diagnostik
```

Atau jalankan seluruh test suite kompilator NUSANTARA:

```bash
npm test
```
