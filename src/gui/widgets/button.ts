/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Tombol Interaktif (Button Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export class TombolWidget extends Widget {
  public teks: string;
  public ikon?: string;
  public tooltip?: string;
  public varian: 'primer' | 'sekunder' | 'bahaya' | 'sukses' | 'outline' = 'primer';

  constructor(teks: string = '', arg2?: any, arg3?: any, arg4?: string) {
    let aksiKlik: PenanganPeristiwaGUI | undefined;
    let gaya: GayaWidget | undefined;
    let id: string | undefined;

    if (typeof arg2 === 'function') {
      aksiKlik = arg2;
      gaya = typeof arg3 === 'object' && arg3 !== null ? arg3 : undefined;
      id = typeof arg3 === 'string' ? arg3 : typeof arg4 === 'string' ? arg4 : undefined;
    } else if (typeof arg2 === 'string') {
      id = arg2;
      gaya = typeof arg3 === 'object' && arg3 !== null ? arg3 : undefined;
    } else if (typeof arg2 === 'object' && arg2 !== null) {
      gaya = arg2;
      id = typeof arg3 === 'string' ? arg3 : undefined;
    }

    super('tombol', id, gaya);
    this.teks = teks;
    this.aksesibilitas.peran = 'button';
    this.aksesibilitas.label = teks;

    if (aksiKlik) {
      this.padaKlik(aksiKlik);
    }
  }

  public getTeks(): string {
    return this.teks;
  }

  public setTeks(teksBaru: string): this {
    this.teks = teksBaru;
    this.aksesibilitas.label = teksBaru;
    return this;
  }

  public setIkon(ikon: string): this {
    this.ikon = ikon;
    return this;
  }

  public setVarian(varian: 'primer' | 'sekunder' | 'bahaya' | 'sukses' | 'outline'): this {
    this.varian = varian;
    return this;
  }

  public setTooltip(tooltip: string): this {
    this.tooltip = tooltip;
    return this;
  }

  public padaKlik(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('klik', penangan);
  }

  public async klik(): Promise<void> {
    if (!this.aktif) return;
    const evt = buatPeristiwaGUI(this.id, 'klik', { nilaiTeks: this.teks });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      teks: this.teks,
      ikon: this.ikon,
      tooltip: this.tooltip,
      varian: this.varian,
    };
  }
}
