# Spesifikasi Bentuk Literal Bahasa NUSANTARA

Dokumen ini mendefinisikan bentuk sintaksis dari nilai literal primitif dalam bahasa **NUSANTARA**.

Status: **[DITETAPKAN] — Acuan Sintaksis Nilai Konstan (Phase 4)**

---

## 1. Bentuk-Bentuk Literal Resmi

| Tipe Data | Format Penulisan Sintaks | Contoh Valid | Keterangan |
|---|---|---|---|
| `teks` | Diapit tanda kutip ganda (`"..."`) | `"Halo"`, `"Nusantara"`, `"Baris 1\nBaris 2"` | Rangkaian karakter UTF-8 |
| `bilangan` | Rangkaian angka desimal bulat tanpa pemisah | `0`, `42`, `1000` | Nilai bilangan bulat |
| `desimal` | Angka dengan pemisah titik desimal tunggal | `12.5`, `3.14159`, `0.75` | Pecahan titik mengambang (*floating point*) |
| `logika` | Kata kunci boolean khusus | `benar`, `salah` | Nilai kebenaran boolean |
| `kosong` | Kata kunci penanda kekosongan | `kosong` | Representasi ketiadaan nilai (*null/void*) |

---

## 2. Aturan Tanda Negatif (`-`)

Apakah `-10` merupakan literal atau ekspresi?

**Ketetapan Formal:**
- Tanda minus (`-`) yang mendahului sebuah bilangan diperlakukan sebagai **Operator Unari Negasi (*Unary Negation Operator*)**, bukan bagian langsung dari literal leksikal.
- Penganalisis leksikal mengenali token `OPERATOR(-)` diikuti token `LITERAL_BILANGAN(10)`.
- Pada tahap pembuatan AST (*Abstract Syntax Tree*), parser akan merangkainya menjadi simpul ekspresi `EkspresiUnari(Operator: "-", Nilai: 10)`.
- Hal ini menjamin konsistensi yang seragam antara ekspresi `-10`, `-(5 + 5)`, dan `-x`.

---

## 3. Aturan Karakter Lolos Minimal (*String Escaping*)

Di dalam literal `teks`, karakter khusus wajib diawali oleh garis miring terbalik (`\`):

1. **`\"` (Tanda Kutip Ganda):** Menulis kutip ganda tanpa menutup literal string.
   - Contoh: `"Ia berkata: \"Merdeka!\""`
2. **`\\` (Garis Miring Terbalik):** Menulis karakter backslash tunggal.
   - Contoh: `"C:\\berkas\\data"`
3. **`\n` (Baris Baru):** Menghasilkan baris baru (*newline*).
   - Contoh: `"Halo\nDunia"`
4. **`\t` (Tabulasi Horizontal):** Menghasilkan jarak tab.
   - Contoh: `"Kolom 1\tKolom 2"`

---

## 4. Status Terbuka: Sintaks Literal Karakter Tunggal

- Penggunaan tanda kutip tunggal (`'A'`) untuk tipe `karakter` telah dicadangkan secara leksikal.
- Namun, penanganan karakter multibita (misal: emoji atau grapheme cluster seperti `'🇮🇩'`) masih dicatat dalam [KEPUTUSAN-TERBUKA.md](KEPUTUSAN-TERBUKA.md) untuk disahkan saat arsitektur representasi bit memori difinalisasi pada Phase 9.
