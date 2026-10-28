/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Kelas Inti Aplikasi Web: Orkestrasi Router, Middleware, Template, Berkas Statis, dan Server Adapter.
 */

import {
  MetodeHTTP,
  PenanganRute,
  MiddlewareWeb,
  OpsiServerWeb,
  PermintaanWeb,
  ResponsWeb,
  FungsiLanjut,
  GalatWeb,
  JenisGalatWeb,
} from './jenis';
import { RouterWeb } from './router';
import { MesinTemplate, OpsiRenderTemplate } from './template';
import { PenanganBerkasStatis, OpsiBerkasStatis } from './statis';
import { ServerWebAdapter } from './server';
import { buatMiddlewareKeamanan } from './middleware/keamanan';
import { buatMiddlewarePencatat } from './middleware/pencatat';
import { buatMiddlewareCORS, OpsiCORS } from './middleware/cors';

export class AplikasiWeb {
  public readonly router: RouterWeb;
  public readonly template: MesinTemplate;
  private readonly middlewareList: MiddlewareWeb[] = [];
  private readonly penanganStatisList: PenanganBerkasStatis[] = [];
  private readonly adapterServer: ServerWebAdapter;
  private opsi: OpsiServerWeb;

  constructor(opsi: OpsiServerWeb = {}) {
    this.opsi = {
      port: 3000,
      host: '127.0.0.1',
      batasUkuranBadanBytes: 1048576, // 1 MB
      batasWaktuMilidetik: 30000,
      aktifkanPencatatAkses: false,
      ...opsi,
    };

    this.router = new RouterWeb();
    this.template = new MesinTemplate();

    // Middleware keamanan default terpasang secara transparan
    this.middlewareList.push(buatMiddlewareKeamanan());

    if (this.opsi.aktifkanPencatatAkses) {
      this.middlewareList.push(buatMiddlewarePencatat());
    }

    if (this.opsi.asalCORS) {
      const opsiCORS: OpsiCORS = {
        asal: this.opsi.asalCORS,
        kredensial: this.opsi.kredensialCORS,
      };
      this.middlewareList.push(buatMiddlewareCORS(opsiCORS));
    }

    if (this.opsi.direktoriStatis) {
      this.berkasStatis(this.opsi.prefixStatis || '/publik', this.opsi.direktoriStatis);
    }

    this.adapterServer = new ServerWebAdapter(this.opsi, (req, res) =>
      this.tanganiPermintaan(req, res)
    );
  }

  public gunakan(middleware: MiddlewareWeb): this {
    this.middlewareList.push(middleware);
    return this;
  }

  public rute(metode: MetodeHTTP | 'SEMUA', pola: string, penangan: PenanganRute): this {
    this.router.daftarkan(metode, pola, penangan);
    return this;
  }

  // Metode Penjaluran Bahasa Indonesia & Standar
  public dapatkan(pola: string, penangan: PenanganRute): this {
    this.router.get(pola, penangan);
    return this;
  }
  public get(pola: string, penangan: PenanganRute): this {
    return this.dapatkan(pola, penangan);
  }

  public kirimkan(pola: string, penangan: PenanganRute): this {
    this.router.post(pola, penangan);
    return this;
  }
  public post(pola: string, penangan: PenanganRute): this {
    return this.kirimkan(pola, penangan);
  }

  public perbarui(pola: string, penangan: PenanganRute): this {
    this.router.put(pola, penangan);
    return this;
  }
  public put(pola: string, penangan: PenanganRute): this {
    return this.perbarui(pola, penangan);
  }

  public tambal(pola: string, penangan: PenanganRute): this {
    this.router.patch(pola, penangan);
    return this;
  }
  public patch(pola: string, penangan: PenanganRute): this {
    return this.tambal(pola, penangan);
  }

  public hapus(pola: string, penangan: PenanganRute): this {
    this.router.delete(pola, penangan);
    return this;
  }
  public delete(pola: string, penangan: PenanganRute): this {
    return this.hapus(pola, penangan);
  }

  public semua(pola: string, penangan: PenanganRute): this {
    this.router.semua(pola, penangan);
    return this;
  }

  public grup(prefix: string, callback: (routerGrup: RouterWeb) => void): this {
    this.router.grup(prefix, callback);
    return this;
  }

  public berkasStatis(prefixUrl: string, direktoriLokal: string, opsi?: Partial<OpsiBerkasStatis>): this {
    const penangan = new PenanganBerkasStatis({
      direktoriRoot: direktoriLokal,
      prefixUrl,
      ...opsi,
    });
    this.penanganStatisList.push(penangan);
    return this;
  }

  public daftarkanTemplate(nama: string, konten: string): this {
    this.template.daftarkan(nama, konten);
    return this;
  }

  public daftarkanLayout(nama: string, konten: string): this {
    this.template.daftarkanLayout(nama, konten);
    return this;
  }

  public daftarkanPartial(nama: string, konten: string): this {
    this.template.daftarkanPartial(nama, konten);
    return this;
  }

  public render(namaAtauKonten: string, data: Record<string, any> = {}, opsi?: OpsiRenderTemplate): string {
    return this.template.render(namaAtauKonten, data, opsi);
  }

  public async mulai(port?: number, host?: string): Promise<{ port: number; host: string }> {
    return this.adapterServer.mulai(port, host);
  }

  public async berhenti(): Promise<void> {
    return this.adapterServer.berhenti();
  }

  public apakahBerjalan(): boolean {
    return this.adapterServer.apakahBerjalan();
  }

  public async uji(opsiReq: {
    metode?: string;
    jalur: string;
    tajuk?: Record<string, string>;
    badan?: any;
  }) {
    return this.adapterServer.eksekusiUji(opsiReq);
  }

  private async tanganiPermintaan(req: PermintaanWeb, res: ResponsWeb): Promise<void> {
    try {
      // 0. Deteksi dini serangan path traversal global pada URL
      if (
        req.urlLengkap.includes('/../') ||
        req.urlLengkap.includes('/..') ||
        req.urlLengkap.includes('%2e%2e') ||
        req.urlLengkap.includes('%2E%2E')
      ) {
        throw new GalatWeb(
          JenisGalatWeb.AKSES_JALUR_ILEGAL,
          403,
          'Percobaan path traversal terdeteksi pada URL.'
        );
      }

      // 1. Eksekusi rantai Middleware Global
      let indeksMiddleware = 0;

      const jalankanBerikutnya: FungsiLanjut = async () => {
        if (res.sudahTerkirim) return;

        if (indeksMiddleware < this.middlewareList.length) {
          const mw = this.middlewareList[indeksMiddleware++];
          await mw(req, res, jalankanBerikutnya);
          return;
        }

        // 2. Cek apakah cocok dengan Berkas Statis
        for (const statis of this.penanganStatisList) {
          const tertangani = statis.tangani(req, res);
          if (tertangani || res.sudahTerkirim) {
            return;
          }
        }

        // 3. Pencocokan Rute Aplikasi
        const { hasil, metodeDiizinkan } = this.router.cocokkan(req.metode, req.jalur);

        if (hasil) {
          // Sematkan parameter rute ke objek permintaan
          (req as any).parameter = hasil.parameter;

          // Eksekusi middleware rute jika ada
          const ruteMiddleware = hasil.rute.middleware || [];
          let idxRuteMw = 0;

          const lanjutRute: FungsiLanjut = async () => {
            if (res.sudahTerkirim) return;
            if (idxRuteMw < ruteMiddleware.length) {
              const mw = ruteMiddleware[idxRuteMw++];
              await mw(req, res, lanjutRute);
            } else {
              await hasil.rute.penangan(req, res);
            }
          };

          await lanjutRute();
          return;
        }

        // 4. Jika jalur cocok dengan rute lain namun metodenya berbeda -> 405 Method Not Allowed
        if (metodeDiizinkan.length > 0) {
          res.tajuk('Allow', metodeDiizinkan.join(', '));
          res.status(405).json(
            {
              sukses: false,
              galat: 'METODE_TIDAK_DIIZINKAN',
              pesan: `Metode '${req.metode}' tidak diizinkan untuk jalur '${req.jalur}'.`,
              metodeDiizinkan,
            },
            405
          );
          return;
        }

        // 5. Rute Tidak Ditemukan -> 404 Not Found
        res.status(404).json(
          {
            sukses: false,
            galat: 'RUTE_TIDAK_DITEMUKAN',
            pesan: `Rute '${req.metode} ${req.jalur}' tidak ditemukan pada server ini.`,
          },
          404
        );
      };

      await jalankanBerikutnya();
    } catch (err: any) {
      if (!res.sudahTerkirim) {
        const status = err instanceof GalatWeb ? err.kodeHTTP : 500;
        res.status(status).json(
          {
            sukses: false,
            galat: err instanceof GalatWeb ? err.jenis : 'SERVER_GAGAL',
            pesan: err.message || 'Terjadi kesalahan internal pada server.',
          },
          status
        );
      }
    }
  }
}
