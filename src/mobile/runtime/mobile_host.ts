/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Peladen Preview Mobile Nyata (Loopback HTTP + WebSocket IPC) & Detektor Toolchain Mobile
 */

import { AplikasiMobile } from '../core/application';
import { KomponenMobile } from '../ui/component';
import { InputTeksMobile } from '../ui/input';
import { SakelarMobile, KotakCentangMobile, TombolRadioMobile } from '../ui/toggle';
import { DropdownMobile } from '../ui/select';
import { NavigatorTumpukanMobile } from '../navigation/stack_navigator';
import { NavigatorTabMobile } from '../navigation/tab_navigator';
import { NavigasiBawahMobile } from '../navigation/bottom_nav';
import { PerenderMobile } from '../ui/mobile_renderer';
import { JembatanMobileNative } from '../bridge/bridge';
import { muatModulNode, apakahNodeRuntime } from '../../gui/platform/node_bridge';

export interface StatusToolchainMobile {
  nodeRuntime: boolean;
  os: string;
  android: {
    androidHome: string | null;
    adb: boolean;
    gradle: boolean;
    javac: boolean;
    keytool: boolean;
    perangkatTerhubung: string[];
    siapKompilasiNative: boolean;
  };
  ios: {
    apakahMacOS: boolean;
    xcodebuild: boolean;
    simctl: boolean;
    siapKompilasiNative: boolean;
  };
}

export class DetektorToolchainMobile {
  private static ujiBin(bin: string, args: string[] = ['--version']): { ada: boolean; stdout: string } {
    const cp = muatModulNode<any>('child_process');
    if (!cp || typeof cp.spawnSync !== 'function') {
      return { ada: false, stdout: '' };
    }
    try {
      const res = cp.spawnSync(bin, args, { timeout: 2500, stdio: 'pipe', encoding: 'utf-8' });
      return {
        ada: !res.error && res.status === 0,
        stdout: String(res.stdout || ''),
      };
    } catch {
      return { ada: false, stdout: '' };
    }
  }

  public static deteksi(): StatusToolchainMobile {
    if (!apakahNodeRuntime()) {
      return {
        nodeRuntime: false,
        os: 'browser',
        android: {
          androidHome: null,
          adb: false,
          gradle: false,
          javac: false,
          keytool: false,
          perangkatTerhubung: [],
          siapKompilasiNative: false,
        },
        ios: {
          apakahMacOS: false,
          xcodebuild: false,
          simctl: false,
          siapKompilasiNative: false,
        },
      };
    }

    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || null;
    const adbProbe = this.ujiBin('adb', ['version']);
    const gradleProbe = this.ujiBin('gradle', ['--version']);
    const javacProbe = this.ujiBin('javac', ['-version']);
    const keytoolProbe = this.ujiBin('keytool', ['-help']);

    let perangkatTerhubung: string[] = [];
    if (adbProbe.ada) {
      const devRes = this.ujiBin('adb', ['devices']);
      if (devRes.ada) {
        perangkatTerhubung = devRes.stdout
          .split('\n')
          .slice(1)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('*'));
      }
    }

    const apakahMacOS = process.platform === 'darwin';
    const xcodebuild = apakahMacOS && this.ujiBin('xcodebuild', ['-version']).ada;
    const simctl = apakahMacOS && this.ujiBin('xcrun', ['simctl', 'help']).ada;

    return {
      nodeRuntime: true,
      os: process.platform,
      android: {
        androidHome,
        adb: adbProbe.ada,
        gradle: gradleProbe.ada,
        javac: javacProbe.ada,
        keytool: keytoolProbe.ada,
        perangkatTerhubung,
        siapKompilasiNative: Boolean(androidHome && javacProbe.ada),
      },
      ios: {
        apakahMacOS,
        xcodebuild,
        simctl,
        siapKompilasiNative: Boolean(apakahMacOS && xcodebuild),
      },
    };
  }
}

export class HostPreviewMobile {
  private readonly perender = new PerenderMobile();
  private httpServer: any = null;
  private wss: any = null;
  private portAktif: number = 0;
  private urlAktif: string = '';

  constructor(private readonly app: AplikasiMobile, private readonly portDiminta: number = 0) {}

  public getUrlAktif(): string {
    return this.urlAktif;
  }

  public getPortAktif(): number {
    return this.portAktif;
  }

  public async mulai(): Promise<string> {
    if (this.httpServer) return this.urlAktif;
    const http = muatModulNode<any>('http');
    if (!http) {
      throw new Error('Modul http Node.js tidak tersedia di lingkungan saat ini.');
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
      const p = (req.url || '/').split('?')[0];
      if (p === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', aplikasi: this.app.konfigurasi.nama, lifecycle: this.app.getStatus() }));
        return;
      }
      if (p === '/api/state') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.perender.bangunPohonUINative(this.app)));
        return;
      }
      const wsUrl = `ws://127.0.0.1:${this.portAktif}/ipc`;
      const html = this.perender.renderKeHTML(this.app, wsUrl);
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
            await this.tanganiPesan(msg, socket);
          } catch (err: any) {
            socket.send(JSON.stringify({ tipe: 'galat', pesan: err?.message || String(err) }));
          }
        });
      });
    }

    return this.urlAktif;
  }

  private cariKomponen(id: string): KomponenMobile | null {
    const cari = (k: KomponenMobile | null | undefined): KomponenMobile | null => {
      if (!k) return null;
      if (k.id === id) return k;
      for (const a of k.anak || []) {
        const found = cari(a);
        if (found) return found;
      }
      return null;
    };
    if (this.app.navigatorUtama) {
      const f = cari(this.app.navigatorUtama);
      if (f) return f;
    }
    for (const k of this.app.dapatkanKomponenAkar()) {
      const f = cari(k);
      if (f) return f;
    }
    return null;
  }

  private async tanganiPesan(msg: any, socket: any): Promise<void> {
    if (msg.tipe === 'bridge_call') {
      const res = await JembatanMobileNative.dapatkanInstance().panggilNative(
        msg.modul,
        msg.metode,
        msg.argumen
      );
      socket.send(JSON.stringify({ tipe: 'bridge_respon', id: msg.id, sukses: true, data: res }));
      return;
    }

    if (msg.jenis === 'nav_kembali' && this.app.navigatorUtama instanceof NavigatorTumpukanMobile) {
      this.app.navigatorUtama.kembali();
      this.siarkanSinkronisasi();
      return;
    }

    if (msg.idKomponen) {
      const target = this.cariKomponen(msg.idKomponen);
      if (target) {
        if (msg.jenis === 'pilih_tab' && (target instanceof NavigatorTabMobile || target instanceof NavigasiBawahMobile)) {
          if (target instanceof NavigatorTabMobile) target.pilihTab(String(msg.kunci));
          else target.pilih(String(msg.kunci));
        } else if (msg.jenis === 'teks_berubah' && target instanceof InputTeksMobile) {
          target.setNilai(String(msg.nilaiTeks ?? ''));
        } else if (msg.jenis === 'nilai_berubah') {
          if (target instanceof SakelarMobile) target.setAktifStatus(Boolean(msg.nilaiLogika));
          else if (target instanceof KotakCentangMobile) target.setCentang(Boolean(msg.nilaiLogika));
          else if (target instanceof TombolRadioMobile) target.setTerpilih(Boolean(msg.nilaiLogika));
        } else if (msg.jenis === 'seleksi_berubah' && target instanceof DropdownMobile) {
          target.setTerpilih(String(msg.nilaiTeks ?? ''));
        } else {
          await target.picu(msg.jenis || 'klik', msg);
        }
      }
    }

    this.siarkanSinkronisasi();
  }

  public siarkanSinkronisasi(): void {
    if (!this.wss) return;
    const payload = JSON.stringify({
      tipe: 'sinkronisasi',
      html: this.perender.renderKontenUtamaHTML(this.app),
      state: this.app.konteks.state.toJSON(),
    });
    for (const klien of this.wss.clients) {
      if (klien.readyState === 1) {
        klien.send(payload);
      }
    }
  }

  public async hentikan(): Promise<void> {
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
  }
}
