/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PembacaBerkas {
  apakahAda(jalur: string): boolean;
  baca(jalur: string): string;
  tulis?(jalur: string, konten: string): void;
  tulisBerkas?(jalur: string, konten: string): void;
  daftarDirektori?(jalur: string): string[];
  apakahDirektori?(jalur: string): boolean;
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

  public tulis(jalur: string, konten: string): void {
    this.tulisBerkas(jalur, konten);
  }

  public tulisBerkas(jalur: string, konten: string): void {
    const absolut = this.jalurAbsolut(jalur);
    this.berkas.set(absolut, konten);
  }

  public hapusBerkas(jalur: string): void {
    const absolut = this.jalurAbsolut(jalur);
    this.berkas.delete(absolut);
  }

  public dapatkanSemuaBerkas(): Map<string, string> {
    return new Map(this.berkas);
  }

  public apakahAda(jalur: string): boolean {
    const absolut = this.jalurAbsolut(jalur);
    if (this.berkas.has(absolut)) return true;
    if (this.berkas.has(jalur)) return true;
    const norm = this.normalisasiJalur(jalur);
    if (this.berkas.has(norm)) return true;
    const targetTail = '/' + norm.replace(/^\/+/, '');
    for (const k of this.berkas.keys()) {
      if (k.endsWith(targetTail)) return true;
    }
    return this.apakahDirektori(jalur);
  }

  public apakahDirektori(jalur: string): boolean {
    const absolut = this.jalurAbsolut(jalur);
    const prefix = absolut === '/' ? '/' : (absolut.endsWith('/') ? absolut : absolut + '/');
    for (const k of this.berkas.keys()) {
      if (k.startsWith(prefix)) return true;
    }
    const norm = this.normalisasiJalur(jalur);
    const normPrefix = norm === '/' ? '/' : (norm.endsWith('/') ? norm : norm + '/');
    for (const k of this.berkas.keys()) {
      if (k.includes(normPrefix)) return true;
    }
    return false;
  }

  public daftarDirektori(jalur: string): string[] {
    const absolut = this.jalurAbsolut(jalur);
    const prefix = absolut === '/' ? '/' : (absolut.endsWith('/') ? absolut : absolut + '/');
    const subEntri = new Set<string>();
    for (const k of this.berkas.keys()) {
      if (k.startsWith(prefix)) {
        const sisa = k.slice(prefix.length);
        const segmenPertama = sisa.split('/')[0];
        if (segmenPertama) subEntri.add(segmenPertama);
      }
    }
    return Array.from(subEntri);
  }

  public baca(jalur: string): string {
    const absolut = this.jalurAbsolut(jalur);
    if (this.berkas.has(absolut)) return this.berkas.get(absolut)!;
    if (this.berkas.has(jalur)) return this.berkas.get(jalur)!;
    const norm = this.normalisasiJalur(jalur);
    if (this.berkas.has(norm)) return this.berkas.get(norm)!;
    const targetTail = '/' + norm.replace(/^\/+/, '');
    for (const [k, v] of this.berkas.entries()) {
      if (k.endsWith(targetTail)) return v;
    }
    throw new Error(`Berkas '${jalur}' tidak ditemukan pada sistem memori.`);
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
      const proc = typeof process !== 'undefined' ? (process as any) : null;
      this.fs =
        proc?.getBuiltinModule
          ? proc.getBuiltinModule('fs')
          : typeof require !== 'undefined'
          ? require('fs')
          : null;
      this.path =
        proc?.getBuiltinModule
          ? proc.getBuiltinModule('path')
          : typeof require !== 'undefined'
          ? require('path')
          : null;
    } catch {
      this.fs = null;
      this.path = null;
    }
  }

  public apakahAda(jalur: string): boolean {
    if (!this.fs) return false;
    try {
      return this.fs.existsSync(jalur);
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

  public tulis(jalur: string, konten: string): void {
    if (!this.fs) {
      throw new Error(`Sistem berkas Node.js tidak tersedia pada lingkungan saat ini.`);
    }
    this.fs.writeFileSync(jalur, konten, 'utf-8');
  }

  public apakahDirektori(jalur: string): boolean {
    if (!this.fs) return false;
    try {
      return this.fs.existsSync(jalur) && this.fs.statSync(jalur).isDirectory();
    } catch {
      return false;
    }
  }

  public daftarDirektori(jalur: string): string[] {
    if (!this.fs) return [];
    try {
      return this.fs.readdirSync(jalur);
    } catch {
      return [];
    }
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
