/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Token } from '../lexer/jenisToken';
import { formatPosisi } from '../lexer/posisi';

export enum JenisGalatParser {
  TOKEN_TAK_TERDUGA = 'TOKEN_TAK_TERDUGA',
  EKSPRESI_TIDAK_LENGKAP = 'EKSPRESI_TIDAK_LENGKAP',
  PERNYATAAN_TIDAK_VALID = 'PERNYATAAN_TIDAK_VALID',
  BLOK_TIDAK_DITUTUP = 'BLOK_TIDAK_DITUTUP',
  STRUKTUR_PROGRAM_TIDAK_VALID = 'STRUKTUR_PROGRAM_TIDAK_VALID',
}

export class GalatParser extends Error {
  public readonly jenis: JenisGalatParser;
  public readonly tokenDitemukan: Token;
  public readonly baris: number;
  public readonly kolom: number;

  constructor(
    jenis: JenisGalatParser,
    pesan: string,
    tokenDitemukan: Token
  ) {
    const posisiStr = formatPosisi(tokenDitemukan.posisi.awal);
    super(`Kesalahan sintaks pada ${posisiStr}: ${pesan}`);
    this.name = 'GalatParser';
    this.jenis = jenis;
    this.tokenDitemukan = tokenDitemukan;
    this.baris = tokenDitemukan.baris;
    this.kolom = tokenDitemukan.kolom;
  }
}

export function buatGalatTokenTakTerduga(
  harapan: string,
  ditemukan: Token
): GalatParser {
  const nilaiDitemukan = ditemukan.jenis === 'EOF' ? '<akhir berkas (EOF)>' : `'${ditemukan.nilai}'`;
  return new GalatParser(
    JenisGalatParser.TOKEN_TAK_TERDUGA,
    `diharapkan ${harapan}, tetapi ditemukan ${nilaiDitemukan}`,
    ditemukan
  );
}
