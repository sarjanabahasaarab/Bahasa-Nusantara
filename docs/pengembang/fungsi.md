# Arsitektur & Dokumentasi Teknis Sistem Fungsi NUSANTARA (Phase 13)

Dokumen ini menjelaskan implementasi internal saluran pipa (*compiler pipeline*) untuk sistem fungsi bahasa **NUSANTARA**, meliputi AST, Parser, Type Checker, Interpreter, dan penanganan galat.

---

## 1. Saluran Pipa (*Pipeline*) Fungsi

```text
Kode Sumber (.nusantara)
         │
         ▼
       Lexer           (Tokenisasi: KW_FUNGSI, KW_KEMBALIKAN, IDENTIFIER, dll.)
         │
         ▼
      Parser           (Membangun NodeDeklarasiFungsi, NodeParameterFungsi, NodePemanggilanFungsi)
         │
         ▼
   Pemeriksa Tipe      (Validasi tipe parameter, tipe kembalian, deteksi duplikasi & fungsi gaib)
         │
         ▼
    Interpreter        (Pengikatan argumen, bingkai tumpukan terisolasi, sinyal kembalikan)
         │
         ▼
    Luaran Program
```

---

## 2. Struktur Simpul AST (Pohon Sintaksis Abstrak)

Simpul AST didefinisikan pada `src/parser/ast.ts`:

### A. `NodeDeklarasiFungsi`
```typescript
export interface NodeDeklarasiFungsi extends NodeAST {
  jenis: JenisNodeAST.DEKLARASI_FUNGSI;
  nama: string;
  parameter: NodeParameterFungsi[];
  tipeKembalian?: string;
  tubuh: PernyataanAST[];
}
```

### B. `NodeParameterFungsi`
```typescript
export interface NodeParameterFungsi extends NodeAST {
  jenis: JenisNodeAST.PARAMETER_FUNGSI;
  nama: string;
  tipeData: string;
}
```

### C. `NodePemanggilanFungsi`
```typescript
export interface NodePemanggilanFungsi extends NodeAST {
  jenis: JenisNodeAST.PEMANGGILAN_FUNGSI;
  namaFungsi: string;
  argumen: EkspresiAST[];
}
```

### D. `NodeInstruksiKembalikan`
```typescript
export interface NodeInstruksiKembalikan extends NodeAST {
  jenis: JenisNodeAST.INSTRUKSI_KEMBALIKAN;
  nilai?: EkspresiAST;
}
```

---

## 3. Analisis Semantik & Sistem Tipe (`PemeriksaTipe`)

Modul `src/tipe/pemeriksaTipe.ts` menerapkan validasi 2 tahap (*two-pass checking*):
1. **Pass 1 (Registrasi Header):** Mendaftarkan seluruh nama fungsi, parameter, dan tipe kembalian ke dalam `tabelFungsi`.
   - Menolak duplikasi nama fungsi (`DEKLARASI_GANDA`).
   - Menolak penggunaan nama built-in `tampilkan`.
   - Menolak nama parameter ganda pada satu fungsi.
2. **Pass 2 (Pemeriksaan Tubuh):** Memeriksa tubuh setiap fungsi dalam `LingkupTipe` lokal yang memuat parameter sebagai simbol terdaftar.
   - Memeriksa kesesuaian tipe nilai ekspresi pada `kembalikan`.
   - Memastikan fungsi bertipe non-void memiliki instruksi `kembalikan`.
   - Menolak instruksi `kembalikan` yang berada di luar fungsi.
   - Memvalidasi argumen pada saat ekspresi `PEMANGGILAN_FUNGSI` dievaluasi.

---

## 4. Eksekusi Runtime (`Interpreter`)

Modul `src/interpreter/interpreter.ts` menangani siklus hidup pemanggilan fungsi:
1. **Tumpukan Konteks (*Call Stack*):** Setiap kali fungsi dipanggil, `BingkaiTumpukan` baru didorong ke `tumpukanPanggilan` untuk jejak kesalahan runtime presisi.
2. **Proteksi Stack Overflow:** Menolak pemanggilan yang melebihi batas 500 tingkat dengan galat `BATAS_ITERASI_TERLAMPAUI`.
3. **Lingkungan Terisolasi:** Dibuat `Lingkungan` baru dengan tautan induk ke `lingkunganPenutup` leksikal. Parameter diikat ke nilai argumen yang telah dievaluasi.
4. **Mekanisme Nilai Kembali:** Menggunakan kelas kendali alur `SinyalKembalikan(nilai)`. Sinyal ini ditangkap secara spesifik oleh bingkai fungsi pemanggil dan mengembalikan nilai ke ekspresi terkait.

---

## 5. Rangkaian Pengujian (`pengujian/fungsi/uji_fungsi.ts`)

28 skenario pengujian unit dan integrasi terotomasi mencakup:
- Parsing AST deklarasi, parameter, dan pemanggilan.
- Diagnostik sintaksis parser (koma trailing, blok belum ditutup).
- Pemeriksaan semantik Type System (kesesuaian argumen, duplikasi, return checking).
- Evaluasi runtime, rekursi faktorial, isolasi lingkup, dan proteksi rekursi tak terbatas.
- Eksekusi program nyata dari pipeline hulu ke hilir.
