/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CLI Application Generator (Phase 33)
 * Validator Integritas dan Struktur Proyek NUSANTARA
 */

import { PembacaBerkas } from '../modul/pembacaBerkas';
import { LaporanValidasiProyek } from './types';
import { bacaManifest } from '../paket/manifest';
import { Parser } from '../parser/parser';

export class ValidatorProyek {
  private pembaca: PembacaBerkas;

  constructor(pembaca: PembacaBerkas) {
    this.pembaca = pembaca;
  }

  /**
   * Memeriksa apakah sebuah direktori merupakan proyek NUSANTARA yang valid,
   * memiliki manifest sah, entry point, dan berkas sumber yang dapat diparsing.
   */
  public periksa(direktori: string): LaporanValidasiProyek {
    const pesan: string[] = [];
    const absDir = this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(direktori));

    // 1. Periksa keberadaan manifest (nusantara.toml atau nusantara-project.json)
    const jalurToml = this.pembaca.gabungJalur(absDir, 'nusantara.toml');
    const jalurJson = this.pembaca.gabungJalur(absDir, 'nusantara-project.json');

    const adaToml = this.pembaca.apakahAda(jalurToml);
    const adaJson = this.pembaca.apakahAda(jalurJson);
    const adaManifest = adaToml || adaJson;

    let namaProyek: string | undefined;
    let versiProyek: string | undefined;
    let template: string | undefined;
    let entryPoint: string | undefined;

    if (!adaManifest) {
      pesan.push(`Tidak ditemukan berkas manifest ('nusantara.toml' atau 'nusantara-project.json') pada direktori '${absDir}'.`);
    } else {
      if (adaToml) {
        try {
          const kontenToml = this.pembaca.baca(jalurToml);
          const manifest = bacaManifest(kontenToml);
          namaProyek = manifest.nusantara.nama;
          versiProyek = manifest.nusantara.versi;
        } catch (err: any) {
          pesan.push(`Manifest 'nusantara.toml' rusak atau tidak valid: ${err.message}`);
        }
      }

      if (adaJson) {
        try {
          const kontenJson = this.pembaca.baca(jalurJson);
          const parsed = JSON.parse(kontenJson);
          if (!namaProyek) namaProyek = parsed.name;
          if (!versiProyek) versiProyek = parsed.projectVersion || parsed.version;
          template = parsed.template;
          entryPoint = parsed.entryPoint;
        } catch (err: any) {
          pesan.push(`Manifest 'nusantara-project.json' rusak atau tidak valid: ${err.message}`);
        }
      }
    }

    // 2. Periksa Entry Point
    if (!entryPoint) {
      const kandidatUtama = this.pembaca.gabungJalur(absDir, 'src', 'utama.nusantara');
      const kandidatLib = this.pembaca.gabungJalur(absDir, 'src', 'lib.nusantara');
      if (this.pembaca.apakahAda(kandidatUtama)) {
        entryPoint = 'src/utama.nusantara';
      } else if (this.pembaca.apakahAda(kandidatLib)) {
        entryPoint = 'src/lib.nusantara';
      }
    }

    const adaEntryPoint = !!entryPoint && this.pembaca.apakahAda(this.pembaca.gabungJalur(absDir, entryPoint));
    if (!adaEntryPoint) {
      pesan.push(`Berkas entry point sumber (misal: 'src/utama.nusantara' atau 'src/lib.nusantara') tidak ditemukan.`);
    }

    // 3. Periksa dan parsing seluruh berkas .nusantara yang ditemukan
    const kesalahanSintaks: string[] = [];
    let jumlahBerkasSumber = 0;

    const daftarBerkasSumber = this.kumpulkanBerkasNusantara(absDir);
    jumlahBerkasSumber = daftarBerkasSumber.length;

    for (const jalurBerkas of daftarBerkasSumber) {
      try {
        const kode = this.pembaca.baca(jalurBerkas);
        const parser = new Parser(kode);
        parser.parse();
        const galat = parser.dapatkanDaftarGalat();
        if (galat.length > 0) {
          const pesanGalat = galat.map((g) => g.message || String(g)).join('; ');
          kesalahanSintaks.push(`${jalurBerkas}: ${pesanGalat}`);
        }
      } catch (err: any) {
        kesalahanSintaks.push(`${jalurBerkas}: ${err.message}`);
      }
    }

    if (kesalahanSintaks.length > 0) {
      pesan.push(`Ditemukan kesalahan sintaks pada berkas sumber NUSANTARA:\n  ${kesalahanSintaks.join('\n  ')}`);
    }

    const valid = adaManifest && adaEntryPoint && kesalahanSintaks.length === 0;

    return {
      valid,
      pesan,
      adaManifest,
      adaEntryPoint,
      berkasSumberValid: kesalahanSintaks.length === 0,
      detail: {
        namaProyek,
        versi: versiProyek,
        template,
        entryPoint,
        jumlahBerkasSumber,
        kesalahanSintaks: kesalahanSintaks.length > 0 ? kesalahanSintaks : undefined,
      },
    };
  }

  private kumpulkanBerkasNusantara(direktori: string): string[] {
    const hasil: string[] = [];

    // Jika sistem berbasis memori dengan dapatkanSemuaBerkas
    if (typeof (this.pembaca as any).dapatkanSemuaBerkas === 'function') {
      const semua: Map<string, string> = (this.pembaca as any).dapatkanSemuaBerkas();
      const prefix = direktori.endsWith('/') ? direktori : direktori + '/';
      for (const k of semua.keys()) {
        if (k.startsWith(prefix) && k.endsWith('.nusantara')) {
          hasil.push(k);
        }
      }
      return hasil;
    }

    // Jika mendukung daftarDirektori (Node.js atau FS nyata)
    if (typeof this.pembaca.daftarDirektori === 'function') {
      const telusuri = (dir: string) => {
        try {
          const entri = this.pembaca.daftarDirektori!(dir);
          for (const nama of entri) {
            if (nama === 'node_modules' || nama === 'target' || nama === '.cache') continue;
            const jalurLengkap = this.pembaca.gabungJalur(dir, nama);
            if (typeof this.pembaca.apakahDirektori === 'function' && this.pembaca.apakahDirektori(jalurLengkap)) {
              telusuri(jalurLengkap);
            } else if (nama.endsWith('.nusantara')) {
              hasil.push(jalurLengkap);
            }
          }
        } catch {
          // Abaikan direktori yang tidak dapat diakses
        }
      };
      telusuri(direktori);
    }

    return hasil;
  }
}
