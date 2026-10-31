/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Wadah Bergulir (Scroll Layout)
 */

import { Widget } from '../widgets/base';
import { GayaWidget } from '../types';

export class WadahGulirWidget extends Widget {
  public gulirVertikal: boolean = true;
  public gulirHorizontal: boolean = false;

  constructor(konten?: Widget, vertikal: boolean = true, horizontal: boolean = false, gaya?: GayaWidget, id?: string) {
    super('gulir', id, gaya);
    this.gulirVertikal = vertikal;
    this.gulirHorizontal = horizontal;
    if (konten) {
      this.tambahAnak(konten);
    }
  }

  public setGulirVertikal(v: boolean): this {
    this.gulirVertikal = v;
    return this;
  }

  public setGulirHorizontal(h: boolean): this {
    this.gulirHorizontal = h;
    return this;
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      tipeLayout: 'gulir',
      gulirVertikal: this.gulirVertikal,
      gulirHorizontal: this.gulirHorizontal,
    };
  }
}
