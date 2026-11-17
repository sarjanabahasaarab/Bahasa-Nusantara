/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Pengelola Tautan Dalam Mobile (Deep Linking & Universal Link Manager)
 */

export interface HasilDeepLink {
  skema: string;
  host: string;
  jalur: string;
  parameter: Record<string, string>;
  urlAsli: string;
}

export type PenanganDeepLink = (hasil: HasilDeepLink) => void;

export class PengelolaDeepLinkMobile {
  private skemaDidukung: Set<string> = new Set(['nusantara', 'app']);
  private penanganRute: Map<string, PenanganDeepLink> = new Map();
  private penanganGlobal: PenanganDeepLink[] = [];

  constructor(skemaTambahan?: string[]) {
    if (skemaTambahan) {
      for (const s of skemaTambahan) {
        this.skemaDidukung.add(s.toLowerCase());
      }
    }
  }

  public daftarkanSkema(skema: string): void {
    this.skemaDidukung.add(skema.toLowerCase());
  }

  public daftarkanPenangan(jalur: string, penangan: PenanganDeepLink): void {
    const normal = jalur.startsWith('/') ? jalur : `/${jalur}`;
    this.penanganRute.set(normal, penangan);
  }

  public padaTautan(penangan: PenanganDeepLink): () => void {
    this.penanganGlobal.push(penangan);
    return () => {
      const idx = this.penanganGlobal.indexOf(penangan);
      if (idx !== -1) this.penanganGlobal.splice(idx, 1);
    };
  }

  public uraikanUrl(url: string): HasilDeepLink | null {
    try {
      if (typeof url !== 'string' || !url.trim() || /[\r\n\0]/.test(url)) {
        return null;
      }
      // Regex parsing untuk skema seperti nusantara://produk/123?promo=true atau https://domain.id/produk/123
      const regex = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?/;
      const cocok = url.match(regex);
      if (!cocok) return null;

      const skema = cocok[1].toLowerCase();
      const host = cocok[2];
      const jalur = cocok[3] || '/';
      const kueri = cocok[4] || '';

      const parameter: Record<string, string> = {};
      if (kueri) {
        const pasangan = kueri.split('&');
        for (const p of pasangan) {
          const eqIdx = p.indexOf('=');
          const rawKey = eqIdx === -1 ? p : p.slice(0, eqIdx);
          const rawVal = eqIdx === -1 ? '' : p.slice(eqIdx + 1);
          if (rawKey) {
            const kunci = decodeURIComponent(rawKey);
            if (kunci === '__proto__' || kunci === 'constructor' || kunci === 'prototype') {
              continue;
            }
            Object.defineProperty(parameter, kunci, {
              value: decodeURIComponent(rawVal),
              enumerable: true,
              configurable: true,
              writable: true,
            });
          }
        }
      }

      return {
        skema,
        host,
        jalur: jalur.startsWith('/') ? jalur : `/${jalur}`,
        parameter,
        urlAsli: url,
      };
    } catch {
      return null;
    }
  }

  public tanganiUrl(url: string): boolean {
    const hasil = this.uraikanUrl(url);
    if (!hasil) return false;

    // Periksa apakah skema didukung
    if (!this.skemaDidukung.has(hasil.skema) && hasil.skema !== 'http' && hasil.skema !== 'https') {
      return false;
    }

    // Jalankan penangan global
    for (const p of this.penanganGlobal) {
      p(hasil);
    }

    // Cocokkan jalur
    const penanganJalur = this.penanganRute.get(hasil.jalur);
    if (penanganJalur) {
      penanganJalur(hasil);
      return true;
    }

    // Coba cocokkan host + jalur
    const ruteGabung = `/${hasil.host}${hasil.jalur === '/' ? '' : hasil.jalur}`;
    const penanganGabung = this.penanganRute.get(ruteGabung);
    if (penanganGabung) {
      penanganGabung(hasil);
      return true;
    }

    return true;
  }
}
