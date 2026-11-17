/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Peladen Host Desktop WebView Nyata (Loopback HTTP + WebSocket IPC Server)
 */

import { AdaptorPlatformGUI, TipePlatformGUI } from './adapter';
import { KonfigurasiAplikasiGUI } from '../types';
import { JendelaGUI } from '../core/window';
import { PerenderDesktop } from '../render/renderer';
import { PengelolaInputGUI } from '../events/input_router';
import { JembatanDesktopWebview } from './bridge';
import { pengelolaTemaGlobal } from '../styling/theme';
import { muatModulNode } from './node_bridge';

export class AdaptorDesktopWebviewServer implements AdaptorPlatformGUI {
  public readonly jembatan = new JembatanDesktopWebview();
  private readonly perender = new PerenderDesktop();
  private readonly jendelaMap: Map<string, JendelaGUI> = new Map();
  private readonly inputMap: Map<string, PengelolaInputGUI> = new Map();
  private httpServer: any = null;
  private wss: any = null;
  private portAktif: number = 0;
  private urlAktif: string = '';

  constructor(private readonly portDiminta: number = 0) {}

  public dapatkanNamaPlatform(): TipePlatformGUI {
    if (typeof process !== 'undefined') {
      if (process.platform === 'linux') return 'linux';
      if (process.platform === 'win32') return 'windows';
      if (process.platform === 'darwin') return 'macos';
    }
    return 'headless';
  }

  public getUrlAktif(): string {
    return this.urlAktif;
  }

  public getPortAktif(): number {
    return this.portAktif;
  }

  public async inisialisasi(_konfig: KonfigurasiAplikasiGUI): Promise<void> {
    if (this.httpServer) return;
    const http = muatModulNode<any>('http');
    if (!http) {
      throw new Error('Modul Node.js http tidak tersedia pada lingkungan saat ini.');
    }

    let wsMod = muatModulNode<any>('ws');
    if (!wsMod) {
      try {
        const dynImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
        wsMod = await dynImport('ws');
      } catch {
        wsMod = null;
      }
    }

    this.httpServer = http.createServer((req: any, res: any) => {
      const reqPath = (req.url || '/').split('?')[0];
      const securityHeaders: Record<string, string> = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': `default-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:${this.portAktif} ws://localhost:${this.portAktif}; img-src 'self' data:;`,
      };

      if (reqPath === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json', ...securityHeaders });
        res.end(JSON.stringify({ status: 'ok', jendela: Array.from(this.jendelaMap.keys()) }));
        return;
      }

      const targetId = reqPath.startsWith('/jendela/') ? reqPath.replace('/jendela/', '') : '';
      const jendela =
        (targetId ? this.jendelaMap.get(targetId) : undefined) ||
        Array.from(this.jendelaMap.values())[0];

      if (!jendela) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders });
        res.end('Belum ada jendela GUI terdaftar.');
        return;
      }

      const wsUrl = `ws://127.0.0.1:${this.portAktif}/ipc`;
      const html = this.perender.renderKeHTML(jendela, wsUrl, {
        skemaWarna: pengelolaTemaGlobal.dapatkanSkema(),
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders });
      res.end(html);
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer.once('error', reject);
      this.httpServer.listen(this.portDiminta, '127.0.0.1', () => {
        const addr = this.httpServer.address();
        this.portAktif = typeof addr === 'object' && addr ? addr.port : this.portDiminta;
        this.urlAktif = `http://127.0.0.1:${this.portAktif}`;
        resolve();
      });
    });

    const WssCtor = wsMod?.WebSocketServer || wsMod?.default?.WebSocketServer;
    if (WssCtor) {
      this.wss = new WssCtor({
        server: this.httpServer,
        path: '/ipc',
        maxPayload: 256 * 1024,
        verifyClient: (info: any) => {
          const origin = info?.origin || info?.req?.headers?.origin;
          if (!origin) return true; // Non-browser native/Node client
          return (
            origin === `http://127.0.0.1:${this.portAktif}` ||
            origin === `http://localhost:${this.portAktif}`
          );
        },
      });
      this.wss.on('connection', (socket: any) => {
        socket.on('message', async (raw: any) => {
          try {
            const msg = JSON.parse(String(raw));
            if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
              throw new Error('Format muatan IPC harus berupa objek JSON.');
            }
            await this.tanganiPesanKlien(msg);
          } catch (err) {
            this.jembatan.siarkan('desktop:error', { galat: String(err) });
          }
        });
      });
    }
  }

  private async tanganiPesanKlien(msg: any): Promise<void> {
    const jenisRaw = typeof msg.jenis === 'string' ? msg.jenis : 'umum';
    if (jenisRaw === '__proto__' || jenisRaw === 'constructor' || jenisRaw === 'prototype') return;

    this.jembatan.siarkan(`ipc:${jenisRaw}`, msg);
    const idWidget = typeof msg.idWidget === 'string' ? msg.idWidget : undefined;
    if (!idWidget) return;

    for (const jendela of this.jendelaMap.values()) {
      const target = this.cariWidgetRekursif(jendela.kontenUtama, idWidget);
      if (target) {
        if (jenisRaw === 'teks_berubah' && typeof (target as any).setNilai === 'function') {
          (target as any).setNilai(String(msg.nilaiTeks ?? ''));
        } else if (jenisRaw === 'nilai_berubah' && typeof (target as any).setNilai === 'function' && msg.nilaiAngka !== undefined) {
          (target as any).setNilai(Number(msg.nilaiAngka));
        } else if (jenisRaw === 'seleksi_berubah') {
          if (typeof (target as any).pilih === 'function' && msg.nilaiTeks !== undefined) {
            (target as any).pilih(String(msg.nilaiTeks));
          } else if (typeof (target as any).pilihTab === 'function' && msg.nilaiAngka !== undefined) {
            (target as any).pilihTab(Number(msg.nilaiAngka));
          } else if (typeof (target as any).pilihBaris === 'function' && msg.nilaiAngka !== undefined) {
            (target as any).pilihBaris(Number(msg.nilaiAngka));
          } else {
            await target.picu(jenisRaw, msg);
          }
        } else if (jenisRaw === 'klik' && typeof (target as any).toggle === 'function') {
          (target as any).toggle();
          await target.picu('klik');
        } else if (jenisRaw === 'klik' && typeof (target as any).pilih === 'function' && target.jenis === 'tombol_radio') {
          (target as any).pilih();
          await target.picu('klik');
        } else {
          await target.picu(jenisRaw, msg);
        }
        await this.perbaruiTampilan(jendela);
        break;
      }
    }
  }

  private cariWidgetRekursif(akar: any, id: string): any {
    if (!akar) return null;
    if (akar.id === id) return akar;
    for (const anak of akar.anak || []) {
      const ketemu = this.cariWidgetRekursif(anak, id);
      if (ketemu) return ketemu;
    }
    return null;
  }

  public async bukaJendela(jendela: JendelaGUI): Promise<void> {
    this.jendelaMap.set(jendela.id, jendela);
    this.inputMap.set(jendela.id, new PengelolaInputGUI(jendela));
    jendela.tampilkan();
  }

  public async tutupJendela(id: string): Promise<void> {
    this.jendelaMap.delete(id);
    this.inputMap.delete(id);
  }

  public async perbaruiTampilan(jendela: JendelaGUI): Promise<void> {
    if (!this.wss) return;
    const skema = pengelolaTemaGlobal.dapatkanSkema();
    const html = jendela.kontenUtama ? this.perender.renderWidgetKeHTML(jendela.kontenUtama, skema) : '';
    const payload = JSON.stringify({ tipe: 'sinkronisasi', idJendela: jendela.id, html });
    for (const klien of this.wss.clients) {
      if (klien.readyState === 1) {
        klien.send(payload);
      }
    }
  }

  public getInputRouter(idJendela: string): PengelolaInputGUI | undefined {
    return this.inputMap.get(idJendela);
  }

  public async hancurkan(): Promise<void> {
    if (this.wss) {
      for (const klien of this.wss.clients) {
        try {
          klien.close();
        } catch {
          // ignore
        }
      }
      this.wss.close();
      this.wss = null;
    }
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => resolve());
      });
      this.httpServer = null;
    }
    this.jendelaMap.clear();
    this.inputMap.clear();
    this.jembatan.bersihkan();
  }
}
