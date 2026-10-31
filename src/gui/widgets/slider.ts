/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Geser Rentang Nilai (Slider Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export class SliderWidget extends Widget {
  public nilai: number;
  public nilaiMin: number;
  public nilaiMaks: number;
  public langkah: number;

  constructor(
    arg1: number = 0,
    arg2: number = 100,
    arg3: number = 0,
    langkah: number = 1,
    gaya?: GayaWidget,
    id?: string
  ) {
    super('slider', id, gaya);
    // arg1: min or initial, arg2: max or min, arg3: initial or max
    let min = 0;
    let maks = 100;
    let val = 0;

    if (arg1 <= arg2) {
      min = arg1;
      maks = arg2;
      val = arg3 !== undefined ? arg3 : min;
    } else {
      val = arg1;
      min = arg2;
      maks = arg3 !== undefined ? arg3 : 100;
    }

    this.nilaiMin = min;
    this.nilaiMaks = maks;
    this.langkah = langkah;
    this.nilai = Math.min(Math.max(min, val), maks);
    this.aksesibilitas.peran = 'slider';
    this.aksesibilitas.nilaiSaatIni = String(this.nilai);
  }

  public getNilai(): number {
    return this.nilai;
  }

  public setNilai(nilaiBaru: number): this {
    const dibatasi = Math.min(Math.max(this.nilaiMin, nilaiBaru), this.nilaiMaks);
    const berubah = this.nilai !== dibatasi;
    this.nilai = dibatasi;
    this.aksesibilitas.nilaiSaatIni = String(this.nilai);
    if (berubah) {
      this.picuPerubahan();
    }
    return this;
  }

  public padaPerubahan(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('nilai_berubah', penangan);
  }

  public async picuPerubahan(): Promise<void> {
    const evt = buatPeristiwaGUI(this.id, 'nilai_berubah', { nilaiAngka: this.nilai });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      nilai: this.nilai,
      nilaiMin: this.nilaiMin,
      nilaiMaks: this.nilaiMaks,
      langkah: this.langkah,
    };
  }
}
