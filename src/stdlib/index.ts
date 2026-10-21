/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatatanModul, StatusPemuatanModul, InfoSimbolModul } from '../modul/jenisModul';
import { NilaiRuntime } from '../interpreter/nilai';
import { Lingkungan } from '../interpreter/environment';

import { simbolEksporTeks, buatEksporTeks } from './teks';
import { simbolEksporMatematika, buatEksporMatematika } from './matematika';
import { simbolEksporKonversi, buatEksporKonversi } from './konversi';
import { simbolEksporWaktu, buatEksporWaktu } from './waktu';
import { simbolEksporAcak, buatEksporAcak } from './acak';
import { simbolEksporKoleksi, buatEksporKoleksi } from './koleksi';
import { simbolEksporBerkas, buatEksporBerkas, SandboxBerkas, sandboxBerkasGlobal } from './berkas';
import { simbolEksporSistem, buatEksporSistem, VERSI_NUSANTARA } from './sistem';

export * from './teks';
export * from './matematika';
export * from './konversi';
export * from './waktu';
export * from './acak';
export * from './koleksi';
export * from './berkas';
export * from './sistem';

export interface MetadataModulStandar {
  nama: string;
  deskripsi: string;
  simbolEkspor: Map<string, InfoSimbolModul>;
  pabrikEkspor: (opsi?: any) => Map<string, NilaiRuntime>;
}

export const KATALOG_MODUL_STANDAR: Record<string, MetadataModulStandar> = {
  teks: {
    nama: 'teks',
    deskripsi: 'Manipulasi string, pemotongan, penggabungan, pencarian, dan konversi huruf kapital/kecil.',
    simbolEkspor: simbolEksporTeks,
    pabrikEkspor: () => buatEksporTeks(),
  },
  matematika: {
    nama: 'matematika',
    deskripsi: 'Kalkulasi matematika numerik, konstanta PI & E, trigonometri dasar, pembulatan, pangkat, dan akar.',
    simbolEkspor: simbolEksporMatematika,
    pabrikEkspor: () => buatEksporMatematika(),
  },
  konversi: {
    nama: 'konversi',
    deskripsi: 'Konversi tipe data eksplisit (ke teks, bilangan, desimal, bulat, logika) yang aman dan teruji.',
    simbolEkspor: simbolEksporKonversi,
    pabrikEkspor: () => buatEksporKonversi(),
  },
  waktu: {
    nama: 'waktu',
    deskripsi: 'Akses waktu dan tanggal sekarang, timestamp presisi milidetik, jam, menit, detik, dan pemformatan.',
    simbolEkspor: simbolEksporWaktu,
    pabrikEkspor: () => buatEksporWaktu(),
  },
  acak: {
    nama: 'acak',
    deskripsi: 'Pembangkit bilangan acak pseudorandom, desimal antara 0..1, bilangan dalam rentang, dan pemilihan acak dari daftar.',
    simbolEkspor: simbolEksporAcak,
    pabrikEkspor: () => buatEksporAcak(),
  },
  koleksi: {
    nama: 'koleksi',
    deskripsi: 'Operasi tingkat lanjut pada struktur data daftar dan peta: pengurutan, pembalikan, pencarian, dan pengirisan.',
    simbolEkspor: simbolEksporKoleksi,
    pabrikEkspor: () => buatEksporKoleksi(),
  },
  berkas: {
    nama: 'berkas',
    deskripsi: 'Operasi I/O berkas teks terisolasi dengan perlindungan keamanan Sandbox (pembacaan, penulisan, penambahan, dan direktori).',
    simbolEkspor: simbolEksporBerkas,
    pabrikEkspor: (opsi?: { sandboxBerkas?: SandboxBerkas }) =>
      buatEksporBerkas(opsi?.sandboxBerkas || sandboxBerkasGlobal),
  },
  sistem: {
    nama: 'sistem',
    deskripsi: 'Informasi platform host, arsitektur CPU, versi resmi Nusantara, argumen baris perintah, dan variabel lingkungan.',
    simbolEkspor: simbolEksporSistem,
    pabrikEkspor: (opsi?: { argumenCLI?: string[]; envOverrides?: Record<string, string> }) =>
      buatEksporSistem(opsi?.argumenCLI, opsi?.envOverrides),
  },
};

/**
 * Memeriksa apakah nama modul yang diminta merupakan modul resmi standard library NUSANTARA.
 */
export function apakahModulStandar(namaAtauJalur: string): boolean {
  return normalisasiNamaModulStandar(namaAtauJalur) !== undefined;
}

/**
 * Menormalisasi string referensi modul menjadi nama modul standar murni.
 * Mendukung format: "teks", "std:teks", "stdlib:teks", "nusantara:teks", "std/teks", "stdlib/teks".
 */
export function normalisasiNamaModulStandar(namaAtauJalur: string): string | undefined {
  let bersih = namaAtauJalur.trim();
  if (bersih.startsWith('"') && bersih.endsWith('"')) {
    bersih = bersih.slice(1, -1).trim();
  }
  if (bersih.startsWith("'") && bersih.endsWith("'")) {
    bersih = bersih.slice(1, -1).trim();
  }

  // Jangan tangani jalur relatif lokal sebagai stdlib kecuali ber-prefix std:
  const berAwalanJalurLokal =
    bersih.startsWith('./') ||
    bersih.startsWith('.\\') ||
    bersih.startsWith('../') ||
    bersih.startsWith('..\\');

  // Hilangkan prefix resmi jika ada
  const prefixDikenal = ['std:', 'stdlib:', 'nusantara:', 'std/', 'stdlib/', 'nusantara/'];
  let adaPrefixResmi = false;
  for (const p of prefixDikenal) {
    if (bersih.startsWith(p)) {
      bersih = bersih.slice(p.length).trim();
      adaPrefixResmi = true;
      break;
    }
  }

  if (berAwalanJalurLokal && !adaPrefixResmi) {
    return undefined;
  }

  // Hilangkan ekstensi .nusantara jika ada
  if (bersih.endsWith('.nusantara')) {
    bersih = bersih.replace(/\.nusantara$/, '');
  }

  if (Object.prototype.hasOwnProperty.call(KATALOG_MODUL_STANDAR, bersih)) {
    return bersih;
  }
  return undefined;
}

/**
 * Mengembalikan seluruh nama modul standar resmi yang tersedia.
 */
export function dapatkanDaftarNamaModulStandar(): string[] {
  return Object.keys(KATALOG_MODUL_STANDAR);
}

/**
 * Membuat catatan modul runtime (CatatanModul) untuk modul standar.
 */
export function buatCatatanModulStandar(
  namaStandar: string,
  opsi?: {
    sandboxBerkas?: SandboxBerkas;
    argumenCLI?: string[];
    envOverrides?: Record<string, string>;
  }
): CatatanModul {
  const meta = KATALOG_MODUL_STANDAR[namaStandar];
  if (!meta) {
    throw new Error(`Modul standar '${namaStandar}' tidak terdaftar dalam Standard Library Nusantara.`);
  }

  const ekspor = meta.pabrikEkspor(opsi);
  const lingkungan = new Lingkungan();

  for (const [k, v] of ekspor.entries()) {
    lingkungan.definisikan(k, v, true);
  }

  return {
    id: `stdlib:${namaStandar}`,
    nama: namaStandar,
    jalurBerkas: `<stdlib:${namaStandar}>`,
    status: StatusPemuatanModul.SUDAH_DIMUAT,
    ekspor,
    simbolEkspor: new Map(meta.simbolEkspor),
    simbolInternal: new Set<string>(),
    lingkungan,
  };
}
