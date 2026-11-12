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
      if (reqPath === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', jendela: Array.from(this.jendelaMap.keys()) }));
        return;
      }

      const targetId = reqPath.startsWith('/jendela/') ? reqPath.replace('/jendela/', '') : '';
      const jendela =
        (targetId ? this.jendelaMap.get(targetId) : undefined) ||
        Array.from(this.jendelaMap.values())[0];

      if (!jendela) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Belum ada jendela GUI terdaftar.');
        return;
      }

      const wsUrl = `ws://127.0.0.1:${this.portAktif}/ipc`;
      const html = this.perender.renderKeHTML(jendela, wsUrl, {
        skemaWarna: pengelolaTemaGlobal.dapatkanSkema(),
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
      this.wss = new WssCtor({ server: this.httpServer, path: '/ipc' });
      this.wss.on('connection', (socket: any) => {
        socket.on('message', async (raw: any) => {
          try {
            const msg = JSON.parse(String(raw));
            await this.tanganiPesanKlien(msg);
          } catch (err) {
            this.jembatan.siarkan('desktop:error', { galat: String(err) });
          }
        });
      });
    }
  }

  private async tanganiPesanKlien(msg: any): Promise<void> {
    this.jembatan.siarkan(`ipc:${msg.jenis || 'umum'}`, msg);
    const idWidget = msg.idWidget as string | undefined;
    if (!idWidget) return;

    for (const jendela of this.jendelaMap.values()) {
      const target = this.cariWidgetRekursif(jendela.kontenUtama, idWidget);
      if (target) {
        if (msg.jenis === 'teks_berubah' && typeof (target as any).setNilai === 'function') {
          (target as any).setNilai(String(msg.nilaiTeks ?? ''));
        } else if (msg.jenis === 'klik' && typeof (target as any).toggle === 'function') {
          (target as any).toggle();
          await target.picu('klik');
        } else {
          await target.picu(msg.jenis || 'klik', msg);
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
