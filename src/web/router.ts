/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Router: Penjaluran HTTP dengan pencocokan statis, parameter dinamis, dan route grouping.
 */

import {
  MetodeHTTP,
  PenanganRute,
  MiddlewareWeb,
  KonfigurasiRute,
  HasilPencocokanRute,
} from './jenis';

interface PolaSegmen {
  jenis: 'statis' | 'param';
  nilai: string;
}

interface RuteInternal {
  metode: MetodeHTTP | 'SEMUA';
  polaAsli: string;
  segmen: PolaSegmen[];
  penangan: PenanganRute;
  middleware: MiddlewareWeb[];
}

export class RouterWeb {
  private ruteList: RuteInternal[] = [];
  private prefixSaatIni: string = '';
  private middlewareSaatIni: MiddlewareWeb[] = [];

  constructor(prefix: string = '') {
    this.prefixSaatIni = this.normalisasiJalur(prefix);
  }

  public normalisasiJalur(jalur: string): string {
    if (!jalur || jalur === '/') return '/';
    let j = jalur.replace(/\/+/g, '/');
    if (!j.startsWith('/')) j = '/' + j;
    if (j.length > 1 && j.endsWith('/')) j = j.slice(0, -1);
    return j;
  }

  private uraiPola(pola: string): PolaSegmen[] {
    const bersih = this.normalisasiJalur(pola);
    if (bersih === '/') {
      return [{ jenis: 'statis', nilai: '' }];
    }
    const bagian = bersih.split('/').slice(1);
    return bagian.map(b => {
      if (b.startsWith(':')) {
        return { jenis: 'param', nilai: b.slice(1) };
      }
      return { jenis: 'statis', nilai: b };
    });
  }

  public daftarkan(
    metode: MetodeHTTP | 'SEMUA',
    pola: string,
    penangan: PenanganRute,
    middleware: MiddlewareWeb[] = []
  ): this {
    const jalurLengkap = this.normalisasiJalur(
      (this.prefixSaatIni === '/' ? '' : this.prefixSaatIni) + '/' + pola
    );
    const segmen = this.uraiPola(jalurLengkap);
    this.ruteList.push({
      metode,
      polaAsli: jalurLengkap,
      segmen,
      penangan,
      middleware: [...this.middlewareSaatIni, ...middleware],
    });
    return this;
  }

  public get(pola: string, penangan: PenanganRute, ...middleware: MiddlewareWeb[]): this {
    return this.daftarkan('GET', pola, penangan, middleware);
  }

  public post(pola: string, penangan: PenanganRute, ...middleware: MiddlewareWeb[]): this {
    return this.daftarkan('POST', pola, penangan, middleware);
  }

  public put(pola: string, penangan: PenanganRute, ...middleware: MiddlewareWeb[]): this {
    return this.daftarkan('PUT', pola, penangan, middleware);
  }

  public patch(pola: string, penangan: PenanganRute, ...middleware: MiddlewareWeb[]): this {
    return this.daftarkan('PATCH', pola, penangan, middleware);
  }

  public delete(pola: string, penangan: PenanganRute, ...middleware: MiddlewareWeb[]): this {
    return this.daftarkan('DELETE', pola, penangan, middleware);
  }

  public semua(pola: string, penangan: PenanganRute, ...middleware: MiddlewareWeb[]): this {
    return this.daftarkan('SEMUA', pola, penangan, middleware);
  }

  public grup(prefix: string, callback: (routerGrup: RouterWeb) => void): this {
    const routerAnak = new RouterWeb(
      (this.prefixSaatIni === '/' ? '' : this.prefixSaatIni) + '/' + prefix
    );
    routerAnak.middlewareSaatIni = [...this.middlewareSaatIni];
    callback(routerAnak);
    // Gabungkan rute anak ke router induk
    for (const r of routerAnak.dapatkanSeluruhRute()) {
      this.ruteList.push(r);
    }
    return this;
  }

  public dapatkanSeluruhRute(): RuteInternal[] {
    return [...this.ruteList];
  }

  public cocokkan(
    metode: MetodeHTTP,
    jalurReq: string
  ): {
    hasil: HasilPencocokanRute | null;
    metodeDiizinkan: MetodeHTTP[];
  } {
    const jalurBersih = this.normalisasiJalur(jalurReq);
    const bagianReq = jalurBersih === '/' ? [''] : jalurBersih.split('/').slice(1);
    const metodeDiizinkan: Set<MetodeHTTP> = new Set();
    let ruteCocok: RuteInternal | null = null;
    let paramDitemukan: Record<string, string> = {};

    for (const r of this.ruteList) {
      if (r.segmen.length !== bagianReq.length) {
        continue;
      }

      let cocok = true;
      const params: Record<string, string> = {};

      for (let i = 0; i < r.segmen.length; i++) {
        const seg = r.segmen[i];
        const valReq = bagianReq[i];

        if (seg.jenis === 'statis') {
          if (seg.nilai !== valReq) {
            cocok = false;
            break;
          }
        } else if (seg.jenis === 'param') {
          try {
            params[seg.nilai] = decodeURIComponent(valReq);
          } catch {
            params[seg.nilai] = valReq;
          }
        }
      }

      if (cocok) {
        if (r.metode === 'SEMUA') {
          metodeDiizinkan.add(metode);
          if (!ruteCocok) {
            ruteCocok = r;
            paramDitemukan = params;
          }
        } else {
          metodeDiizinkan.add(r.metode);
          if (r.metode === metode && !ruteCocok) {
            ruteCocok = r;
            paramDitemukan = params;
          }
        }
      }
    }

    if (ruteCocok) {
      return {
        hasil: {
          rute: {
            metode: ruteCocok.metode,
            pola: ruteCocok.polaAsli,
            penangan: ruteCocok.penangan,
            middleware: ruteCocok.middleware,
          },
          parameter: paramDitemukan,
        },
        metodeDiizinkan: Array.from(metodeDiizinkan),
      };
    }

    return {
      hasil: null,
      metodeDiizinkan: Array.from(metodeDiizinkan),
    };
  }
}
