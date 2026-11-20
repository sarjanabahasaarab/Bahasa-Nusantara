# Arsitektur Kompilator & Saluran Pipa Bahasa NUSANTARA

Dokumen ini menetapkan cetak biru saluran pipa kompilator NUSANTARA. Implementasinya dilakukan bertahap sesuai peta jalan resmi; nomor fase di bawah merujuk pada milestone implementasi yang berlaku saat ini.

Pada **Phase 1**, arsitektur ini ditetapkan sebagai cetak biru resmi tanpa implementasi kompilator tiruan (*no mock compiler*).

---

## 1. Saluran Pipa Kompilasi (*Compilation Pipeline*)

```
[ Berkas Kode Sumber (.nusantara) ]
                  │
                  ▼
        ┌──────────────────┐
        │   1. LEXER       │  (Fase 6)
        │   Tokenisasi ID  │
        └─────────┬────────┘
                  │ Stream Token (KATA_KUNCI, PENGIDENTIFIKASI, LITERAL, OPERATOR)
                  ▼
        ┌──────────────────┐
        │   2. PARSER      │  (Fase 7)
        │   Tata Bahasa    │
        └─────────┬────────┘
                  │ Pohon Sintaksis Abstrak (AST)
                  ▼
        ┌──────────────────┐
        │   3. AST         │  (Struktur Pohon Terverifikasi)
        │   Representasi   │
        └─────────┬────────┘
                  │ Validasi Simbol & Tipe
                  ▼
        ┌──────────────────┐
        │   4. SEMANTIK    │  (Fase 9 & 10)
        │   Pemeriksa Tipe │
        └─────────┬────────┘
                  │ AST Teranotasi
                  ▼
        ┌──────────────────┐
        │   5. IR          │  (Phase 43: NIR)
        │   Intermed. Repr │
        └─────────┬────────┘
                  │ Tiga Alamat Kode / SSA Form
                  ▼
        ┌──────────────────┐
        │   6. OPTIMIZER   │  (optimasi bertahap)
        │   Optimasi Kode  │
        └─────────┬────────┘
                  │ IR Teroptimasi
                  ▼
        ┌──────────────────┐
        │   7. BACKEND     │  (Phase 44: LLVM)
        │   LLVM / Mesin   │
        └─────────┬────────┘
                  │ Assembler & Linker (Phase 45)
                  ▼
[ Berkas Biner Eksekusi Asli (Native Binary / .exe / ELF) ]
```

---

## 2. Penjelasan Tahapan Saluran Pipa

### Tahap 1: Penganalisis Leksikal (Lexer)
- **Tugas:** Membaca aliran karakter UTF-8 dari berkas `.nusantara` dan mengubahnya menjadi deretan token logis (`Token`).
- **Fitur Khusus:**
  - Mengenali kata kunci Bahasa Indonesia (`program`, `mulai`, `selesai`, `jika`, dll.).
  - Mendeteksi operator leksikal (`dan`, `atau`, `tidak`, `+`, `-`, `*`, `/`, `>=`, `<=`).
  - Mencatat lokasi baris dan kolom untuk pelaporan diagnostik yang akurat.

### Tahap 2: Penganalisis Sintaksis (Parser)
- **Tugas:** Memeriksa kesesuaian deretan token dengan tata bahasa formal NUSANTARA.
- **Metode:** *Recursive Descent Parser* dengan strategi pemulihan galat (*error recovery*) yang ramah pengguna.
- **Keluaran:** Node-node hierarkis yang merepresentasikan struktur program.

### Tahap 3: Pohon Sintaksis Abstrak (AST)
- Node-node murni yang merefleksikan logika komputasi:
  - `NodeProgram`
  - `NodeDeklarasiVariabel`
  - `NodePercabanganKondisi`
  - `NodePerulanganUntuk`
  - `NodeDefinisiFungsi`
  - `NodePernyataanKembalikan`

### Tahap 4: Analisis Semantik (Semantic Analyzer)
- **Tugas:**
  - Membangun tabel simbol (*symbol table*) untuk melacak cakupan (*scope*) variabel dan fungsi.
  - Memverifikasi kecocokan tipe data (`teks` tidak boleh dijumlahkan secara sembarangan dengan `logika` tanpa konversi).
  - Memastikan konstanta bertanda `tetap` tidak dapat diubah kembali (*immutable*).

### Tahap 5: Representasi Perantara (Intermediate Representation / IR)
- Menghasilkan representasi instruksi independen dari arsitektur perangkat keras (*architecture-neutral*); implementasi NUSANTARA Intermediate Representation (NIR) berada pada Phase 43.
- Menggunakan format *Static Single Assignment* (SSA) untuk memudahkan algoritma optimasi.

### Tahap 6: Pengoptimal (Optimizer)
- **Tugas:**
  - *Dead Code Elimination* (menghapus kode yang tidak pernah dieksekusi).
  - *Constant Folding* (mengevaluasi ekspresi bernilai tetap saat kompilasi).
  - *Inline Expansion* (memperluas fungsi pendek untuk meniadakan beban *call stack*).

### Tahap 7: Pembangkit Kode (Backend)
- Menerjemahkan IR menjadi instruksi mesin melalui backend LLVM (Phase 44) atau backend lain yang tervalidasi.
- Mengaitkan pustaka runtime untuk alokasi memori dan operasi I/O; resolusi simbol, relokasi, dan pengemasan executable ditangani pada tahap linker (Phase 45).
- Menghasilkan biner mandiri (*standalone executable*) berkinerja tinggi.

---

## 3. Visi Format Berkas Mandiri NUSANTARA (Phase 30)

Di masa depan, ekosistem NUSANTARA direncanakan mendukung format berkas multimedia dan data mandiri berakar Bahasa Indonesia yang terintegrasi secara natif dengan runtime bahasa:

| Format Ekstensi | Fungsi & Kegunaan yang Direncanakan |
|---|---|
| `.gambar` | Format raster & vektor grafis berpresisi tinggi dengan metadata bahasa asli |
| `.video` | Format kontainer video komputasional berlatensi rendah |
| `.suara` | Format audio lossless dengan dukungan sintesis suara otomatis |
| `.animasi` | Deskripsi grafis gerak prosedural dan vektor dinamis |
| `.buku` | Format publikasi dokumen digital interaktif dan berindeks |
| `.font` | Format glif dan tipografi aksara nusantara & universal |
| `.ikon` | Kumpulan aset ikonik resolusi independen untuk aplikasi GUI |

> **Penegasan Fase 1:** Format-format di atas merupakan visi konseptual yang baru akan diriset dan diimplementasikan pada **Phase 30 (Format NUSANTARA)**. Tidak ada klaim bahwa format-format ini telah berfungsi pada rilis v0.1.0.
