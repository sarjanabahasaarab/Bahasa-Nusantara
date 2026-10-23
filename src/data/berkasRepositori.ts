export interface BerkasRepo {
  jalur: string;
  nama: string;
  kategori: string;
  bahasa: 'markdown' | 'nusantara' | 'javascript' | 'teks';
  ukuran: number;
  konten: string;
}

export const BERKAS_REPOSITORI: BerkasRepo[] = [
  // --- FASE 20: LANGUAGE SERVER & DEVELOPER TOOLS NUSANTARA ---
  {
    jalur: 'docs/referensi/language-server.md',
    nama: 'language-server.md',
    kategori: 'Referensi Pengguna Language Server',
    bahasa: 'markdown',
    ukuran: 6500,
    konten: `# Referensi Pengguna: Language Server Protocol (LSP) NUSANTARA (Phase 20)\n\nDokumen panduan resmi integrasi editor VS Code, Neovim, Emacs dengan NUSANTARA Language Server via stdio JSON-RPC 2.0.`
  },
  {
    jalur: 'docs/pengembang/language-server.md',
    nama: 'language-server.md (Pengembang)',
    kategori: 'Arsitektur Teknis Language Server',
    bahasa: 'markdown',
    ukuran: 7200,
    konten: `# Panduan Pengembang: Arsitektur Language Server NUSANTARA (Phase 20)\n\nArsitektur internal LSP, manajemen dokumen in-memory, invalidasi cache bertingkat, dan layanan diagnostik/kompleksi/hover/definisi/simbol.`
  },
  {
    jalur: 'pengujian/lsp/uji_lsp.ts',
    nama: 'uji_lsp.ts',
    kategori: '32 Pengujian Language Server',
    bahasa: 'javascript',
    ukuran: 26000,
    konten: `// Rangkaian 32 Uji Komprehensif Language Server Protocol (LSP) dan Developer Tools NUSANTARA (Phase 20)`
  },
  {
    jalur: 'src/language-server/server.ts',
    nama: 'server.ts (lsp)',
    kategori: 'Inti Language Server LSP',
    bahasa: 'javascript',
    ukuran: 12500,
    konten: `// Server Bahasa Resmi NUSANTARA (LSP Core): Lifecycle, Request Dispatcher, dan Protokol Stdio Aman`
  },
  {
    jalur: 'editors/vscode/package.json',
    nama: 'package.json (vscode)',
    kategori: 'Manifest Ekstensi VS Code',
    bahasa: 'teks',
    ukuran: 1500,
    konten: `// Manifest ekstensi editor VS Code untuk bahasa pemrograman NUSANTARA`
  },
  // --- FASE 19: TOOLCHAIN & FORMATTER NUSANTARA ---
  {
    jalur: 'docs/referensi/formatter.md',
    nama: 'formatter.md',
    kategori: 'Referensi Pengguna Formatter',
    bahasa: 'markdown',
    ukuran: 6200,
    konten: `# Referensi Pemformat Kode Resmi (Formatter) NUSANTARA (Phase 19)\n\nPanduan penggunaan 'nusantara format', opsi --cek, --tulis, konfigurasi nusantara.toml, preservasi komentar, string, dan aturan tata letak resmi.`
  },
  {
    jalur: 'docs/referensi/toolchain.md',
    nama: 'toolchain.md',
    kategori: 'Referensi Pengguna Toolchain',
    bahasa: 'markdown',
    ukuran: 6800,
    konten: `# Referensi Toolchain Resmi NUSANTARA (Phase 19)\n\nUtilitas baris perintah CLI, pipeline pemeriksaan 'nusantara cek', aturan linter dasar (NUS-W001 s/d NUS-W004), konvensi exit code, dan format JSON.`
  },
  {
    jalur: 'docs/pengembang/formatter.md',
    nama: 'formatter.md (Pengembang)',
    kategori: 'Arsitektur Teknis Formatter',
    bahasa: 'markdown',
    ukuran: 5900,
    konten: `# Panduan Pengembang: Arsitektur Formatter & Toolchain NUSANTARA (Phase 19)\n\nSiklus kerja pretty printer AST, algoritma pelestarian komentar KomentarSumber, protokol keamanan tulis (formatAman), dan pedoman aturan linter.`
  },
  {
    jalur: 'pengujian/toolchain/uji_toolchain.ts',
    nama: 'uji_toolchain.ts',
    kategori: '54 Pengujian Toolchain & Formatter',
    bahasa: 'javascript',
    ukuran: 16500,
    konten: `// Rangkaian 54 Uji Komprehensif Toolchain, Formatter, Linter, dan Project Validator NUSANTARA (Phase 19)`
  },
  {
    jalur: 'src/toolchain/formatter.ts',
    nama: 'formatter.ts',
    kategori: 'Pemformat Kode AST',
    bahasa: 'javascript',
    ukuran: 15800,
    konten: `// Pretty printer AST, pemformatan aman, preservasi komentar dan string`
  },
  {
    jalur: 'src/toolchain/linter.ts',
    nama: 'linter.ts',
    kategori: 'Linter Analisis Statis',
    bahasa: 'javascript',
    ukuran: 16000,
    konten: `// Penganalisis statis aturan peringatan NUS-W001 s/d NUS-W004`
  },
  {
    jalur: 'src/toolchain/pemeriksa.ts',
    nama: 'pemeriksa.ts',
    kategori: 'Validator Berkas & Proyek',
    bahasa: 'javascript',
    ukuran: 9200,
    konten: `// Pemeriksa kode dan validator proyek nusantara.toml, lockfile, dan kode sumber`
  },
  // --- FASE 18: SISTEM ERROR & DEBUGGING NUSANTARA ---
  {
    jalur: 'docs/referensi/sistem-error.md',
    nama: 'sistem-error.md',
    kategori: 'Referensi Pengguna Sistem Error',
    bahasa: 'markdown',
    ukuran: 8900,
    konten: `# Referensi Pengguna: Sistem Error & Debugging Bahasa NUSANTARA (Phase 18)\n\nPedoman resmi 12 kategori galat, taksonomi kode error NUS-xxx-yyy, cuplikan kode caret (^^^^), saran typo Levenshtein, jejak tumpukan (stack trace), dan format JSON.`
  },
  {
    jalur: 'docs/pengembang/sistem-error.md',
    nama: 'sistem-error.md (Pengembang)',
    kategori: 'Arsitektur Teknis Sistem Error',
    bahasa: 'markdown',
    ukuran: 6500,
    konten: `# Panduan Pengembang: Sistem Diagnostik & Error NUSANTARA (Phase 18)\n\nArsitektur MesinDiagnostik terpusat, model data Diagnostik, integrasi frame eksekusi, algoritma saran Levenshtein, dan pedoman kontribusi.`
  },
  {
    jalur: 'pengujian/diagnostik/uji_diagnostik.ts',
    nama: 'uji_diagnostik.ts',
    kategori: '20 Pengujian Sistem Error',
    bahasa: 'javascript',
    ukuran: 21000,
    konten: `// Rangkaian 20 Uji Komprehensif Sistem Error & Debugging Bahasa NUSANTARA (Phase 18)`
  },
  {
    jalur: 'src/diagnostik/mesin.ts',
    nama: 'mesin.ts (diagnostik)',
    kategori: 'Mesin Diagnostik Terpusat',
    bahasa: 'javascript',
    ukuran: 19500,
    konten: `// Mesin diagnostik, error engine, dan normalisasi galat resmi NUSANTARA`
  },
  {
    jalur: 'src/diagnostik/kode.ts',
    nama: 'kode.ts (diagnostik)',
    kategori: 'Taksonomi Kode Galat NUS',
    bahasa: 'javascript',
    ukuran: 18000,
    konten: `// Enumerasi lengkap kode galat NUS-xxx-yyy dan tabel METADATA_KODE_GALAT`
  },
  // --- FASE 17: STANDARD LIBRARY NUSANTARA ---
  {
    jalur: 'docs/referensi/standard-library.md',
    nama: 'standard-library.md',
    kategori: 'Referensi Pengguna Standard Library',
    bahasa: 'markdown',
    ukuran: 7200,
    konten: `# Referensi Pengguna: Standard Library Bahasa NUSANTARA (Phase 17)\n\nPanduan referensi 8 modul standar resmi: teks, matematika, konversi, waktu, acak, koleksi, berkas, dan sistem beserta kebijakan Sandbox Filesystem.`
  },
  {
    jalur: 'docs/pengembang/standard-library.md',
    nama: 'standard-library.md (Pengembang)',
    kategori: 'Arsitektur Teknis Standard Library',
    bahasa: 'markdown',
    ukuran: 5800,
    konten: `# Panduan Pengembang: Standard Library Bahasa NUSANTARA (Phase 17)\n\nArsitektur registrasi simbol ekspor modul, pabrik runtime, resolusi modul presedensi, dan SandboxBerkas.`
  },
  {
    jalur: 'pengujian/stdlib/uji_stdlib.ts',
    nama: 'uji_stdlib.ts',
    kategori: '22 Pengujian Standard Library',
    bahasa: 'javascript',
    ukuran: 21000,
    konten: `// Rangkaian 22 Uji Komprehensif Standard Library Bahasa NUSANTARA (Phase 17)`
  },
  {
    jalur: 'src/stdlib/index.ts',
    nama: 'index.ts (stdlib)',
    kategori: 'Katalog Modul Standar',
    bahasa: 'javascript',
    ukuran: 4800,
    konten: `// Registri dan normalisasi nama modul standar resmi NUSANTARA`
  },
  // --- FASE 16: PACKAGE MANAGER NUSANTARA ---
  {
    jalur: 'docs/referensi/package-manager.md',
    nama: 'package-manager.md',
    kategori: 'Referensi Pengguna Package Manager',
    bahasa: 'markdown',
    ukuran: 5470,
    konten: `# Referensi Pengguna: Package Manager NUSANTARA (nusantara) — Phase 16\n\nPanduan resmi pembuatan paket, manajemen dependensi nusantara.toml, kunci versi nusantara.lock, dan perintah CLI.`
  },
  {
    jalur: 'docs/pengembang/package-manager.md',
    nama: 'package-manager.md (Pengembang)',
    kategori: 'Arsitektur Teknis Package Manager',
    bahasa: 'markdown',
    ukuran: 6240,
    konten: `# Arsitektur & Dokumentasi Teknis Package Manager NUSANTARA (Phase 16)\n\nArsitektur graf dependensi, deteksi siklus (DFS), resolusi semver, abstraksi registry, dan integrasi resolver modul.`
  },
  {
    jalur: 'pengujian/paket/uji_paket.ts',
    nama: 'uji_paket.ts',
    kategori: '31 Pengujian Package Manager',
    bahasa: 'javascript',
    ukuran: 27800,
    konten: `// Rangkaian 31 Uji Komprehensif Package Manager Bahasa NUSANTARA (Phase 16)`
  },
  {
    jalur: 'nusantara.toml',
    nama: 'nusantara.toml',
    kategori: 'Manifest Paket Resmi',
    bahasa: 'teks',
    ukuran: 380,
    konten: `[nusantara]\nnama = "nusantara"\nversi = "0.16.0"\ndeskripsi = "Bahasa Pemrograman Indonesia"\nlisensi = "Apache-2.0"\npenulis = "Tim Pengembang Nusantara"\n\n[dependensi]\n`
  },
  {
    jalur: 'nusantara.lock',
    nama: 'nusantara.lock',
    kategori: 'Berkas Kunci Dependensi',
    bahasa: 'teks',
    ukuran: 250,
    konten: `# Berkas Kunci Dependensi NUSANTARA (nusantara.lock)\n# Dihasilkan secara otomatis oleh Package Manager. JANGAN EDIT MANUAL.\n\nversi_format = 1\npaket = []\n`
  },
  // --- FASE 15: SISTEM MODUL NUSANTARA ---
  {
    jalur: 'docs/referensi/modul.md',
    nama: 'modul.md',
    kategori: 'Referensi Sintaks Sistem Modul',
    bahasa: 'markdown',
    ukuran: 5800,
    konten: `# Referensi Sintaks: Sistem Modul Bahasa NUSANTARA (Phase 15)\n\nPedoman resmi penggunaan modul, gunakan, impor, ekspor, alias sebagai, destrukturisasi dari, resolver aman, dan deteksi ketergantungan melingkar.`
  },
  {
    jalur: 'docs/pengembang/modul.md',
    nama: 'modul.md (Pengembang)',
    kategori: 'Dokumentasi Teknis Sistem Modul',
    bahasa: 'markdown',
    ukuran: 5200,
    konten: `# Arsitektur & Dokumentasi Teknis Sistem Modul NUSANTARA\n\nPenjelasan alur pemuat modul, cache singleton, isolasi lingkungan scope, proteksi anti-path-traversal, dan pelacakan jejak kesalahan konteks modul.`
  },
  {
    jalur: 'pengujian/modul/uji_modul.ts',
    nama: 'uji_modul.ts',
    kategori: '24 Pengujian Sistem Modul',
    bahasa: 'javascript',
    ukuran: 18200,
    konten: `// Rangkaian 24 Uji Komprehensif Sistem Modul Bahasa NUSANTARA (Phase 15)`
  },
  {
    jalur: 'contoh/07_modul.nusantara',
    nama: '07_modul.nusantara',
    kategori: 'Contoh Acuan Penggunaan Modul',
    bahasa: 'nusantara',
    ukuran: 340,
    konten: `program ProgramUtamaModul\n\ngunakan contoh_matematika\ngunakan contoh_teks\n\nmulai\n    hasilTambah : bilangan = contoh_matematika.tambah(15, 25)\n    tampilkan("Hasil tambah:", hasilTambah)\n    pesan : teks = contoh_teks.beriSambutan("Nusantara")\n    tampilkan(pesan)\nselesai`
  },
  {
    jalur: 'contoh/contoh_matematika.nusantara',
    nama: 'contoh_matematika.nusantara',
    kategori: 'Modul Contoh Matematika',
    bahasa: 'nusantara',
    ukuran: 420,
    konten: `modul contoh_matematika\n\nekspor fungsi tambah(a : bilangan, b : bilangan) : bilangan\nmulai\n    kembalikan a + b\nselesai\n\nekspor fungsi kali(a : bilangan, b : bilangan) : bilangan\nmulai\n    kembalikan a * b\nselesai`
  },
  {
    jalur: 'contoh/contoh_teks.nusantara',
    nama: 'contoh_teks.nusantara',
    kategori: 'Modul Contoh Teks',
    bahasa: 'nusantara',
    ukuran: 280,
    konten: `modul contoh_teks\n\nekspor fungsi gabungDua(a : teks, b : teks) : teks\nmulai\n    kembalikan a + " " + b\nselesai\n\nekspor fungsi beriSambutan(nama : teks) : teks\nmulai\n    kembalikan "Halo, " + nama + "!"\nselesai`
  },

  // --- FASE 14: STRUKTUR DATA (DAFTAR & PETA) ---
  {
    jalur: 'docs/referensi/struktur-data.md',
    nama: 'struktur-data.md',
    kategori: 'Referensi Sintaks Struktur Data',
    bahasa: 'markdown',
    ukuran: 5400,
    konten: `# Referensi Sintaks: Struktur Data (Daftar & Peta) Bahasa NUSANTARA\n\nPedoman resmi penggunaan koleksi terindeks daftar dan koleksi asosiatif peta, akses indeks, mutasi, dan fungsi panjang.`
  },
  {
    jalur: 'docs/pengembang/struktur-data.md',
    nama: 'struktur-data.md (Pengembang)',
    kategori: 'Dokumentasi Teknis Struktur Data',
    bahasa: 'markdown',
    ukuran: 4900,
    konten: `# Arsitektur & Dokumentasi Teknis Struktur Data NUSANTARA\n\nPenjelasan integrasi compiler pipeline, pohon AST, runtime map/array, type checker, dan deep equality.`
  },
  {
    jalur: 'pengujian/struktur_data/uji_struktur_data.ts',
    nama: 'uji_struktur_data.ts',
    kategori: '31 Pengujian Struktur Data',
    bahasa: 'javascript',
    ukuran: 15600,
    konten: `// Rangkaian 31 Uji Komprehensif Struktur Data Bahasa NUSANTARA (Phase 14)`
  },
  {
    jalur: 'contoh/06_struktur_data.nusantara',
    nama: '06_struktur_data.nusantara',
    kategori: 'Contoh Acuan Struktur Data',
    bahasa: 'nusantara',
    ukuran: 720,
    konten: `program StrukturDataNusantara\n\nmulai\n    angka : daftar = [10, 20, 30, 40]\n    siswa : peta = {"nama": "Ayu", "umur": 20}\n    tampilkan(angka[0])\n    tampilkan(siswa["nama"])\nselesai`
  },

  // --- FASE 13: SISTEM FUNGSI & PROSEDUR ---
  {
    jalur: 'docs/referensi/fungsi.md',
    nama: 'fungsi.md',
    kategori: 'Referensi Sintaks Fungsi',
    bahasa: 'markdown',
    ukuran: 4350,
    konten: `# Referensi Sintaks: Sistem Fungsi Bahasa NUSANTARA\n\nPedoman resmi deklarasi fungsi, parameter terikat, nilai kembalian, cakupan leksikal, dan rekursi.`
  },
  {
    jalur: 'docs/pengembang/fungsi.md',
    nama: 'fungsi.md (Pengembang)',
    kategori: 'Dokumentasi Teknis Fungsi',
    bahasa: 'markdown',
    ukuran: 4100,
    konten: `# Arsitektur & Dokumentasi Teknis Sistem Fungsi NUSANTARA\n\nPenjelasan integrasi saluran pipa kompilasi untuk deklarasi, type checking, dan runtime stack frame.`
  },
  {
    jalur: 'pengujian/fungsi/uji_fungsi.ts',
    nama: 'uji_fungsi.ts',
    kategori: '28 Pengujian Fungsi',
    bahasa: 'javascript',
    ukuran: 14900,
    konten: `// Rangkaian 28 Uji Komprehensif Sistem Fungsi Bahasa NUSANTARA (Phase 13)`
  },

  // --- FASE 12: SISTEM PERULANGAN ---
  {
    jalur: 'docs/referensi/perulangan.md',
    nama: 'perulangan.md',
    kategori: 'Referensi Sintaks Perulangan',
    bahasa: 'markdown',
    ukuran: 4800,
    konten: `# Referensi Sintaks: Sistem Perulangan NUSANTARA\n\nPedoman resmi penggunaan selama, untuk, dari, sampai, lakukan, hentikan, lanjutkan, akhir.`
  },
  {
    jalur: 'docs/pengembang/perulangan.md',
    nama: 'perulangan.md (Pengembang)',
    kategori: 'Dokumentasi Teknis Perulangan',
    bahasa: 'markdown',
    ukuran: 4400,
    konten: `# Arsitektur & Dokumentasi Teknis Sistem Perulangan NUSANTARA\n\nPenjelasan integrasi saluran pipa kompilasi untuk perulangan.`
  },
  {
    jalur: 'pengujian/perulangan/uji_perulangan.ts',
    nama: 'uji_perulangan.ts',
    kategori: '25 Pengujian Perulangan',
    bahasa: 'javascript',
    ukuran: 10500,
    konten: `// Rangkaian 25 Uji Komprehensif Sistem Perulangan Bahasa NUSANTARA (Phase 12)`
  },

  // --- FASE 11: PERCABANGAN KONDISIONAL ---
  {
    jalur: 'docs/referensi/percabangan.md',
    nama: 'percabangan.md',
    kategori: 'Referensi Sintaks Percabangan',
    bahasa: 'markdown',
    ukuran: 4200,
    konten: `# Referensi Sintaks: Percabangan Kondisional (jika)\n\nPedoman resmi penggunaan jika ... maka ... selain ... akhir.`
  },
  {
    jalur: 'docs/pengembang/percabangan.md',
    nama: 'percabangan.md (Pengembang)',
    kategori: 'Dokumentasi Teknis Percabangan',
    bahasa: 'markdown',
    ukuran: 3900,
    konten: `# Arsitektur & Dokumentasi Teknis Percabangan NUSANTARA\n\nPenjelasan integrasi saluran pipa kompilasi untuk percabangan.`
  },
  {
    jalur: 'pengujian/percabangan/uji_percabangan.ts',
    nama: 'uji_percabangan.ts',
    kategori: '24 Pengujian Percabangan',
    bahasa: 'javascript',
    ukuran: 9800,
    konten: `// Rangkaian 24 Uji Komprehensif Percabangan Bahasa NUSANTARA (Phase 11)`
  },

  // --- FASE 10: SISTEM OPERATOR & PRESEDENSI ---
  {
    jalur: 'src/operator/jenisOperator.ts',
    nama: 'jenisOperator.ts',
    kategori: 'Taksonomi & Presedensi 8 Tingkat',
    bahasa: 'javascript',
    ukuran: 3600,
    konten: `// Taksonomi dan Tabel Presedensi 8 Tingkat Resmi NUSANTARA (Phase 10)`
  },
  {
    jalur: 'src/operator/evaluasi.ts',
    nama: 'evaluasi.ts',
    kategori: 'Mesin Evaluasi & Dispatch Operator',
    bahasa: 'javascript',
    ukuran: 6800,
    konten: `// Mesin Evaluasi Terpusat untuk Operator Unari & Biner (Phase 10)`
  },
  {
    jalur: 'docs/referensi/operator.md',
    nama: 'operator.md',
    kategori: 'Referensi Presedensi & Asosiativitas',
    bahasa: 'markdown',
    ukuran: 5400,
    konten: `# Referensi Resmi Sistem Operator Bahasa NUSANTARA`
  },
  {
    jalur: 'docs/pengembang/operator.md',
    nama: 'operator.md (Pengembang)',
    kategori: 'Dokumentasi Teknis Operator',
    bahasa: 'markdown',
    ukuran: 4800,
    konten: `# Arsitektur & Dokumentasi Teknis Sistem Operator NUSANTARA`
  },
  {
    jalur: 'pengujian/operator/uji_operator.ts',
    nama: 'uji_operator.ts',
    kategori: '21 Pengujian Sistem Operator',
    bahasa: 'javascript',
    ukuran: 13500,
    konten: `// Rangkaian 21 Uji Komprehensif Sistem Operator (Phase 10)`
  },

  // --- FASE 9: SISTEM TIPE DATA & TYPE CHECKER ---
  {
    jalur: 'src/tipe/pemeriksaTipe.ts',
    nama: 'pemeriksaTipe.ts',
    kategori: 'Type Checker & Semantic Analyzer',
    bahasa: 'javascript',
    ukuran: 12400,
    konten: `// Type Checker Resmi Bahasa NUSANTARA (Phase 9)`
  },
  {
    jalur: 'src/tipe/kompatibilitas.ts',
    nama: 'kompatibilitas.ts',
    kategori: 'Aturan Kompatibilitas Tipe',
    bahasa: 'javascript',
    ukuran: 3200,
    konten: `// Aturan Kompatibilitas & Kesetaraan Tipe`
  },
  {
    jalur: 'src/tipe/jenisTipe.ts',
    nama: 'jenisTipe.ts',
    kategori: 'Definisi Tipe Resmi',
    bahasa: 'javascript',
    ukuran: 2500,
    konten: `// Definisi Tipe Data Resmi NUSANTARA`
  },
  {
    jalur: 'docs/pengembang/type-system.md',
    nama: 'type-system.md',
    kategori: 'Dokumentasi Sistem Tipe',
    bahasa: 'markdown',
    ukuran: 3800,
    konten: `# Arsitektur & Dokumentasi Sistem Tipe Data NUSANTARA`
  },
  {
    jalur: 'pengujian/tipe/uji_tipe.ts',
    nama: 'uji_tipe.ts',
    kategori: 'Rangkaian 12 Uji Sistem Tipe',
    bahasa: 'javascript',
    ukuran: 7200,
    konten: `// Pengujian Sistem Tipe Data Bahasa NUSANTARA`
  },

  // --- FASE 8: IMPLEMENTASI INTERPRETER INTI ---
  {
    jalur: 'src/interpreter/interpreter.ts',
    nama: 'interpreter.ts',
    kategori: 'Mesin Eksekusi AST',
    bahasa: 'javascript',
    ukuran: 15800,
    konten: `// Interpreter Resmi Bahasa NUSANTARA (Phase 8)`
  },
  {
    jalur: 'src/interpreter/nilai.ts',
    nama: 'nilai.ts',
    kategori: 'Sistem Nilai Runtime',
    bahasa: 'javascript',
    ukuran: 2800,
    konten: `// Sistem Nilai Runtime Bahasa NUSANTARA`
  },
  {
    jalur: 'src/interpreter/environment.ts',
    nama: 'environment.ts',
    kategori: 'Manajemen Lingkup & Simbol',
    bahasa: 'javascript',
    ukuran: 2300,
    konten: `// Manajemen Lingkup & Perlindungan Nilai Tetap`
  },

  // --- FASE 7: IMPLEMENTASI PARSER & AST INTI ---
  {
    jalur: 'src/parser/parser.ts',
    nama: 'parser.ts',
    kategori: 'Mesin Penganalisis Sintaksis EBNF',
    bahasa: 'javascript',
    ukuran: 14500,
    konten: `// Parser Resmi Bahasa NUSANTARA (Phase 7)`
  },
  {
    jalur: 'src/parser/ast.ts',
    nama: 'ast.ts',
    kategori: 'Definisi Struktur Simpul AST',
    bahasa: 'javascript',
    ukuran: 5120,
    konten: `// Definisi Simpul AST Bahasa NUSANTARA`
  },

  // --- FASE 6: IMPLEMENTASI LEXER INTI ---
  {
    jalur: 'src/lexer/lexer.ts',
    nama: 'lexer.ts',
    kategori: 'Mesin Pemindai Karakter',
    bahasa: 'javascript',
    ukuran: 7520,
    konten: `// Lexer Resmi Bahasa NUSANTARA (Phase 6)`
  },

  // --- FASE 5: BUKU PANDUAN & DOKUMENTASI AWAL (docs/) ---
  {
    jalur: 'docs/README.md',
    nama: 'README.md (docs)',
    kategori: 'Pusat Buku Panduan',
    bahasa: 'markdown',
    ukuran: 2450,
    konten: `# Dokumentasi Resmi Bahasa Pemrograman NUSANTARA`
  },
  {
    jalur: 'docs/referensi/tipe-data.md',
    nama: 'tipe-data.md',
    kategori: 'Referensi Tipe Data',
    bahasa: 'markdown',
    ukuran: 2600,
    konten: `# Referensi Tipe Data Resmi Bahasa NUSANTARA (Phase 9)`
  },

  // --- FASE 4: SPESIFIKASI SINTAKS EBNF ---
  {
    jalur: 'dokumentasi/GRAMMAR-EBNF.md',
    nama: 'GRAMMAR-EBNF.md',
    kategori: 'Tata Bahasa Formal EBNF (Phase 4)',
    bahasa: 'markdown',
    ukuran: 5522,
    konten: `# Tata Bahasa Formal EBNF Bahasa NUSANTARA (ISO/IEC 14977)`
  },

  // --- FASE 3: LISENSI & TATA KELOLA ---
  {
    jalur: 'LISENSI',
    nama: 'LISENSI',
    kategori: 'Lisensi Resmi (Apache 2.0)',
    bahasa: 'teks',
    ukuran: 11354,
    konten: `Apache License Version 2.0, January 2004`
  },

  // --- BERKAS ROOT & CONTOH ---
  {
    jalur: 'README.md',
    nama: 'README.md',
    kategori: 'Dokumentasi Utama',
    bahasa: 'markdown',
    ukuran: 5610,
    konten: `# NUSANTARA (Phase 9: Variabel & Tipe Data Selesai - v0.9.0)`
  },
  {
    jalur: 'PERUBAHAN.md',
    nama: 'PERUBAHAN.md',
    kategori: 'Catatan Rilis (Changelog)',
    bahasa: 'markdown',
    ukuran: 9800,
    konten: `# Catatan Perubahan NUSANTARA (v0.9.0, v0.8.0, v0.7.0, v0.6.0, v0.5.0, v0.4.0, v0.3.0, v0.2.0, v0.1.0)`
  },
  {
    jalur: 'ROADMAP.md',
    nama: 'ROADMAP.md',
    kategori: 'Peta Jalan 36 Fase',
    bahasa: 'markdown',
    ukuran: 8550,
    konten: `# Peta Jalan Pengembangan (ROADMAP) Bahasa Pemrograman NUSANTARA`
  },
  {
    jalur: 'contoh/01_halo.nusantara',
    nama: '01_halo.nusantara',
    kategori: 'Kode Contoh',
    bahasa: 'nusantara',
    ukuran: 57,
    konten: `program Halo\n\nmulai\n    tampilkan("Halo Dunia!")\nselesai`
  }
];

export const DAFTAR_TIPE_MATRIKS_PHASE9 = [
  { tipe: 'teks', kategori: 'Primitif', contoh: '"Indonesia"', status: 'Lengkap' },
  { tipe: 'bilangan', kategori: 'Primitif', contoh: '42, -10', status: 'Lengkap' },
  { tipe: 'desimal', kategori: 'Primitif', contoh: '3.14, 175.5', status: 'Lengkap' },
  { tipe: 'logika', kategori: 'Primitif', contoh: 'benar, salah', status: 'Lengkap' },
  { tipe: 'karakter', kategori: 'Primitif', contoh: "'A', 'Z'", status: 'Lengkap' },
  { tipe: 'kosong', kategori: 'Khusus', contoh: 'kosong', status: 'Lengkap' },
  { tipe: 'daftar', kategori: 'Majemuk', contoh: 'Menunggu Phase 14', status: 'Fondasi' },
  { tipe: 'peta', kategori: 'Majemuk', contoh: 'Menunggu Phase 14', status: 'Fondasi' },
  { tipe: 'tanggal', kategori: 'Domain', contoh: 'Menunggu Phase 29', status: 'Fondasi' },
  { tipe: 'waktu', kategori: 'Domain', contoh: 'Menunggu Phase 29', status: 'Fondasi' },
  { tipe: 'fungsi', kategori: 'Orde Tinggi', contoh: 'fungsi nama(...) : tipe', status: 'Lengkap' },
];

export const DAFTAR_PRESEDENSI_OPERATOR = [
  { tingkat: 1, nama: 'Pengelompokan Kurung', simbol: '( )', asosiasi: 'Dalam ke Luar' },
  { tingkat: 2, nama: 'Negasi & Unari Minus', simbol: 'tidak, -', asosiasi: 'Kanan ke Kiri' },
  { tingkat: 3, nama: 'Perkalian, Pembagian, Modulo', simbol: '*, /, %', asosiasi: 'Kiri ke Kanan' },
  { tingkat: 4, nama: 'Penjumlahan & Pengurangan', simbol: '+, -', asosiasi: 'Kiri ke Kanan' },
  { tingkat: 5, nama: 'Perbandingan Relasional', simbol: '<, <=, >, >=', asosiasi: 'Kiri ke Kanan' },
  { tingkat: 6, nama: 'Perbandingan Kesetaraan', simbol: '==, !=', asosiasi: 'Kiri ke Kanan' },
  { tingkat: 7, nama: 'Konjungsi Logika (AND)', simbol: 'dan', asosiasi: 'Kiri ke Kanan' },
  { tingkat: 8, nama: 'Disjungsi Logika (OR)', simbol: 'atau', asosiasi: 'Kiri ke Kanan' },
];

export const DAFTAR_GLOSARIUM = [
  { asing: 'Abstract Syntax Tree (AST)', lokal: 'Pohon Sintaksis Abstrak', ket: 'Representasi struktur logika kode sumber dalam bentuk pohon hierarki.' },
  { asing: 'Assignment', lokal: 'Penugasan', ket: 'Pemberian atau penggantian nilai ke variabel menggunakan operator =.' },
  { asing: 'Compiler', lokal: 'Kompilator', ket: 'Program penerjemah kode sumber menjadi kode mesin biner mandiri.' },
  { asing: 'Immutable', lokal: 'Tak Terubahkan / Kekal', ket: 'Sifat nilai tetap (konstanta) yang dilarang diubah setelah didefinisikan.' },
  { asing: 'Interpreter', lokal: 'Penerjemah Eksekusi', ket: 'Komponen yang menjalankan instruksi AST langsung di memori komputer.' },
  { asing: 'Lexer / Tokenizer', lokal: 'Penganalisis Leksikal', ket: 'Komponen yang memecah aliran teks sumber menjadi token-token bermakna.' },
  { asing: 'Parser', lokal: 'Penganalisis Sintaksis', ket: 'Komponen yang memvalidasi tata bahasa token dan membentuk pohon AST.' },
  { asing: 'Type Checker', lokal: 'Pemeriksa Tipe Data', ket: 'Komponen pemeriksa kepatuhan semantik dan kompatibilitas tipe data.' },
];

export const DAFTAR_FASE_ROADMAP = [
  { fase: 1, nama: 'Identitas & Fondasi', versi: 'v0.1.0', kategori: 'Fondasi', status: 'Selesai' },
  { fase: 2, nama: 'Konstitusi Bahasa', versi: 'v0.2.0', kategori: 'Fondasi', status: 'Selesai' },
  { fase: 3, nama: 'Lisensi & Tata Kelola', versi: 'v0.3.0', kategori: 'Fondasi', status: 'Selesai' },
  { fase: 4, nama: 'Spesifikasi Sintaks (EBNF)', versi: 'v0.4.0', kategori: 'Fondasi', status: 'Selesai' },
  { fase: 5, nama: 'Dokumentasi Awal & Panduan', versi: 'v0.5.0', kategori: 'Fondasi', status: 'Selesai' },
  { fase: 6, nama: 'Lexer (Penganalisis Leksikal)', versi: 'v0.6.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 7, nama: 'Parser (Penganalisis Sintaksis & AST)', versi: 'v0.7.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 8, nama: 'Interpreter (Penerjemah Eksekusi AST)', versi: 'v0.8.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 9, nama: 'Variabel & Tipe Data Lanjutan', versi: 'v0.9.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 10, nama: 'Operator & Ekspresi Lanjutan', versi: 'v0.10.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 11, nama: 'Percabangan Lanjutan', versi: 'v0.11.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 12, nama: 'Perulangan Lanjutan', versi: 'v0.12.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 13, nama: 'Fungsi Lanjutan', versi: 'v0.13.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 14, nama: 'Struktur Data (Daftar & Peta)', versi: 'v0.14.0', kategori: 'Fitur Lanjut', status: 'Selesai' },
  { fase: 15, nama: 'Sistem Modul', versi: 'v0.15.0', kategori: 'Fitur Lanjut', status: 'Selesai' },
  { fase: 16, nama: 'Package Manager (nusantara)', versi: 'v0.16.0', kategori: 'Ekosistem', status: 'Selesai' },
  { fase: 17, nama: 'Standard Library (stdlib)', versi: 'v0.17.0', kategori: 'Ekosistem', status: 'Selesai' },
  { fase: 18, nama: 'Sistem Error & Debugging', versi: 'v0.18.0', kategori: 'Mesin Inti', status: 'Selesai' },
  { fase: 19, nama: 'Toolchain & Formatter', versi: 'v0.19.0', kategori: 'Tooling', status: 'Selesai' },
  { fase: 20, nama: 'Language Server & Developer Tools', versi: 'v0.20.0', kategori: 'Tooling', status: 'Selesai' },
  { fase: 21, nama: 'Intermediate Representation', versi: 'v0.21.0', kategori: 'Kompilasi Native', status: 'Rencana' },
  { fase: 22, nama: 'Backend Compiler', versi: 'v0.22.0', kategori: 'Kompilasi Native', status: 'Rencana' },
  { fase: 23, nama: 'Executable Native', versi: 'v0.23.0', kategori: 'Kompilasi Native', status: 'Rencana' },
  { fase: 24, nama: 'Optimasi Compiler', versi: 'v0.24.0', kategori: 'Kompilasi Native', status: 'Rencana' },
  { fase: 25, nama: 'Sistem Build', versi: 'v0.25.0', kategori: 'Kompilasi Native', status: 'Rencana' },
  { fase: 26, nama: 'CLI', versi: 'v0.26.0', kategori: 'Ekosistem', status: 'Rencana' },
  { fase: 27, nama: 'Package Manager', versi: 'v0.27.0', kategori: 'Ekosistem', status: 'Rencana' },
  { fase: 28, nama: 'Package Registry', versi: 'v0.28.0', kategori: 'Ekosistem', status: 'Rencana' },
  { fase: 29, nama: 'Standard Library', versi: 'v0.29.0', kategori: 'Ekosistem', status: 'Rencana' },
  { fase: 30, nama: 'Format NUSANTARA', versi: 'v0.30.0', kategori: 'Ekosistem', status: 'Rencana' },
  { fase: 31, nama: 'Extension Editor', versi: 'v0.31.0', kategori: 'Ekosistem', status: 'Rencana' },
  { fase: 32, nama: 'NUSANTARA IDE', versi: 'v0.32.0', kategori: 'Ekosistem', status: 'Rencana' },
  { fase: 33, nama: 'NUSANTARA Web', versi: 'v0.33.0', kategori: 'Domain Khusus', status: 'Rencana' },
  { fase: 34, nama: 'Desktop & Mobile', versi: 'v0.34.0', kategori: 'Domain Khusus', status: 'Rencana' },
  { fase: 35, nama: 'Game & Multimedia', versi: 'v0.35.0', kategori: 'Domain Khusus', status: 'Rencana' },
  { fase: 36, nama: 'NUSANTARA System & NusantaraOS', versi: 'v1.0.0', kategori: 'Sistem Operasi', status: 'Rencana' },
];
