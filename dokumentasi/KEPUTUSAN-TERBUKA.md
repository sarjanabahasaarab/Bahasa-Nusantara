# Katalog Keputusan Terbuka (Open Decisions) Bahasa NUSANTARA

Dokumen ini mencatat keputusan arsitektural dan sintaksis yang **belum difinalisasi secara resmi pada Phase 4**, dan sengaja ditangguhkan pembahasannya ke fase-fase berikutnya atau membutuhkan evaluasi proposal formal NIP.

> ⚠️ **Prinsip Integritas Rekayasa:** Seluruh topik dalam dokumen ini berstatus **[TERBUKA / RANCANGAN]**. Kompiler, linter, dan perkakas ekosistem **DILARANG MENGKLAIM** telah mendukung fitur-fitur ini sebelum disahkan secara resmi.

---

## 1. Daftar Topik Keputusan Terbuka

### A. Pengidentifikasi Beraksara Daerah & Unicode Lanjutan
- **Isu:** Apakah pengidentifikasi boleh memuat karakter non-ASCII (seperti huruf beraksen `é` pada kata `skéma` atau aksara Nusantara)?
- **Status Saat Ini:** Terbatas pada ASCII `[a-zA-Z_][a-zA-Z0-9_]*`.
- **Fase Pembahasan:** Phase 9 (Tipe Data & Simbol) atau melalui proposal NIP khusus.

### B. Format Komentar Banyak Baris (*Multi-line Comments*)
- **Isu:** Pemilihan antara gaya C `/* ... */` atau blok leksikal berbahasa Indonesia (misal: `komentar_mulai ... komentar_selesai`).
- **Status Saat Ini:** Hanya komentar satu baris `//` yang disahkan pada Phase 4.
- **Fase Pembahasan:** Phase 6 (Lexer) dan Phase 7 (Parser).

### C. Usulan Kata Kunci Percabangan Bertingkat (`selain_jika`)
- **Isu:** Mengurangi tingkat indentasi (*nesting*) saat mengevaluasi kondisi bertingkat banyak tanpa harus menulis `selain` bersarang dengan `jika`.
- **Usulan Sintaks:**
  ```nusantara
  jika nilai >= 90 maka
      tampilkan("A")
  selain_jika nilai >= 80 maka
      tampilkan("B")
  selain
      tampilkan("C")
  akhir
  ```
- **Status Saat Ini:** Berstatus [RANCANGAN]. Memerlukan persetujuan proposal NIP formal sebelum kata kunci baru ditambahkan ke kamus bahasa.

### D. Sintaksis Formal Koleksi `daftar` dan `peta`
- **Isu:** Penetapan apakah kumpulan data menggunakan tanda kurung siku `[1, 2, 3]` untuk `daftar` dan kurung kurawal `{"kunci": "nilai"}` untuk `peta`, atau menggunakan sintaks fungsi `buat daftar(...)`.
- **Status Saat Ini:** Berstatus [RANCANGAN].
- **Fase Pembahasan:** Phase 14 (Struktur Data Koleksi).

### E. Penanganan Nilai Kosong & Null-Safety Ketat
- **Isu:** Apakah variabel secara default tidak boleh bernilai kosong (*non-nullable* by default), dan apakah tipe data yang boleh kosong memerlukan penanda khusus seperti `teks?`.
- **Status Saat Ini:** Disediakan literal `kosong`. Semantik pengecekan waktu kompilasi (*compile-time null safety*) akan disahkan pada Phase 9.
