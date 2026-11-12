/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Aplikasi GUI Utama (Desktop Application Core)
 */

import { KonfigurasiAplikasiGUI, KonfigurasiJendelaGUI, NamaTemaGUI } from '../types';
import { JendelaGUI } from './window';
import { KonteksAplikasiGUI } from './application_context';
import { StatusAplikasi } from './lifecycle';
import { AdaptorPlatformGUI } from '../platform/adapter';

export class AplikasiGUI {
  public readonly konfigurasi: KonfigurasiAplikasiGUI;
  public readonly konteks: KonteksAplikasiGUI;
  public jendelaUtama: JendelaGUI | null = null;
  private adaptorPlatform: AdaptorPlatformGUI | null = null;

  constructor(konfigurasi: KonfigurasiAplikasiGUI, adaptor?: AdaptorPlatformGUI) {
    this.konfigurasi = {
      tutupOtomatisSaatJendelaTerakhirTutup: true,
      temaAwal: 'terang',
      ...konfigurasi,
    };
    this.konteks = KonteksAplikasiGUI.dapatkanKonteks();
    if (adaptor) {
      this.adaptorPlatform = adaptor;
    }

    if (this.konfigurasi.temaAwal) {
      this.konteks.tema.setTema(this.konfigurasi.temaAwal);
    }
  }

  public tetapkanAdaptorPlatform(adaptor: AdaptorPlatformGUI): this {
    this.adaptorPlatform = adaptor;
    return this;
  }

  public dapatkanAdaptorPlatform(): AdaptorPlatformGUI | null {
    return this.adaptorPlatform;
  }

  public buatJendela(konfigurasi: KonfigurasiJendelaGUI): JendelaGUI {
    const jendela = new JendelaGUI(konfigurasi);
    this.konteks.daftarkanJendela(jendela);

    if (!this.jendelaUtama) {
      this.jendelaUtama = jendela;
    }

    jendela.pasang('jendela_ditutup', async () => {
      if (this.adaptorPlatform) {
        await this.adaptorPlatform.tutupJendela(jendela.id);
      }
      if (this.konfigurasi.tutupOtomatisSaatJendelaTerakhirTutup) {
        let adaJendelaLain = false;
        for (const [id, j] of this.konteks.daftarJendela.entries()) {
          if (id !== jendela.id && j.status !== 'tersembunyi') {
            adaJendelaLain = true;
            break;
          }
        }
        if (!adaJendelaLain) {
          await this.berhenti();
        }
      }
    });

    return jendela;
  }

  public dapatkanJendela(id: string): JendelaGUI | undefined {
    return this.konteks.dapatkanJendela(id);
  }

  public setTema(tema: NamaTemaGUI): this {
    this.konteks.tema.setTema(tema);
    return this;
  }

  public async jalankan(): Promise<void> {
    if (this.konteks.lifecycle.getStatus() === StatusAplikasi.BERJALAN) {
      return;
    }

    await this.konteks.lifecycle.transisiKe(StatusAplikasi.MEMULAI);
    if (this.adaptorPlatform) {
      await this.adaptorPlatform.inisialisasi(this.konfigurasi);
      for (const jendela of this.konteks.daftarJendela.values()) {
        await this.adaptorPlatform.bukaJendela(jendela);
      }
    }
    await this.konteks.lifecycle.transisiKe(StatusAplikasi.BERJALAN);

    // Jalankan event loop
    await this.konteks.loop.jalankan();
  }

  public async perbaruiSemuaTampilan(): Promise<void> {
    if (!this.adaptorPlatform) return;
    for (const jendela of this.konteks.daftarJendela.values()) {
      await this.adaptorPlatform.perbaruiTampilan(jendela);
    }
  }

  public async berhenti(): Promise<void> {
    if (this.konteks.lifecycle.getStatus() === StatusAplikasi.BERHENTI) {
      return;
    }

    this.konteks.loop.hentikan();
    if (this.adaptorPlatform) {
      await this.adaptorPlatform.hancurkan();
    }
    await this.konteks.lifecycle.transisiKe(StatusAplikasi.BERHENTI);
  }

  public hancurkan(): void {
    if (this.adaptorPlatform) {
      this.adaptorPlatform.hancurkan().catch(() => {});
    }
    this.konteks.bersihkan();
    this.konteks.lifecycle.transisiKe(StatusAplikasi.DIHANCURKAN).catch(() => {});
    this.jendelaUtama = null;
  }
}
