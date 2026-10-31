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

export class AplikasiGUI {
  public readonly konfigurasi: KonfigurasiAplikasiGUI;
  public readonly konteks: KonteksAplikasiGUI;
  public jendelaUtama: JendelaGUI | null = null;

  constructor(konfigurasi: KonfigurasiAplikasiGUI) {
    this.konfigurasi = {
      tutupOtomatisSaatJendelaTerakhirTutup: true,
      temaAwal: 'terang',
      ...konfigurasi,
    };
    this.konteks = KonteksAplikasiGUI.dapatkanKonteks();

    if (this.konfigurasi.temaAwal) {
      this.konteks.tema.setTema(this.konfigurasi.temaAwal);
    }
  }

  public buatJendela(konfigurasi: KonfigurasiJendelaGUI): JendelaGUI {
    const jendela = new JendelaGUI(konfigurasi);
    this.konteks.daftarkanJendela(jendela);

    if (!this.jendelaUtama) {
      this.jendelaUtama = jendela;
    }

    jendela.pasang('jendela_ditutup', async () => {
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
    await this.konteks.lifecycle.transisiKe(StatusAplikasi.BERJALAN);

    // Jalankan event loop
    await this.konteks.loop.jalankan();
  }

  public async berhenti(): Promise<void> {
    if (this.konteks.lifecycle.getStatus() === StatusAplikasi.BERHENTI) {
      return;
    }

    this.konteks.loop.hentikan();
    await this.konteks.lifecycle.transisiKe(StatusAplikasi.BERHENTI);
  }

  public hancurkan(): void {
    this.konteks.bersihkan();
    this.konteks.lifecycle.transisiKe(StatusAplikasi.DIHANCURKAN).catch(() => {});
    this.jendelaUtama = null;
  }
}
