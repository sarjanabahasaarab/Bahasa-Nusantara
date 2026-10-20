/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parse as uraiTOML, stringify as cetakTOML } from 'smol-toml';

export interface EntriPaketKunci {
  nama: string;
  versi: string;
  sumber: string;
  integritas?: string;
  dependensi?: Record<string, string>;
}

export interface BerkasKunci {
  versi_format: number;
  paket: EntriPaketKunci[];
}

export class GalatBerkasKunci extends Error {
  constructor(pesan: string) {
    super(`Kesalahan berkas kunci (nusantara.lock):\n${pesan}`);
    this.name = 'GalatBerkasKunci';
  }
}

/**
 * Menghitung checksum integritas string secara deterministik menggunakan SHA-256.
 */
export function hitungChecksum(konten: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = typeof window === 'undefined' ? require('crypto') : null;
    if (crypto && crypto.createHash) {
      return 'sha256-' + crypto.createHash('sha256').update(konten, 'utf8').digest('hex');
    }
  } catch {
    // fallback
  }

  // Fallback FNV-1a 64-bit deterministik jika modul crypto tidak tersedia di web iframe
  let h1 = 0x811c9dc5;
  for (let i = 0; i < konten.length; i++) {
    h1 ^= konten.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return 'fnv1a-' + (h1 >>> 0).toString(16);
}

/**
 * Mengurai string TOML nusantara.lock.
 */
export function bacaLock(kontenTOML: string): BerkasKunci {
  let dataMentah: any;
  try {
    dataMentah = uraiTOML(kontenTOML);
  } catch (err: any) {
    throw new GalatBerkasKunci(`Sintaks berkas lock tidak valid: ${err.message}`);
  }

  if (!dataMentah || typeof dataMentah !== 'object') {
    throw new GalatBerkasKunci(`Format berkas lock kosong atau tidak valid.`);
  }

  const versiFormat = typeof dataMentah.versi_format === 'number' ? dataMentah.versi_format : 1;
  const daftarPaketMentah = dataMentah.paket || [];

  if (!Array.isArray(daftarPaketMentah)) {
    throw new GalatBerkasKunci(`Entri 'paket' dalam berkas lock harus berupa array.`);
  }

  const paket: EntriPaketKunci[] = [];
  for (const p of daftarPaketMentah) {
    if (!p.nama || typeof p.nama !== 'string') {
      throw new GalatBerkasKunci(`Setiap entri paket pada lockfile wajib memiliki nama.`);
    }
    if (!p.versi || typeof p.versi !== 'string') {
      throw new GalatBerkasKunci(`Paket '${p.nama}' pada lockfile tidak memiliki versi yang valid.`);
    }

    paket.push({
      nama: p.nama,
      versi: p.versi,
      sumber: typeof p.sumber === 'string' ? p.sumber : 'lokal',
      integritas: typeof p.integritas === 'string' ? p.integritas : undefined,
      dependensi: typeof p.dependensi === 'object' && p.dependensi ? p.dependensi : undefined,
    });
  }

  return {
    versi_format: versiFormat,
    paket,
  };
}

/**
 * Menghasilkan teks nusantara.lock yang terformat rapi.
 */
export function tulisLock(lock: BerkasKunci): string {
  const objekTOML: Record<string, any> = {
    versi_format: lock.versi_format,
    paket: lock.paket.map(p => {
      const entri: Record<string, any> = {
        nama: p.nama,
        versi: p.versi,
        sumber: p.sumber,
      };
      if (p.integritas) entri.integritas = p.integritas;
      if (p.dependensi && Object.keys(p.dependensi).length > 0) {
        entri.dependensi = p.dependensi;
      }
      return entri;
    }),
  };

  const toml = cetakTOML(objekTOML);
  return (
    `# Berkas Kunci Dependensi NUSANTARA (nusantara.lock)\n` +
    `# Dihasilkan secara otomatis oleh Package Manager. JANGAN EDIT MANUAL.\n\n` +
    toml
  );
}
