# Arsitektur & Dokumentasi Teknis Percabangan NUSANTARA

Dokumen ini menjelaskan rancangan arsitektur, cara kerja internal, dan integrasi modul **Percabangan Kondisional (*Branching*)** bahasa **NUSANTARA** yang diselesaikan pada **Phase 11 (Milestone v0.11.0)**.

---

## 1. Saluran Pipa (*Pipeline*) Percabangan

Percabangan diproses secara konsisten melalui seluruh saluran pipa NUSANTARA:

```text
Kode Sumber (.nusantara)
         │
         ▼
 ┌───────────────┐
 │     Lexer     │  --> Mengenali token KW_JIKA, KW_MAKA, KW_SELAIN, KW_AKHIR
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │    Parser     │  --> Membangun NodePercabanganJika dengan Recursive Descent
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  Type Checker │  --> Memvalidasi tipe kondisi adalah NamaTipe.LOGIKA dan simbol terdefinisi
 └───────────────┘
         │
         ▼
 ┌───────────────┐
 │  Interpreter  │  --> Mengevaluasi kondisi runtime dan mengeksekusi blok terpilih dalam scope lokal
 └───────────────┘
```

---

## 2. Penganalisis Leksikal (Lexer)

Modul Lexer mengenali empat kata kunci utama:
- `jika` (`JenisToken.KW_JIKA`)
- `maka` (`JenisToken.KW_MAKA`)
- `selain` (`JenisToken.KW_SELAIN`)
- `akhir` (`JenisToken.KW_AKHIR`)

Seluruh kata kunci ini terdaftar pada kamus `TABEL_KATA_KUNCI` di `src/lexer/keyword.ts` dan dilindungi dari benturan dengan pengidentifikasi umum melalui mekanisme pencadangan leksikal (*reserved words*).

---

## 3. Penganalisis Sintaksis (Parser) & Node AST

Metode `parsePercabanganJika(tokenAwal: Token)` di `src/parser/parser.ts` mengadopsi pola *Recursive Descent*:
1. Memeriksa keberadaan ekspresi kondisi (mencegah kondisi kosong sebelum `maka`).
2. Mengurai ekspresi kondisi menggunakan `parseEkspresi()`.
3. Menuntut kemunculan token `KW_MAKA`.
4. Membaca daftar pernyataan dalam `cabangMaka` hingga bertemu `KW_SELAIN` atau `KW_AKHIR`.
5. Jika token `KW_SELAIN` ditemukan, membaca daftar pernyataan dalam `cabangSelain` hingga bertemu `KW_AKHIR`.
6. Menuntut penutup token `KW_AKHIR`.
7. Menghasilkan struktur node `NodePercabanganJika`:

```typescript
export interface NodePercabanganJika extends NodeAST {
  jenis: JenisNodeAST.PERCABANGAN_JIKA;
  kondisi: EkspresiAST;
  cabangMaka: PernyataanAST[];
  cabangSelain?: PernyataanAST[];
}
```

### Penanganan Kesalahan Sintaksis:
- **Lupa `akhir`:** Jika menemui `selesai` atau `EOF` saat masih di dalam blok percabangan, Parser melempar `JenisGalatParser.BLOK_TIDAK_DITUTUP` dengan koordinat posisi token yang akurat.
- **Kata Kunci Nyasar:** Jika `selain` atau `akhir` ditemui di luar konteks percabangan, Parser melempar `JenisGalatParser.TOKEN_TAK_TERDUGA`.

---

## 4. Analisis Semantik & Sistem Tipe (Type System)

Pemeriksaan tipe percabangan diatur dalam `src/tipe/pemeriksaTipe.ts`:
1. **Validasi Variabel Kondisi:** Mengiterasi ekspresi kondisi dan memastikan setiap pengidentifikasi yang dirujuk telah terdaftar pada tabel simbol lingkup aktif (`LingkupTipe`). Jika tidak ditemukan, melempar `JenisGalatTipe.VARIABEL_BELUM_DIDEKLARASIKAN`.
2. **Validasi Tipe Hasil Kondisi:** Menghitung tipe data ekspresi kondisi melalui `periksaEkspresi(s.kondisi)`. Jika tipe bukan `NamaTipe.LOGIKA`, sistem melempar `JenisGalatTipe.KETIDAKCOCOKAN_TIPE`.
3. **Pemeriksaan Pernyataan Berlingkup:** Memeriksa pernyataan di dalam `cabangMaka` dan `cabangSelain` menggunakan instansiasi `LingkupTipe` turunan (*lexical child scope*).

---

## 5. Mesin Eksekusi Runtime (Interpreter)

Eksekusi percabangan ditangani dalam `src/interpreter/interpreter.ts`:
```typescript
case JenisNodeAST.PERCABANGAN_JIKA: {
  const s = stmt as NodePercabanganJika;
  const hasilKondisi = this.evaluasiEkspresi(s.kondisi);

  if (hasilKondisi.jenis !== JenisNilaiRuntime.LOGIKA) {
    throw new GalatRuntime(
      JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
      `Kondisi percabangan 'jika' harus bertipe logika (benar/salah), bukan ${hasilKondisi.jenis}.`,
      s.kondisi.posisi.awal,
      [...this.tumpukanPanggilan]
    );
  }

  if (hasilKondisi.nilai === true) {
    this.eksekusiBlok(s.cabangMaka);
  } else if (s.cabangSelain) {
    this.eksekusiBlok(s.cabangSelain);
  }
  break;
}
```

### Karakteristik Eksekusi:
1. **Isolasi Cabang:** Hanya cabang yang terpilih yang dieksekusi. Cabang lain tidak pernah dihitung ataupun diakses, mencegah efek samping (*side-effects*) yang tidak diinginkan.
2. **Manajemen Lingkungan (*Environment*):** Pemanggilan `eksekusiBlok()` membuat lingkup `Lingkungan` baru bertaut ke lingkungan saat ini. Deklarasi lokal tidak bocor keluar, namun penugasan terhadap variabel luar tetap menembus lingkup induk secara tepat.

---

## 6. Pengujian & Kualitas Perangkat Lunak

Suite pengujian khusus terletak pada `pengujian/percabangan/uji_percabangan.ts` mencakup 24 skenario pengujian:
- Eksekusi `jika` tunggal tanpa `selain`
- Eksekusi `jika` berpasangan dengan `selain`
- Percabangan bersarang (*nested branching*) hingga tiga tingkat
- Struktur AST dan kelengkapan properti node
- Kondisi majemuk dengan operator relasional dan logika Phase 10
- Pengujian short-circuit dalam kondisi percabangan
- Verifikasi batas lingkup variabel (*scoping*)
- Validasi statis penolakan tipe `bilangan` dan `teks`
- Deteksi variabel kondisi tak terdefinisi
- Penolakan kesalahan sintaksis parser (lupa `maka`, lupa `akhir`, kata kunci nyasar)
- Pipeline eksekusi penuh program acuan spesifikasi resmi
