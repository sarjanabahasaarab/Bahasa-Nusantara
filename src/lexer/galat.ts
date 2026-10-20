/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber, formatPosisi } from './posisi';

/**
 * Kategori jenis galat yang dapat terjadi pada tahapan analisis leksikal.
 */
export enum JenisGalatLexer {
  KARAKTER_TAK_DIKENAL = 'KARAKTER_TAK_DIKENAL',
  TEKS_TIDAK_DITUTUP = 'TEKS_TIDAK_DITUTUP',
  KARAKTER_TIDAK_DITUTUP = 'KARAKTER_TIDAK_DITUTUP',
  ANGKA_TIDAK_VALID = 'ANGKA_TIDAK_VALID',
  URUTAN_LOLOS_TIDAK_VALID = 'URUTAN_LOLOS_TIDAK_VALID',
}

/**
 * Kelas representasi Galat Leksikal Bahasa NUSANTARA.
 */
export class GalatLexer extends Error {
  public readonly jenis: JenisGalatLexer;
  public readonly posisi: PosisiSumber;
  public readonly potonganSumber?: string;

  constructor(
    jenis: JenisGalatLexer,
    pesan: string,
    posisi: PosisiSumber,
    potonganSumber?: string
  ) {
    super(`[Galat Leksikal] ${pesan} pada ${formatPosisi(posisi)}`);
    this.name = 'GalatLexer';
    this.jenis = jenis;
    this.posisi = posisi;
    this.potonganSumber = potonganSumber;
  }
}

/**
 * Fungsi pembuat pesan galat leksikal standar berbahasa Indonesia.
 */
export function buatGalatKarakterIlegal(karakter: string, pos: PosisiSumber, barisTeks?: string): GalatLexer {
  return new GalatLexer(
    JenisGalatLexer.KARAKTER_TAK_DIKENAL,
    `Karakter tidak dikenal '${karakter}'`,
    pos,
    barisTeks
  );
}

export function buatGalatTeksTidakDitutup(pos: PosisiSumber, barisTeks?: string): GalatLexer {
  return new GalatLexer(
    JenisGalatLexer.TEKS_TIDAK_DITUTUP,
    `Literal teks tidak ditutup tanda kutip ganda (")`,
    pos,
    barisTeks
  );
}

export function buatGalatKarakterTidakDitutup(pos: PosisiSumber, barisTeks?: string): GalatLexer {
  return new GalatLexer(
    JenisGalatLexer.KARAKTER_TIDAK_DITUTUP,
    `Literal karakter tidak ditutup tanda kutip tunggal (')`,
    pos,
    barisTeks
  );
}

export function buatGalatAngkaTidakValid(literal: string, pos: PosisiSumber, barisTeks?: string): GalatLexer {
  return new GalatLexer(
    JenisGalatLexer.ANGKA_TIDAK_VALID,
    `Format angka tidak valid '${literal}'`,
    pos,
    barisTeks
  );
}

export function buatGalatUrutanLolosTidakValid(urutan: string, pos: PosisiSumber, barisTeks?: string): GalatLexer {
  return new GalatLexer(
    JenisGalatLexer.URUTAN_LOLOS_TIDAK_VALID,
    `Urutan karakter lolos tidak valid '\\${urutan}'`,
    pos,
    barisTeks
  );
}
