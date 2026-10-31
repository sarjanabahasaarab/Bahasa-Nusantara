/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Adaptor Headless GUI untuk Pengujian dan Lingkungan Tanpa Display
 */

import { AdaptorPlatformGUI, TipePlatformGUI } from './adapter';
import { KonfigurasiAplikasiGUI } from '../types';
import { JendelaGUI } from '../core/window';

export class AdaptorHeadlessGUI implements AdaptorPlatformGUI {
  private konfig?: KonfigurasiAplikasiGUI;
  private jendelaAktif: Map<string, JendelaGUI> = new Map();
  private riwayatAksi: Array<{ aksi: string; target: string; waktu: number }> = [];

  public dapatkanNamaPlatform(): TipePlatformGUI {
    return 'headless';
  }

  public async inisialisasi(konfig: KonfigurasiAplikasiGUI): Promise<void> {
    this.konfig = konfig;
    this.riwayatAksi.push({ aksi: 'inisialisasi', target: konfig.idAplikasi, waktu: Date.now() });
  }

  public async bukaJendela(jendela: JendelaGUI): Promise<void> {
    this.jendelaAktif.set(jendela.id, jendela);
    this.riwayatAksi.push({ aksi: 'buka_jendela', target: jendela.id, waktu: Date.now() });
  }

  public async tutupJendela(id: string): Promise<void> {
    this.jendelaAktif.delete(id);
    this.riwayatAksi.push({ aksi: 'tutup_jendela', target: id, waktu: Date.now() });
  }

  public async perbaruiTampilan(jendela: JendelaGUI): Promise<void> {
    this.riwayatAksi.push({ aksi: 'perbarui_tampilan', target: jendela.id, waktu: Date.now() });
  }

  public getRiwayatAksi(): Array<{ aksi: string; target: string; waktu: number }> {
    return [...this.riwayatAksi];
  }

  public renderPohonTeks(jendela: JendelaGUI): string {
    const data = jendela.serialisasi();
    return JSON.stringify(data, null, 2);
  }

  public async hancurkan(): Promise<void> {
    this.jendelaAktif.clear();
    this.riwayatAksi.push({ aksi: 'hancurkan', target: 'semua', waktu: Date.now() });
  }
}
