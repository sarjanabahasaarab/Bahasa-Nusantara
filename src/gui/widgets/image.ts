/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Gambar (Image Widget)
 */

import { Widget } from './base';
import { GayaWidget } from '../types';

export class GambarWidget extends Widget {
  public sumber: string;
  public teksAlternatif: string;
  public jagaRasio: boolean = true;
  public lebar?: number;
  public tinggi?: number;

  constructor(sumber: string, teksAlternatif: string = '', lebar?: number, tinggi?: number, gaya?: GayaWidget, id?: string) {
    super('gambar', id, gaya);
    this.sumber = sumber;
    this.teksAlternatif = teksAlternatif;
    this.lebar = lebar;
    this.tinggi = tinggi;
    this.aksesibilitas.peran = 'img';
    this.aksesibilitas.label = teksAlternatif;
  }

  public setSumber(sumberBaru: string): this {
    this.sumber = sumberBaru;
    return this;
  }

  public setTeksAlternatif(alt: string): this {
    this.teksAlternatif = alt;
    this.aksesibilitas.label = alt;
    return this;
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      sumber: this.sumber,
      teksAlternatif: this.teksAlternatif,
      jagaRasio: this.jagaRasio,
      lebar: this.lebar,
      tinggi: this.tinggi,
    };
  }
}
