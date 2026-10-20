/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber } from '../lexer/posisi';
import {
  NilaiRuntime,
  JenisNilaiRuntime,
  NilaiDaftar,
  NilaiPeta,
  buatBilangan,
  buatDesimal,
  buatTeks,
  buatLogika,
  buatDaftar,
  formatNilaiTeks,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime, BingkaiTumpukan } from '../interpreter/galat';

/**
 * Evaluasi Operator Unari NUSANTARA (Phase 10).
 * Mendukung operator unari:
 * - `-` (Negasi Numerik: bilangan / desimal)
 * - `tidak` (Negasi Logika: logika)
 */
export function evaluasiOperasiUnari(
  op: string,
  argumen: NilaiRuntime,
  posisi?: PosisiSumber,
  tumpukanPanggilan: BingkaiTumpukan[] = []
): NilaiRuntime {
  if (op === '-') {
    if (argumen.jenis === JenisNilaiRuntime.BILANGAN) {
      return buatBilangan(-argumen.nilai);
    }
    if (argumen.jenis === JenisNilaiRuntime.DESIMAL) {
      return buatDesimal(-argumen.nilai);
    }
    throw new GalatRuntime(
      JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
      `Operator unari '-' hanya dapat digunakan pada bilangan atau desimal, bukan '${argumen.jenis}'.`,
      posisi,
      tumpukanPanggilan
    );
  }

  if (op === 'tidak') {
    if (argumen.jenis === JenisNilaiRuntime.LOGIKA) {
      return buatLogika(!argumen.nilai);
    }
    throw new GalatRuntime(
      JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
      `Operator unari 'tidak' hanya dapat digunakan pada nilai logika (benar/salah), bukan '${argumen.jenis}'.`,
      posisi,
      tumpukanPanggilan
    );
  }

  throw new GalatRuntime(
    JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
    `Operator unari '${op}' tidak dikenal atau tidak didukung dalam bahasa NUSANTARA.`,
    posisi,
    tumpukanPanggilan
  );
}

/**
 * Evaluasi Operator Biner NUSANTARA (Phase 10).
 * Mendukung:
 * - Aritmatika: `+`, `-`, `*`, `/`, `%`
 * - Perbandingan: `==`, `!=`, `<`, `>`, `<=`, `>=`
 * - Logika (non-short-circuit fallback): `dan`, `atau`
 */
export function evaluasiOperasiBiner(
  op: string,
  kiri: NilaiRuntime,
  kanan: NilaiRuntime,
  posisi?: PosisiSumber,
  tumpukanPanggilan: BingkaiTumpukan[] = [],
  namaModul?: string
): NilaiRuntime {
  // 1. Operasi Penjumlahan & Penggabungan Teks (+)
  if (op === '+') {
    if (kiri.jenis === JenisNilaiRuntime.TEKS || kanan.jenis === JenisNilaiRuntime.TEKS) {
      return buatTeks(formatNilaiTeks(kiri) + formatNilaiTeks(kanan));
    }
    if (kiri.jenis === JenisNilaiRuntime.BILANGAN && kanan.jenis === JenisNilaiRuntime.BILANGAN) {
      return buatBilangan(kiri.nilai + kanan.nilai);
    }
    if (
      (kiri.jenis === JenisNilaiRuntime.BILANGAN || kiri.jenis === JenisNilaiRuntime.DESIMAL) &&
      (kanan.jenis === JenisNilaiRuntime.BILANGAN || kanan.jenis === JenisNilaiRuntime.DESIMAL)
    ) {
      return buatDesimal(kiri.nilai + kanan.nilai);
    }
  }

  // 2. Operasi Pengurangan (-)
  if (op === '-') {
    if (kiri.jenis === JenisNilaiRuntime.BILANGAN && kanan.jenis === JenisNilaiRuntime.BILANGAN) {
      return buatBilangan(kiri.nilai - kanan.nilai);
    }
    if (
      (kiri.jenis === JenisNilaiRuntime.BILANGAN || kiri.jenis === JenisNilaiRuntime.DESIMAL) &&
      (kanan.jenis === JenisNilaiRuntime.BILANGAN || kanan.jenis === JenisNilaiRuntime.DESIMAL)
    ) {
      return buatDesimal(kiri.nilai - kanan.nilai);
    }
  }

  // 3. Operasi Perkalian (*)
  if (op === '*') {
    if (kiri.jenis === JenisNilaiRuntime.BILANGAN && kanan.jenis === JenisNilaiRuntime.BILANGAN) {
      return buatBilangan(kiri.nilai * kanan.nilai);
    }
    if (
      (kiri.jenis === JenisNilaiRuntime.BILANGAN || kiri.jenis === JenisNilaiRuntime.DESIMAL) &&
      (kanan.jenis === JenisNilaiRuntime.BILANGAN || kanan.jenis === JenisNilaiRuntime.DESIMAL)
    ) {
      return buatDesimal(kiri.nilai * kanan.nilai);
    }
  }

  // 4. Operasi Pembagian (/): Menangani Pembagian dengan Nol Secara Aman
  if (op === '/') {
    if (
      (kiri.jenis === JenisNilaiRuntime.BILANGAN || kiri.jenis === JenisNilaiRuntime.DESIMAL) &&
      (kanan.jenis === JenisNilaiRuntime.BILANGAN || kanan.jenis === JenisNilaiRuntime.DESIMAL)
    ) {
      if (kanan.nilai === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.PEMBAGIAN_NOL,
          'pembagian dengan nol tidak diperbolehkan',
          posisi,
          tumpukanPanggilan,
          namaModul
        );
      }
      return buatDesimal(kiri.nilai / kanan.nilai);
    }
  }

  // 5. Operasi Modulo (%): Menangani Modulo dengan Nol Secara Aman
  if (op === '%') {
    if (kiri.jenis === JenisNilaiRuntime.BILANGAN && kanan.jenis === JenisNilaiRuntime.BILANGAN) {
      if (kanan.nilai === 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.PEMBAGIAN_NOL,
          'operasi modulo dengan nol tidak diperbolehkan.',
          posisi,
          tumpukanPanggilan,
          namaModul
        );
      }
      return buatBilangan(kiri.nilai % kanan.nilai);
    }
  }

  // 6. Operasi Perbandingan Kesetaraan (==, !=)
  if (op === '==') {
    return buatLogika(apakahNilaiSama(kiri, kanan));
  }

  if (op === '!=') {
    return buatLogika(!apakahNilaiSama(kiri, kanan));
  }

  // 7. Operasi Perbandingan Relasional (<, <=, >, >=)
  if (op === '<' || op === '<=' || op === '>' || op === '>=') {
    if (
      (kiri.jenis === JenisNilaiRuntime.BILANGAN || kiri.jenis === JenisNilaiRuntime.DESIMAL) &&
      (kanan.jenis === JenisNilaiRuntime.BILANGAN || kanan.jenis === JenisNilaiRuntime.DESIMAL)
    ) {
      switch (op) {
        case '<':
          return buatLogika(kiri.nilai < kanan.nilai);
        case '<=':
          return buatLogika(kiri.nilai <= kanan.nilai);
        case '>':
          return buatLogika(kiri.nilai > kanan.nilai);
        case '>=':
          return buatLogika(kiri.nilai >= kanan.nilai);
      }
    }

    if (kiri.jenis === JenisNilaiRuntime.TEKS && kanan.jenis === JenisNilaiRuntime.TEKS) {
      switch (op) {
        case '<':
          return buatLogika(kiri.nilai < kanan.nilai);
        case '<=':
          return buatLogika(kiri.nilai <= kanan.nilai);
        case '>':
          return buatLogika(kiri.nilai > kanan.nilai);
        case '>=':
          return buatLogika(kiri.nilai >= kanan.nilai);
      }
    }
  }

  // 8. Operasi Logika Evaluasi Langsung (dan, atau)
  if (op === 'dan') {
    if (kiri.jenis === JenisNilaiRuntime.LOGIKA && kanan.jenis === JenisNilaiRuntime.LOGIKA) {
      return buatLogika(kiri.nilai && kanan.nilai);
    }
    throw new GalatRuntime(
      JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
      `Operator 'dan' membutuhkan operan bertipe logika, tetapi ditemukan '${kiri.jenis}' dan '${kanan.jenis}'.`,
      posisi,
      tumpukanPanggilan
    );
  }

  if (op === 'atau') {
    if (kiri.jenis === JenisNilaiRuntime.LOGIKA && kanan.jenis === JenisNilaiRuntime.LOGIKA) {
      return buatLogika(kiri.nilai || kanan.nilai);
    }
    throw new GalatRuntime(
      JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
      `Operator 'atau' membutuhkan operan bertipe logika, tetapi ditemukan '${kiri.jenis}' dan '${kanan.jenis}'.`,
      posisi,
      tumpukanPanggilan
    );
  }

  throw new GalatRuntime(
    JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
    `Operator '${op}' tidak dapat digunakan antara tipe '${kiri.jenis}' dan '${kanan.jenis}'.`,
    posisi,
    tumpukanPanggilan
  );
}

/**
 * Membandingkan kesetaraan nilai runtime secara rekursif (deep equality).
 */
export function apakahNilaiSama(kiri: NilaiRuntime, kanan: NilaiRuntime): boolean {
  if (kiri.jenis !== kanan.jenis) {
    if (
      (kiri.jenis === JenisNilaiRuntime.BILANGAN || kiri.jenis === JenisNilaiRuntime.DESIMAL) &&
      (kanan.jenis === JenisNilaiRuntime.BILANGAN || kanan.jenis === JenisNilaiRuntime.DESIMAL)
    ) {
      return kiri.nilai === kanan.nilai;
    }
    return false;
  }

  if (kiri.jenis === JenisNilaiRuntime.KOSONG) {
    return true;
  }

  if (
    kiri.jenis === JenisNilaiRuntime.TEKS ||
    kiri.jenis === JenisNilaiRuntime.BILANGAN ||
    kiri.jenis === JenisNilaiRuntime.DESIMAL ||
    kiri.jenis === JenisNilaiRuntime.LOGIKA ||
    kiri.jenis === JenisNilaiRuntime.KARAKTER
  ) {
    return kiri.nilai === (kanan as any).nilai;
  }

  if (kiri.jenis === JenisNilaiRuntime.DAFTAR) {
    const kDaftar = kanan as NilaiDaftar;
    if (kiri.elemen.length !== kDaftar.elemen.length) return false;
    for (let i = 0; i < kiri.elemen.length; i++) {
      if (!apakahNilaiSama(kiri.elemen[i], kDaftar.elemen[i])) {
        return false;
      }
    }
    return true;
  }

  if (kiri.jenis === JenisNilaiRuntime.PETA) {
    const kPeta = kanan as NilaiPeta;
    if (kiri.nilai.size !== kPeta.nilai.size) return false;
    for (const [k, v] of kiri.nilai.entries()) {
      if (!kPeta.nilai.has(k)) return false;
      if (!apakahNilaiSama(v, kPeta.nilai.get(k)!)) return false;
    }
    return true;
  }

  return kiri === kanan;
}
