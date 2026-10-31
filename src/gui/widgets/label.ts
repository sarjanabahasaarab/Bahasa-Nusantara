/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Label Teks (Label Widget)
 */

import { Widget } from './base';
import { GayaWidget, PerataanTeks } from '../types';

export class LabelWidget extends Widget {
  public teks: string;
  public perataan: PerataanTeks = 'kiri';
  public tooltip?: string;
  public bungkusTeks: boolean = true;

  constructor(teks: string = '', arg2?: string | GayaWidget, arg3?: GayaWidget | string) {
    const id = typeof arg2 === 'string' ? arg2 : typeof arg3 === 'string' ? arg3 : undefined;
    const gaya = typeof arg2 === 'object' && arg2 !== null ? arg2 : typeof arg3 === 'object' && arg3 !== null ? arg3 : undefined;
    super('label', id, gaya);
    this.teks = teks;
    this.aksesibilitas.peran = 'label';
    this.aksesibilitas.label = teks;
  }

  public getTeks(): string {
    return this.teks;
  }

  public setTeks(teksBaru: string): this {
    this.teks = teksBaru;
    this.aksesibilitas.label = teksBaru;
    return this;
  }

  public setUkuranFont(ukuran: number): this {
    this.gaya.ukuranFont = ukuran;
    return this;
  }

  public setWarna(warna: string): this {
    this.gaya.warnaTeks = warna;
    return this;
  }

  public setPerataan(perataan: PerataanTeks): this {
    this.perataan = perataan;
    return this;
  }

  public setTooltip(tooltip: string): this {
    this.tooltip = tooltip;
    return this;
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      teks: this.teks,
      perataan: this.perataan,
      tooltip: this.tooltip,
      bungkusTeks: this.bungkusTeks,
    };
  }
}
