# Tabel Prioritas & Presedensi Operator Resmi Bahasa NUSANTARA

Dokumen ini mengesahkan hirarki urutan evaluasi prioritas operator (*operator precedence*) dan arah asosiasi (*associativity*) dalam bahasa **NUSANTARA**.

Status: **[DITETAPKAN] — Acuan Parsing Ekspresi (Phase 4)**

---

## 1. Tabel Presedensi Resmi (Tingkat 1 Tertinggi hingga Tingkat 8 Terendah)

| Tingkat | Kategori Operator | Simbol / Kata Kunci | Arah Asosiatif | Contoh Evaluasi |
|---|---|---|---|---|
| **1 (Tertinggi)** | Pengelompokan | `( )` | Dari dalam ke luar | `(a + b) * c` |
| **2** | Negasi Logika & Tanda Unari | `tidak`, `-` (unari) | Kanan ke Kiri | `tidak aktif`, `-x` |
| **3** | Perkalian, Pembagian, Modulo | `*`, `/`, `%` | Kiri ke Kanan | `a * b / c % d` |
| **4** | Penjumlahan & Pengurangan | `+`, `-` | Kiri ke Kanan | `a + b - c` |
| **5** | Perbandingan Ukuran | `<`, `<=`, `>`, `>=` | Kiri ke Kanan | `nilai >= 75` |
| **6** | Perbandingan Kesetaraan | `==`, `!=` | Kiri ke Kanan | `status == "aktif"` |
| **7** | Konjungsi Logika (AND) | `dan` | Kiri ke Kanan | `a > 0 dan b < 10` |
| **8 (Terendah)** | Disjungsi Logika (OR) | `atau` | Kiri ke Kanan | `lulus atau remedial` |

*(Catatan: Operator penugasan `=` berada di tingkat pernyataan instruksi, bukan bagian dari evaluasi ekspresi bernilai biner).*

---

## 2. Aturan Arah Asosiatif (*Associativity*)

1. **Kiri ke Kanan (*Left-to-Right*):**
   Operator aritmetika dan relasional dievaluasi dari kiri ke kanan.
   - Contoh: `10 - 4 - 2` dievaluasi sebagai `(10 - 4) - 2 = 4`, bukan `10 - (4 - 2) = 8`.
2. **Kanan ke Kiri (*Right-to-Left*):**
   Operator unari dievaluasi dari kanan ke kiri.
   - Contoh: `tidak tidak benar` dievaluasi sebagai `tidak (tidak benar) = benar`.

---

## 3. Penggunaan Tanda Kurung untuk Penegasan Prioritas

Sesuai filosofi keterbacaan kode, penggunaan tanda kurung `( )` sangat dianjurkan untuk ekspresi majemuk yang melibatkan gabungan operator aritmetika dan logika:

```nusantara
// Dianjurkan (eksplisit & mudah dibaca):
jika (skorUjian >= 75) dan (kehadiran >= 80) maka
    tampilkan("Lulus")
akhir
```
