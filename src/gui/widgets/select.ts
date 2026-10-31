/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Komponen Dropdown / Pilihan (Select Widget)
 */

import { Widget } from './base';
import { GayaWidget, PenanganPeristiwaGUI } from '../types';
import { buatPeristiwaGUI } from '../events/event';

export interface OpsiDropdown {
  nilai: string;
  label: string;
  nonaktif?: boolean;
}

export class PilihanDropdownWidget extends Widget {
  public opsi: OpsiDropdown[] = [];
  public nilaiTerpilih?: string;
  public placeholder: string;

  constructor(
    daftarOpsi: Array<string | OpsiDropdown> = [],
    nilaiAwal?: string,
    placeholder: string = 'Pilih salah satu...',
    gaya?: GayaWidget,
    id?: string
  ) {
    super('pilihan', id, gaya);
    this.placeholder = placeholder;
    this.setDaftarOpsi(daftarOpsi);
    if (nilaiAwal !== undefined) {
      this.nilaiTerpilih = nilaiAwal;
    }
    this.aksesibilitas.peran = 'combobox';
    this.aksesibilitas.label = placeholder;
  }

  public setDaftarOpsi(daftar: Array<string | OpsiDropdown>): this {
    this.opsi = daftar.map((item) => {
      if (typeof item === 'string') {
        return { nilai: item, label: item };
      }
      return item;
    });
    return this;
  }

  public tambahOpsi(label: string, nilai?: string): this {
    this.opsi.push({ label, nilai: nilai ?? label });
    return this;
  }

  public pilih(nilai: string): this {
    if (!this.aktif) return this;
    const berubah = this.nilaiTerpilih !== nilai;
    this.nilaiTerpilih = nilai;
    if (berubah) {
      this.picuPerubahan();
    }
    return this;
  }

  public setTerpilih(nilai: string): this {
    return this.pilih(nilai);
  }

  public dapatkanNilai(): string | undefined {
    return this.nilaiTerpilih;
  }

  public getTerpilih(): string | undefined {
    return this.dapatkanNilai();
  }

  public padaPerubahan(penangan: PenanganPeristiwaGUI): () => void {
    return this.pasang('seleksi_berubah', penangan);
  }

  public async picuPerubahan(): Promise<void> {
    const evt = buatPeristiwaGUI(this.id, 'seleksi_berubah', { nilaiTeks: this.nilaiTerpilih });
    await this.peristiwa.picu(evt);
  }

  public override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      opsi: this.opsi,
      nilaiTerpilih: this.nilaiTerpilih,
      placeholder: this.placeholder,
    };
  }
}
