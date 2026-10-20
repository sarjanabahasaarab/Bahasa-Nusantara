/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PembacaBerkas {
  apakahAda(jalur: string): boolean;
  baca(jalur: string): string;
  jalurAbsolut(jalur: string): string;
  direktoriDari(jalur: string): string;
  gabungJalur(...bagian: string[]): string;
  normalisasiJalur(jalur: string): string;
}

/**
 * Pembaca berkas berbasis memori (in-memory) untuk pengujian mandiri dan UI web.
 */
export class PembacaBerkasMemori implements PembacaBerkas {
  private berkas = new Map<string, string>();
  private direktoriDasar: string;

  constructor(berkasAwal?: Record<string, string>, direktoriDasar: string = '/proyek') {
    this.direktoriDasar = this.normalisasiJalur(direktoriDasar);
    if (berkasAwal) {
      for (const [k, v] of Object.entries(berkasAwal)) {
        this.tulisBerkas(k, v);
      }
    }
  }

  public tulisBerkas(jalur: string, konten: string): void {
    const absolut = this.jalurAbsolut(jalur);
    this.berkas.set(absolut, konten);
  }

  public hapusBerkas(jalur: string): void {
    const absolut = this.jalurAbsolut(jalur);
    this.berkas.delete(absolut);
  }

  public apakahAda(jalur: string): boolean {
    const absolut = this.jalurAbsolut(jalur);
    return this.berkas.has(absolut);
  }

  public baca(jalur: string): string {
    const absolut = this.jalurAbsolut(jalur);
    const konten = this.berkas.get(absolut);
    if (konten === undefined) {
      throw new Error(`Berkas '${jalur}' tidak ditemukan pada sistem memori.`);
    }
    return konten;
  }

  public jalurAbsolut(jalur: string): string {
    const norm = this.normalisasiJalur(jalur);
    if (norm.startsWith('/')) {
      return norm;
    }
    return this.normalisasiJalur(`${this.direktoriDasar}/${norm}`);
  }

  public direktoriDari(jalur: string): string {
    const norm = this.jalurAbsolut(jalur);
    const idx = norm.lastIndexOf('/');
    if (idx <= 0) return '/';
    return norm.slice(0, idx);
  }

  public gabungJalur(...bagian: string[]): string {
    return this.normalisasiJalur(bagian.filter(Boolean).join('/'));
  }

  public normalisasiJalur(jalur: string): string {
    // Standarisasi pemisah garis miring
    const pemisah = jalur.replace(/\\/g, '/');
    const segmen = pemisah.split('/');
    const hasilSegmen: string[] = [];

    const isAbsolut = pemisah.startsWith('/');

    for (const seg of segmen) {
      if (!seg || seg === '.') continue;
      if (seg === '..') {
        if (hasilSegmen.length > 0 && hasilSegmen[hasilSegmen.length - 1] !== '..') {
          hasilSegmen.pop();
        } else if (!isAbsolut) {
          hasilSegmen.push('..');
        }
      } else {
        hasilSegmen.push(seg);
      }
    }

    const hasil = hasilSegmen.join('/');
    return isAbsolut ? '/' + hasil : hasil || '.';
  }
}

/**
 * Pembaca berkas sistem nyata (Node.js fs) untuk eksekusi CLI dan kompilator lokal.
 */
export class PembacaBerkasNode implements PembacaBerkas {
  private fs: any;
  private path: any;

  constructor() {
    try {
      // Menggunakan dynamic require/import secara aman agar kompatibel di lingkungan bundler
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.fs = typeof window === 'undefined' ? require('fs') : null;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.path = typeof window === 'undefined' ? require('path') : null;
    } catch {
      this.fs = null;
      this.path = null;
    }
  }

  public apakahAda(jalur: string): boolean {
    if (!this.fs) return false;
    try {
      return this.fs.existsSync(jalur) && this.fs.statSync(jalur).isFile();
    } catch {
      return false;
    }
  }

  public baca(jalur: string): string {
    if (!this.fs) {
      throw new Error(`Sistem berkas Node.js tidak tersedia pada lingkungan saat ini.`);
    }
    return this.fs.readFileSync(jalur, 'utf-8');
  }

  public jalurAbsolut(jalur: string): string {
    if (!this.path) return jalur;
    return this.path.resolve(jalur);
  }

  public direktoriDari(jalur: string): string {
    if (!this.path) return '.';
    return this.path.dirname(jalur);
  }

  public gabungJalur(...bagian: string[]): string {
    if (!this.path) return bagian.join('/');
    return this.path.join(...bagian);
  }

  public normalisasiJalur(jalur: string): string {
    if (!this.path) return jalur;
    return this.path.normalize(jalur);
  }
}
