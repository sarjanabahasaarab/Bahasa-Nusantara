# Spesifikasi Token Leksikal Bahasa NUSANTARA

Dokumen ini mendefinisikan seluruh kategori token leksikal yang dihasilkan oleh Lexer (Phase 6) saat memindai berkas sumber `.nusantara`.

Status: **[DITETAPKAN] untuk token inti; [RANCANGAN] untuk token lanjutan.**

---

## 1. Taksonomi Token

Lexer memecah aliran karakter kode sumber menjadi 10 kategori token dasar:

| Kategori Token | Pola Leksikal | Contoh Token | Status |
|---|---|---|---|
| **KATA_KUNCI** | 32 kata leksikal cadangan | `program`, `mulai`, `selesai`, `jika`, `maka` | 21 [DITETAPKAN], 11 [RANCANGAN] |
| **PENGIDENTIFIKASI** | `[a-zA-Z_][a-zA-Z0-9_]*` | `nama`, `skorAkhir`, `hitung_total` | **[DITETAPKAN]** |
| **LITERAL_BILANGAN** | `[0-9]+` | `0`, `42`, `1000` | **[DITETAPKAN]** |
| **LITERAL_DESIMAL** | `[0-9]+\.[0-9]+` | `3.14`, `0.5`, `100.0` | **[DITETAPKAN]** |
| **LITERAL_TEKS** | `"([^"\\]|\\.)*"` | `"Halo Dunia"`, `"Nusantara\n"` | **[DITETAPKAN]** |
| **LITERAL_KARAKTER** | `'([^'\\]|\\.)'` | `'A'`, `'z'`, `'\n'` | **[DITETAPKAN]** |
| **LITERAL_LOGIKA** | `benar` \| `salah` | `benar`, `salah` | **[DITETAPKAN]** |
| **LITERAL_KOSONG** | `kosong` | `kosong` | **[DITETAPKAN]** |
| **OPERATOR** | Simbol matematika & relasional | `+`, `-`, `*`, `/`, `%`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `=` | **[DITETAPKAN]** |
| **OPERATOR_LOGIKA** | `dan` \| `atau` \| `tidak` | `dan`, `atau`, `tidak` | **[DITETAPKAN]** |
| **PENGELOMPOK** | Tanda kurung & kurung siku | `(`, `)`, `[`, `]`, `{`, `}` | Kurung `()` [DITETAPKAN], `[]` & `{}` [RANCANGAN] |
| **PEMISAH** | Titik dua, koma, baris baru | `:`, `,`, `\n` | **[DITETAPKAN]** |
| **KOMENTAR** | `//.*` | `// Ini komentar` | **[DITETAPKAN]** |

---

## 2. Aturan Karakter & Kepekaan Huruf (*Case Sensitivity*)

1. **Pengkodean Berkas Wajib:** Berkas sumber `.nusantara` wajib dienkode dalam **UTF-8**.
2. **Peka Huruf Besar & Kecil (*Case-Sensitive*):**
   - Huruf besar dan kecil dibedakan secara ketat.
   - Variabel `totalNilai`, `TotalNilai`, dan `TOTALNILAI` adalah tiga token pengidentifikasi yang berbeda.
   - Kata kunci wajib ditulis dalam huruf kecil seragam (`program`, bukan `Program`; `mulai`, bukan `MULAI`).

---

## 3. Aturan Karakter Lolos String (*Escape Sequences*)

Pada literal teks (`"..."`), karakter garis miring terbalik (`\`) digunakan untuk menyisipkan karakter kontrol minimal:

| Urutan Lolos | Nilai Karakter Representasi | Fungsi |
|---|---|---|
| `\"` | Tanda kutip ganda (`"`) | Memasukkan tanda kutip di dalam teks |
| `\\` | Garis miring terbalik (`\`) | Memasukkan simbol backslash tunggal |
| `\n` | Baris Baru (*Line Feed / LF*) | Pindah baris tulisan |
| `\t` | Tabulasi (*Horizontal Tab*) | Jarak tabulasi horizontal |
| `\r` | Pengembalian Kereta (*Carriage Return*) | Format penutup baris sistem berkas tertentu |

> Setiap karakter lolos di luar daftar di atas (misal: `\x`, `\uXXXX`) belum difinalisasi dan akan menghasilkan peringatan leksikal.

---

## 4. Aturan Spasi, Baris Baru, dan Akhir Berkas

1. **Spasi & Tab (*Whitespace*):** Digunakan murni sebagai pemisah token leksikal dan diabaikan dalam pohon sintaksis (AST).
2. **Baris Baru (*Newline*):** Bertindak sebagai pemisah alami instruksi. Satu baris instruksi ditutup saat karakter `\n` terdeteksi, kecuali baris tersebut sedang membuka ekspresi bertanda kurung terbuka `(`.
3. **Akhir Berkas (*End of File / EOF*):** Setiap berkas sumber dianggap valid meskipun tidak diakhiri oleh baris kosong di ujung berkas, asalkan blok `mulai` telah ditutup oleh `selesai`.
