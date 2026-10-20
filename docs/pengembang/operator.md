# Arsitektur & Dokumentasi Teknis Sistem Operator NUSANTARA

Dokumen ini menjelaskan arsitektur internal sistem operator bahasa **NUSANTARA** yang dibangun dan disempurnakan pada **Phase 10 (Target: `v0.10.0`)**.

---

## 1. Saluran Pipa (Pipeline) Operator

Dalam arsitektur kompilasi dan interpretasi NUSANTARA, pemrosesan operator mengalir secara ketat melalui saluran pipa berikut:

```text
    Kode Sumber (.nusantara)
               │
               ▼
       ┌───────────────┐
       │     Lexer     │  Memindai simbol '+', '-', '*', dsb. dan kata 'dan', 'atau', 'tidak'
       └───────┬───────┘
               │  Aliran Token (Token Stream)
               ▼
       ┌───────────────┐
       │    Parser     │  Mengkonstruksi pohon sintaksis (AST) berdasarkan 8 tingkat presedensi
       └───────┬───────┘
               │  Pohon AST (NodeEkspresiBiner, NodeEkspresiUnari, NodeEkspresiPengelompokan)
               ▼
       ┌───────────────┐
       │  Type System  │  Pemeriksaan statis kompatibilitas tipe operan (PemeriksaTipe)
       └───────┬───────┘
               │  AST Tervalidasi & Aman Tipe
               ▼
       ┌───────────────┐
       │  Interpreter  │  Mengevaluasi ekspresi, hubung singkat (short-circuit), dispatch evaluasi
       └───────┬───────┘
               │
               ▼
       Keluaran Program / Galat Runtime Terstruktur
```

---

## 2. Modul Sistem Operator (`src/operator/`)

Sistem operator dipisahkan dalam modul tersendiri untuk mencegah duplikasi logika (*zero duplication*):

1. **`src/operator/jenisOperator.ts`:**
   - Menyediakan taksonomi kategori: `KategoriOperator` dan `ArahAsosiasi`.
   - Mendefinisikan `TABEL_PRESEDENSI_OPERATOR` dengan metadata lengkap (tingkat 1-8, arah asosiasi, keterlibatan unari/biner).
   - Memastikan tidak ada operator liar yang lolos tanpa spesifikasi.

2. **`src/operator/evaluasi.ts`:**
   - `evaluasiOperasiUnari(op, argumen, posisi, tumpukan)`:
     Mengevaluasi operator unari numerik (`-`) dan logika (`tidak`). Memastikan tipe operan valid sebelum kalkulasi.
   - `evaluasiOperasiBiner(op, kiri, kanan, posisi, tumpukan)`:
     Fungsi pemancar terpusat (*central operator dispatcher*) untuk aritmatika (`+`, `-`, `*`, `/`, `%`), perbandingan (`==`, `!=`, `<`, `>`, `<=`, `>=`), dan operasi logika biasa.
     Menangani proteksi pembagian dengan nol dan modulo dengan nol secara aman.

3. **`src/operator/index.ts`:**
   - Barrel export seluruh jenis, tabel presedensi, dan fungsi evaluasi.

---

## 3. Presedensi & Asosiativitas pada Parser (`src/parser/parser.ts`)

Parser menerapkan teknik *Recursive Descent* dengan jenjang fungsi bertingkat yang mencerminkan tabel presedensi 8 tingkat:

- `parseEkspresi()` -> memanggil `parseLogikaAtau()` (Tingkat 8: `atau`)
- `parseLogikaAtau()` -> memanggil `parseLogikaDan()` (Tingkat 7: `dan`)
- `parseLogikaDan()` -> memanggil `parseKesetaraan()` (Tingkat 6: `==`, `!=`)
- `parseKesetaraan()` -> memanggil `parseRelasional()` (Tingkat 5: `<`, `<=`, `>`, `>=`)
- `parseRelasional()` -> memanggil `parsePenjumlahan()` (Tingkat 4: `+`, `-`)
- `parsePenjumlahan()` -> memanggil `parsePerkalian()` (Tingkat 3: `*`, `/`, `%`)
- `parsePerkalian()` -> memanggil `parseUnari()` (Tingkat 2: `tidak`, `-` unari)
- `parseUnari()` -> memanggil `parsePrimer()` (Tingkat 1: `( ekspresi )`, literal, pengidentifikasi)

### Asosiativitas:
- **Kiri ke Kanan (Biner):** Diimplementasikan melalui perulangan `while` di setiap jenjang, menyarangkan ekspresi terdahulu di subpohon sebelah kiri: `kiri = { kiri: kiriLama, kanan: kananBaru }`.
- **Kanan ke Kiri (Unari):** Diimplementasikan melalui pemanggilan rekursif ke `parseUnari()` pada simpul argumen: `- - 5` -> `{ operator: '-', argumen: { operator: '-', argumen: 5 } }`.

---

## 4. Evaluasi Hubung Singkat (Short-circuit Evaluation)

Evaluasi hubung singkat diterapkan langsung pada AST tingkat Interpreter sebelum cabang kanan dievaluasi:

```typescript
// Sisi kiri dievaluasi terlebih dahulu
const kiri = this.evaluasiEkspresi(b.kiri);

if (b.operator === 'dan') {
  // Jika kiri sudah salah, cabang kanan TIDAK dievaluasi sama sekali
  if (!kiri.nilai) return buatLogika(false);
  return this.evaluasiEkspresi(b.kanan);
}

if (b.operator === 'atau') {
  // Jika kiri sudah benar, cabang kanan TIDAK dievaluasi sama sekali
  if (kiri.nilai) return buatLogika(true);
  return this.evaluasiEkspresi(b.kanan);
}
```

Dengan desain ini, pemanggilan fungsi yang berpotensi menghasilkan galat atau memiliki efek samping di sisi kanan akan dilewati jika hasil sisi kiri sudah menentukan nilai kebenaran.

---

## 5. Integrasi Sistem Tipe (`src/tipe/`)

Sistem tipe data statis (`PemeriksaTipe`) memvalidasi ekspresi sebelum interpretasi:
- Operan `dan`, `atau`, dan `tidak` **wajib** bertipe `logika`.
- Operan `<`, `<=`, `>`, `>=` hanya berlaku untuk pasangan numerik (`bilangan`/`desimal`) atau `teks`.
- Operan `%` hanya berlaku untuk pasangan `bilangan` bulat.
- Penjumlahan `+` mendukung konkatenasi jika melibatkan tipe `teks`.

Jika tipe tidak cocok, dibangkitkan `GalatTipe` diagnostik berbahasa Indonesia dengan koordinat posisi sumber lengkap.

---

## 6. Rangkaian Pengujian Operator

Rangkaian pengujian terotomatisasi di `pengujian/operator/uji_operator.ts` mencakup:
1. Operator Aritmatika (`+`, `-`, `*`, `/`, `%`).
2. Operator Perbandingan (`==`, `!=`, `<`, `>`, `<=`, `>=`).
3. Operator Logika (`dan`, `atau`, `tidak`).
4. Operator Unari (`tidak`, `-`).
5. Uji Presedensi Bertingkat (`2 + 3 * 4 == 14`).
6. Uji Asosiativitas Kiri ke Kanan (`10 - 5 - 2 == 3`).
7. Tanda Kurung Pengelompokan (`(2 + 3) * 4 == 20`).
8. Validasi Tipe Operan Statis.
9. Bukti Evaluasi Hubung Singkat (Memastikan efek samping tidak dipanggil).
10. Proteksi Pembagian dan Modulo dengan Nol.
11. Penolakan Operator Ilegal.
12. Presisi Lokasi Baris & Kolom pada Pesan Kesalahan.
13. Program Integrasi Komprehensif Melalui Seluruh Pipeline.
