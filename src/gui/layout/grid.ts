/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Grid Multi-Kolom (Grid Layout)
 */

import { Widget } from '../widgets/base';
import { GayaWidget } from '../types';

export class GridLayout extends Widget {
  public jumlahKolom: number = 2;
  public jarakBaris: number = 8;
  public jarakKolom: number = 8;

  constructor(jumlahKolom: number = 2, jarak: number = 8, anakAwal: Widget[] = [], gaya?: GayaWidget, id?: string) {
    super('grid', id, gaya);
    this.jumlahKolom = Math.max(1, jumlahKolom);
    this.jarakBaris = jarak;
    this.jarakKolom = jarak;
    for (const a of anakAwal) {
      this.tambahAnak(a);
    }
  }

  public get kolom(): number {
    return this.jumlahKolom;
  }

  public setJumlahKolom(kolom: number): this {
    this.jumlahKolom = Math.max(1, kolom);
    return this;
  }

  public setJarak(jarakBaris: number, jarakKolom: number = jarakBaris): this {
    this.jarakBaris = jarakBaris;
    this.jarakKolom = jarakKolom;
    return this;
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      jumlahKolom: this.jumlahKolom,
      jarakBaris: this.jarakBaris,
      jarakKolom: this.jarakKolom,
    };
  }
}
