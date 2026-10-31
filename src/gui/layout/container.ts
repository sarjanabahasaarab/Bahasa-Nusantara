/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Wadah Kontainer (Container Layout)
 */

import { Widget } from '../widgets/base';
import { GayaWidget } from '../types';

export class WadahWidget extends Widget {
  constructor(anakAwal: Widget[] = [], gaya?: GayaWidget, id?: string) {
    super('wadah', id, gaya);
    for (const a of anakAwal) {
      this.tambahAnak(a);
    }
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      tipeLayout: 'wadah',
    };
  }
}
