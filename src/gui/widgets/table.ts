/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Tabel Data (Table Widget)
 */

import { Widget } from './base';
import { KolomTabelDefinisi, GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export class TabelWidget extends Widget {
  public kolom: KolomTabelDefinisi[] = [];
  public baris: Array<Record<string, any>> = [];
  public indeksBarisTerpilih: number = -1;
  public kolomUrut?: string;
  public arahUrut: 'naik' | 'turun' = 'naik';

  constructor(
    kolomAwal: Array<string | KolomTabelDefinisi> = [],
    barisAwal: Array<Record<string, any>> = [],
    gaya?: GayaWidget,
    id?: string
  ) {
    super('tabel', id, gaya);
    this.setKolom(kolomAwal);
    this.setBaris(barisAwal);
    this.aksesibilitas.peran = 'table';
  }

  public setKolom(kolomBaru: Array<string | KolomTabelDefinisi>): this {
    this.kolom = kolomBaru.map((k) => {
      if (typeof k === 'string') {
        return { id: k, judul: k };
      }
      return k;
    });
    return this;
  }

  public setBaris(barisBaru: Array<Record<string, any>>): this {
    this.baris = [...barisBaru];
    this.indeksBarisTerpilih = -1;
    return this;
  }

  public setData(data: Array<Record<string, any>>): this {
    return this.setBaris(data);
  }

  public getData(): Array<Record<string, any>> {
    return this.baris;
  }

  public tambahBaris(data: Record<string, any>): this {
    this.baris.push(data);
    return this;
  }

  public hapusBaris(indeks: number): boolean {
    if (indeks >= 0 && indeks < this.baris.length) {
      this.baris.splice(indeks, 1);
      if (this.indeksBarisTerpilih === indeks) {
        this.indeksBarisTerpilih = -1;
      }
      return true;
    }
    return false;
  }

  public pilihBaris(indeks: number): this {
    if (indeks >= 0 && indeks < this.baris.length) {
      this.indeksBarisTerpilih = indeks;
      this.picuPerubahan();
    }
    return this;
  }

  public dapatkanBarisTerpilih(): Record<string, any> | undefined {
    if (this.indeksBarisTerpilih >= 0 && this.indeksBarisTerpilih < this.baris.length) {
      return this.baris[this.indeksBarisTerpilih];
    }
    return undefined;
  }

  public urutkan(idKolom: string, arah?: 'naik' | 'turun'): this {
    if (arah) {
      this.arahUrut = arah;
    } else if (this.kolomUrut === idKolom) {
      this.arahUrut = this.arahUrut === 'naik' ? 'turun' : 'naik';
    } else {
      this.arahUrut = 'naik';
    }
    this.kolomUrut = idKolom;

    this.baris.sort((a, b) => {
      const valA = a[idKolom];
      const valB = b[idKolom];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      const res = valA < valB ? -1 : 1;
      return this.arahUrut === 'naik' ? res : -res;
    });

    return this;
  }

  public padaPerubahan(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('seleksi_berubah', penangan);
  }

  public async picuPerubahan(): Promise<void> {
    const evt = buatPeristiwaGUI(this.id, 'seleksi_berubah', {
      nilaiAngka: this.indeksBarisTerpilih,
      data: this.dapatkanBarisTerpilih(),
    });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      kolom: this.kolom,
      baris: this.baris,
      indeksBarisTerpilih: this.indeksBarisTerpilih,
      kolomUrut: this.kolomUrut,
      arahUrut: this.arahUrut,
    };
  }
}
