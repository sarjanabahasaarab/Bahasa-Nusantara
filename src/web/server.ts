/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Server HTTP Adapter: Implementasi Server HTTP berbasis node:http
 * dengan parsing body aman, pembatasan ukuran payload (Anti-DoS),
 * pengelolaan timeout, dan pembersihan sumber daya saat berhenti.
 */

import * as http from 'node:http';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  MetodeHTTP,
  PermintaanWeb,
  ResponsWeb,
  OpsiKuki,
  OpsiServerWeb,
  GalatWeb,
  JenisGalatWeb,
} from './jenis';
import { dapatkanTipeMIME } from './statis';

export class PermintaanWebImpl implements PermintaanWeb {
  public readonly id: string;
  public readonly metode: MetodeHTTP;
  public readonly jalur: string;
  public readonly urlLengkap: string;
  public readonly kueri: Record<string, string> = {};
  public parameter: Record<string, string> = {};
  public readonly tajuk: Record<string, string> = {};
  public readonly tipeKonten?: string;
  public badan: any = null;
  public badanMentah?: string;
  public readonly kuki: Record<string, string> = {};
  public readonly ipKlien: string;

  constructor(
    metode: string,
    urlMentah: string,
    tajukMentah: http.IncomingHttpHeaders,
    ipMentah: string,
    kepercayaanProxy: boolean = false
  ) {
    this.id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    this.metode = (metode.toUpperCase() as MetodeHTTP) || 'GET';
    this.urlLengkap = urlMentah;

    // Parsing URL dan Kueri
    try {
      const parsed = new URL(urlMentah, 'http://localhost');
      this.jalur = parsed.pathname;
      parsed.searchParams.forEach((val, key) => {
        this.kueri[key] = val;
      });
    } catch {
      this.jalur = urlMentah.split('?')[0] || '/';
    }

    // Normalisasi Header (lowercase)
    for (const [k, v] of Object.entries(tajukMentah)) {
      if (v !== undefined) {
        this.tajuk[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
      }
    }
    this.tipeKonten = this.tajuk['content-type'];

    // Parsing Kuki
    const kukiHeader = this.tajuk['cookie'];
    if (kukiHeader) {
      const parts = kukiHeader.split(';');
      for (const p of parts) {
        const [k, ...vParts] = p.trim().split('=');
        if (k) {
          this.kuki[k] = decodeURIComponent(vParts.join('='));
        }
      }
    }

    // Evaluasi IP Klien Aman
    if (kepercayaanProxy && this.tajuk['x-forwarded-for']) {
      const forwardedIps = this.tajuk['x-forwarded-for'].split(',');
      this.ipKlien = forwardedIps[0].trim();
    } else {
      this.ipKlien = ipMentah || '127.0.0.1';
    }
  }

  public ambilKueri(kunci: string, bawaan?: string): string | undefined {
    return this.kueri[kunci] ?? bawaan;
  }

  public ambilParam(kunci: string, bawaan?: string): string | undefined {
    return this.parameter[kunci] ?? bawaan;
  }

  public ambilTajuk(kunci: string, bawaan?: string): string | undefined {
    return this.tajuk[kunci.toLowerCase()] ?? bawaan;
  }

  public ambilKuki(kunci: string, bawaan?: string): string | undefined {
    return this.kuki[kunci] ?? bawaan;
  }

  public badanJSON<T = Record<string, any>>(): T | null {
    if (this.badan && typeof this.badan === 'object') {
      return this.badan as T;
    }
    if (this.badanMentah) {
      try {
        return JSON.parse(this.badanMentah) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export class ResponsWebImpl implements ResponsWeb {
  private _sudahTerkirim: boolean = false;
  private _kodeStatus: number = 200;
  private _tajuk: Record<string, string | string[]> = {};
  private _daftarKuki: string[] = [];

  constructor(private readonly resAsli?: http.ServerResponse) {}

  public get sudahTerkirim(): boolean {
    return this._sudahTerkirim;
  }

  public get kodeStatus(): number {
    return this._kodeStatus;
  }

  public get seluruhTajuk(): Record<string, string | string[]> {
    return { ...this._tajuk };
  }

  public status(kode: number): this {
    if (this._sudahTerkirim) return this;
    this._kodeStatus = kode;
    return this;
  }

  public tajuk(kunci: string, nilai: string | string[]): this {
    if (this._sudahTerkirim) return this;
    this._tajuk[kunci] = nilai;
    return this;
  }

  public tipe(tipeMime: string): this {
    return this.tajuk('Content-Type', tipeMime);
  }

  public kuki(nama: string, nilai: string, opsi: OpsiKuki = {}): this {
    if (this._sudahTerkirim) return this;
    let kukiStr = `${encodeURIComponent(nama)}=${encodeURIComponent(nilai)}`;
    if (opsi.path) kukiStr += `; Path=${opsi.path}`;
    else kukiStr += '; Path=/';
    if (opsi.domain) kukiStr += `; Domain=${opsi.domain}`;
    if (opsi.maxAge !== undefined) kukiStr += `; Max-Age=${opsi.maxAge}`;
    if (opsi.expires) kukiStr += `; Expires=${opsi.expires.toUTCString()}`;
    if (opsi.httpOnly) kukiStr += '; HttpOnly';
    if (opsi.secure) kukiStr += '; Secure';
    if (opsi.sameSite) kukiStr += `; SameSite=${opsi.sameSite}`;

    this._daftarKuki.push(kukiStr);
    this._tajuk['Set-Cookie'] = [...this._daftarKuki];
    return this;
  }

  public hapusKuki(nama: string, opsi: OpsiKuki = {}): this {
    return this.kuki(nama, '', { ...opsi, maxAge: 0, expires: new Date(0) });
  }

  private kirimMentah(isi: string | Buffer, tipeMime?: string): void {
    if (this._sudahTerkirim) return;
    this._sudahTerkirim = true;

    if (tipeMime && !this._tajuk['Content-Type']) {
      this._tajuk['Content-Type'] = tipeMime;
    }

    if (this.resAsli) {
      this.resAsli.statusCode = this._kodeStatus;
      for (const [k, v] of Object.entries(this._tajuk)) {
        this.resAsli.setHeader(k, v);
      }
      this.resAsli.end(isi);
    }
  }

  public teks(konten: string, status?: number): void {
    if (status !== undefined) this.status(status);
    this.kirimMentah(konten, 'text/plain; charset=utf-8');
  }

  public html(kontenHTML: string, status?: number): void {
    if (status !== undefined) this.status(status);
    this.kirimMentah(kontenHTML, 'text/html; charset=utf-8');
  }

  public json(data: any, status?: number): void {
    if (status !== undefined) this.status(status);
    const serialized = JSON.stringify(data ?? null);
    this.kirimMentah(serialized, 'application/json; charset=utf-8');
  }

  public alihkan(tujuanURL: string, status: number = 302): void {
    this.status(status);
    this.tajuk('Location', tujuanURL);
    this.kirimMentah('', 'text/plain; charset=utf-8');
  }

  public berkas(jalurBerkas: string, opsi: { batasAman?: string } = {}): void {
    const jalurSelesai = path.resolve(jalurBerkas);
    if (opsi.batasAman) {
      const root = path.resolve(opsi.batasAman);
      const relatif = path.relative(root, jalurSelesai);
      if (relatif.startsWith('..') || path.isAbsolute(relatif)) {
        throw new GalatWeb(
          JenisGalatWeb.AKSES_JALUR_ILEGAL,
          403,
          'Akses berkas di luar direktori aman ditolak.'
        );
      }
    }

    if (!fs.existsSync(jalurSelesai)) {
      this.status(404).teks('Berkas tidak ditemukan.', 404);
      return;
    }

    const mime = dapatkanTipeMIME(jalurSelesai);
    const buffer = fs.readFileSync(jalurSelesai);
    this.kirimMentah(buffer, mime);
  }

  public kirimStatus(kode: number): void {
    this.status(kode);
    this.kirimMentah('', 'text/plain; charset=utf-8');
  }
}

export type HandlerPermintaanUtama = (
  req: PermintaanWeb,
  res: ResponsWeb
) => Promise<void> | void;

export class ServerWebAdapter {
  private serverNode: http.Server | null = null;
  private koneksiAktif: Set<any> = new Set();
  private sedangBerjalan: boolean = false;

  constructor(
    private readonly opsi: OpsiServerWeb,
    private readonly handlerUtama: HandlerPermintaanUtama
  ) {}

  public apakahBerjalan(): boolean {
    return this.sedangBerjalan;
  }

  public async mulai(
    portOverride?: number,
    hostOverride?: string
  ): Promise<{ port: number; host: string }> {
    if (this.sedangBerjalan) {
      throw new GalatWeb(
        JenisGalatWeb.SERVER_GAGAL,
        500,
        'Server HTTP NUSANTARA sudah dalam kondisi berjalan.'
      );
    }

    const port = portOverride ?? this.opsi.port ?? 3000;
    const host = hostOverride ?? this.opsi.host ?? '127.0.0.1'; // Aman: default localhost
    const batasBadan = this.opsi.batasUkuranBadanBytes ?? 1048576; // 1 MB
    const batasWaktu = this.opsi.batasWaktuMilidetik ?? 30000;

    return new Promise((resolve, reject) => {
      this.serverNode = http.createServer((nodeReq, nodeRes) => {
        nodeReq.setTimeout(batasWaktu, () => {
          if (!nodeRes.headersSent) {
            nodeRes.statusCode = 408;
            nodeRes.end('Batas waktu permintaan terlampaui (Request Timeout).');
          }
          nodeReq.destroy();
        });

        const req = new PermintaanWebImpl(
          nodeReq.method || 'GET',
          nodeReq.url || '/',
          nodeReq.headers,
          nodeReq.socket.remoteAddress || '127.0.0.1',
          this.opsi.kepercayaanProxy ?? false
        );
        const res = new ResponsWebImpl(nodeRes);

        // Baca Request Body secara streaming dengan batas ukuran (Anti-DoS)
        let totalByte = 0;
        const chunks: Buffer[] = [];
        let ukuranTerlampaui = false;

        nodeReq.on('data', chunk => {
          if (ukuranTerlampaui) return;
          totalByte += chunk.length;
          if (totalByte > batasBadan) {
            ukuranTerlampaui = true;
            nodeReq.pause();
            res.status(413).json(
              {
                sukses: false,
                galat: 'BADAN_TERLALU_BESAR',
                pesan: `Ukuran payload melebihi batas yang diizinkan (${batasBadan} byte).`,
              },
              413
            );
            nodeReq.destroy();
            return;
          }
          chunks.push(chunk);
        });

        nodeReq.on('end', async () => {
          if (ukuranTerlampaui) return;

          const bufferLengkap = Buffer.concat(chunks);
          req.badanMentah = bufferLengkap.toString('utf-8');

          // Parsing JSON jika Content-Type adalah application/json
          if (req.tipeKonten && req.tipeKonten.includes('application/json') && req.badanMentah.trim()) {
            try {
              req.badan = JSON.parse(req.badanMentah);
            } catch (err) {
              res.status(400).json(
                {
                  sukses: false,
                  galat: 'SINTAKS_BADAN_TIDAK_VALID',
                  pesan: 'Format JSON pada body permintaan tidak valid.',
                },
                400
              );
              return;
            }
          } else {
            req.badan = req.badanMentah;
          }

          try {
            await this.handlerUtama(req, res);
            if (!res.sudahTerkirim && !nodeRes.headersSent) {
              res.status(404).json(
                {
                  sukses: false,
                  galat: 'RUTE_TIDAK_DITEMUKAN',
                  pesan: `Jalur '${req.jalur}' tidak ditemukan.`,
                },
                404
              );
            }
          } catch (err: any) {
            if (!res.sudahTerkirim && !nodeRes.headersSent) {
              const statusGalat = err instanceof GalatWeb ? err.kodeHTTP : 500;
              res.status(statusGalat).json(
                {
                  sukses: false,
                  galat: err instanceof GalatWeb ? err.jenis : 'KESALAHAN_INTERNAL',
                  pesan: err.message || 'Terjadi kesalahan pada server internal.',
                },
                statusGalat
              );
            }
          }
        });
      });

      // Lacak soket aktif untuk pembersihan bersih (Graceful Shutdown)
      this.serverNode.on('connection', socket => {
        this.koneksiAktif.add(socket);
        socket.on('close', () => {
          this.koneksiAktif.delete(socket);
        });
      });

      this.serverNode.once('error', err => {
        this.sedangBerjalan = false;
        reject(err);
      });

      this.serverNode.listen(port, host, () => {
        this.sedangBerjalan = true;
        const addr = this.serverNode!.address() as any;
        const portAktual = addr && typeof addr === 'object' ? addr.port : port;
        resolve({ port: portAktual, host });
      });
    });
  }

  public async berhenti(): Promise<void> {
    if (!this.serverNode || !this.sedangBerjalan) {
      return;
    }

    return new Promise(resolve => {
      // Hancurkan semua koneksi soket aktif yang masih terbuka
      for (const socket of this.koneksiAktif) {
        socket.destroy();
      }
      this.koneksiAktif.clear();

      this.serverNode!.close(() => {
        this.sedangBerjalan = false;
        this.serverNode = null;
        resolve();
      });
    });
  }

  /**
   * Eksekusi langsung in-memory untuk pengujian cepat tanpa mengikat soket jaringan.
   */
  public async eksekusiUji(
    opsiReq: {
      metode?: string;
      jalur: string;
      tajuk?: Record<string, string>;
      badan?: any;
    }
  ): Promise<{
    status: number;
    tajuk: Record<string, string | string[]>;
    badan: string;
    json: () => any;
  }> {
    const metode = (opsiReq.metode?.toUpperCase() as MetodeHTTP) || 'GET';
    const tajuk = { ...(opsiReq.tajuk || {}) };
    let badanMentah = '';
    let badanObj: any = null;

    if (opsiReq.badan !== undefined && opsiReq.badan !== null) {
      if (typeof opsiReq.badan === 'object') {
        badanMentah = JSON.stringify(opsiReq.badan);
        badanObj = opsiReq.badan;
        if (!tajuk['content-type'] && !tajuk['Content-Type']) {
          tajuk['content-type'] = 'application/json';
        }
      } else {
        badanMentah = String(opsiReq.badan);
        badanObj = badanMentah;
      }
    }

    const req = new PermintaanWebImpl(metode, opsiReq.jalur, tajuk, '127.0.0.1', false);
    req.badanMentah = badanMentah;
    req.badan = badanObj;

    let responsBuffer = '';
    const res = new ResponsWebImpl({
      setHeader: (k: string, v: any) => {},
      end: (data?: any) => {
        if (data) responsBuffer = data.toString('utf-8');
      },
    } as any);

    await this.handlerUtama(req, res);

    return {
      status: res.kodeStatus,
      tajuk: res.seluruhTajuk,
      badan: responsBuffer,
      json: () => (responsBuffer ? JSON.parse(responsBuffer) : null),
    };
  }
}
