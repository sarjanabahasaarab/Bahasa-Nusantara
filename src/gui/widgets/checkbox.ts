/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Kotak Centang (Checkbox Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export class KotakCentangWidget extends Widget {
  public label: string;
  public terpilih: boolean;

  constructor(label: string = '', terpilihAwal: boolean = false, arg3?: string | GayaWidget, arg4?: GayaWidget | string) {
    const id = typeof arg3 === 'string' ? arg3 : typeof arg4 === 'string' ? arg4 : undefined;
    const gaya = typeof arg3 === 'object' && arg3 !== null ? arg3 : typeof arg4 === 'object' && arg4 !== null ? arg4 : undefined;
    super('kotak_centang', id, gaya);
    this.label = label;
    this.terpilih = terpilihAwal;
    this.aksesibilitas.peran = 'checkbox';
    this.aksesibilitas.label = label;
    this.aksesibilitas.nilaiSaatIni = terpilihAwal ? 'true' : 'false';
  }

  public isCentang(): boolean {
    return this.terpilih;
  }

  public setCentang(status: boolean): this {
    return this.setTerpilih(status);
  }

  public setTerpilih(status: boolean): this {
    const berubah = this.terpilih !== status;
    this.terpilih = status;
    this.aksesibilitas.nilaiSaatIni = status ? 'true' : 'false';
    if (berubah) {
      this.picuPerubahan();
    }
    return this;
  }

  public setLabel(labelBaru: string): this {
    this.label = labelBaru;
    this.aksesibilitas.label = labelBaru;
    return this;
  }

  public toggle(): this {
    return this.setTerpilih(!this.terpilih);
  }

  public padaPerubahan(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('nilai_berubah', penangan);
  }

  public async picuPerubahan(): Promise<void> {
    const evt = buatPeristiwaGUI(this.id, 'nilai_berubah', { nilaiLogika: this.terpilih });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      label: this.label,
      terpilih: this.terpilih,
    };
  }
}
