/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Penumpukan Z-Index / Tumpukan (Stack Layout)
 */

import { Widget } from '../widgets/base';
import { GayaWidget, PerataanLayout } from '../types';

export class StackLayout extends Widget {
  public perataan: PerataanLayout = 'tengah';

  constructor(anakAwal: Widget[] = [], gaya?: GayaWidget, id?: string) {
    super('stack', id, gaya);
    for (const a of anakAwal) {
      this.tambahAnak(a);
    }
  }

  public setPerataan(p: PerataanLayout): this {
    this.perataan = p;
    return this;
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      tipeLayout: 'stack',
      perataan: this.perataan,
    };
  }
}
