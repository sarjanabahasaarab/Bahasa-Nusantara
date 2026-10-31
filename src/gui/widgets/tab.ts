/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Tab Navigasi & Panel (Tab Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export interface PanelTab {
  id: string;
  judul: string;
  ikon?: string;
  konten: Widget;
}

export class TabWidget extends Widget {
  public daftarTab: PanelTab[] = [];
  public indeksAktif: number = 0;

  constructor(gaya?: GayaWidget, id?: string) {
    super('tab', id, gaya);
    this.aksesibilitas.peran = 'tablist';
  }

  public tambahTab(arg1: string, arg2: string | Widget, arg3?: Widget | string, arg4?: string): this {
    let idTab: string;
    let judul: string;
    let konten: Widget;
    let ikon: string | undefined;

    if (arg2 instanceof Widget) {
      judul = arg1;
      idTab = `tab_${this.daftarTab.length + 1}`;
      konten = arg2;
      ikon = typeof arg3 === 'string' ? arg3 : undefined;
    } else {
      idTab = arg1;
      judul = String(arg2);
      konten = arg3 as Widget;
      ikon = arg4;
    }

    const tab: PanelTab = { id: idTab, judul, konten, ikon };
    this.daftarTab.push(tab);
    this.tambahAnak(konten);
    return this;
  }

  public pilihTab(indeks: number): this {
    if (indeks >= 0 && indeks < this.daftarTab.length) {
      const berubah = this.indeksAktif !== indeks;
      this.indeksAktif = indeks;
      if (berubah) {
        this.picuPerubahan();
      }
    }
    return this;
  }

  public dapatkanTabAktif(): PanelTab | undefined {
    return this.daftarTab[this.indeksAktif];
  }

  public padaPerubahan(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('seleksi_berubah', penangan);
  }

  public async picuPerubahan(): Promise<void> {
    const tab = this.dapatkanTabAktif();
    const evt = buatPeristiwaGUI(this.id, 'seleksi_berubah', {
      nilaiAngka: this.indeksAktif,
      nilaiTeks: tab?.judul,
      data: tab?.id,
    });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      daftarTab: this.daftarTab.map((t) => ({
        id: t.id,
        judul: t.judul,
        ikon: t.ikon,
        kontenId: t.konten.id,
      })),
      indeksAktif: this.indeksAktif,
    };
  }
}
