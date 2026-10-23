# Panduan Pengembang: Arsitektur Formatter & Toolchain NUSANTARA

Versi Dokumen: v0.19.0  
Sasaran Pembaca: Kontributor & Pengembang Inti Bahasa NUSANTARA

---

## 1. Arsitektur Komponen (`src/toolchain/`)

Sistem toolchain NUSANTARA dirancang dengan pola modular tingkat tinggi:

```
src/toolchain/
├── konfigurasi.ts   # Konfigurasi format & pengurai tabel [format] TOML
├── formatter.ts     # Pretty printer AST & implementasi formatAman
├── linter.ts        # Aturan analisis statis (NUS-W001 s/d NUS-W004)
├── pemeriksa.ts     # Validator berkas tunggal & validator proyek rekursif
└── index.ts         # Pintu masuk ekspor barrel
```

---

## 2. Siklus Kerja Pretty Printer (`FormatterNUSANTARA`)

1. **Fase Pemindaian Komentar**:
   Objek `Lexer` dijalankan untuk memindai komentar (`//`) dan merekam posisinya ke dalam `KomentarSumber`:
   ```ts
   export interface KomentarSumber {
     teks: string;
     baris: number;
     kolom: number;
     indeksAwal: number;
     indeksAkhir: number;
     apakahKomentarBarisPenuh: boolean;
   }
   ```
2. **Fase Penguraian AST**:
   Objek `Parser` membangun `NodeProgram`. Jika terdapat galat sintaksis, proses dihentikan dan melempar galat parser yang akan diterjemahkan oleh Diagnostic Engine Phase 18.
3. **Fase Rekonstruksi (Pretty Printing)**:
   - Komentar yang terletak sebelum deklarasi atau pernyataan dicetak dengan indentasi yang sesuai.
   - Komentar inline yang berada di baris instruksi yang sama disisipkan kembali di ujung baris setelah satu spasi.
   - Presedensi operator biner dievaluasi untuk menjaga keabsahan tanda kurung aritmetika dan logika.
   - String literal menggunakan indeks asli dokumen kode sumber jika tersedia untuk menjamin 100% kelestarian escape sequence dan spasi internal.

---

## 3. Protokol Keamanan Tulis (Safety Check Protocol)

Fungsi `formatAman()` menerapkan pengamanan dua lapis sebelum memodifikasi berkas pengguna:

```ts
export function formatAman(kodeSumber: string, opsi?: Partial<KonfigurasiFormat>): HasilFormatAman {
  // 1. Format kode sumber asli
  const hasilFormat = formatKode(kodeSumber, opsi);

  // 2. Parse ulang hasil format
  const parserUji = new Parser(hasilFormat);
  parserUji.parse();
  const galat = parserUji.dapatkanDaftarGalat();

  // 3. Batalkan jika parse ulang menghasilkan galat
  if (galat.length > 0) {
    return { sukses: false, galat: galat[0], apakahBerubah: false };
  }

  return { sukses: true, hasil: hasilFormat, apakahBerubah: hasilFormat !== kodeSumber };
}
```

Hal ini mencegah terjadinya kerusakan berkas (*corruption*) bila ada kasus batas sintaksis yang belum terduga.

---

## 4. Penambahan Aturan Linter Baru

Untuk menambahkan aturan baru:
1. Daftarkan kode pada `KodeAturanLinter` di `src/toolchain/linter.ts` dengan format `NUS-Wxxx`.
2. Implementasikan logika penelusuran AST pada kelas `LinterNUSANTARA`.
3. Gunakan `this.tambahDiagnostik(...)` untuk menghasilkan objek diagnostik dengan tingkat keparahan `TingkatDiagnostik.PERINGATAN`.
4. Tambahkan pengujian otomatis di `pengujian/toolchain/uji_toolchain.ts`.
