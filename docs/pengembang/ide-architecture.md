# Arsitektur Developer Tools & IDE Foundation (Phase 26)

Dokumen ini menjelaskan rancangan arsitektur internal dari **NUSANTARA IDE & Developer Tools Foundation** pada versi `v0.26.0`.

---

## 1. Diagram Arsitektur Komponen

```
+---------------------------------------------------------------------------------+
|                                 NUSANTARA IDE                                   |
|                                                                                 |
|  [Project Explorer]   [Source Editor]     [Diagnostics Panel]  [Command Palette]|
|  [Search in Files]    [Breakpoint Gutter] [Output & Terminal]  [Settings / i18n]|
+---------------------------------------------------------------------------------+
                                      |
                         Layanan Inti IDE (src/ide/)
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
  [ManajerRuangKerja]           [JembatanLSP]              [PelariProsesIDE]
  - Normalisasi jalur           - LayananDiagnostik        - Interpreter (Run)
  - Struktur pohon berkas       - LayananKompleksi         - Penelusur (Debug)
  - Pencarian terindeks         - LayananHover             - Profiler (Performa)
  - Operasi CRUD aman           - LayananDefinisi          - Penghapusan zombie
                                - FormatterNUSANTARA       - TerminalTerintegrasi
                                      |
                                      v
                      NUSANTARA TOOLCHAIN (Phases 1-25)
  +-------------------------------------------------------------------------------+
  | Lexer -> Parser -> AST -> Type System -> Interpreter/DAP -> CLI & Packages   |
  +-------------------------------------------------------------------------------+
```

---

## 2. Pemisahan Modul (`src/ide/`)

1. **`types.ts`**: Definisi antarmuka untuk pohon berkas, tab editor, diagnostik, hasil pencarian, status eksekusi, pengaturan, dan perintah.
2. **`workspaceManager.ts`**: Pengelolaan sistem berkas virtual dalam memori, sanitasi jalur terhadap path traversal (`..`), dan pembentukan pohon direktori.
3. **`highlighter.ts`**: Pewarnaan sintaksis menggunakan `Lexer` resmi dengan resolusi token kata kunci, tipe, bilangan, teks, operator, dan komentar.
4. **`lspBridge.ts`**: Integrasi Language Server Phase 20 dan Formatter Phase 19.
5. **`runner.ts`**: Eksekusi program, debugging, dan profiling terkontrol dengan penanganan `stdout`, `stderr`, dan pembatalan proses.
6. **`terminalRunner.ts`**: Terminal interaktif berbasis `NusantaraCLI`.
7. **`settingsManager.ts`**: Penyimpanan pengaturan lokal (`localStorage`) dengan event emitter.
8. **`commandRegistry.ts`**: Registrasi perintah dan pencarian fuzzy untuk Command Palette.
9. **`i18n.ts`**: Glosarium dwibahasa (Indonesia & Inggris) dengan interpolasi parameter.

---

## 3. Kompatibilitas Mundur & Kualitas

- 100% kompatibel dengan grammar dan runtime Phase 1–25.
- Zero regression pada seluruh pengujian otomatis (22 suite tes `npm test` lulus 100%).
- Penanganan proses tanpa kebocoran memori atau proses zombie.
