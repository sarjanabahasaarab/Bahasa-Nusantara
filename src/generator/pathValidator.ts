/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CLI Application Generator (Phase 33)
 * Validator Lokasi dan Jalur Sistem Berkas
 */

import { PembacaBerkas } from '../modul/pembacaBerkas';

export interface HasilValidasiJalur {
  valid: boolean;
  pesan?: string;
  jalurAbsolut: string;
  apakahAda: boolean;
  apakahKosong: boolean;
}

const JALUR_BERBAHAYA_SISTEM = [
  '/',
  '/bin',
  '/boot',
  '/dev',
  '/etc',
  '/home',
  '/lib',
  '/lib64',
  '/opt',
  '/proc',
  '/root',
  '/run',
  '/sbin',
  '/sys',
  '/usr',
  '/var',
  'c:/',
  'c:/windows',
  'c:/program files',
  'c:/program files (x86)',
];

/**
 * Memvalidasi lokasi direktori target pembuatan proyek baru.
 */
export function validasiJalurTujuan(
  pembaca: PembacaBerkas,
  direktoriBasis: string,
  namaProyek: string,
  opsi?: { force?: boolean }
): HasilValidasiJalur {
  const jalurGabung = pembaca.gabungJalur(direktoriBasis, namaProyek);
  const jalurAbsolut = pembaca.normalisasiJalur(pembaca.jalurAbsolut(jalurGabung));

  // 1. Perlindungan direktori sistem root
  const normalisasiKecil = jalurAbsolut.toLowerCase().replace(/\\/g, '/');
  for (const berbahaya of JALUR_BERBAHAYA_SISTEM) {
    if (normalisasiKecil === berbahaya || normalisasiKecil === berbahaya + '/') {
      return {
        valid: false,
        pesan: `Direktori target '${jalurAbsolut}' mengarah ke direktori sistem yang dilarang.`,
        jalurAbsolut,
        apakahAda: true,
        apakahKosong: false,
      };
    }
  }

  // 2. Periksa apakah sudah ada
  const apakahAda = pembaca.apakahAda(jalurAbsolut);
  let apakahKosong = true;

  if (apakahAda) {
    if (typeof pembaca.daftarDirektori === 'function') {
      try {
        const daftar = pembaca.daftarDirektori(jalurAbsolut);
        apakahKosong = daftar.length === 0;
      } catch {
        apakahKosong = false;
      }
    } else {
      // Jika pembaca memori tanpa daftarDirektori, periksa apakah ada berkas dengan prefiks ini
      if (typeof (pembaca as any).dapatkanSemuaBerkas === 'function') {
        const semua: Map<string, string> = (pembaca as any).dapatkanSemuaBerkas();
        let hitung = 0;
        const prefix = jalurAbsolut.endsWith('/') ? jalurAbsolut : jalurAbsolut + '/';
        for (const k of semua.keys()) {
          if (k.startsWith(prefix)) {
            hitung++;
          }
        }
        apakahKosong = hitung === 0;
      }
    }

    if (!apakahKosong && !opsi?.force) {
      return {
        valid: false,
        pesan: `Direktori target '${jalurAbsolut}' sudah ada dan berisi berkas. Gunakan nama proyek lain atau tambahkan opsi '--force' untuk menimpa.`,
        jalurAbsolut,
        apakahAda: true,
        apakahKosong: false,
      };
    }
  }

  return {
    valid: true,
    jalurAbsolut,
    apakahAda,
    apakahKosong,
  };
}

/**
 * Memastikan jalur file yang hendak ditulis tidak mengalami path traversal
 * dan tetap berada di dalam direktori proyek.
 */
export function periksaJalurBerkasAman(
  pembaca: PembacaBerkas,
  direktoriAkarProyek: string,
  jalurRelatif: string
): string {
  if (
    jalurRelatif.includes('../') ||
    jalurRelatif.includes('..\\') ||
    jalurRelatif.startsWith('/') ||
    jalurRelatif.startsWith('\\')
  ) {
    throw new Error(
      `Jalur berkas '${jalurRelatif}' melanggar keamanan direktori proyek (terdeteksi path traversal).`
    );
  }

  const gabungan = pembaca.gabungJalur(direktoriAkarProyek, jalurRelatif);
  const absolut = pembaca.normalisasiJalur(pembaca.jalurAbsolut(gabungan));
  const akarAbsolut = pembaca.normalisasiJalur(pembaca.jalurAbsolut(direktoriAkarProyek));

  const prefixAkar = akarAbsolut.endsWith('/') ? akarAbsolut : akarAbsolut + '/';
  if (!absolut.startsWith(prefixAkar) && absolut !== akarAbsolut) {
    throw new Error(
      `Berkas '${jalurRelatif}' keluar dari batas direktori proyek '${akarAbsolut}'.`
    );
  }

  return absolut;
}
