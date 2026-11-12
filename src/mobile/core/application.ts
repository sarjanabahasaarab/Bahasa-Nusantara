/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Inti Aplikasi Mobile (Mobile Application Core)
 */

import { KonfigurasiAplikasiMobile, StatusLifecycleMobile } from '../types';
import { KonteksAplikasiMobile } from './application_context';
import { PengelolaKonfigurasiMobile } from './config';
import { JembatanMobileNative } from '../bridge/bridge';

export class AplikasiMobile {
  public readonly konfigurasi: KonfigurasiAplikasiMobile;
  public readonly konteks: KonteksAplikasiMobile;
  public navigatorUtama: any = null;

  constructor(konfigurasi: Partial<KonfigurasiAplikasiMobile>) {
    const validasi = PengelolaKonfigurasiMobile.validasi(konfigurasi);
    if (!validasi.sah) {
      throw new Error(`Konfigurasi aplikasi mobile tidak valid: ${validasi.daftarGalat.join('; ')}`);
    }

    this.konfigurasi = {
      ...PengelolaKonfigurasiMobile.buatKonfigurasiBawaan(konfigurasi.nama, konfigurasi.id),
      ...konfigurasi,
    } as KonfigurasiAplikasiMobile;

    this.konteks = KonteksAplikasiMobile.dapatkanKonteks();
    this.konteks.konfigurasi = this.konfigurasi;

    if (this.konfigurasi.temaAwal) {
      this.konteks.setTema(this.konfigurasi.temaAwal);
    }
  }

  public setNavigator(navigator: any): this {
    this.navigatorUtama = navigator;
    this.konteks.navigatorAktif = navigator;
    return this;
  }

  public getStatus(): StatusLifecycleMobile {
    return this.konteks.lifecycle.getStatus();
  }

  private siarkanLifecycle(status: StatusLifecycleMobile): void {
    JembatanMobileNative.dapatkanInstance().kirimPeristiwaDariNative({
      saluran: 'lifecycle',
      namaPeristiwa: 'status_berubah',
      data: { idAplikasi: this.konfigurasi.id, status },
      stempelWaktu: Date.now(),
    });
  }

  public async jalankan(): Promise<void> {
    await this.konteks.lifecycle.transisiKe(StatusLifecycleMobile.MEMULAI);
    this.siarkanLifecycle(StatusLifecycleMobile.MEMULAI);
    await this.konteks.lifecycle.transisiKe(StatusLifecycleMobile.AKTIF);
    this.siarkanLifecycle(StatusLifecycleMobile.AKTIF);
  }

  public async jeda(): Promise<void> {
    await this.konteks.lifecycle.transisiKe(StatusLifecycleMobile.JEDA);
    this.siarkanLifecycle(StatusLifecycleMobile.JEDA);
  }

  public async lanjutkan(): Promise<void> {
    await this.konteks.lifecycle.transisiKe(StatusLifecycleMobile.RESUME);
    this.siarkanLifecycle(StatusLifecycleMobile.RESUME);
    await this.konteks.lifecycle.transisiKe(StatusLifecycleMobile.AKTIF);
    this.siarkanLifecycle(StatusLifecycleMobile.AKTIF);
  }

  public async keLatarBelakang(): Promise<void> {
    await this.konteks.lifecycle.transisiKe(StatusLifecycleMobile.LATAR_BELAKANG);
    this.siarkanLifecycle(StatusLifecycleMobile.LATAR_BELAKANG);
  }

  public async hentikan(): Promise<void> {
    await this.konteks.lifecycle.transisiKe(StatusLifecycleMobile.BERHENTI);
    this.siarkanLifecycle(StatusLifecycleMobile.BERHENTI);
  }

  public async hancurkan(): Promise<void> {
    await this.konteks.lifecycle.transisiKe(StatusLifecycleMobile.DIHANCURKAN);
    this.siarkanLifecycle(StatusLifecycleMobile.DIHANCURKAN);
    this.konteks.bersihkan();
    this.navigatorUtama = null;
  }

  public readonly komponenAkar: any[] = [];

  public tambahKomponenAkar(komp: any): this {
    this.komponenAkar.push(komp);
    return this;
  }

  public dapatkanKomponenAkar(): any[] {
    return this.komponenAkar;
  }

  public dapatkanKonfigurasi(): KonfigurasiAplikasiMobile {
    return this.konfigurasi;
  }

  public dapatkanStatusLifecycle(): StatusLifecycleMobile {
    return this.getStatus();
  }

  public dapatkanState() {
    return this.konteks.state;
  }

  public async berhenti(): Promise<void> {
    return this.hentikan();
  }

  public toJson(): Record<string, any> {
    return this.serialisasi();
  }

  public serialisasi(): Record<string, any> {
    return {
      aplikasi: this.konfigurasi.nama,
      id: this.konfigurasi.id,
      versi: this.konfigurasi.versi,
      status: this.getStatus(),
      tema: this.konteks.temaAktif,
      perangkat: this.konteks.infoPerangkat,
      navigator: this.navigatorUtama ? this.navigatorUtama.serialisasi() : null,
      state: this.konteks.state.toJSON(),
      komponenAkar: this.komponenAkar.map(k => (typeof k?.toJson === 'function' ? k.toJson() : k)),
    };
  }
}
