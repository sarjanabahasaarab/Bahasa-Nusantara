/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Indikator Progres (Progress Indicator Widget)
 */

import { Widget } from './base';
import { GayaWidget } from '../types';

export class IndikatorProgresWidget extends Widget {
  public nilai: number = 0;
  public nilaiMaksimal: number = 100;
  public indeterminate: boolean = false;

  constructor(nilaiAwal: number = 0, maksimal: number = 100, indeterminate: boolean = false, gaya?: GayaWidget, id?: string) {
    super('progres', id, gaya);
    this.nilai = Math.min(Math.max(0, nilaiAwal), maksimal);
    this.nilaiMaksimal = maksimal;
    this.indeterminate = indeterminate;
    this.aksesibilitas.peran = 'progressbar';
    this.aksesibilitas.nilaiSaatIni = String(this.nilai);
  }

  public setNilai(nilaiBaru: number): this {
    this.nilai = Math.min(Math.max(0, nilaiBaru), this.nilaiMaksimal);
    this.aksesibilitas.nilaiSaatIni = String(this.nilai);
    return this;
  }

  public setIndeterminate(status: boolean): this {
    this.indeterminate = status;
    return this;
  }

  public get persentase(): number {
    if (this.nilaiMaksimal <= 0) return 0;
    return Math.round((this.nilai / this.nilaiMaksimal) * 100);
  }

  public getNilai(): number {
    return this.nilai;
  }

  public getPersentase(): number {
    return this.persentase;
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      nilai: this.nilai,
      nilaiMaksimal: this.nilaiMaksimal,
      persentase: this.persentase,
      indeterminate: this.indeterminate,
    };
  }
}
