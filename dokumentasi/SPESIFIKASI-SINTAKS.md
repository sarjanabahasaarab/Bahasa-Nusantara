# Spesifikasi Sintaks Formal Bahasa NUSANTARA

Dokumen ini merupakan spesifikasi sintaksis acuan resmi bagi bahasa pemrograman **NUSANTARA**. Spesifikasi ini mendasari implementasi Lexer pada Phase 6 dan Parser pada Phase 7.

Status dokumen: **[DITETAPKAN] — Acuan Sintaksis Formal (Phase 4)**

---

## 1. Audit & Harmonisasi Spesifikasi Sebelumnya

Sebelum merumuskan tata bahasa formal EBNF, dilakukan audit terhadap seluruh keputusan dari Phase 1, Phase 2 (Konstitusi Bahasa), dan Phase 3 (Tata Kelola):

### A. Perbedaan dan Keputusan Harmonisasi

| Aspek | Status Fase Sebelumnya | Keputusan Resmi Phase 4 | Alasan Teknis |
|---|---|---|---|
| **Pemisah Pernyataan (*Semicolon* vs *Newline*)** | Belum diatur eksplisit pada Phase 2 | **Baris Baru (*Newline*)** menjadi pemisah alami pernyataan; tanda titik koma (`;`) tidak diwajibkan dan dihindari. | Menjaga keterbacaan alami (*cognitive fluency*) Bahasa Indonesia tanpa gangguan tanda baca redundan. |
| **Bentuk Deklarasi Variabel** | Didukung 2 bentuk: `nama : tipe = nilai` dan `variabel nama : tipe = nilai` | **Kedua bentuk SAH**. Bentuk singkat `nama : tipe = nilai` adalah bentuk idiomatik; kata kunci `variabel` opsional untuk kejelasan eksplisit. | Memberikan kemudahan penulisan ringkas sekaligus tetap mendukung kejelasan deklaratif pemula. |
| **Batas Akhir Perulangan `untuk`** | Disebut `untuk angka dari 1 sampai 10 lakukan` | **Batas akhir bersifat INKLUSIF** (angka 10 ikut diproses dalam iterasi). | Sesuai semantik Bahasa Indonesia "sampai", yang mencakup batas akhir yang disebutkan. |
| **Blok Percabangan Bertingkat** | Belum ada kata kunci `jika_tidak` | Kata kunci resmi adalah `jika` ... `maka` ... `selain` ... `akhir`. Kondisi bertingkat ditulis dengan bersarang (*nested*) di dalam blok `selain`. Usulan `selain_jika` dicatat sebagai [RANCANGAN]. | Mencegah penambahan kata kunci baru tanpa melalui mekanisme proposal NIP. |
| **Komentar Multibaris** | Berstatus [RANCANGAN] pada Phase 2 | **Komentar resmi adalah satu baris `//`**. Komentar multibaris `/* ... */` dicatat dalam [KEPUTUSAN-TERBUKA.md](KEPUTUSAN-TERBUKA.md) hingga generator parser Phase 7 siap. | Menghindari kompleksitas tokenisasi leksikal dini. |

---

## 2. Struktur Program Dasar

Satu berkas sumber `.nusantara` memuat tepat **satu unit program utama**:

```nusantara
program NamaProgram

mulai
    // pernyataan-pernyataan
selesai
```

### Ketentuan Struktur:
1. **Deklarasi Program Wajib:** Kata kunci `program` harus berada pada baris instruksi pertama (setelah komentar atau baris kosong).
2. **Aturan Nama Program:** `NamaProgram` wajib berupa pengidentifikasi sah dengan konvensi huruf kapital PascalCase.
3. **Blok Utama Wajib:** Seluruh instruksi eksekusi wajib berada di dalam blok `mulai` dan `selesai`.
4. **Baris Kosong & Indentasi:** Baris kosong diabaikan oleh parser. Indentasi disarankan 4 spasi untuk keterbacaan, namun tidak memengaruhi batas leksikal blok.
5. **Cakupan Berkas:** Satu berkas berekstensi `.nusantara` mendefinisikan satu program mandiri.

---

## 3. Peta Dokumen Spesifikasi Sintaks Phase 4

Spesifikasi formal ini dipecah ke dalam modul-modul dokumen terperinci:

1. **[GRAMMAR-EBNF.md](GRAMMAR-EBNF.md):** Notasi tata bahasa bebas konteks resmi menggunakan standar EBNF.
2. **[TOKEN.md](TOKEN.md):** Aturan leksikal token, spasi, baris baru, literal, dan karakter lolos (*escape sequences*).
3. **[IDENTIFIER.md](IDENTIFIER.md):** Kaidah pembentukan nama variabel, fungsi, konstanta, dan program.
4. **[LITERAL.md](LITERAL.md):** Bentuk literal `teks`, `bilangan`, `desimal`, `logika`, dan `kosong`.
5. **[EKSPRESI.md](EKSPRESI.md):** Tata bahasa evaluasi ekspresi matematis dan logika.
6. **[PRIORITAS-OPERATOR.md](PRIORITAS-OPERATOR.md):** Tabel presedensi 9 tingkat dan arah asosiasi operator.
7. **[ATURAN-BLOK.md](ATURAN-BLOK.md):** Pembatasan blok kendali `jika`, `untuk`, `selama`, dan `fungsi`.
8. **[KEPUTUSAN-TERBUKA.md](KEPUTUSAN-TERBUKA.md):** Catatan teknis fitur yang belum difinalisasi untuk fase berikutnya.
9. **[CONTOH-SINTAKS.md](CONTOH-SINTAKS.md):** 10 contoh program acuan dengan status kepatuhan spesifikasi.
