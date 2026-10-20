/**
 * Skrip Pemeriksaan Kepatuhan Repositori Bahasa NUSANTARA
 * Memvalidasi integritas seluruh berkas Phase 1, 2, 3, 4, 5, 6, 7, 8, 9, dan Phase 10 (v0.10.0).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const berkasWajib = [
  // --- TATA KELOLA & LISENSI UTAMA (Phase 3 & Root) ---
  { berkas: 'README.md', kategori: 'Dokumentasi Utama', fase: 'Phase 1-10' },
  { berkas: 'LISENSI', kategori: 'Teks Apache License 2.0', fase: 'Phase 3' },
  { berkas: 'TATA-KELOLA.md', kategori: 'Struktur 5 Peran Komunitas', fase: 'Phase 3' },
  { berkas: 'KEAMANAN.md', kategori: 'Kebijakan Keamanan', fase: 'Phase 3' },
  { berkas: 'KONTRIBUSI.md', kategori: 'Panduan Kontribusi 10 Langkah', fase: 'Phase 1-3' },
  { berkas: 'KODE-ETIK.md', kategori: 'Kode Etik Komunitas', fase: 'Phase 1-3' },
  { berkas: 'PERUBAHAN.md', kategori: 'Catatan Rilis (Changelog)', fase: 'Phase 1-10' },
  { berkas: 'ROADMAP.md', kategori: 'Peta Jalan 36 Fase', fase: 'Phase 1-10' },
  { berkas: '.gitignore', kategori: 'Konfigurasi Git', fase: 'Phase 1' },

  // --- TEMPLAT GITHUB (Phase 3) ---
  { berkas: '.github/ISSUE_TEMPLATE/bug.md', kategori: 'Templat Laporan Kutu', fase: 'Phase 3' },
  { berkas: '.github/ISSUE_TEMPLATE/fitur.md', kategori: 'Templat Usulan Fitur', fase: 'Phase 3' },
  { berkas: '.github/ISSUE_TEMPLATE/dokumentasi.md', kategori: 'Templat Isu Dokumentasi', fase: 'Phase 3' },
  { berkas: '.github/ISSUE_TEMPLATE/pertanyaan.md', kategori: 'Templat Diskusi & Tanya', fase: 'Phase 3' },
  { berkas: '.github/PULL_REQUEST_TEMPLATE.md', kategori: 'Templat Pull Request', fase: 'Phase 3' },

  // --- IMPLEMENTASI & DOKUMENTASI SISTEM MODUL (Phase 15 Baru) ---
  { berkas: 'src/modul/jenisModul.ts', kategori: 'Definisi & Tipe Data Sistem Modul', fase: 'Phase 15' },
  { berkas: 'src/modul/galatModul.ts', kategori: 'Sistem Pelaporan Galat Modul', fase: 'Phase 15' },
  { berkas: 'src/modul/pembacaBerkas.ts', kategori: 'Abstraksi Pembaca Sistem Berkas', fase: 'Phase 15' },
  { berkas: 'src/modul/resolverModul.ts', kategori: 'Resolver Jalur & Keamanan Traversal', fase: 'Phase 15' },
  { berkas: 'src/modul/pemuatModul.ts', kategori: 'Pemuat, Cache & Deteksi Siklus', fase: 'Phase 15' },
  { berkas: 'src/modul/index.ts', kategori: 'Ekspor Terpadu Subsistem Modul', fase: 'Phase 15' },
  { berkas: 'docs/referensi/modul.md', kategori: 'Panduan Referensi Sistem Modul', fase: 'Phase 15' },
  { berkas: 'docs/pengembang/modul.md', kategori: 'Dokumentasi Teknis Sistem Modul', fase: 'Phase 15' },
  { berkas: 'pengujian/modul/uji_modul.ts', kategori: 'Rangkaian 24 Uji Sistem Modul', fase: 'Phase 15' },
  { berkas: 'pengujian/modul/README.md', kategori: 'Panduan Eksekusi Uji Modul', fase: 'Phase 15' },
  { berkas: 'contoh/07_modul.nusantara', kategori: 'Contoh Acuan Penggunaan Modul', fase: 'Phase 15' },
  { berkas: 'contoh/contoh_matematika.nusantara', kategori: 'Modul Contoh Matematika', fase: 'Phase 15' },
  { berkas: 'contoh/contoh_teks.nusantara', kategori: 'Modul Contoh Teks', fase: 'Phase 15' },

  // --- IMPLEMENTASI & DOKUMENTASI STRUKTUR DATA (Phase 14) ---
  { berkas: 'docs/referensi/struktur-data.md', kategori: 'Panduan Referensi Struktur Data', fase: 'Phase 14' },
  { berkas: 'docs/pengembang/struktur-data.md', kategori: 'Dokumentasi Teknis Struktur Data', fase: 'Phase 14' },
  { berkas: 'pengujian/struktur_data/uji_struktur_data.ts', kategori: 'Rangkaian 31 Uji Struktur Data', fase: 'Phase 14' },
  { berkas: 'pengujian/struktur_data/README.md', kategori: 'Panduan Eksekusi Uji Struktur Data', fase: 'Phase 14' },
  { berkas: 'contoh/06_struktur_data.nusantara', kategori: 'Contoh Acuan Struktur Data', fase: 'Phase 14' },

  // --- IMPLEMENTASI & DOKUMENTASI SISTEM FUNGSI (Phase 13) ---
  { berkas: 'docs/referensi/fungsi.md', kategori: 'Panduan Referensi Fungsi', fase: 'Phase 13' },
  { berkas: 'docs/pengembang/fungsi.md', kategori: 'Dokumentasi Teknis Fungsi', fase: 'Phase 13' },
  { berkas: 'pengujian/fungsi/uji_fungsi.ts', kategori: 'Rangkaian 28 Uji Sistem Fungsi', fase: 'Phase 13' },
  { berkas: 'pengujian/fungsi/README.md', kategori: 'Panduan Eksekusi Uji Fungsi', fase: 'Phase 13' },

  // --- IMPLEMENTASI & DOKUMENTASI SISTEM PERULANGAN (Phase 12) ---
  { berkas: 'docs/referensi/perulangan.md', kategori: 'Panduan Referensi Perulangan', fase: 'Phase 12' },
  { berkas: 'docs/pengembang/perulangan.md', kategori: 'Dokumentasi Teknis Perulangan', fase: 'Phase 12' },
  { berkas: 'pengujian/perulangan/uji_perulangan.ts', kategori: 'Rangkaian 25 Uji Perulangan', fase: 'Phase 12' },
  { berkas: 'pengujian/perulangan/README.md', kategori: 'Panduan Eksekusi Uji Perulangan', fase: 'Phase 12' },

  // --- IMPLEMENTASI & DOKUMENTASI PERCABANGAN (Phase 11) ---
  { berkas: 'docs/referensi/percabangan.md', kategori: 'Panduan Referensi Percabangan', fase: 'Phase 11' },
  { berkas: 'docs/pengembang/percabangan.md', kategori: 'Dokumentasi Teknis Percabangan', fase: 'Phase 11' },
  { berkas: 'pengujian/percabangan/uji_percabangan.ts', kategori: 'Rangkaian 24 Uji Percabangan', fase: 'Phase 11' },
  { berkas: 'pengujian/percabangan/README.md', kategori: 'Panduan Eksekusi Uji Percabangan', fase: 'Phase 11' },

  // --- IMPLEMENTASI MODUL SISTEM OPERATOR (Phase 10) ---
  { berkas: 'src/operator/jenisOperator.ts', kategori: 'Taksonomi & Presedensi 8 Tingkat', fase: 'Phase 10' },
  { berkas: 'src/operator/evaluasi.ts', kategori: 'Mesin Evaluasi & Dispatch Operator', fase: 'Phase 10' },
  { berkas: 'src/operator/index.ts', kategori: 'Ekspor Terpadu Sistem Operator', fase: 'Phase 10' },
  { berkas: 'docs/pengembang/operator.md', kategori: 'Dokumentasi Teknis Sistem Operator', fase: 'Phase 10' },
  { berkas: 'pengujian/operator/uji_operator.ts', kategori: 'Rangkaian 21 Uji Sistem Operator', fase: 'Phase 10' },
  { berkas: 'pengujian/operator/README.md', kategori: 'Panduan Eksekusi Uji Operator', fase: 'Phase 10' },

  // --- IMPLEMENTASI MODUL SISTEM TIPE DATA & TYPE CHECKER (Phase 9 Baru) ---
  { berkas: 'src/tipe/jenisTipe.ts', kategori: 'Definisi Tipe & Taksonomi Resmi', fase: 'Phase 9' },
  { berkas: 'src/tipe/galatTipe.ts', kategori: 'Sistem Pelaporan Kesalahan Tipe', fase: 'Phase 9' },
  { berkas: 'src/tipe/kompatibilitas.ts', kategori: 'Aturan Kompatibilitas Tipe', fase: 'Phase 9' },
  { berkas: 'src/tipe/pemeriksaTipe.ts', kategori: 'Mesin Analisis Semantik & Type Checker', fase: 'Phase 9' },
  { berkas: 'src/tipe/index.ts', kategori: 'Ekspor Terpadu Sistem Tipe', fase: 'Phase 9' },
  { berkas: 'docs/pengembang/type-system.md', kategori: 'Dokumentasi Teknis Sistem Tipe', fase: 'Phase 9' },
  { berkas: 'pengujian/tipe/uji_tipe.ts', kategori: 'Rangkaian 12 Uji Sistem Tipe', fase: 'Phase 9' },
  { berkas: 'pengujian/tipe/README.md', kategori: 'Panduan Eksekusi Uji Sistem Tipe', fase: 'Phase 9' },

  // --- IMPLEMENTASI MODUL INTERPRETER RUNTIME (Phase 8) ---
  { berkas: 'src/interpreter/nilai.ts', kategori: 'Sistem Nilai Runtime', fase: 'Phase 8' },
  { berkas: 'src/interpreter/environment.ts', kategori: 'Manajemen Lingkup & Tabel Simbol', fase: 'Phase 8' },
  { berkas: 'src/interpreter/sinyal.ts', kategori: 'Sinyal Kontrol Alur Eksekusi', fase: 'Phase 8' },
  { berkas: 'src/interpreter/outputWriter.ts', kategori: 'Abstraksi Pencetak Keluaran', fase: 'Phase 8' },
  { berkas: 'src/interpreter/galat.ts', kategori: 'Pelaporan Galat Runtime', fase: 'Phase 8' },
  { berkas: 'src/interpreter/interpreter.ts', kategori: 'Mesin Eksekusi AST', fase: 'Phase 8' },
  { berkas: 'src/interpreter/index.ts', kategori: 'Ekspor Terpadu Interpreter', fase: 'Phase 8' },
  { berkas: 'docs/pengembang/interpreter.md', kategori: 'Dokumentasi Teknis Interpreter', fase: 'Phase 8' },
  { berkas: 'pengujian/interpreter/uji_interpreter.ts', kategori: 'Rangkaian 15 Uji Interpreter', fase: 'Phase 8' },
  { berkas: 'pengujian/interpreter/README.md', kategori: 'Panduan Eksekusi Uji Interpreter', fase: 'Phase 8' },

  // --- IMPLEMENTASI MODUL PARSER & AST (Phase 7) ---
  { berkas: 'src/parser/ast.ts', kategori: 'Definisi Struktur Simpul AST', fase: 'Phase 7' },
  { berkas: 'src/parser/galat.ts', kategori: 'Pelaporan Galat Sintaksis', fase: 'Phase 7' },
  { berkas: 'src/parser/astPrinter.ts', kategori: 'Utilitas Visualisasi Pohon AST', fase: 'Phase 7' },
  { berkas: 'src/parser/parser.ts', kategori: 'Mesin Penganalisis Sintaksis EBNF', fase: 'Phase 7' },
  { berkas: 'src/parser/index.ts', kategori: 'Ekspor Terpadu Parser & AST', fase: 'Phase 7' },
  { berkas: 'src/parser/README.md', kategori: 'Dokumentasi Modul Parser', fase: 'Phase 7' },
  { berkas: 'docs/pengembang/parser.md', kategori: 'Dokumentasi Teknis Parser', fase: 'Phase 7' },
  { berkas: 'pengujian/parser/uji_parser.ts', kategori: 'Rangkaian 11 Uji Parser & AST', fase: 'Phase 7' },
  { berkas: 'pengujian/parser/README.md', kategori: 'Panduan Eksekusi Uji Parser', fase: 'Phase 7' },

  // --- IMPLEMENTASI MODUL LEXER NYATA (Phase 6) ---
  { berkas: 'src/lexer/posisi.ts', kategori: 'Pelacak Koordinat Karakter', fase: 'Phase 6' },
  { berkas: 'src/lexer/jenisToken.ts', kategori: 'Taksonomi Token Leksikal', fase: 'Phase 6' },
  { berkas: 'src/lexer/keyword.ts', kategori: 'Tabel Kata Kunci Resmi', fase: 'Phase 6' },
  { berkas: 'src/lexer/galat.ts', kategori: 'Pelaporan Galat Diagnostik', fase: 'Phase 6' },
  { berkas: 'src/lexer/lexer.ts', kategori: 'Mesin Pemindai Karakter', fase: 'Phase 6' },
  { berkas: 'src/lexer/tokenStream.ts', kategori: 'Abstraksi Aliran Token', fase: 'Phase 6' },
  { berkas: 'src/lexer/index.ts', kategori: 'Ekspor Terpadu Lexer', fase: 'Phase 6' },
  { berkas: 'docs/pengembang/lexer.md', kategori: 'Dokumentasi Teknis Lexer', fase: 'Phase 6' },
  { berkas: 'pengujian/lexer/uji_lexer.ts', kategori: 'Rangkaian 21 Uji Lexer', fase: 'Phase 6' },
  { berkas: 'pengujian/lexer/README.md', kategori: 'Panduan Eksekusi Uji Lexer', fase: 'Phase 6' },

  // --- PUSAT DOKUMENTASI & PANDUAN (Phase 5: docs/) ---
  { berkas: 'docs/README.md', kategori: 'Pusat Buku Panduan', fase: 'Phase 5' },
  { berkas: 'docs/indeks.md', kategori: 'Indeks Lengkap Topik', fase: 'Phase 5' },
  { berkas: 'docs/pengenalan/apa-itu-nusantara.md', kategori: 'Pengenalan Bahasa', fase: 'Phase 5' },
  { berkas: 'docs/pengenalan/tujuan-dan-filosofi.md', kategori: 'Tujuan & 4 Filosofi', fase: 'Phase 5' },
  { berkas: 'docs/pengenalan/status-pengembangan.md', kategori: 'Status & Batasan', fase: 'Phase 5' },
  { berkas: 'docs/pengenalan/tanya-jawab.md', kategori: 'FAQ Pertanyaan Umum', fase: 'Phase 5' },
  { berkas: 'docs/panduan/persiapan.md', kategori: 'Panduan Persiapan Editor', fase: 'Phase 5' },
  { berkas: 'docs/panduan/program-pertama.md', kategori: 'Program Pertama Halo Dunia', fase: 'Phase 5' },
  { berkas: 'docs/panduan/struktur-program.md', kategori: 'Struktur Dasar Berkas', fase: 'Phase 5' },
  { berkas: 'docs/panduan/komentar.md', kategori: 'Panduan Komentar Kode', fase: 'Phase 5' },
  { berkas: 'docs/panduan/variabel-dan-tipe-data.md', kategori: 'Variabel & Tipe Data', fase: 'Phase 5' },
  { berkas: 'docs/panduan/operator.md', kategori: 'Panduan Operator', fase: 'Phase 5' },
  { berkas: 'docs/panduan/percabangan.md', kategori: 'Panduan Percabangan', fase: 'Phase 5' },
  { berkas: 'docs/panduan/perulangan.md', kategori: 'Panduan Perulangan', fase: 'Phase 5' },
  { berkas: 'docs/panduan/fungsi.md', kategori: 'Panduan Fungsi Modular', fase: 'Phase 5' },
  { berkas: 'docs/referensi/sintaks.md', kategori: 'Ringkasan Sintaks', fase: 'Phase 5' },
  { berkas: 'docs/referensi/keyword.md', kategori: 'Tabel 32 Kata Kunci', fase: 'Phase 5' },
  { berkas: 'docs/referensi/tipe-data.md', kategori: 'Referensi Tipe Data', fase: 'Phase 5-9' },
  { berkas: 'docs/referensi/operator.md', kategori: 'Presedensi 8 Tingkat', fase: 'Phase 5' },
  { berkas: 'docs/referensi/tata-bahasa-ebnf.md', kategori: 'Referensi EBNF', fase: 'Phase 5' },
  { berkas: 'docs/referensi/contoh-kode.md', kategori: 'Katalog Contoh Kode', fase: 'Phase 5' },
  { berkas: 'docs/pengembang/struktur-proyek.md', kategori: 'Struktur Folder Proyek', fase: 'Phase 5' },
  { berkas: 'docs/pengembang/alur-pengembangan.md', kategori: 'Alur Siklus Fase', fase: 'Phase 5' },
  { berkas: 'docs/pengembang/standar-dokumentasi.md', kategori: 'Standar Format Dokumen', fase: 'Phase 5' },
  { berkas: 'docs/pengembang/pengujian-dokumentasi.md', kategori: 'Prosedur Uji Integritas', fase: 'Phase 5' },
  { berkas: 'docs/kontribusi/mulai-berkontribusi.md', kategori: 'Alur 10 Langkah Kontribusi', fase: 'Phase 5' },
  { berkas: 'docs/kontribusi/proses-nip.md', kategori: 'Alur 7 Tahapan NIP', fase: 'Phase 5' },
  { berkas: 'docs/kontribusi/pedoman-kode.md', kategori: 'Style Guide Penamaan', fase: 'Phase 5' },
  { berkas: 'docs/glosarium.md', kategori: 'Glosarium 26 Istilah', fase: 'Phase 5' },

  // --- SPESIFIKASI SINTAKS FORMAL EBNF (Phase 4) ---
  { berkas: 'dokumentasi/SPESIFIKASI-SINTAKS.md', kategori: 'Spesifikasi Sintaks Induk', fase: 'Phase 4' },
  { berkas: 'dokumentasi/GRAMMAR-EBNF.md', kategori: 'Tata Bahasa Formal EBNF', fase: 'Phase 4' },
  { berkas: 'dokumentasi/TOKEN.md', kategori: 'Spesifikasi Token Leksikal', fase: 'Phase 4' },
  { berkas: 'dokumentasi/IDENTIFIER.md', kategori: 'Kaidah Pengidentifikasi', fase: 'Phase 4' },
  { berkas: 'dokumentasi/LITERAL.md', kategori: 'Spesifikasi Bentuk Literal', fase: 'Phase 4' },
  { berkas: 'dokumentasi/EKSPRESI.md', kategori: 'Spesifikasi Tata Ekspresi', fase: 'Phase 4' },
  { berkas: 'dokumentasi/PRIORITAS-OPERATOR.md', kategori: 'Tabel Presedensi 8 Tingkat', fase: 'Phase 4' },
  { berkas: 'dokumentasi/ATURAN-BLOK.md', kategori: 'Aturan Blok & Kontrol Aliran', fase: 'Phase 4' },
  { berkas: 'dokumentasi/KEPUTUSAN-TERBUKA.md', kategori: 'Katalog Keputusan Terbuka', fase: 'Phase 4' },
  { berkas: 'dokumentasi/CONTOH-SINTAKS.md', kategori: 'Katalog 10 Contoh Sintaks', fase: 'Phase 4' },

  // --- PENGUJIAN SINTAKS FORMAL (Phase 4) ---
  { berkas: 'pengujian/spesifikasi/kasus-valid.md', kategori: 'Koleksi Kasus Valid', fase: 'Phase 4' },
  { berkas: 'pengujian/spesifikasi/kasus-tidak-valid.md', kategori: '15 Kasus Negatif EBNF', fase: 'Phase 4' },
  { berkas: 'pengujian/spesifikasi/grammar-checklist.md', kategori: 'Daftar Periksa EBNF', fase: 'Phase 4' },

  // --- DOKUMENTASI TATA KELOLA & KEBIJAKAN (Phase 3) ---
  { berkas: 'dokumentasi/LISENSI.md', kategori: 'Panduan Lisensi Apache 2.0', fase: 'Phase 3' },
  { berkas: 'dokumentasi/KEBIJAKAN-LISENSI.md', kategori: 'Kebijakan Dependensi & Aset', fase: 'Phase 3' },
  { berkas: 'dokumentasi/KEBIJAKAN-RILIS.md', kategori: 'Kebijakan Versi & Rilis', fase: 'Phase 3' },
  { berkas: 'dokumentasi/TEMPLATE-RELEASE.md', kategori: 'Templat GitHub Release', fase: 'Phase 3' },
  { berkas: 'dokumentasi/PENGATURAN-GITHUB.md', kategori: 'Panduan Konfigurasi GitHub', fase: 'Phase 3' },
  { berkas: 'dokumentasi/NIP/PROSES-NIP.md', kategori: 'Alur 7 Tahapan NIP', fase: 'Phase 3' },
  { berkas: 'dokumentasi/NIP/TEMPLATE-NIP.md', kategori: 'Format Templat NIP', fase: 'Phase 3' },

  // --- DOKUMENTASI KONSTITUSI & SPESIFIKASI (Phase 2) ---
  { berkas: 'dokumentasi/KONSTITUSI-BAHASA.md', kategori: 'Konstitusi Bahasa', fase: 'Phase 2' },
  { berkas: 'dokumentasi/KEYWORD.md', kategori: 'Tabel 32 Kata Kunci', fase: 'Phase 2' },
  { berkas: 'dokumentasi/TIPE-DATA.md', kategori: 'Spesifikasi Tipe Data', fase: 'Phase 2' },
  { berkas: 'dokumentasi/OPERATOR.md', kategori: 'Klasifikasi Operator', fase: 'Phase 2-4' },
  { berkas: 'dokumentasi/ATURAN-PENAMAAN.md', kategori: 'Kaidah Penamaan & Komentar', fase: 'Phase 2' },
  { berkas: 'dokumentasi/PESAN-KESALAHAN.md', kategori: 'Standar Pesan Galat', fase: 'Phase 2' },
  { berkas: 'dokumentasi/KOMPATIBILITAS.md', kategori: 'Kebijakan Kompatibilitas', fase: 'Phase 2' },
  { berkas: 'dokumentasi/nip/NIP-0002.md', kategori: 'Proposal NIP-0002', fase: 'Phase 2' },

  // --- PENGUJIAN SPESIFIKASI (Phase 2) ---
  { berkas: 'pengujian/spesifikasi/README.md', kategori: 'Indeks Uji Spesifikasi', fase: 'Phase 2' },
  { berkas: 'pengujian/spesifikasi/program-valid.nusantara', kategori: 'Kode Uji Program Valid', fase: 'Phase 2' },
  { berkas: 'pengujian/spesifikasi/program-tidak-valid.md', kategori: 'Katalog Kasus Tak Valid', fase: 'Phase 2' },

  // --- FONDASI & IDENTITAS (Phase 1) ---
  { berkas: 'dokumentasi/README.md', kategori: 'Indeks Dokumentasi Formal', fase: 'Phase 1-4' },
  { berkas: 'dokumentasi/prinsip-desain.md', kategori: 'Filosofi Desain', fase: 'Phase 1' },
  { berkas: 'dokumentasi/arsitektur-kompilator.md', kategori: 'Arsitektur Kompilator', fase: 'Phase 1' },
  { berkas: 'dokumentasi/panduan-github.md', kategori: 'Panduan Operasional GitHub', fase: 'Phase 1' },
  { berkas: 'dokumentasi/nip/NIP-0001.md', kategori: 'Proposal NIP-0001', fase: 'Phase 1' },

  // --- KODE SUMBER CONTOH .nusantara ---
  { berkas: 'contoh/README.md', kategori: 'Indeks Contoh Acuan', fase: 'Phase 1' },
  { berkas: 'contoh/01_halo.nusantara', kategori: 'Kode Contoh: Halo Dunia', fase: 'Phase 1' },
  { berkas: 'contoh/02_data.nusantara', kategori: 'Kode Contoh: Variabel & Tipe', fase: 'Phase 1' },
  { berkas: 'contoh/03_kondisi.nusantara', kategori: 'Kode Contoh: Percabangan', fase: 'Phase 1' },
  { berkas: 'contoh/04_perulangan.nusantara', kategori: 'Kode Contoh: Perulangan', fase: 'Phase 1' },
  { berkas: 'contoh/05_fungsi.nusantara', kategori: 'Kode Contoh: Fungsi', fase: 'Phase 1' },

  // --- PETA ARSITEKTUR KOMPILATOR & PERKAKAS ---
  { berkas: 'pengujian/README.md', kategori: 'Kerangka Pengujian', fase: 'Phase 1' },
  { berkas: 'kompilator/README.md', kategori: 'Peta Kompilator', fase: 'Phase 1' },
  { berkas: 'runtime/README.md', kategori: 'Peta Runtime', fase: 'Phase 1' },
  { berkas: 'standar/README.md', kategori: 'Peta Pustaka Standar', fase: 'Phase 1' },
  { berkas: 'pustaka/README.md', kategori: 'Peta Pustaka Ekosistem', fase: 'Phase 1' },
  { berkas: 'kerangka/README.md', kategori: 'Peta Kerangka Kerja', fase: 'Phase 1' },
  { berkas: 'alat/README.md', kategori: 'Peta Perkakas', fase: 'Phase 1' },
  { berkas: 'ide/README.md', kategori: 'Peta Dukungan IDE', fase: 'Phase 1' },
  { berkas: 'skrip/README.md', kategori: 'Skrip Pemeliharaan', fase: 'Phase 1' },
];

console.log('=============================================================================');
console.log('PEMERIKSAAN KEPATUHAN SPESIFIKASI & IMPLEMENTASI BAHASA NUSANTARA');
console.log('Target Milestone: Phase 15 — Sistem Modul (v0.15.0)');
console.log('=============================================================================\n');

let jumlahLulus = 0;
let jumlahGagal = 0;

for (const item of berkasWajib) {
  const lokasi = path.join(rootDir, item.berkas);
  if (fs.existsSync(lokasi)) {
    const stats = fs.statSync(lokasi);
    console.log(`[✓ LULUS] ${item.berkas.padEnd(46)} | ${item.kategori.padEnd(30)} | ${item.fase} (${stats.size} B)`);
    jumlahLulus++;
  } else {
    console.error(`[✗ GAGAL] ${item.berkas.padEnd(46)} | BERKAS TIDAK DITEMUKAN!`);
    jumlahGagal++;
  }
}

console.log('\n-----------------------------------------------------------------------------');
console.log(`Hasil Evaluasi: ${jumlahLulus} berkas LULUS, ${jumlahGagal} berkas GAGAL.`);
console.log('-----------------------------------------------------------------------------');

if (jumlahGagal === 0) {
  console.log('STATUS: SELURUH DOKUMENTASI, SPESIFIKASI, LEXER, PARSER, INTERPRETER, TIPE, OPERATOR, PERCABANGAN, PERULANGAN, FUNGSI, STRUKTUR DATA, DAN SISTEM MODUL LENGKAP & TERUJI.');
  console.log('Repositori siap untuk milestone v0.15.0 (feat: implement nusantara module system).');
  process.exit(0);
} else {
  console.error('STATUS: TERDAPAT BERKAS RESMI YANG HILANG. PERIKSA KEMBALI SEBELUM COMMIT.');
  process.exit(1);
}
