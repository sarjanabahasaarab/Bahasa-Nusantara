/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Kelas Dasar Widget GUI (Base Widget Component)
 */

import { GayaWidget, JenisWidget, JenisPeristiwaGUI, PenanganPeristiwaGUI, DataPeristiwaGUI } from '../types';
import { PengelolaPeristiwaGUI } from '../events/event_handler';
import { buatPeristiwaGUI } from '../events/event';

let counterIdWidget = 0;

export interface InfoAksesibilitas {
  peran?: string;
  label?: string;
  deskripsi?: string;
  wajib?: boolean;
  nilaiSaatIni?: string;
}

export abstract class Widget {
  public readonly id: string;
  public readonly jenis: JenisWidget;
  public gaya: GayaWidget = {};
  public aktif: boolean = true;
  public terlihat: boolean = true;
  public anak: Widget[] = [];
  public induk?: Widget;
  public aksesibilitas: InfoAksesibilitas = {};
  protected readonly peristiwa: PengelolaPeristiwaGUI = new PengelolaPeristiwaGUI();

  constructor(jenis: JenisWidget, idKustom?: string, gayaAwal?: GayaWidget) {
    this.jenis = jenis;
    counterIdWidget++;
    this.id = idKustom || `widget_${jenis}_${counterIdWidget}`;
    if (gayaAwal) {
      this.gaya = { ...gayaAwal };
    }
  }

  public tambahAnak(widgetAnak: Widget): this {
    widgetAnak.induk = this;
    this.anak.push(widgetAnak);
    return this;
  }

  public hapusAnak(widgetAnak: Widget): boolean {
    const idx = this.anak.indexOf(widgetAnak);
    if (idx !== -1) {
      this.anak.splice(idx, 1);
      widgetAnak.induk = undefined;
      return true;
    }
    return false;
  }

  public bersihkanAnak(): void {
    for (const a of this.anak) {
      a.induk = undefined;
      a.hancurkan();
    }
    this.anak = [];
  }

  public pasang(jenis: JenisPeristiwaGUI, penangan: PenanganPeristiwaGUI): () => void {
    return this.peristiwa.pasang(jenis, penangan);
  }

  public async picu(jenis: JenisPeristiwaGUI, data?: any): Promise<void> {
    if (!this.aktif && jenis !== 'fokus' && jenis !== 'blur') {
      return; // Widget nonaktif tidak memproses event interaksi
    }
    const evt = buatPeristiwaGUI(this.id, jenis, { data });
    await this.peristiwa.picu(evt);
  }

  public setGaya(gayaBaru: GayaWidget): this {
    this.gaya = { ...this.gaya, ...gayaBaru };
    return this;
  }

  public setAktif(status: boolean): this {
    this.aktif = status;
    return this;
  }

  public setTerlihat(status: boolean): this {
    this.terlihat = status;
    return this;
  }

  public setAksesibilitas(info: InfoAksesibilitas): this {
    this.aksesibilitas = { ...this.aksesibilitas, ...info };
    return this;
  }

  /**
   * Representasi serialisasi pohon widget untuk backend rendering (DOM / Webview / Headless Inspector)
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      jenis: this.jenis,
      aktif: this.aktif,
      terlihat: this.terlihat,
      gaya: this.gaya,
      aksesibilitas: this.aksesibilitas,
      anak: this.anak.map((a) => a.toJSON()),
    };
  }

  public serialisasi(): Record<string, any> {
    return this.toJSON();
  }

  /**
   * Pembersihan resource dan pelepasan listener saat widget dihancurkan.
   */
  public hancurkan(): void {
    this.bersihkanAnak();
    this.peristiwa.bersihkan();
    this.induk = undefined;
  }
}
