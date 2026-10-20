# Spesifikasi Evaluasi Ekspresi Bahasa NUSANTARA

Dokumen ini mendefinisikan struktur sintaksis dan kaidah semantik evaluasi ekspresi matematis, relasional, dan logika dalam bahasa **NUSANTARA**.

Status: **[DITETAPKAN] — Acuan Evaluasi Ekspresi (Phase 4)**

---

## 1. Definisi Ekspresi

Ekspresi adalah konstruksi sintaksis yang dapat dievaluasi untuk menghasilkan sebuah nilai tunggal dengan tipe data tertentu.

Bentuk dasar ekspresi meliputi:
1. **Ekspresi Primer:** Literal konstan (`"teks"`, `42`, `benar`), pengidentifikasi variabel (`skor`), atau ekspresi dalam tanda kurung `(a + b)`.
2. **Ekspresi Unari:** Operator tunggal di depan operan (`tidak aktif`, `-nilai`).
3. **Ekspresi Biner:** Dua operan yang dihubungkan oleh operator biner (`a + b`, `skor >= 75`, `lulus dan aktif`).
4. **Ekspresi Pemanggilan Fungsi:** Nama fungsi diikuti daftar argumen terkurung (`hitung(a, b)`).

---

## 2. Penghindaran Ambiguitas Parsing

Untuk mencegah ambiguitas pada parser (misalnya: apakah `2 + 3 * 4` berarti `(2 + 3) * 4` atau `2 + (3 * 4)`), tata bahasa ekspresi ditata dalam hirarki pohon bertingkat yang mencerminkan tabel presedensi secara alami:

- Evaluasi selalu mengalir dari tingkat prioritas terendah (`atau`) menuju tingkat prioritas tertinggi (ekspresi primer).
- Operator pada tingkat yang sama dievaluasi sesuai arah asosiasinya (sebagian besar dari kiri ke kanan).

---

## 3. Evaluasi Hubung Singkat Logika (*Short-Circuit Evaluation*)

Operator logika berbahasa Indonesia mematuhi aturan evaluasi hubung singkat secara konseptual:
- **`a dan b`:** Jika `a` bernilai `salah`, maka `b` tidak perlu dievaluasi karena hasil keseluruhan dipastikan `salah`.
- **`a atau b`:** Jika `a` bernilai `benar`, maka `b` tidak perlu dievaluasi karena hasil keseluruhan dipastikan `benar`.

---

## 4. Tipe Hasil Evaluasi Konseptual

| Operasi | Tipe Operan yang Diharapkan | Tipe Hasil Evaluasi |
|---|---|---|
| Aritmetika (`+`, `-`, `*`, `/`, `%`) | `bilangan` atau `desimal` | `bilangan` (jika kedua operan bulat) atau `desimal` |
| Penggabungan Teks (`+`) | Salah satu atau kedua operan `teks` | `teks` |
| Relasional (`<`, `<=`, `>`, `>=`) | `bilangan` atau `desimal` | `logika` (`benar` / `salah`) |
| Kesetaraan (`==`, `!=`) | Sepadan tipe datanya | `logika` (`benar` / `salah`) |
| Logika (`dan`, `atau`, `tidak`) | `logika` | `logika` (`benar` / `salah`) |

> ⚠️ **Catatan Status:** Tabel ini merupakan spesifikasi aturan semantik masa depan. Kompiler belum mengeksekusi evaluasi ini pada Phase 4.
