/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Taksonomi Nama Tipe Data Resmi Bahasa NUSANTARA (Phase 2, 4, & 9).
 */
export enum NamaTipe {
  TEKS = 'teks',
  BILANGAN = 'bilangan',
  DESIMAL = 'desimal',
  LOGIKA = 'logika',
  KARAKTER = 'karakter',
  DAFTAR = 'daftar',
  PETA = 'peta',
  TANGGAL = 'tanggal',
  WAKTU = 'waktu',
  KOSONG = 'kosong',
  FUNGSI = 'fungsi',
  MODUL = 'modul',
  APAPUN = 'apapun', // Digunakan secara internal untuk fungsi bawaan variadik seperti tampilkan(...)
}

/**
 * Status kesiapan dukungan tipe pada mesin eksekusi Phase 9.
 */
export enum StatusDukunganTipe {
  LENGKAP = 'Lengkap',         // Didukung penuh oleh runtime dan type checker
  FONDASI = 'Fondasi',         // Struktur tipe terdefinisi, menunggu spesifikasi sintaks lanjutan
  DIRENCANAKAN = 'Direncanakan', // Masuk roadmap fase mendatang
}

export interface DefinisiTipe {
  nama: NamaTipe;
  namaAlias?: string[];
  status: StatusDukunganTipe;
  keterangan: string;
}

export const TABEL_TIPE_RESMI: Record<NamaTipe, DefinisiTipe> = {
  [NamaTipe.TEKS]: {
    nama: NamaTipe.TEKS,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Rangkaian karakter teks UTF-8 yang diapit tanda petik ganda.',
  },
  [NamaTipe.BILANGAN]: {
    nama: NamaTipe.BILANGAN,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Bilangan bulat bertanda (integer) tanpa titik desimal.',
  },
  [NamaTipe.DESIMAL]: {
    nama: NamaTipe.DESIMAL,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Bilangan pecahan presisi ganda (64-bit floating point).',
  },
  [NamaTipe.LOGIKA]: {
    nama: NamaTipe.LOGIKA,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Nilai kebenaran boolean (benar atau salah).',
  },
  [NamaTipe.KARAKTER]: {
    nama: NamaTipe.KARAKTER,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Karakter tunggal yang diapit tanda petik tunggal.',
  },
  [NamaTipe.DAFTAR]: {
    nama: NamaTipe.DAFTAR,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Koleksi data berurutan terindeks (array/list). Didukung penuh sejak Phase 14.',
  },
  [NamaTipe.PETA]: {
    nama: NamaTipe.PETA,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Koleksi pasangan kunci-nilai (dictionary/map). Didukung penuh sejak Phase 14.',
  },
  [NamaTipe.TANGGAL]: {
    nama: NamaTipe.TANGGAL,
    status: StatusDukunganTipe.FONDASI,
    keterangan: 'Representasi kalender tanggal formal. API pustaka pada Phase 29.',
  },
  [NamaTipe.WAKTU]: {
    nama: NamaTipe.WAKTU,
    status: StatusDukunganTipe.FONDASI,
    keterangan: 'Representasi waktu jam/menit/detik formal. API pustaka pada Phase 29.',
  },
  [NamaTipe.KOSONG]: {
    nama: NamaTipe.KOSONG,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Representasi ketiadaan nilai (null/void).',
  },
  [NamaTipe.FUNGSI]: {
    nama: NamaTipe.FUNGSI,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Objek fungsi subrutin yang dapat dipanggil.',
  },
  [NamaTipe.MODUL]: {
    nama: NamaTipe.MODUL,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Unit modul terpisah pembawa fungsi, konstanta, dan tipe ekspor.',
  },
  [NamaTipe.APAPUN]: {
    nama: NamaTipe.APAPUN,
    status: StatusDukunganTipe.LENGKAP,
    keterangan: 'Tipe dinamis bebas khusus fungsi bawaan tingkat sistem.',
  },
};

/**
 * Memvalidasi apakah suatu string merupakan pengenal tipe data yang sah di NUSANTARA.
 */
export function apakahTipeSah(nama: string): boolean {
  return Object.values(NamaTipe).includes(nama as NamaTipe);
}
