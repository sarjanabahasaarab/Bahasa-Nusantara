/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas, PembacaBerkasNode, ResolverModul, PemuatModul } from '../modul';
import { Parser } from '../parser/parser';
import { PemeriksaTipe } from '../tipe/pemeriksaTipe';
import { mesinDiagnostikDefault, Diagnostik, TingkatDiagnostik } from '../diagnostik';
import { LinterNUSANTARA } from './linter';
import { bacaManifest } from '../paket/manifest';
import { bacaLock } from '../paket/lockfile';

export interface OpsiPemeriksaan {
  sertakanPeringatan?: boolean;
}

export interface HasilPemeriksaanBerkas {
  sukses: boolean;
  jalur: string;
  diagnostik: Diagnostik[];
  galat: Diagnostik[];
  peringatan: Diagnostik[];
}

export interface HasilPemeriksaanProyek {
  sukses: boolean;
  totalBerkasDiperiksa: number;
  berkasSukses: number;
  daftarBerkas: string[];
  diagnostik: Diagnostik[];
  galat: Diagnostik[];
  peringatan: Diagnostik[];
}

/**
 * Pemeriksa Kode dan Validator Proyek Resmi Bahasa NUSANTARA (Phase 19).
 */
export class PemeriksaProyek {
  private readonly pembaca: PembacaBerkas;

  constructor(pembaca?: PembacaBerkas) {
    this.pembaca = pembaca || new PembacaBerkasNode();
  }

  /**
   * Memeriksa satu berkas kode sumber NUSANTARA (Lexer -> Parser -> Tipe -> Linter).
   */
  public periksaBerkas(jalurBerkas: string, opsi?: OpsiPemeriksaan): HasilPemeriksaanBerkas {
    const hasil: HasilPemeriksaanBerkas = {
      sukses: true,
      jalur: jalurBerkas,
      diagnostik: [],
      galat: [],
      peringatan: [],
    };

    if (!this.pembaca.apakahAda(jalurBerkas)) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(
        new Error(`Berkas '${jalurBerkas}' tidak ditemukan.`),
        { namaBerkas: jalurBerkas }
      );
      hasil.sukses = false;
      hasil.diagnostik.push(diag);
      hasil.galat.push(diag);
      return hasil;
    }

    let kodeSumber = '';
    try {
      kodeSumber = this.pembaca.baca(jalurBerkas);
    } catch (e) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(e, { namaBerkas: jalurBerkas });
      hasil.sukses = false;
      hasil.diagnostik.push(diag);
      hasil.galat.push(diag);
      return hasil;
    }

    // 1. Lexer & Parser
    const parser = new Parser(kodeSumber);
    const ast = parser.parse();
    const galatParser = parser.dapatkanDaftarGalat();
    if (galatParser.length > 0) {
      for (const g of galatParser) {
        const diag = mesinDiagnostikDefault.ubahKeDiagnostik(g, {
          kodeSumber,
          namaBerkas: jalurBerkas,
        });
        hasil.diagnostik.push(diag);
        hasil.galat.push(diag);
      }
      hasil.sukses = false;
      return hasil;
    }

    // 2. Pemeriksaan Sistem Tipe & Resolusi Modul
    const direktoriBerkas = this.pembaca.direktoriDari(jalurBerkas) || '.';
    const resolver = new ResolverModul(this.pembaca, {
      direktoriAkarProyek: direktoriBerkas,
    });
    const pemuat = new PemuatModul(resolver, this.pembaca);
    const pemeriksaTipe = new PemeriksaTipe(pemuat);
    const galatTipe = pemeriksaTipe.periksa(ast, direktoriBerkas);

    if (galatTipe.length > 0) {
      for (const gt of galatTipe) {
        const diag = mesinDiagnostikDefault.ubahKeDiagnostik(gt, {
          kodeSumber,
          namaBerkas: jalurBerkas,
        });
        hasil.diagnostik.push(diag);
        hasil.galat.push(diag);
      }
      hasil.sukses = false;
    }

    // 3. Pemeriksaan Linter Dasar (Phase 19)
    if (opsi?.sertakanPeringatan !== false) {
      const linter = new LinterNUSANTARA(kodeSumber, jalurBerkas);
      const peringatan = linter.periksa(ast);
      for (const p of peringatan) {
        hasil.diagnostik.push(p);
        hasil.peringatan.push(p);
      }
    }

    hasil.sukses = hasil.galat.length === 0;
    return hasil;
  }

  /**
   * Memvalidasi keseluruhan proyek (Manifest TOML, Lockfile, dan semua berkas .nusantara).
   */
  public periksaProyek(direktoriAkar = '.', opsi?: OpsiPemeriksaan): HasilPemeriksaanProyek {
    const hasil: HasilPemeriksaanProyek = {
      sukses: true,
      totalBerkasDiperiksa: 0,
      berkasSukses: 0,
      daftarBerkas: [],
      diagnostik: [],
      galat: [],
      peringatan: [],
    };

    // 1. Validasi Manifest nusantara.toml jika ada
    const jalurManifest = this.pembaca.gabungJalur(direktoriAkar, 'nusantara.toml');
    if (this.pembaca.apakahAda(jalurManifest)) {
      try {
        const teks = this.pembaca.baca(jalurManifest);
        bacaManifest(teks);
      } catch (err) {
        const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
          namaBerkas: 'nusantara.toml',
        });
        hasil.diagnostik.push(diag);
        hasil.galat.push(diag);
        hasil.sukses = false;
      }
    }

    // 2. Validasi nusantara.lock jika ada
    const jalurKunci = this.pembaca.gabungJalur(direktoriAkar, 'nusantara.lock');
    if (this.pembaca.apakahAda(jalurKunci)) {
      try {
        const teks = this.pembaca.baca(jalurKunci);
        bacaLock(teks);
      } catch (err) {
        const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
          namaBerkas: 'nusantara.lock',
        });
        hasil.diagnostik.push(diag);
        hasil.galat.push(diag);
        hasil.sukses = false;
      }
    }

    // 3. Temukan semua berkas *.nusantara di dalam direktori proyek
    const berkasDitemukan = this.temukanBerkasNusantara(direktoriAkar);
    hasil.totalBerkasDiperiksa = berkasDitemukan.length;
    hasil.daftarBerkas = berkasDitemukan;

    for (const b of berkasDitemukan) {
      const res = this.periksaBerkas(b, opsi);
      if (res.sukses) {
        hasil.berkasSukses++;
      } else {
        hasil.sukses = false;
      }
      for (const g of res.galat) {
        hasil.diagnostik.push(g);
        hasil.galat.push(g);
      }
      for (const p of res.peringatan) {
        hasil.diagnostik.push(p);
        hasil.peringatan.push(p);
      }
    }

    return hasil;
  }

  /**
   * Menjelajahi struktur direktori secara rekursif untuk menemukan berkas .nusantara,
   * dengan mengabaikan direktori tersembunyi/vendor (.git, .nusantara, node_modules, dist).
   */
  public temukanBerkasNusantara(direktori: string): string[] {
    const hasil: string[] = [];

    // Jika ini adalah berkas langsung
    if (this.pembaca.apakahAda(direktori) && direktori.endsWith('.nusantara')) {
      return [direktori];
    }

    if (typeof this.pembaca.daftarDirektori !== 'function') {
      return [];
    }

    const daftarAbaikan = new Set(['.git', '.nusantara', 'node_modules', 'dist', 'build', '.aistudio']);

    const jelajahi = (dir: string): void => {
      let entri: string[] = [];
      try {
        entri = this.pembaca.daftarDirektori!(dir);
      } catch {
        return;
      }

      for (const item of entri) {
        if (daftarAbaikan.has(item)) continue;
        const jalurLengkap = this.pembaca.gabungJalur(dir, item);

        if (typeof this.pembaca.apakahDirektori === 'function' && this.pembaca.apakahDirektori(jalurLengkap)) {
          jelajahi(jalurLengkap);
        } else if (item.endsWith('.nusantara')) {
          hasil.push(jalurLengkap);
        }
      }
    };

    jelajahi(direktori);
    return hasil;
  }
}
