/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pembuat Sorotan Sintaksis (Syntax Highlighter) Berbasis Lexer Resmi NUSANTARA (Phase 26)
 */

import { Lexer } from '../lexer/lexer';
import { JenisToken, Token } from '../lexer/jenisToken';
import { BarisTokenHighlight } from './types';

export function tentukanKelasCssToken(token: Token): string {
  const jenis = token.jenis;

  // 1. Kata Kunci Alur Kendali & Deklarasi
  if (jenis.startsWith('KW_')) {
    if (jenis === JenisToken.KW_BENAR || jenis === JenisToken.KW_SALAH || jenis === JenisToken.KW_KOSONG) {
      return 'text-amber-400 font-semibold';
    }
    return 'text-purple-400 font-semibold';
  }

  // 2. Literal Angka & Teks
  if (jenis === JenisToken.LITERAL_BILANGAN || jenis === JenisToken.LITERAL_DESIMAL) {
    return 'text-emerald-400';
  }
  if (jenis === JenisToken.LITERAL_TEKS || jenis === JenisToken.LITERAL_KARAKTER) {
    return 'text-amber-300';
  }

  // 3. Operator
  if (jenis.startsWith('OP_')) {
    return 'text-rose-400 font-semibold';
  }

  // 4. Pemisah & Tanda Baca
  if (
    jenis === JenisToken.KURUNG_BUKA ||
    jenis === JenisToken.KURUNG_TUTUP ||
    jenis === JenisToken.SIKU_BUKA ||
    jenis === JenisToken.SIKU_TUTUP ||
    jenis === JenisToken.KURAWAL_BUKA ||
    jenis === JenisToken.KURAWAL_TUTUP ||
    jenis === JenisToken.TITIK_DUA ||
    jenis === JenisToken.TITIK ||
    jenis === JenisToken.KOMA
  ) {
    return 'text-slate-400';
  }

  // 5. Identifier & Tipe
  if (jenis === JenisToken.IDENTIFIER) {
    const nilai = token.nilai.toLowerCase();
    const tipeKoleksi = ['bilangan', 'desimal', 'teks', 'logika', 'karakter', 'daftar', 'peta', 'kosong', 'apapun'];
    if (tipeKoleksi.includes(nilai)) {
      return 'text-cyan-400 font-medium';
    }
    return 'text-slate-200';
  }

  return 'text-slate-200';
}

/**
 * Memecah dan mewarnai kode sumber baris demi baris menggunakan Lexer NUSANTARA.
 */
export function sorotSintaksisNUSANTARA(kodeSumber: string): BarisTokenHighlight[] {
  const barisTeks = kodeSumber.split('\n');
  const hasilBaris: BarisTokenHighlight[] = barisTeks.map((teks, idx) => ({
    nomorBaris: idx + 1,
    tokenList: [],
  }));

  try {
    const lexer = new Lexer(kodeSumber, { sertakanBarisBaru: true });
    const { token: tokens } = lexer.tokenisasi();
    const komentarList = lexer.dapatkanDaftarKomentar();

    // 1. Petakan token bahasa
    for (const token of tokens) {
      if (token.jenis === JenisToken.BARIS_BARU || token.jenis === JenisToken.EOF) {
        continue;
      }

      const brsIdx = token.baris - 1;
      if (brsIdx >= 0 && brsIdx < hasilBaris.length) {
        hasilBaris[brsIdx].tokenList.push({
          teks: token.nilai,
          kelasCss: tentukanKelasCssToken(token),
          jenisToken: token.jenis,
        });
      }
    }

    // 2. Petakan komentar kode
    for (const kom of komentarList) {
      const brsIdx = kom.baris - 1;
      if (brsIdx >= 0 && brsIdx < hasilBaris.length) {
        hasilBaris[brsIdx].tokenList.push({
          teks: kom.teks,
          kelasCss: 'text-slate-500 italic',
          jenisToken: 'KOMENTAR',
        });
      }
    }
  } catch {
    // Fallback jika lexer mengalami kesalahan tak terduga
    for (let i = 0; i < barisTeks.length; i++) {
      hasilBaris[i].tokenList = [{ teks: barisTeks[i] || ' ', kelasCss: 'text-slate-200' }];
    }
  }

  // Jika suatu baris kosong atau tidak memiliki token, isi dengan teks aslinya
  for (let i = 0; i < barisTeks.length; i++) {
    if (hasilBaris[i].tokenList.length === 0) {
      hasilBaris[i].tokenList.push({
        teks: barisTeks[i] || ' ',
        kelasCss: 'text-slate-200',
      });
    }
  }

  return hasilBaris;
}
