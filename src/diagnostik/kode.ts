/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Kode Galat Standar Resmi Bahasa Pemrograman NUSANTARA (Phase 18).
 * Format: NUS-[KATEGORI]-[NOMOR]
 */
export enum KodeGalat {
  // --- KESALAHAN LEXER (NUS-LEX-xxx) ---
  LEX_KARAKTER_TAK_DIKENAL = 'NUS-LEX-001',
  LEX_TEKS_TIDAK_DITUTUP = 'NUS-LEX-002',
  LEX_KARAKTER_TIDAK_DITUTUP = 'NUS-LEX-003',
  LEX_ANGKA_TIDAK_VALID = 'NUS-LEX-004',
  LEX_URUTAN_LOLOS_TIDAK_VALID = 'NUS-LEX-005',

  // --- KESALAHAN PARSER & SINTAKS (NUS-PAR-xxx) ---
  PAR_TOKEN_TAK_TERDUGA = 'NUS-PAR-001',
  PAR_EKSPRESI_TIDAK_LENGKAP = 'NUS-PAR-002',
  PAR_PERNYATAAN_TIDAK_VALID = 'NUS-PAR-003',
  PAR_BLOK_TIDAK_DITUTUP = 'NUS-PAR-004',
  PAR_STRUKTUR_TIDAK_VALID = 'NUS-PAR-005',

  // --- KESALAHAN SISTEM TIPE (NUS-TYP-xxx) ---
  TYP_KETIDAKCOCOKAN_TIPE = 'NUS-TYP-001',
  TYP_TIPE_TIDAK_DIKENAL = 'NUS-TYP-002',
  TYP_OPERATOR_TIDAK_DIDUKUNG = 'NUS-TYP-003',
  TYP_DEKLARASI_GANDA = 'NUS-TYP-004',
  TYP_MODIFIKASI_TETAP = 'NUS-TYP-005',
  TYP_ARGUMEN_TIDAK_SESUAI = 'NUS-TYP-006',
  TYP_KEMBALIAN_TIDAK_SESUAI = 'NUS-TYP-007',

  // --- KESALAHAN RESOLUSI NAMA (NUS-NAM-xxx) ---
  NAM_VARIABEL_TIDAK_DITEMUKAN = 'NUS-NAM-001',
  NAM_FUNGSI_TIDAK_DITEMUKAN = 'NUS-NAM-002',
  NAM_IDENTIFIER_DI_LUAR_LINGKUP = 'NUS-NAM-003',

  // --- KESALAHAN MODUL (NUS-MOD-xxx) ---
  MOD_TIDAK_DITEMUKAN = 'NUS-MOD-001',
  MOD_ANGGOTA_TIDAK_DITEMUKAN = 'NUS-MOD-002',
  MOD_KETERGANTUNGAN_MELINGKAR = 'NUS-MOD-003',
  MOD_JALUR_TIDAK_AMAN = 'NUS-MOD-004',
  MOD_ANGGOTA_TERLINDUNGI = 'NUS-MOD-005',
  MOD_BERKAS_RUSAK = 'NUS-MOD-006',

  // --- KESALAHAN PAKET / PACKAGE MANAGER (NUS-PKG-xxx) ---
  PKG_MANIFEST_RUSAK = 'NUS-PKG-001',
  PKG_KONFLIK_VERSI = 'NUS-PKG-002',
  PKG_KETERGANTUNGAN_MELINGKAR = 'NUS-PKG-003',
  PKG_BERKAS_KUNCI_RUSAK = 'NUS-PKG-004',
  PKG_INTEGRITAS_GAGAL = 'NUS-PKG-005',
  PKG_NAMA_TIDAK_VALID = 'NUS-PKG-006',
  PKG_TIDAK_DITEMUKAN = 'NUS-PKG-007',

  // --- KESALAHAN RUNTIME (NUS-RUN-xxx) ---
  RUN_PEMBAGIAN_NOL = 'NUS-RUN-001',
  RUN_KENDALI_DI_LUAR_KONTEKS = 'NUS-RUN-002',
  RUN_BATAS_ITERASI_TERLAMPAUI = 'NUS-RUN-003',
  RUN_OPERASI_TIDAK_VALID = 'NUS-RUN-004',
  RUN_KONSTANTA_DIUBAH = 'NUS-RUN-005',

  // --- KESALAHAN STRUKTUR DATA & INDEKS (NUS-IDX-xxx) ---
  IDX_BATAS_TERLAMPAUI = 'NUS-IDX-001',
  IDX_KUNCI_TIDAK_DITEMUKAN = 'NUS-IDX-002',
  IDX_BUKAN_KOLEKSI = 'NUS-IDX-003',

  // --- KESALAHAN BERKAS / I/O SANDBOX (NUS-FILE-xxx) ---
  FILE_TIDAK_DITEMUKAN = 'NUS-FILE-001',
  FILE_PELANGGARAN_SANDBOX = 'NUS-FILE-002',
  FILE_BERKAS_SENSITIF = 'NUS-FILE-003',
  FILE_GAGAL_AKSES = 'NUS-FILE-004',

  // --- KESALAHAN KONVERSI TIPE (NUS-CON-xxx) ---
  CON_GAGAL_BILANGAN = 'NUS-CON-001',
  CON_GAGAL_DESIMAL = 'NUS-CON-002',
  CON_GAGAL_LOGIKA = 'NUS-CON-003',

  // --- KESALAHAN INTERNAL INTERPRETER (NUS-INT-xxx) ---
  INT_KESALAHAN_SISTEM = 'NUS-INT-001',
  INT_AST_TIDAK_VALID = 'NUS-INT-002',
}

/**
 * Informasi metadata untuk kode galat tertentu.
 */
export interface MetadataKodeGalat {
  kode: KodeGalat;
  kategori: string;
  judul: string;
  penjelasan: string;
  saranStandar?: string;
}

export const METADATA_KODE_GALAT: Record<KodeGalat, MetadataKodeGalat> = {
  // Lexer
  [KodeGalat.LEX_KARAKTER_TAK_DIKENAL]: {
    kode: KodeGalat.LEX_KARAKTER_TAK_DIKENAL,
    kategori: 'Lexer',
    judul: 'Karakter Tidak Dikenal',
    penjelasan: 'Karakter ini tidak termasuk dalam kosakata atau simbol resmi bahasa NUSANTARA.',
    saranStandar: 'Hapus atau ganti karakter dengan simbol yang didukung oleh NUSANTARA.',
  },
  [KodeGalat.LEX_TEKS_TIDAK_DITUTUP]: {
    kode: KodeGalat.LEX_TEKS_TIDAK_DITUTUP,
    kategori: 'Lexer',
    judul: 'Literal Teks Tidak Ditutup',
    penjelasan: 'Literal teks dibuka dengan tanda kutip ganda (") tetapi tidak memiliki pasangan penutup pada baris yang sama.',
    saranStandar: 'Tambahkan tanda kutip ganda penutup (") di akhir teks.',
  },
  [KodeGalat.LEX_KARAKTER_TIDAK_DITUTUP]: {
    kode: KodeGalat.LEX_KARAKTER_TIDAK_DITUTUP,
    kategori: 'Lexer',
    judul: 'Literal Karakter Tidak Ditutup',
    penjelasan: 'Literal karakter dibuka dengan tanda kutip tunggal (\') tetapi tidak ditutup dengan benar.',
    saranStandar: 'Tambahkan tanda kutip tunggal penutup (\') setelah satu karakter.',
  },
  [KodeGalat.LEX_ANGKA_TIDAK_VALID]: {
    kode: KodeGalat.LEX_ANGKA_TIDAK_VALID,
    kategori: 'Lexer',
    judul: 'Format Angka Tidak Valid',
    penjelasan: 'Format angka numerik tidak sesuai dengan aturan sintaksis NUSANTARA.',
    saranStandar: 'Pastikan penulisan bilangan atau desimal hanya menggunakan digit angka dan satu tanda titik.',
  },
  [KodeGalat.LEX_URUTAN_LOLOS_TIDAK_VALID]: {
    kode: KodeGalat.LEX_URUTAN_LOLOS_TIDAK_VALID,
    kategori: 'Lexer',
    judul: 'Urutan Lolos (Escape Sequence) Tidak Valid',
    penjelasan: 'Karakter setelah garis miring terbalik (\\) bukan merupakan karakter lolos yang sah.',
    saranStandar: 'Gunakan karakter lolos yang valid seperti \\n, \\t, \\", \\\', atau \\\\.',
  },

  // Parser
  [KodeGalat.PAR_TOKEN_TAK_TERDUGA]: {
    kode: KodeGalat.PAR_TOKEN_TAK_TERDUGA,
    kategori: 'Sintaks',
    judul: 'Token Tak Terduga',
    penjelasan: 'Struktur kode tidak sesuai dengan tata bahasa resmi NUSANTARA pada posisi ini.',
    saranStandar: 'Periksa urutan kata kunci, tanda baca, atau tanda kurung yang belum berpasangan.',
  },
  [KodeGalat.PAR_EKSPRESI_TIDAK_LENGKAP]: {
    kode: KodeGalat.PAR_EKSPRESI_TIDAK_LENGKAP,
    kategori: 'Sintaks',
    judul: 'Ekspresi Tidak Lengkap',
    penjelasan: 'Sebuah operasi matematika atau logika memerlukan operand di sebelah kanan.',
    saranStandar: 'Lengkapi ekspresi dengan nilai, variabel, atau pemanggilan fungsi.',
  },
  [KodeGalat.PAR_PERNYATAAN_TIDAK_VALID]: {
    kode: KodeGalat.PAR_PERNYATAAN_TIDAK_VALID,
    kategori: 'Sintaks',
    judul: 'Pernyataan Tidak Valid',
    penjelasan: 'Instruksi tidak dapat dipahami sebagai pernyataan yang sah di blok ini.',
  },
  [KodeGalat.PAR_BLOK_TIDAK_DITUTUP]: {
    kode: KodeGalat.PAR_BLOK_TIDAK_DITUTUP,
    kategori: 'Sintaks',
    judul: 'Blok Tidak Ditutup',
    penjelasan: 'Sebuah blok (program, fungsi, mulai, jika, untuk, atau selama) belum ditutup dengan kata kunci penutup yang sesuai.',
    saranStandar: 'Tambahkan kata kunci penutup yang sesuai (selesai atau akhir).',
  },
  [KodeGalat.PAR_STRUKTUR_TIDAK_VALID]: {
    kode: KodeGalat.PAR_STRUKTUR_TIDAK_VALID,
    kategori: 'Sintaks',
    judul: 'Struktur Program Tidak Valid',
    penjelasan: 'Program harus memiliki deklarasi dan blok utama yang terstruktur.',
  },

  // Tipe
  [KodeGalat.TYP_KETIDAKCOCOKAN_TIPE]: {
    kode: KodeGalat.TYP_KETIDAKCOCOKAN_TIPE,
    kategori: 'Tipe',
    judul: 'Ketidakcocokan Tipe Data',
    penjelasan: 'Tipe data nilai yang diberikan berbeda dari tipe data yang diharapkan oleh variabel atau konteks.',
    saranStandar: 'Sesuaikan nilai dengan tipe yang dideklarasikan, atau gunakan modul konversi.',
  },
  [KodeGalat.TYP_TIPE_TIDAK_DIKENAL]: {
    kode: KodeGalat.TYP_TIPE_TIDAK_DIKENAL,
    kategori: 'Tipe',
    judul: 'Tipe Data Tidak Dikenal',
    penjelasan: 'Nama tipe yang ditulis tidak terdaftar dalam sistem tipe NUSANTARA.',
    saranStandar: 'Gunakan tipe bawaan resmi: bilangan, desimal, teks, karakter, logika, daftar, peta, atau kosong.',
  },
  [KodeGalat.TYP_OPERATOR_TIDAK_DIDUKUNG]: {
    kode: KodeGalat.TYP_OPERATOR_TIDAK_DIDUKUNG,
    kategori: 'Tipe',
    judul: 'Operator Tidak Didukung untuk Tipe Tersebut',
    penjelasan: 'Operator yang digunakan tidak dapat dioperasikan pada kombinasi tipe operand yang diberikan.',
    saranStandar: 'Periksa kecocokan tipe data kedua sisi operator.',
  },
  [KodeGalat.TYP_DEKLARASI_GANDA]: {
    kode: KodeGalat.TYP_DEKLARASI_GANDA,
    kategori: 'Tipe',
    judul: 'Deklarasi Ganda',
    penjelasan: 'Nama variabel atau fungsi ini sudah pernah dideklarasikan sebelumnya dalam lingkup yang sama.',
    saranStandar: 'Gunakan nama lain atau hapus deklarasi yang berulang.',
  },
  [KodeGalat.TYP_MODIFIKASI_TETAP]: {
    kode: KodeGalat.TYP_MODIFIKASI_TETAP,
    kategori: 'Tipe',
    judul: 'Modifikasi Konstanta Tetap Dilarang',
    penjelasan: 'Pengidentifikasi yang dideklarasikan dengan kata kunci "tetap" bersifat abadi dan tidak dapat diubah.',
    saranStandar: 'Deklarasikan sebagai "variabel" jika nilainya perlu diperbarui dalam program.',
  },
  [KodeGalat.TYP_ARGUMEN_TIDAK_SESUAI]: {
    kode: KodeGalat.TYP_ARGUMEN_TIDAK_SESUAI,
    kategori: 'Tipe',
    judul: 'Argumen Fungsi Tidak Sesuai',
    penjelasan: 'Jumlah atau tipe argumen yang diberikan pada pemanggilan fungsi tidak cocok dengan parameter fungsi.',
    saranStandar: 'Periksa tanda tangan parameter fungsi yang dipanggil.',
  },
  [KodeGalat.TYP_KEMBALIAN_TIDAK_SESUAI]: {
    kode: KodeGalat.TYP_KEMBALIAN_TIDAK_SESUAI,
    kategori: 'Tipe',
    judul: 'Tipe Nilai Kembalian Tidak Sesuai',
    penjelasan: 'Nilai yang dikembalikan oleh instruksi "kembalikan" tidak cocok dengan tipe kembalian fungsi.',
  },

  // Nama
  [KodeGalat.NAM_VARIABEL_TIDAK_DITEMUKAN]: {
    kode: KodeGalat.NAM_VARIABEL_TIDAK_DITEMUKAN,
    kategori: 'Nama',
    judul: 'Variabel Tidak Ditemukan',
    penjelasan: 'Pengidentifikasi belum dideklarasikan atau berada di luar lingkup (scope) yang dapat diakses.',
    saranStandar: 'Pastikan nama variabel sudah dideklarasikan sebelum digunakan.',
  },
  [KodeGalat.NAM_FUNGSI_TIDAK_DITEMUKAN]: {
    kode: KodeGalat.NAM_FUNGSI_TIDAK_DITEMUKAN,
    kategori: 'Nama',
    judul: 'Fungsi Tidak Ditemukan',
    penjelasan: 'Fungsi dengan nama tersebut belum didefinisikan atau belum diimpor dari modul yang sesuai.',
  },
  [KodeGalat.NAM_IDENTIFIER_DI_LUAR_LINGKUP]: {
    kode: KodeGalat.NAM_IDENTIFIER_DI_LUAR_LINGKUP,
    kategori: 'Nama',
    judul: 'Pengidentifikasi di Luar Lingkup',
    penjelasan: 'Pengidentifikasi ini tidak dapat diakses dari blok kode saat ini.',
  },

  // Modul
  [KodeGalat.MOD_TIDAK_DITEMUKAN]: {
    kode: KodeGalat.MOD_TIDAK_DITEMUKAN,
    kategori: 'Modul',
    judul: 'Modul Tidak Ditemukan',
    penjelasan: 'Berkas atau pustaka modul yang diminta tidak ditemukan pada lokasi pencarian yang diperiksa.',
    saranStandar: 'Periksa penulisan nama modul atau keberadaan berkas .nusantara.',
  },
  [KodeGalat.MOD_ANGGOTA_TIDAK_DITEMUKAN]: {
    kode: KodeGalat.MOD_ANGGOTA_TIDAK_DITEMUKAN,
    kategori: 'Modul',
    judul: 'Anggota Modul Tidak Ditemukan',
    penjelasan: 'Simbol atau fungsi yang diakses tidak terdaftar dalam ekspor resmi modul.',
  },
  [KodeGalat.MOD_KETERGANTUNGAN_MELINGKAR]: {
    kode: KodeGalat.MOD_KETERGANTUNGAN_MELINGKAR,
    kategori: 'Modul',
    judul: 'Ketergantungan Melingkar Terdeteksi',
    penjelasan: 'Dua atau lebih modul saling mengimpor satu sama lain sehingga membentuk siklus tanpa akhir.',
    saranStandar: 'Pisahkan fungsi bersama ke dalam modul pembantu terpisah untuk memutus siklus.',
  },
  [KodeGalat.MOD_JALUR_TIDAK_AMAN]: {
    kode: KodeGalat.MOD_JALUR_TIDAK_AMAN,
    kategori: 'Modul',
    judul: 'Jalur Modul Tidak Aman',
    penjelasan: 'Jalur modul mencoba keluar dari batas direktori akar proyek (path traversal).',
  },
  [KodeGalat.MOD_ANGGOTA_TERLINDUNGI]: {
    kode: KodeGalat.MOD_ANGGOTA_TERLINDUNGI,
    kategori: 'Modul',
    judul: 'Akses ke Anggota Internal Terlindungi',
    penjelasan: 'Simbol ini bersifat internal pada modul dan tidak diekspor ke modul lain.',
    saranStandar: 'Tambahkan kata kunci "ekspor" pada deklarasi modul jika simbol perlu diakses dari luar.',
  },
  [KodeGalat.MOD_BERKAS_RUSAK]: {
    kode: KodeGalat.MOD_BERKAS_RUSAK,
    kategori: 'Modul',
    judul: 'Berkas Modul Rusak',
    penjelasan: 'Terjadi kesalahan sintaksis atau kegagalan pembacaan di dalam berkas modul.',
  },

  // Paket
  [KodeGalat.PKG_MANIFEST_RUSAK]: {
    kode: KodeGalat.PKG_MANIFEST_RUSAK,
    kategori: 'Paket',
    judul: 'Manifest nusantara.toml Rusak',
    penjelasan: 'Format TOML manifest paket tidak valid atau tidak memuat tabel [nusantara].',
  },
  [KodeGalat.PKG_KONFLIK_VERSI]: {
    kode: KodeGalat.PKG_KONFLIK_VERSI,
    kategori: 'Paket',
    judul: 'Konflik Versi Dependensi Paket',
    penjelasan: 'Beberapa paket meminta versi yang saling bertentangan dan tidak dapat diselaraskan.',
  },
  [KodeGalat.PKG_KETERGANTUNGAN_MELINGKAR]: {
    kode: KodeGalat.PKG_KETERGANTUNGAN_MELINGKAR,
    kategori: 'Paket',
    judul: 'Ketergantungan Melingkar Antar-Paket',
    penjelasan: 'Terdapat rantai dependensi paket yang berputar melingkar.',
  },
  [KodeGalat.PKG_BERKAS_KUNCI_RUSAK]: {
    kode: KodeGalat.PKG_BERKAS_KUNCI_RUSAK,
    kategori: 'Paket',
    judul: 'Berkas Kunci nusantara.lock Rusak',
    penjelasan: 'Berkas kunci integritas paket tidak dapat diurai.',
  },
  [KodeGalat.PKG_INTEGRITAS_GAGAL]: {
    kode: KodeGalat.PKG_INTEGRITAS_GAGAL,
    kategori: 'Paket',
    judul: 'Pemeriksaan Integritas Paket Gagal',
    penjelasan: 'Checksum berkas paket lokal tidak cocok dengan checksum yang tersimpan di nusantara.lock.',
  },
  [KodeGalat.PKG_NAMA_TIDAK_VALID]: {
    kode: KodeGalat.PKG_NAMA_TIDAK_VALID,
    kategori: 'Paket',
    judul: 'Nama Paket Tidak Valid',
    penjelasan: 'Nama paket melanggar aturan penamaan resmi atau memuat karakter yang tidak aman.',
  },
  [KodeGalat.PKG_TIDAK_DITEMUKAN]: {
    kode: KodeGalat.PKG_TIDAK_DITEMUKAN,
    kategori: 'Paket',
    judul: 'Paket Tidak Ditemukan',
    penjelasan: 'Paket yang diminta tidak ditemukan pada direktori lokal atau repositori paket.',
  },

  // Runtime
  [KodeGalat.RUN_PEMBAGIAN_NOL]: {
    kode: KodeGalat.RUN_PEMBAGIAN_NOL,
    kategori: 'Runtime',
    judul: 'Pembagian dengan Nol',
    penjelasan: 'Operasi pembagian atau modulo tidak dapat membagi angka dengan penyebut nol (0).',
    saranStandar: 'Tambahkan pemeriksaan kondisi "jika pembagi != 0" sebelum melakukan operasi pembagian.',
  },
  [KodeGalat.RUN_KENDALI_DI_LUAR_KONTEKS]: {
    kode: KodeGalat.RUN_KENDALI_DI_LUAR_KONTEKS,
    kategori: 'Runtime',
    judul: 'Instruksi Kendali di Luar Konteks',
    penjelasan: 'Instruksi "hentikan" atau "lanjutkan" hanya sah digunakan di dalam blok perulangan.',
  },
  [KodeGalat.RUN_BATAS_ITERASI_TERLAMPAUI]: {
    kode: KodeGalat.RUN_BATAS_ITERASI_TERLAMPAUI,
    kategori: 'Runtime',
    judul: 'Batas Iterasi atau Rekursi Terlampaui',
    penjelasan: 'Program mengalami perulangan tak terbatas atau kedalaman rekursi fungsi melampaui batas aman (stack overflow).',
    saranStandar: 'Periksa kondisi terminasi perulangan atau kasus dasar (base case) rekursi fungsi Anda.',
  },
  [KodeGalat.RUN_OPERASI_TIDAK_VALID]: {
    kode: KodeGalat.RUN_OPERASI_TIDAK_VALID,
    kategori: 'Runtime',
    judul: 'Operasi Runtime Tidak Valid',
    penjelasan: 'Instruksi tidak dapat dieksekusi dengan nilai runtime saat ini.',
  },
  [KodeGalat.RUN_KONSTANTA_DIUBAH]: {
    kode: KodeGalat.RUN_KONSTANTA_DIUBAH,
    kategori: 'Runtime',
    judul: 'Konstanta Diubah saat Runtime',
    penjelasan: 'Upaya mengubah nilai tetap ditolak.',
  },

  // Indeks & Struktur Data
  [KodeGalat.IDX_BATAS_TERLAMPAUI]: {
    kode: KodeGalat.IDX_BATAS_TERLAMPAUI,
    kategori: 'Indeks',
    judul: 'Indeks Daftar di Luar Batas',
    penjelasan: 'Indeks yang diakses berada di luar rentang ukuran daftar yang sah (indeks negatif atau melebihi panjang).',
    saranStandar: 'Pastikan indeks berada di antara 0 dan panjang daftar dikurangi 1.',
  },
  [KodeGalat.IDX_KUNCI_TIDAK_DITEMUKAN]: {
    kode: KodeGalat.IDX_KUNCI_TIDAK_DITEMUKAN,
    kategori: 'Indeks',
    judul: 'Kunci Peta Tidak Ditemukan',
    penjelasan: 'Kunci teks yang diminta tidak ada dalam pasangan kunci-nilai peta.',
  },
  [KodeGalat.IDX_BUKAN_KOLEKSI]: {
    kode: KodeGalat.IDX_BUKAN_KOLEKSI,
    kategori: 'Indeks',
    judul: 'Bukan Merupakan Struktur Koleksi',
    penjelasan: 'Akses menggunakan tanda kurung siku [ ] hanya didukung pada tipe daftar atau peta.',
  },

  // Berkas & Sandbox
  [KodeGalat.FILE_TIDAK_DITEMUKAN]: {
    kode: KodeGalat.FILE_TIDAK_DITEMUKAN,
    kategori: 'Berkas',
    judul: 'Berkas Tidak Ditemukan',
    penjelasan: 'Berkas tidak ditemukan pada lokasi yang ditentukan di dalam sandbox proyek.',
  },
  [KodeGalat.FILE_PELANGGARAN_SANDBOX]: {
    kode: KodeGalat.FILE_PELANGGARAN_SANDBOX,
    kategori: 'Berkas',
    judul: 'Pelanggaran Keamanan Sandbox Berkas',
    penjelasan: 'Operasi berkas ditolak karena mencoba mengakses berkas di luar batas proyek yang diizinkan.',
  },
  [KodeGalat.FILE_BERKAS_SENSITIF]: {
    kode: KodeGalat.FILE_BERKAS_SENSITIF,
    kategori: 'Berkas',
    judul: 'Akses ke Berkas Sensitif Sistem Ditolak',
    penjelasan: 'Sistem sandbox keamanan melarang akses ke berkas kredensial atau sistem operasi.',
  },
  [KodeGalat.FILE_GAGAL_AKSES]: {
    kode: KodeGalat.FILE_GAGAL_AKSES,
    kategori: 'Berkas',
    judul: 'Gagal Mengakses Berkas',
    penjelasan: 'Terjadi kesalahan sistem saat membaca atau menulis ke berkas.',
  },

  // Konversi
  [KodeGalat.CON_GAGAL_BILANGAN]: {
    kode: KodeGalat.CON_GAGAL_BILANGAN,
    kategori: 'Konversi',
    judul: 'Gagal Konversi ke Bilangan',
    penjelasan: 'Teks tidak memuat representasi angka bilangan bulat yang sah.',
    saranStandar: 'Pastikan teks hanya memuat angka numerik.',
  },
  [KodeGalat.CON_GAGAL_DESIMAL]: {
    kode: KodeGalat.CON_GAGAL_DESIMAL,
    kategori: 'Konversi',
    judul: 'Gagal Konversi ke Desimal',
    penjelasan: 'Teks tidak memuat representasi angka desimal yang sah.',
  },
  [KodeGalat.CON_GAGAL_LOGIKA]: {
    kode: KodeGalat.CON_GAGAL_LOGIKA,
    kategori: 'Konversi',
    judul: 'Gagal Konversi ke Logika',
    penjelasan: 'Nilai tidak dapat dikonversi menjadi benar atau salah.',
  },

  // Internal
  [KodeGalat.INT_KESALAHAN_SISTEM]: {
    kode: KodeGalat.INT_KESALAHAN_SISTEM,
    kategori: 'Internal',
    judul: 'Kesalahan Internal NUSANTARA',
    penjelasan: 'Terjadi anomali tidak terduga pada mesin interpreter.',
    saranStandar: 'Silakan laporkan masalah ini kepada tim pengembang bahasa NUSANTARA.',
  },
  [KodeGalat.INT_AST_TIDAK_VALID]: {
    kode: KodeGalat.INT_AST_TIDAK_VALID,
    kategori: 'Internal',
    judul: 'Pohon AST Tidak Valid',
    penjelasan: 'Pohon sintaksis abstrak dalam status tidak valid atau nodenya tidak dikenali.',
  },
};
