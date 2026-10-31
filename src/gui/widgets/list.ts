/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Daftar Pilihan (List Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export class DaftarWidget extends Widget {
  public item: string[] = [];
  public indeksTerpilih: number = -1;
  public banyakSeleksi: boolean = false;
  public indeksTerpilihBanyak: Set<number> = new Set();

  constructor(itemAwal: string[] = [], gaya?: GayaWidget, id?: string) {
    super('daftar', id, gaya);
    this.item = [...itemAwal];
    this.aksesibilitas.peran = 'listbox';
  }

  public setItem(itemBaru: string[]): this {
    this.item = [...itemBaru];
    this.indeksTerpilih = -1;
    this.indeksTerpilihBanyak.clear();
    return this;
  }

  public getData(): string[] {
    return this.item;
  }

  public tambahItem(teks: string): this {
    this.item.push(teks);
    return this;
  }

  public hapusItem(indeks: number): boolean {
    if (indeks >= 0 && indeks < this.item.length) {
      this.item.splice(indeks, 1);
      if (this.indeksTerpilih === indeks) {
        this.indeksTerpilih = -1;
      }
      this.indeksTerpilihBanyak.delete(indeks);
      return true;
    }
    return false;
  }

  public pilih(indeks: number): this {
    if (indeks >= 0 && indeks < this.item.length) {
      this.indeksTerpilih = indeks;
      this.indeksTerpilihBanyak.add(indeks);
      this.picuPerubahan();
    }
    return this;
  }

  public dapatkanItemTerpilih(): string | undefined {
    if (this.indeksTerpilih >= 0 && this.indeksTerpilih < this.item.length) {
      return this.item[this.indeksTerpilih];
    }
    return undefined;
  }

  public padaPerubahan(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('seleksi_berubah', penangan);
  }

  public async picuPerubahan(): Promise<void> {
    const evt = buatPeristiwaGUI(this.id, 'seleksi_berubah', {
      nilaiAngka: this.indeksTerpilih,
      nilaiTeks: this.dapatkanItemTerpilih(),
    });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      item: this.item,
      indeksTerpilih: this.indeksTerpilih,
      banyakSeleksi: this.banyakSeleksi,
    };
  }
}
