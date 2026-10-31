/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Kolom Vertikal (Column Layout)
 */

import { Widget } from '../widgets/base';
import { GayaWidget, PerataanLayout } from '../types';

export class KolomLayout extends Widget {
  public jarak: number = 8;
  public perataan: PerataanLayout = 'awal';
  public perataanSilang: PerataanLayout = 'awal';

  constructor(jarak: number = 8, arg2?: Widget[] | PerataanLayout, gaya?: GayaWidget, id?: string) {
    super('kolom', id, gaya);
    this.jarak = jarak;
    if (Array.isArray(arg2)) {
      for (const a of arg2) {
        this.tambahAnak(a);
      }
    } else if (typeof arg2 === 'string') {
      this.perataan = arg2;
    }
  }

  public setJarak(jarak: number): this {
    this.jarak = jarak;
    return this;
  }

  public setPerataan(perataan: PerataanLayout): this {
    this.perataan = perataan;
    return this;
  }

  public setPerataanSilang(perataan: PerataanLayout): this {
    this.perataanSilang = perataan;
    return this;
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      tipeLayout: 'kolom',
      jarak: this.jarak,
      perataan: this.perataan,
      perataanSilang: this.perataanSilang,
    };
  }
}
