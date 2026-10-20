# Kaidah Pengidentifikasi (Identifier) Bahasa NUSANTARA

Dokumen ini mendefinisikan aturan leksikal resmi untuk pembentukan nama pengidentifikasi (*identifiers*) yang merepresentasikan program, variabel, konstanta tetap, fungsi, parameter, dan kelas.

Status: **[DITETAPKAN] — Acuan Standar Leksikal (Phase 4)**

---

## 1. Aturan Pembentukan Pengidentifikasi

Pengidentifikasi yang sah wajib mematuhi seluruh kaidah leksikal berikut:

1. **Himpunan Karakter Dasar:** Hanya tersusun dari huruf alfabet ASCII (`a`-`z`, `A`-`Z`), angka desimal (`0`-`9`), dan garis bawah (`_`).
2. **Karakter Pertama Wajib Huruf atau Garis Bawah:** Karakter awal **TIDAK BOLEH** berupa angka (`0`-`9`).
3. **Larangan Bentrok Kata Kunci (*Reserved Keywords*):** Tidak boleh menggunakan satu pun dari 32 kata kunci resmi bahasa NUSANTARA (misal: dilarang menamai variabel `jika`, `mulai`, `program`, `fungsi`, atau `kembalikan`).
4. **Peka Huruf Besar & Kecil (*Case-Sensitive*):** Huruf kapital dan huruf kecil dianggap sebagai simbol yang berbeda (`skor`, `Skor`, dan `SKOR` adalah tiga pengidentifikasi independen).
5. **Larangan Spasi & Tanda Baca Khusus:** Dilarang mengandung spasi, tanda hubung (`-`), titik (`.`), atau simbol aritmetika/moneter (`$`, `@`, `#`, `%`).

---

## 2. Contoh Pengidentifikasi Sah & Tidak Sah

### Contoh Sah (*Valid*):
- `nama` — Kata sederhana dengan huruf kecil.
- `umur` — Pengidentifikasi satu kata.
- `nilai_siswa` — Pola snake_case menggunakan garis bawah.
- `hitungTotal` — Pola camelCase yang konsisten.
- `data2` — Huruf diikuti angka di posisi belakang.
- `_penghitung` — Garis bawah di awal untuk identifikasi privat/internal.
- `MAKSIMAL_SKOR` — Pola UPPER_SNAKE_CASE untuk konstanta `tetap`.

### Contoh Tidak Sah (*Invalid*):
- `2nama` — **Gagal:** Diawali oleh angka `2`.
- `jika` — **Gagal:** Merupakan kata kunci percabangan yang dicadangkan.
- `nama siswa` — **Gagal:** Mengandung karakter spasi di antara kata.
- `total-harga` — **Gagal:** Tanda hubung `-` akan diparse sebagai operasi pengurangan.
- `uang$` — **Gagal:** Mengandung simbol khusus `$` yang tidak diizinkan.

---

## 3. Status Terbuka: Karakter Unicode & Aksara Nusantara

- **Keputusan Saat Ini:** Pada Phase 4, pengidentifikasi **dibatasi secara ketat pada karakter ASCII (`[a-zA-Z_][a-zA-Z0-9_]*`)** untuk menjaga keandalan generator parser dan kompatibilitas silang arsitektur kompiler.
- **Keputusan Terbuka [RANCANGAN]:** Dukungan terhadap huruf beraksen (seperti `é`), aksara daerah (Aksara Jawa, Sunda, Bali, Batak, Lontara), atau karakter Unicode lanjutan dicatat dalam [KEPUTUSAN-TERBUKA.md](KEPUTUSAN-TERBUKA.md) dan belum diimplementasikan pada fase ini. Kompiler dilarang mengklaim dukungan Unicode pada pengidentifikasi sebelum ada standarisasi resmi NIP.
