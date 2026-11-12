/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 38
 * Pemeriksa Perangkat Keras Host & ADB Nyata (Real OS & ADB Hardware Probe)
 */

import { muatModulNode, apakahNodeRuntime } from '../../../gui/platform/node_bridge';

export interface InfoBateraiHost {
  terdeteksi: boolean;
  level: number | null;
  sedangMengisi: boolean | null;
  statusTeks: string;
  sumber: 'SYSFS_LINUX' | 'ADB_DUMPSYS' | 'TIDAK_TERSEDIA';
  jalurSysfs?: string;
}

export interface InfoJaringanHost {
  terhubung: boolean;
  antarmukaAktif: string[];
  tipeDominan: 'wifi' | 'ethernet' | 'seluler' | 'loopback' | 'offline';
  ipLokal: string | null;
  sumber: 'OS_NETWORK_INTERFACES' | 'TIDAK_TERSEDIA';
}

export interface PerangkatADBTerhubung {
  serial: string;
  status: string;
  model?: string;
  levelAPI?: number;
}

export interface HasilProbeHardwareHost {
  nodeRuntime: boolean;
  hostOS: string;
  arsitektur: string;
  namaHost: string;
  rilisOS: string;
  memoriTotalMB: number;
  memoriBebasMB: number;
  uptimeDetik: number;
  baterai: InfoBateraiHost;
  jaringan: InfoJaringanHost;
  kameraV4L2: string[];
  bluetoothHCI: string[];
  adbTersedia: boolean;
  perangkatADB: PerangkatADBTerhubung[];
  stempelWaktu: number;
}

export class PemeriksaHardwareHost {
  private static deteksiBateraiSysfs(): InfoBateraiHost {
    const fs = muatModulNode<any>('fs');
    const path = muatModulNode<any>('path');
    if (!fs || !path || process.platform !== 'linux') {
      return {
        terdeteksi: false,
        level: null,
        sedangMengisi: null,
        statusTeks: 'Unavailable',
        sumber: 'TIDAK_TERSEDIA',
      };
    }

    const dasar = '/sys/class/power_supply';
    try {
      if (!fs.existsSync(dasar)) {
        return { terdeteksi: false, level: null, sedangMengisi: null, statusTeks: 'NoPowerSupply', sumber: 'TIDAK_TERSEDIA' };
      }
      const entries: string[] = fs.readdirSync(dasar);
      const batEntry = entries.find((e) => /^BAT\d*$/i.test(e));
      if (!batEntry) {
        return { terdeteksi: false, level: null, sedangMengisi: null, statusTeks: 'NoBatteryNode', sumber: 'TIDAK_TERSEDIA' };
      }

      const batDir = path.join(dasar, batEntry);
      const capFile = path.join(batDir, 'capacity');
      const statusFile = path.join(batDir, 'status');
      const level = fs.existsSync(capFile) ? parseInt(String(fs.readFileSync(capFile, 'utf-8')).trim(), 10) : NaN;
      const statusTeks = fs.existsSync(statusFile) ? String(fs.readFileSync(statusFile, 'utf-8')).trim() : 'Unknown';

      if (!Number.isFinite(level)) {
        return { terdeteksi: false, level: null, sedangMengisi: null, statusTeks, sumber: 'TIDAK_TERSEDIA' };
      }

      return {
        terdeteksi: true,
        level,
        sedangMengisi: /charging|full/i.test(statusTeks),
        statusTeks,
        sumber: 'SYSFS_LINUX',
        jalurSysfs: batDir,
      };
    } catch {
      return { terdeteksi: false, level: null, sedangMengisi: null, statusTeks: 'ReadError', sumber: 'TIDAK_TERSEDIA' };
    }
  }

  private static deteksiJaringanOS(): InfoJaringanHost {
    const os = muatModulNode<any>('os');
    if (!os || typeof os.networkInterfaces !== 'function') {
      return {
        terhubung: false,
        antarmukaAktif: [],
        tipeDominan: 'offline',
        ipLokal: null,
        sumber: 'TIDAK_TERSEDIA',
      };
    }

    try {
      const nics = os.networkInterfaces() || {};
      const antarmukaAktif: string[] = [];
      let ipEksternal: string | null = null;
      let tipe: 'wifi' | 'ethernet' | 'seluler' | 'loopback' | 'offline' = 'offline';

      for (const [nama, list] of Object.entries<any[]>(nics)) {
        if (!Array.isArray(list)) continue;
        const ipv4 = list.find((item) => item && item.family === 'IPv4');
        if (!ipv4) continue;
        antarmukaAktif.push(nama);
        if (!ipv4.internal && !ipEksternal) {
          ipEksternal = ipv4.address;
          if (/^(wl|wlan|wi-?fi)/i.test(nama)) {
            tipe = 'wifi';
          } else if (/^(rmnet|ccmni|wwan|cell)/i.test(nama)) {
            tipe = 'seluler';
          } else {
            tipe = 'ethernet';
          }
        }
      }

      if (!ipEksternal && antarmukaAktif.length > 0) {
        tipe = 'loopback';
        ipEksternal = '127.0.0.1';
      }

      return {
        terhubung: antarmukaAktif.length > 0,
        antarmukaAktif,
        tipeDominan: tipe,
        ipLokal: ipEksternal,
        sumber: 'OS_NETWORK_INTERFACES',
      };
    } catch {
      return {
        terhubung: false,
        antarmukaAktif: [],
        tipeDominan: 'offline',
        ipLokal: null,
        sumber: 'TIDAK_TERSEDIA',
      };
    }
  }

  private static deteksiPerangkatLinux(): { kameraV4L2: string[]; bluetoothHCI: string[] } {
    const fs = muatModulNode<any>('fs');
    const kameraV4L2: string[] = [];
    const bluetoothHCI: string[] = [];
    if (!fs || process.platform !== 'linux') {
      return { kameraV4L2, bluetoothHCI };
    }

    try {
      if (fs.existsSync('/dev')) {
        const devs: string[] = fs.readdirSync('/dev');
        for (const d of devs) {
          if (/^video\d+$/.test(d)) {
            kameraV4L2.push(`/dev/${d}`);
          }
        }
      }
    } catch {
      // Abaikan bila akses /dev dibatasi
    }

    try {
      if (fs.existsSync('/sys/class/bluetooth')) {
        const hcis: string[] = fs.readdirSync('/sys/class/bluetooth');
        for (const h of hcis) {
          if (/^hci\d+$/.test(h)) {
            bluetoothHCI.push(h);
          }
        }
      }
    } catch {
      // Abaikan bila sysfs bluetooth tidak tersedia
    }

    return { kameraV4L2, bluetoothHCI };
  }

  private static jalankanPerintah(bin: string, args: string[]): { ok: boolean; stdout: string } {
    const cp = muatModulNode<any>('child_process');
    if (!cp || typeof cp.spawnSync !== 'function') {
      return { ok: false, stdout: '' };
    }
    try {
      const res = cp.spawnSync(bin, args, { timeout: 2000, stdio: 'pipe', encoding: 'utf-8' });
      return {
        ok: !res.error && res.status === 0,
        stdout: String(res.stdout || ''),
      };
    } catch {
      return { ok: false, stdout: '' };
    }
  }

  private static deteksiPerangkatADB(): { adbTersedia: boolean; perangkatADB: PerangkatADBTerhubung[] } {
    const cek = this.jalankanPerintah('adb', ['devices']);
    if (!cek.ok) {
      return { adbTersedia: false, perangkatADB: [] };
    }

    const baris = cek.stdout
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('*'));

    const perangkatADB: PerangkatADBTerhubung[] = [];
    for (const b of baris) {
      const bagian = b.split(/\s+/);
      const serial = bagian[0];
      const status = bagian[1] || 'unknown';
      const entry: PerangkatADBTerhubung = { serial, status };
      if (status === 'device') {
        const modelRes = this.jalankanPerintah('adb', ['-s', serial, 'shell', 'getprop', 'ro.product.model']);
        if (modelRes.ok && modelRes.stdout.trim()) {
          entry.model = modelRes.stdout.trim();
        }
        const sdkRes = this.jalankanPerintah('adb', ['-s', serial, 'shell', 'getprop', 'ro.build.version.sdk']);
        if (sdkRes.ok && sdkRes.stdout.trim()) {
          const parsed = parseInt(sdkRes.stdout.trim(), 10);
          if (Number.isFinite(parsed)) entry.levelAPI = parsed;
        }
      }
      perangkatADB.push(entry);
    }

    return { adbTersedia: true, perangkatADB };
  }

  public static ambilBateraiADB(serial: string): InfoBateraiHost | null {
    const res = this.jalankanPerintah('adb', ['-s', serial, 'shell', 'dumpsys', 'battery']);
    if (!res.ok) return null;
    const matchLevel = res.stdout.match(/level:\s*(\d+)/i);
    const matchStatus = res.stdout.match(/status:\s*(\d+)/i);
    if (!matchLevel) return null;
    const level = parseInt(matchLevel[1], 10);
    const code = matchStatus ? parseInt(matchStatus[1], 10) : 0;
    const sedangMengisi = code === 2 || code === 5;
    return {
      terdeteksi: true,
      level,
      sedangMengisi,
      statusTeks: sedangMengisi ? 'Charging/Full' : 'Discharging',
      sumber: 'ADB_DUMPSYS',
    };
  }

  public static periksaHost(): HasilProbeHardwareHost {
    if (!apakahNodeRuntime()) {
      return {
        nodeRuntime: false,
        hostOS: 'browser',
        arsitektur: 'wasm32',
        namaHost: 'browser-sandbox',
        rilisOS: 'web',
        memoriTotalMB: 0,
        memoriBebasMB: 0,
        uptimeDetik: 0,
        baterai: { terdeteksi: false, level: null, sedangMengisi: null, statusTeks: 'Browser', sumber: 'TIDAK_TERSEDIA' },
        jaringan: { terhubung: true, antarmukaAktif: [], tipeDominan: 'wifi', ipLokal: null, sumber: 'TIDAK_TERSEDIA' },
        kameraV4L2: [],
        bluetoothHCI: [],
        adbTersedia: false,
        perangkatADB: [],
        stempelWaktu: Date.now(),
      };
    }

    const os = muatModulNode<any>('os');
    const bateraiSysfs = this.deteksiBateraiSysfs();
    const jaringan = this.deteksiJaringanOS();
    const { kameraV4L2, bluetoothHCI } = this.deteksiPerangkatLinux();
    const { adbTersedia, perangkatADB } = this.deteksiPerangkatADB();

    let baterai = bateraiSysfs;
    const aktifADB = perangkatADB.find((p) => p.status === 'device');
    if (aktifADB) {
      const batADB = this.ambilBateraiADB(aktifADB.serial);
      if (batADB) baterai = batADB;
    }

    return {
      nodeRuntime: true,
      hostOS: process.platform,
      arsitektur: process.arch,
      namaHost: os ? os.hostname() : 'localhost',
      rilisOS: os ? os.release() : 'unknown',
      memoriTotalMB: os ? Math.round(os.totalmem() / (1024 * 1024)) : 0,
      memoriBebasMB: os ? Math.round(os.freemem() / (1024 * 1024)) : 0,
      uptimeDetik: os ? Math.round(os.uptime()) : 0,
      baterai,
      jaringan,
      kameraV4L2,
      bluetoothHCI,
      adbTersedia,
      perangkatADB,
      stempelWaktu: Date.now(),
    };
  }
}
