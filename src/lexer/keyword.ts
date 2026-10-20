/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JenisToken } from './jenisToken';

/**
 * Kamus pemetaan kata leksikal menjadi jenis token kata kunci resmi.
 * Mencakup 21 kata kunci ditetapkan, 11 kata kunci rancangan, dan 3 kata kunci operator logika.
 */
export const TABEL_KATA_KUNCI: Readonly<Record<string, JenisToken>> = Object.freeze({
  // Kata Kunci Ditetapkan (Phase 2 & Phase 4)
  program: JenisToken.KW_PROGRAM,
  mulai: JenisToken.KW_MULAI,
  selesai: JenisToken.KW_SELESAI,
  variabel: JenisToken.KW_VARIABEL,
  tetap: JenisToken.KW_TETAP,
  fungsi: JenisToken.KW_FUNGSI,
  kembalikan: JenisToken.KW_KEMBALIKAN,
  jika: JenisToken.KW_JIKA,
  maka: JenisToken.KW_MAKA,
  selain: JenisToken.KW_SELAIN,
  akhir: JenisToken.KW_AKHIR,
  selama: JenisToken.KW_SELAMA,
  untuk: JenisToken.KW_UNTUK,
  dari: JenisToken.KW_DARI,
  sampai: JenisToken.KW_SAMPAI,
  lakukan: JenisToken.KW_LAKUKAN,
  hentikan: JenisToken.KW_HENTIKAN,
  lanjutkan: JenisToken.KW_LANJUTKAN,
  benar: JenisToken.KW_BENAR,
  salah: JenisToken.KW_SALAH,
  kosong: JenisToken.KW_KOSONG,

  // Kata Kunci Rancangan (Phase 2 & Phase 4)
  coba: JenisToken.KW_COBA,
  tangkap: JenisToken.KW_TANGKAP,
  lempar: JenisToken.KW_LEMPAR,
  impor: JenisToken.KW_IMPOR,
  buat: JenisToken.KW_BUAT,
  kelas: JenisToken.KW_KELAS,
  umum: JenisToken.KW_UMUM,
  pribadi: JenisToken.KW_PRIBADI,
  lindungi: JenisToken.KW_LINDUNGI,
  baru: JenisToken.KW_BARU,
  hapus: JenisToken.KW_HAPUS,

  // Kata Kunci Sistem Modul (Phase 15)
  modul: JenisToken.KW_MODUL,
  gunakan: JenisToken.KW_GUNAKAN,
  ekspor: JenisToken.KW_EKSPOR,
  sebagai: JenisToken.KW_SEBAGAI,

  // Operator Logika Leksikal Bahasa Indonesia
  dan: JenisToken.OP_LOGIKA_DAN,
  atau: JenisToken.OP_LOGIKA_ATAU,
  tidak: JenisToken.OP_LOGIKA_TIDAK,
});

/**
 * Memeriksa apakah suatu kata leksikal merupakan kata kunci atau operator leksikal resmi.
 */
export function periksaKataKunci(kata: string): JenisToken | undefined {
  return TABEL_KATA_KUNCI[kata];
}
