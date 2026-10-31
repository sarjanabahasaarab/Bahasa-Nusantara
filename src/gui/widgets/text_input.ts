/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Input Teks Satu Baris (Text Input Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export class InputTeksWidget extends Widget {
  public nilai: string;
  public placeholder: string;
  public modePassword: boolean = false;
  public hanyaBaca: boolean = false;
  public wajib: boolean = false;
  public batasKarakter?: number;

  constructor(placeholder: string = '', nilaiAwal: string = '', arg3?: string | GayaWidget, arg4?: GayaWidget | string) {
    const id = typeof arg3 === 'string' ? arg3 : typeof arg4 === 'string' ? arg4 : undefined;
    const gaya = typeof arg3 === 'object' && arg3 !== null ? arg3 : typeof arg4 === 'object' && arg4 !== null ? arg4 : undefined;
    super('input_teks', id, gaya);
    this.placeholder = placeholder;
    this.nilai = nilaiAwal;
    this.aksesibilitas.peran = 'textbox';
    this.aksesibilitas.label = placeholder;
  }

  public getNilai(): string {
    return this.nilai;
  }

  public bersihkan(): this {
    return this.setNilai('');
  }

  public setNilai(nilaiBaru: string): this {
    if (this.hanyaBaca) return this;
    if (this.batasKarakter && nilaiBaru.length > this.batasKarakter) {
      nilaiBaru = nilaiBaru.slice(0, this.batasKarakter);
    }
    const berubah = this.nilai !== nilaiBaru;
    this.nilai = nilaiBaru;
    if (berubah) {
      this.picuPerubahan();
    }
    return this;
  }

  public setPlaceholder(p: string): this {
    this.placeholder = p;
    this.aksesibilitas.label = p;
    return this;
  }

  public setModePassword(mode: boolean): this {
    this.modePassword = mode;
    return this;
  }

  public setKataSandi(mode: boolean): this {
    return this.setModePassword(mode);
  }

  public setHanyaBaca(hb: boolean): this {
    this.hanyaBaca = hb;
    return this;
  }

  public setWajib(w: boolean): this {
    this.wajib = w;
    this.aksesibilitas.wajib = w;
    return this;
  }

  public setBatasKarakter(batas: number): this {
    this.batasKarakter = batas;
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
      nilai: this.modePassword ? '••••••••' : this.nilai,
      placeholder: this.placeholder,
      modePassword: this.modePassword,
      hanyaBaca: this.hanyaBaca,
      wajib: this.wajib,
      batasKarakter: this.batasKarakter,
    };
  }
}
