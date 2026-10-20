# Kompilator Resmi Bahasa NUSANTARA

Folder ini dicadangkan untuk implementasi inti kompilator bahasa pemrograman NUSANTARA.

---

## Struktur Folder yang Direncanakan

```
kompilator/
├── lexer/        # Penganalisis leksikal dan tokenisasi (Phase 6)
├── parser/       # Penganalisis sintaksis EBNF (Phase 7)
├── ast/          # Definisi node Pohon Sintaksis Abstrak (Phase 7)
├── semantik/     # Pemeriksa tipe dan tabel simbol (Phase 9 & 10)
├── optimasi/     # Pengoptimal IR dan kode mati (Phase 24)
└── backend/      # Pembangkit biner mesin / integrasi LLVM (Phase 22 & 23)
```

---

## Status Phase 1

Folder ini saat ini belum memuat implementasi kode kompilator. Sesuai prinsip rekayasa yang jujur, pembuatan modul kompilator baru akan dimulai pada **Phase 6 (Lexer)** setelah Konstitusi Bahasa (Phase 2) dan Spesifikasi Sintaks Formal EBNF (Phase 4) selesai dirumuskan.
