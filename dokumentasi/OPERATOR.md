# Klasifikasi & Prioritas Operator Bahasa NUSANTARA

Dokumen ini mendefinisikan operator simbolik dan leksikal yang dirancang untuk ekspresi matematis, relasional, dan logis dalam bahasa **NUSANTARA**.

Status: **[DITETAPKAN] — Acuan Parsing Ekspresi Resmi (Disahkan pada Phase 4).**

---

## 1. Klasifikasi Operator Berdasarkan Fungsi

### A. Operator Aritmetika
Digunakan untuk kalkulasi numerik pada tipe `bilangan` dan `desimal`:

| Operator | Nama Operasi | Contoh Ekspresi | Keterangan |
|---|---|---|---|
| `+` | Penjumlahan | `a + b` | Menjumlahkan dua nilai numerik (atau penggabungan teks) |
| `-` | Pengurangan | `a - b` | Mengurangi operan kanan dari operan kiri |
| `*` | Perkalian | `a * b` | Mengalikan dua operan numerik |
| `/` | Pembagian | `a / b` | Membagi operan kiri dengan operan kanan |
| `%` | Modulo / Sisa Bagi | `a % b` | Menghasilkan sisa pembagian bilangan bulat |

### B. Operator Perbandingan (Relasional)
Digunakan untuk mengevaluasi relasi antara dua operan, menghasilkan nilai `logika` (`benar` atau `salah`):

| Operator | Arti Relasi | Contoh Ekspresi | Hasil Contoh (jika a=10, b=20) |
|---|---|---|---|
| `==` | Sama dengan | `a == b` | `salah` |
| `!=` | Tidak sama dengan | `a != b` | `benar` |
| `>` | Lebih besar dari | `a > b` | `salah` |
| `<` | Lebih kecil dari | `a < b` | `benar` |
| `>=` | Lebih besar atau sama | `a >= 10` | `benar` |
| `<=` | Lebih kecil atau sama | `a <= 10` | `benar` |

### C. Operator Logika Berbahasa Indonesia
Sesuai prinsip konstitusi bahasa, operator logika menggunakan kata leksikal Bahasa Indonesia utuh, bukan simbol matematika biner:

| Operator | Fungsi Logika | Contoh Ekspresi | Aturan Evaluasi |
|---|---|---|---|
| `dan` | Konjungsi (AND) | `nilai >= 75 dan aktif` | Menghasilkan `benar` jika kedua operan bernilai `benar` |
| `atau` | Disjungsi (OR) | `ujian == benar atau remedial` | Menghasilkan `benar` jika salah satu operan bernilai `benar` |
| `tidak` | Negasi (NOT) | `tidak aktif` | Membalikkan nilai logika operan tunggal |

### D. Operator Penugasan
| Operator | Fungsi | Contoh | Keterangan |
|---|---|---|---|
| `=` | Penugasan Tunggal | `skor = 100` | Menyalin nilai di ruas kanan ke variabel di ruas kiri |

---

## 2. Tabel Presedensi (Prioritas) Operator Resmi [DITETAPKAN]

Tabel hirarki urutan evaluasi operator dari prioritas tertinggi ke terendah yang disahkan pada **Phase 4 (Spesifikasi Sintaks - EBNF)**:

| Prioritas | Kategori Operator | Simbol / Kata Kunci | Arah Asosiatif | Status Pengesahan |
|---|---|---|---|---|
| 1 (Tertinggi) | Pengelompokan | `( )` | Dari dalam ke luar | **[DITETAPKAN]** |
| 2 | Negasi Logika & Tanda Unari | `tidak`, `-` (unari) | Kanan ke Kiri | **[DITETAPKAN]** |
| 3 | Perkalian, Pembagian, Modulo | `*`, `/`, `%` | Kiri ke Kanan | **[DITETAPKAN]** |
| 4 | Penjumlahan & Pengurangan | `+`, `-` | Kiri ke Kanan | **[DITETAPKAN]** |
| 5 | Perbandingan Ukuran | `<`, `<=`, `>`, `>=` | Kiri ke Kanan | **[DITETAPKAN]** |
| 6 | Perbandingan Kesetaraan | `==`, `!=` | Kiri ke Kanan | **[DITETAPKAN]** |
| 7 | Konjungsi Logika | `dan` | Kiri ke Kanan | **[DITETAPKAN]** |
| 8 (Terendah) | Disjungsi Logika | `atau` | Kiri ke Kanan | **[DITETAPKAN]** |

> Rincian tata bahasa pohon ekspresi bebas ambiguitas dijelaskan secara komprehensif pada dokumen [PRIORITAS-OPERATOR.md](PRIORITAS-OPERATOR.md) dan [EKSPRESI.md](EKSPRESI.md).
