/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Tombol Radio & Grup Radio (Radio Button Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

const mapGrupGlobal: Map<string, GrupRadio> = new Map();

export class GrupRadio {
  public readonly nama: string;
  private readonly anggota: Set<TombolRadioWidget> = new Set();
  private nilaiTerpilih?: string;
  private paraPendengar: Set<(nilai: string) => void> = new Set();

  constructor(nama: string, nilaiAwal?: string) {
    this.nama = nama;
    this.nilaiTerpilih = nilaiAwal;
    mapGrupGlobal.set(nama, this);
  }

  public static dapatkanAtauBuat(nama: string): GrupRadio {
    let g = mapGrupGlobal.get(nama);
    if (!g) {
      g = new GrupRadio(nama);
      mapGrupGlobal.set(nama, g);
    }
    return g;
  }

  public daftarkan(radio: TombolRadioWidget): void {
    this.anggota.add(radio);
    if (this.nilaiTerpilih !== undefined && radio.nilai === this.nilaiTerpilih) {
      radio.terpilih = true;
    }
  }

  public tambah(radio: TombolRadioWidget): void {
    this.daftarkan(radio);
  }

  public keluarkan(radio: TombolRadioWidget): void {
    this.anggota.delete(radio);
  }

  public pilih(nilai: string): void {
    if (this.nilaiTerpilih === nilai) return;
    this.nilaiTerpilih = nilai;

    for (const r of this.anggota) {
      r.terpilih = r.nilai === nilai;
    }

    for (const fn of this.paraPendengar) {
      try {
        fn(nilai);
      } catch (err) {
        console.error('[GrupRadio] Galat pada pendengar grup radio:', err);
      }
    }
  }

  public dapatkanNilai(): string | undefined {
    return this.nilaiTerpilih;
  }

  public getTerpilih(): string | undefined {
    return this.dapatkanNilai();
  }

  public pasangPerubahan(fn: (nilai: string) => void): () => void {
    this.paraPendengar.add(fn);
    return () => this.paraPendengar.delete(fn);
  }
}

export class TombolRadioWidget extends Widget {
  public label: string;
  public nilai: string;
  public terpilih: boolean = false;
  public grup?: GrupRadio;

  constructor(label: string, nilai: string, grup?: GrupRadio | string, terpilihAwal: boolean = false, gaya?: GayaWidget, id?: string) {
    super('tombol_radio', id, gaya);
    this.label = label;
    this.nilai = nilai;
    this.terpilih = terpilihAwal;
    this.aksesibilitas.peran = 'radio';
    this.aksesibilitas.label = label;

    if (grup) {
      const grupObj = typeof grup === 'string' ? GrupRadio.dapatkanAtauBuat(grup) : grup;
      this.tetapkanGrup(grupObj);
    }
  }

  public tetapkanGrup(grup: GrupRadio): this {
    if (this.grup) {
      this.grup.keluarkan(this);
    }
    this.grup = grup;
    grup.daftarkan(this);
    return this;
  }

  public setTerpilih(status: boolean): this {
    if (status) {
      this.pilih();
    } else {
      this.terpilih = false;
      this.picuPerubahan();
    }
    return this;
  }

  public pilih(): this {
    if (!this.aktif) return this;
    if (this.grup) {
      this.grup.pilih(this.nilai);
    } else {
      this.terpilih = true;
    }
    this.picuPerubahan();
    return this;
  }

  public padaPerubahan(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('nilai_berubah', penangan);
  }

  public async picuPerubahan(): Promise<void> {
    const evt = buatPeristiwaGUI(this.id, 'nilai_berubah', { nilaiTeks: this.nilai, nilaiLogika: this.terpilih });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      label: this.label,
      nilai: this.nilai,
      terpilih: this.terpilih,
      namaGrup: this.grup?.nama,
    };
  }
}
