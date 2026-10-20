# Struktur Direktori & Berkas Proyek NUSANTARA

Dokumen ini menjelaskan fungsi setiap direktori dan berkas penting dalam repositori resmi **NUSANTARA**.

---

## 1. Peta Direktori Utama

```text
NUSANTARA/
├── docs/                     # Dokumentasi panduan pemula, referensi, & pengembang (Phase 5)
├── dokumentasi/              # Spesifikasi teknis formal, Konstitusi, EBNF, & arsip NIP
├── contoh/                   # Berkas sumber acuan resmi (.nusantara)
├── pengujian/                # Pengujian spesifikasi, kasus valid, & kasus tidak valid
├── kompilator/               # Peta arsitektur pipa kompilasi (Lexer, Parser, AST, Backend)
├── runtime/                  # Peta runtime eksekusi program
├── standar/                  # Peta pustaka standar bawaan bahasa
├── pustaka/                  # Peta pustaka modul ekosistem
├── kerangka/                 # Peta kerangka kerja web & aplikasi
├── alat/                     # Peta perkakas CLI & pengembang
├── ide/                      # Peta dukungan IDE & LSP
├── skrip/                    # Skrip audit otomatis (periksa_fondasi.js)
├── .github/                  # Templat Issue, Pull Request, & alur kerja GitHub
├── README.md                 # Titik masuk dokumentasi utama repositori
├── LISENSI                   # Teks resmi Apache License 2.0
├── TATA-KELOLA.md            # Piagam 5 peran tata kelola komunitas
├── KEAMANAN.md               # Kebijakan pelaporan kerentanan bertanggung jawab
├── KONTRIBUSI.md             # Panduan 10 langkah kontribusi terstruktur
├── KODE-ETIK.md              # Kode etik komunitas pengembang
├── PERUBAHAN.md              # Catatan rilis formal (Changelog)
└── ROADMAP.md                # Peta jalan 36 fase pengembangan
```

---

## 2. Berkas Kunci di Root

- **`README.md`:** Ringkasan proyek, status fase saat ini, contoh kode acuan, dan lisensi.
- **`LISENSI`:** Teks lengkap Apache License Version 2.0.
- **`ROADMAP.md`:** Rincian 36 fase pengembangan dari fondasi hingga NusantaraOS.
- **`TATA-KELOLA.md`:** Pembagian peran Pengguna, Kontributor, Reviewer, Maintainer, dan Release Manager.
- **`KEAMANAN.md`:** Prosedur *responsible disclosure* dan larangan rahasia dalam kode.
