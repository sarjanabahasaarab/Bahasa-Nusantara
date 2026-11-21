/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PotonganKode } from './jenis';
import { PosisiSumber } from '../lexer/posisi';

/**
 * Membuat potongan kode sumber (source snippet) dengan penunjuk visual caret (^^^^).
 *
 * @param kodeSumber Teks lengkap berkas kode sumber
 * @param baris Nomor baris target (1-indeks)
 * @param kolom Nomor kolom awal target (1-indeks)
 * @param panjang Panjang segmen token atau ekspresi yang disorot (default: 1)
 */
export function buatCuplikanSumber(
  kodeSumber: string,
  baris: number,
  kolom: number,
  panjang: number = 1
): PotonganKode | undefined {
  if (!kodeSumber) return undefined;

  if (!Number.isSafeInteger(baris) || baris < 1 || !Number.isSafeInteger(kolom) || kolom < 1) {
    return undefined;
  }

  const barisList = kodeSumber.split(/\r?\n/);
  const indeksBaris = baris - 1;

  if (indeksBaris < 0 || indeksBaris >= barisList.length) {
    return undefined;
  }

  const teksBarisAsli = barisList[indeksBaris];
  const kolomAwal = Math.min(kolom, teksBarisAsli.length + 1);
  const lebarDiminta =
    Number.isFinite(panjang) && panjang > 0 ? Math.floor(panjang) : 1;
  // Batasi rentang caret ke sisa baris untuk mencegah repeat() menerima
  // angka tak terbatas atau alokasi string yang tidak masuk akal.
  const panjangEfektif = Math.min(
    Math.max(1, lebarDiminta),
    Math.max(1, teksBarisAsli.length - kolomAwal + 1)
  );

  // Terminal menampilkan tab dengan lebar tab-stop yang berbeda-beda.
  // Ekspansi menjadi empat spasi membuat teks dan caret selalu sejajar.
  const teksBaris = teksBarisAsli.replace(/\t/g, '    ');
  let indentasi = '';
  for (let i = 0; i < kolomAwal - 1 && i < teksBarisAsli.length; i++) {
    indentasi += teksBarisAsli[i] === '\t' ? '    ' : ' ';
  }

  const tandaCaret = '^'.repeat(panjangEfektif);
  const teksCaret = `${indentasi}${tandaCaret}`;

  return {
    nomorBaris: baris,
    teksBaris,
    kolomAwal,
    panjang: panjangEfektif,
    teksCaret,
  };
}

/**
 * Format string teks cuplikan lengkap dengan nomor baris dan pembatas pipa (|).
 *
 * Contoh hasil:
 *   12 | hasil = tambah(10, "20")
 *      |                    ^^^^
 */
export function formatCuplikanTeks(potongan: PotonganKode): string {
  const nomorStr = String(potongan.nomorBaris);
  const paddingNomor = ' '.repeat(nomorStr.length);

  return `  ${nomorStr} | ${potongan.teksBaris}\n  ${paddingNomor} | ${potongan.teksCaret}`;
}

/**
 * Ekstraksi cuplikan langsung dari PosisiSumber atau rentang.
 */
export function ekstraksiCuplikanDariPosisi(
  kodeSumber: string,
  posisiAwal?: PosisiSumber,
  posisiAkhir?: PosisiSumber
): PotonganKode | undefined {
  if (!kodeSumber || !posisiAwal) return undefined;

  let panjang = 1;
  if (posisiAkhir && posisiAkhir.baris === posisiAwal.baris && posisiAkhir.kolom >= posisiAwal.kolom) {
    panjang = Math.max(1, posisiAkhir.kolom - posisiAwal.kolom);
  }

  return buatCuplikanSumber(kodeSumber, posisiAwal.baris, posisiAwal.kolom, panjang);
}
