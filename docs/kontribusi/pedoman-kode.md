# Pedoman Gaya Penulisan Kode (Style Guide) NUSANTARA

Untuk menjaga keterbacaan kode yang seragam di seluruh ekosistem, ikuti konvensi penulisan berikut:

---

## 1. Konvensi Penamaan (*Naming Conventions*)

- **Nama Program:** Gunakan gaya **PascalCase** (diawali huruf kapital pada setiap kata).
  - Contoh: `program KasirToko`, `program SimulasiFisika`.
- **Nama Variabel & Parameter:** Gunakan gaya **camelCase** (diawali huruf kecil).
  - Contoh: `namaSiswa`, `skorMaksimal`, `tinggiBadan`.
- **Nama Konstanta `tetap`:** Gunakan gaya **UPPER_SNAKE_CASE** (seluruh huruf kapital dengan pemisah garis bawah).
  - Contoh: `tetap BATAS_AMBANG : bilangan = 100`, `tetap KODE_VERSI : teks = "1.0"`.
- **Nama Fungsi:** Gunakan gaya **camelCase** dengan kata kerja aktif.
  - Contoh: `hitungLuas`, `cetakHasil`, `dapatkanNilai`.

---

## 2. Indentasi & Spasi

1. **Indentasi:** Gunakan **4 spasi** per tingkat blok. Jangan mencampur spasi dan tab.
2. **Spasi Sekitar Operator:** Berikan satu spasi sebelum dan sesudah operator biner (`a + b`, `skor >= 75`, `x = 10`).
3. **Spasi Tanda Kurung:** Jangan berikan spasi di bagian dalam tanda kurung:
   - Benar: `tampilkan(nama)`
   - Kurang Tepat: `tampilkan( nama )`
4. **Deklarasi Tipe:** Gunakan format `nama : tipe = nilai`:
   - Satu spasi sebelum titik dua, satu spasi setelah titik dua, dan satu spasi di sekitar tanda sama dengan.
