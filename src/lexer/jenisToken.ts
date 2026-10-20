/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber, RentangPosisi } from './posisi';

/**
 * Taksonomi Jenis Token Bahasa NUSANTARA (Phase 6).
 * Selaras 100% dengan Spesifikasi Leksikal Phase 4 dan EBNF ISO/IEC 14977.
 */
export enum JenisToken {
  // --- KATA KUNCI UTAMA (Ditetapkan - 21 Kata Kunci) ---
  KW_PROGRAM = 'KW_PROGRAM',         // program
  KW_MULAI = 'KW_MULAI',             // mulai
  KW_SELESAI = 'KW_SELESAI',         // selesai
  KW_VARIABEL = 'KW_VARIABEL',       // variabel
  KW_TETAP = 'KW_TETAP',             // tetap
  KW_FUNGSI = 'KW_FUNGSI',           // fungsi
  KW_KEMBALIKAN = 'KW_KEMBALIKAN',   // kembalikan
  KW_JIKA = 'KW_JIKA',               // jika
  KW_MAKA = 'KW_MAKA',               // maka
  KW_SELAIN = 'KW_SELAIN',           // selain
  KW_AKHIR = 'KW_AKHIR',             // akhir
  KW_SELAMA = 'KW_SELAMA',           // selama
  KW_UNTUK = 'KW_UNTUK',             // untuk
  KW_DARI = 'KW_DARI',               // dari
  KW_SAMPAI = 'KW_SAMPAI',           // sampai
  KW_LAKUKAN = 'KW_LAKUKAN',         // lakukan
  KW_HENTIKAN = 'KW_HENTIKAN',       // hentikan
  KW_LANJUTKAN = 'KW_LANJUTKAN',     // lanjutkan
  KW_BENAR = 'KW_BENAR',             // benar
  KW_SALAH = 'KW_SALAH',             // salah
  KW_KOSONG = 'KW_KOSONG',           // kosong

  // --- KATA KUNCI LANJUTAN (Rancangan - 11 Kata Kunci) ---
  KW_COBA = 'KW_COBA',               // coba
  KW_TANGKAP = 'KW_TANGKAP',         // tangkap
  KW_LEMPAR = 'KW_LEMPAR',           // lempar
  KW_IMPOR = 'KW_IMPOR',             // impor
  KW_BUAT = 'KW_BUAT',               // buat
  KW_KELAS = 'KW_KELAS',             // kelas
  KW_UMUM = 'KW_UMUM',               // umum
  KW_PRIBADI = 'KW_PRIBADI',         // pribadi
  KW_LINDUNGI = 'KW_LINDUNGI',       // lindungi
  KW_BARU = 'KW_BARU',               // baru
  KW_HAPUS = 'KW_HAPUS',             // hapus

  // --- KATA KUNCI SISTEM MODUL (Phase 15) ---
  KW_MODUL = 'KW_MODUL',             // modul
  KW_GUNAKAN = 'KW_GUNAKAN',         // gunakan
  KW_EKSPOR = 'KW_EKSPOR',           // ekspor
  KW_SEBAGAI = 'KW_SEBAGAI',         // sebagai

  // --- IDENTIFIER & LITERAL ---
  IDENTIFIER = 'IDENTIFIER',         // nama, umur, hitungTotal
  LITERAL_BILANGAN = 'LITERAL_BILANGAN', // 0, 42, 1000
  LITERAL_DESIMAL = 'LITERAL_DESIMAL',   // 3.14, 0.5, 170.5
  LITERAL_TEKS = 'LITERAL_TEKS',     // "Halo Dunia"
  LITERAL_KARAKTER = 'LITERAL_KARAKTER', // 'A' (opsional)

  // --- OPERATOR ARITMETIKA & PENUGASAN ---
  OP_TAMBAH = 'OP_TAMBAH',           // +
  OP_KURANG = 'OP_KURANG',           // -
  OP_KALI = 'OP_KALI',               // *
  OP_BAGI = 'OP_BAGI',               // /
  OP_MODULO = 'OP_MODULO',           // %
  OP_SAMA_DENGAN = 'OP_SAMA_DENGAN', // = (penugasan)

  // --- OPERATOR PERBANDINGAN ---
  OP_KESETARAAN = 'OP_KESETARAAN',   // ==
  OP_KETIDAKSAMAAN = 'OP_KETIDAKSAMAAN', // !=
  OP_LEBIH_BESAR = 'OP_LEBIH_BESAR', // >
  OP_LEBIH_KECIL = 'OP_LEBIH_KECIL', // <
  OP_LEBIH_BESAR_SAMA = 'OP_LEBIH_BESAR_SAMA', // >=
  OP_LEBIH_KECIL_SAMA = 'OP_LEBIH_KECIL_SAMA', // <=

  // --- OPERATOR LOGIKA BAHASA INDONESIA ---
  OP_LOGIKA_DAN = 'OP_LOGIKA_DAN',   // dan
  OP_LOGIKA_ATAU = 'OP_LOGIKA_ATAU', // atau
  OP_LOGIKA_TIDAK = 'OP_LOGIKA_TIDAK', // tidak

  // --- PEMISAH & TANDA BACA (SEPARATORS) ---
  KURUNG_BUKA = 'KURUNG_BUKA',       // (
  KURUNG_TUTUP = 'KURUNG_TUTUP',     // )
  SIKU_BUKA = 'SIKU_BUKA',           // [
  SIKU_TUTUP = 'SIKU_TUTUP',         // ]
  KURAWAL_BUKA = 'KURAWAL_BUKA',     // {
  KURAWAL_TUTUP = 'KURAWAL_TUTUP',   // }
  KOMA = 'KOMA',                     // ,
  TITIK_DUA = 'TITIK_DUA',           // :
  TITIK = 'TITIK',                   // .
  BARIS_BARU = 'BARIS_BARU',         // \n (pemisah pernyataan alami)

  // --- KHUSUS AKHIR SUMBER ---
  EOF = 'EOF',                       // Akhir kode sumber (End Of File)
  ILEGAL = 'ILEGAL',                 // Token karakter tak dikenal / galat leksikal
}

/**
 * Struktur representasi sebuah Token hasil leksikalisasi.
 */
export interface Token {
  /** Jenis kategori token */
  jenis: JenisToken;
  /** Nilai leksikal teks asli (lexeme) */
  nilai: string;
  /** Nomor baris tempat token muncul (1-indexed) */
  baris: number;
  /** Nomor kolom tempat karakter pertama token muncul (1-indexed) */
  kolom: number;
  /** Rentang posisi awal dan akhir token dalam dokumen */
  posisi: RentangPosisi;
}

/**
 * Membuat instance Token baru.
 */
export function buatToken(
  jenis: JenisToken,
  nilai: string,
  awal: PosisiSumber,
  akhir: PosisiSumber
): Token {
  return {
    jenis,
    nilai,
    baris: awal.baris,
    kolom: awal.kolom,
    posisi: { awal, akhir },
  };
}
