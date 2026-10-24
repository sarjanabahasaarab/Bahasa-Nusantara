/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GalatPenegasan } from './galatPenegasan';
import { KodeGalat } from '../diagnostik/kode';
import { NilaiRuntime, JenisNilaiRuntime, formatNilaiTeks } from '../interpreter/nilai';
import { PosisiSumber } from '../lexer/posisi';

/**
 * Mesin Penegasan Resmi (Assertion Engine) Bahasa NUSANTARA (Phase 21).
 */
export class Penegasan {
  /**
   * Memastikan bahwa kondisi bernilai kebenaran positif (truthy / benar).
   */
  public static pastikan(
    kondisi: any,
    pesan: string = 'Kondisi yang ditegaskan tidak bernilai benar.',
    lokasi?: PosisiSumber
  ): boolean {
    const isTruthy = Penegasan.apakahTruthy(kondisi);
    if (!isTruthy) {
      throw new GalatPenegasan(
        pesan,
        true,
        Penegasan.ekstrakNilaiPrimitif(kondisi),
        {
          lokasi,
          kode: KodeGalat.TST_PENEGASAN_GAGAL,
          pesanKhusus: pesan,
        }
      );
    }
    return true;
  }

  /**
   * Memastikan bahwa dua nilai identik secara struktural (deep structural equality).
   */
  public static pastikanSama(
    aktual: any,
    diharapkan: any,
    pesan?: string,
    lokasi?: PosisiSumber
  ): boolean {
    const sama = Penegasan.bandingkanNilai(aktual, diharapkan);
    if (!sama) {
      const pesanDefault = `Nilai aktual tidak sama dengan nilai yang diharapkan.`;
      throw new GalatPenegasan(
        pesan || pesanDefault,
        diharapkan,
        aktual,
        {
          lokasi,
          kode: KodeGalat.TST_TIDAK_SAMA,
          pesanKhusus: pesan || pesanDefault,
        }
      );
    }
    return true;
  }

  /**
   * Memastikan bahwa dua nilai tidak sama.
   */
  public static pastikanTidakSama(
    aktual: any,
    tidakDiharapkan: any,
    pesan?: string,
    lokasi?: PosisiSumber
  ): boolean {
    const sama = Penegasan.bandingkanNilai(aktual, tidakDiharapkan);
    if (sama) {
      const pesanDefault = `Nilai aktual seharusnya tidak sama dengan nilai '${Penegasan.formatNilaiRingkas(tidakDiharapkan)}'.`;
      throw new GalatPenegasan(
        pesan || pesanDefault,
        `bukan ${Penegasan.formatNilaiRingkas(tidakDiharapkan)}`,
        aktual,
        {
          lokasi,
          kode: KodeGalat.TST_TIDAK_SAMA,
          pesanKhusus: pesan || pesanDefault,
        }
      );
    }
    return true;
  }

  /**
   * Memastikan kondisi bernilai benar eksplisit (true).
   */
  public static pastikanBenar(
    kondisi: any,
    pesan: string = 'Nilai yang ditegaskan tidak bernilai benar (true).',
    lokasi?: PosisiSumber
  ): boolean {
    const isTrue = Penegasan.apakahBenarEksplisit(kondisi);
    if (!isTrue) {
      throw new GalatPenegasan(
        pesan,
        true,
        Penegasan.ekstrakNilaiPrimitif(kondisi),
        {
          lokasi,
          kode: KodeGalat.TST_BUKAN_BENAR,
          pesanKhusus: pesan,
        }
      );
    }
    return true;
  }

  /**
   * Memastikan kondisi bernilai salah eksplisit (false).
   */
  public static pastikanSalah(
    kondisi: any,
    pesan: string = 'Nilai yang ditegaskan tidak bernilai salah (false).',
    lokasi?: PosisiSumber
  ): boolean {
    const isFalse = Penegasan.apakahSalahEksplisit(kondisi);
    if (!isFalse) {
      throw new GalatPenegasan(
        pesan,
        false,
        Penegasan.ekstrakNilaiPrimitif(kondisi),
        {
          lokasi,
          kode: KodeGalat.TST_BUKAN_SALAH,
          pesanKhusus: pesan,
        }
      );
    }
    return true;
  }

  /**
   * Memastikan pemanggilan fungsi menimbulkan galat / eksepsi (throws error).
   */
  public static pastikanGalat(
    fungsiTarget: () => any,
    pesan?: string,
    lokasi?: PosisiSumber
  ): boolean {
    let melempar = false;
    try {
      fungsiTarget();
    } catch {
      melempar = true;
    }

    if (!melempar) {
      const pesanDefault = 'Fungsi diharapkan menimbulkan galat, tetapi berhasil dieksekusi tanpa galat.';
      throw new GalatPenegasan(
        pesan || pesanDefault,
        'Terjadi Galat (Exception)',
        'Eksekusi Sukses (Tidak ada galat)',
        {
          lokasi,
          kode: KodeGalat.TST_PENEGASAN_GAGAL,
          pesanKhusus: pesan || pesanDefault,
        }
      );
    }
    return true;
  }

  // --- Fungsi Utilitas Evaluasi & Komparasi ---

  private static apakahTruthy(val: any): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val.length > 0;
    if (typeof val === 'object' && val.jenis) {
      const nr = val as NilaiRuntime;
      if (nr.jenis === JenisNilaiRuntime.LOGIKA) return Boolean(nr.nilai);
      if (nr.jenis === JenisNilaiRuntime.BILANGAN || nr.jenis === JenisNilaiRuntime.DESIMAL) return nr.nilai !== 0;
      if (nr.jenis === JenisNilaiRuntime.TEKS) return nr.nilai.length > 0;
      if (nr.jenis === JenisNilaiRuntime.KOSONG) return false;
      if (nr.jenis === JenisNilaiRuntime.DAFTAR) return nr.elemen.length > 0;
      if (nr.jenis === JenisNilaiRuntime.PETA) return nr.nilai.size > 0;
      return true;
    }
    return Boolean(val);
  }

  private static apakahBenarEksplisit(val: any): boolean {
    if (val === true) return true;
    if (typeof val === 'object' && val !== null && val.jenis === JenisNilaiRuntime.LOGIKA) {
      return val.nilai === true;
    }
    return false;
  }

  private static apakahSalahEksplisit(val: any): boolean {
    if (val === false) return true;
    if (typeof val === 'object' && val !== null && val.jenis === JenisNilaiRuntime.LOGIKA) {
      return val.nilai === false;
    }
    return false;
  }

  public static bandingkanNilai(a: any, b: any): boolean {
    const valA = Penegasan.ekstrakNilaiPrimitif(a);
    const valB = Penegasan.ekstrakNilaiPrimitif(b);

    if (valA === valB) return true;
    if (valA === null || valA === undefined || valB === null || valB === undefined) {
      return valA === valB;
    }

    if (typeof valA !== typeof valB) {
      return false;
    }

    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (valA.length !== valB.length) return false;
      for (let i = 0; i < valA.length; i++) {
        if (!Penegasan.bandingkanNilai(valA[i], valB[i])) return false;
      }
      return true;
    }

    if (typeof valA === 'object' && typeof valB === 'object') {
      const keysA = Object.keys(valA).sort();
      const keysB = Object.keys(valB).sort();
      if (keysA.length !== keysB.length) return false;
      for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i]) return false;
        if (!Penegasan.bandingkanNilai(valA[keysA[i]], valB[keysB[i]])) return false;
      }
      return true;
    }

    return false;
  }

  public static ekstrakNilaiPrimitif(v: any): any {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object' && v.jenis) {
      const nr = v as NilaiRuntime;
      switch (nr.jenis) {
        case JenisNilaiRuntime.TEKS:
        case JenisNilaiRuntime.BILANGAN:
        case JenisNilaiRuntime.DESIMAL:
        case JenisNilaiRuntime.LOGIKA:
        case JenisNilaiRuntime.KARAKTER:
          return nr.nilai;
        case JenisNilaiRuntime.KOSONG:
          return null;
        case JenisNilaiRuntime.DAFTAR:
          return nr.elemen.map(e => Penegasan.ekstrakNilaiPrimitif(e));
        case JenisNilaiRuntime.PETA: {
          const obj: Record<string, any> = {};
          for (const [key, val] of nr.nilai.entries()) {
            obj[key] = Penegasan.ekstrakNilaiPrimitif(val);
          }
          return obj;
        }
        default:
          return nr.jenis;
      }
    }
    return v;
  }

  public static formatNilaiRingkas(v: any): string {
    if (v === null || v === undefined) return 'kosong';
    if (typeof v === 'boolean') return v ? 'benar' : 'salah';
    if (typeof v === 'string') return `"${v}"`;
    if (typeof v === 'object' && v.jenis) {
      return formatNilaiTeks(v);
    }
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
}

// Ekspor fungsi langsung dengan penamaan standar Bahasa Indonesia
export const pastikan = Penegasan.pastikan;
export const pastikan_sama = Penegasan.pastikanSama;
export const pastikanSama = Penegasan.pastikanSama;
export const pastikan_tidak_sama = Penegasan.pastikanTidakSama;
export const pastikanTidakSama = Penegasan.pastikanTidakSama;
export const pastikan_benar = Penegasan.pastikanBenar;
export const pastikanBenar = Penegasan.pastikanBenar;
export const pastikan_salah = Penegasan.pastikanSalah;
export const pastikanSalah = Penegasan.pastikanSalah;
export const pastikan_galat = Penegasan.pastikanGalat;
export const pastikanGalat = Penegasan.pastikanGalat;
