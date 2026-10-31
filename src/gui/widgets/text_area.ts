/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Input Teks Banyak Baris (Text Area Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export class AreaTeksWidget extends Widget {
  public nilai: string;
  public placeholder: string;
  public baris: number = 5;
  public hanyaBaca: boolean = false;
  public bungkusOtomatis: boolean = true;

  constructor(placeholder: string = '', nilaiAwal: string = '', arg3?: number | GayaWidget, arg4?: string | GayaWidget, arg5?: GayaWidget) {
    const baris = typeof arg3 === 'number' ? arg3 : 5;
    const gaya = typeof arg3 === 'object' && arg3 !== null ? arg3 : typeof arg4 === 'object' && arg4 !== null ? arg4 : arg5;
    const id = typeof arg4 === 'string' ? arg4 : undefined;

    super('area_teks', id, gaya);
    this.placeholder = placeholder;
    this.nilai = nilaiAwal;
    this.baris = baris;
    this.aksesibilitas.peran = 'textbox';
    this.aksesibilitas.label = placeholder;
  }

  public getNilai(): string {
    return this.nilai;
  }

  public tambahBaris(barisBaru: string): this {
    return this.setNilai(this.nilai ? `${this.nilai}\n${barisBaru}` : barisBaru);
  }

  public setNilai(nilaiBaru: string): this {
    if (this.hanyaBaca) return this;
    const berubah = this.nilai !== nilaiBaru;
    this.nilai = nilaiBaru;
    if (berubah) {
      this.picuPerubahan();
    }
    return this;
  }

  public setBaris(jumlahBaris: number): this {
    this.baris = jumlahBaris;
    return this;
  }

  public setHanyaBaca(hb: boolean): this {
    this.hanyaBaca = hb;
    return this;
  }

  public padaPerubahan(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('teks_berubah', penangan);
  }

  public async picuPerubahan(): Promise<void> {
    const evt = buatPeristiwaGUI(this.id, 'teks_berubah', { nilaiTeks: this.nilai });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      nilai: this.nilai,
      placeholder: this.placeholder,
      baris: this.baris,
      hanyaBaca: this.hanyaBaca,
      bungkusOtomatis: this.bungkusOtomatis,
    };
  }
}
