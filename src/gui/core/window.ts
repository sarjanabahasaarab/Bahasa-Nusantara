/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Manajemen Jendela GUI (Window Management System)
 */

import { KonfigurasiJendelaGUI, StatusJendela, JenisPeristiwaGUI, PenanganPeristiwaGUI } from '../types';
import { Widget } from '../widgets/base';
import { BilahMenu, BilahAlat } from '../menus/menu';
import { PengelolaPeristiwaGUI } from '../events/event_handler';
import { buatPeristiwaGUI } from '../events/event';

let counterIdJendela = 0;

export class JendelaGUI {
  public readonly id: string;
  public judul: string;
  public lebar: number;
  public tinggi: number;
  public lebarMin?: number;
  public tinggiMin?: number;
  public lebarMaks?: number;
  public tinggiMaks?: number;
  public posisiX?: number;
  public posisiY?: number;
  public dapatDiubahUkuran: boolean;
  public modal: boolean;
  public selaluDiAtas: boolean;
  public ikon?: string;
  public status: StatusJendela = 'normal';
  public kontenUtama: Widget | null = null;
  public bilahMenu: BilahMenu | null = null;
  public bilahAlat: BilahAlat | null = null;

  private readonly peristiwa: PengelolaPeristiwaGUI = new PengelolaPeristiwaGUI();
  private penutupKustom?: () => boolean | Promise<boolean>;

  constructor(konfigurasi: KonfigurasiJendelaGUI) {
    counterIdJendela++;
    this.id = konfigurasi.id || `jendela_${counterIdJendela}`;
    this.judul = konfigurasi.judul;
    this.lebar = konfigurasi.lebar ?? 800;
    this.tinggi = konfigurasi.tinggi ?? 600;
    this.lebarMin = konfigurasi.lebarMin;
    this.tinggiMin = konfigurasi.tinggiMin;
    this.lebarMaks = konfigurasi.lebarMaks;
    this.tinggiMaks = konfigurasi.tinggiMaks;
    this.posisiX = konfigurasi.posisiX;
    this.posisiY = konfigurasi.posisiY;
    this.dapatDiubahUkuran = konfigurasi.dapatDiubahUkuran ?? true;
    this.modal = konfigurasi.modal ?? false;
    this.selaluDiAtas = konfigurasi.selaluDiAtas ?? false;
    this.ikon = konfigurasi.ikon;
  }

  public setKonten(widget: Widget): this {
    this.kontenUtama = widget;
    return this;
  }

  public setJudul(judul: string): this {
    this.judul = judul;
    return this;
  }

  public setIkon(jalurIkon: string): this {
    this.ikon = jalurIkon;
    return this;
  }

  public setBilahMenu(menu: BilahMenu): this {
    this.bilahMenu = menu;
    return this;
  }

  public setBilahAlat(alat: BilahAlat): this {
    this.bilahAlat = alat;
    return this;
  }

  public ubahUkuran(lebar: number, tinggi: number): this {
    if (!this.dapatDiubahUkuran) return this;

    let targetLebar = lebar;
    let targetTinggi = tinggi;

    if (this.lebarMin !== undefined && targetLebar < this.lebarMin) targetLebar = this.lebarMin;
    if (this.lebarMaks !== undefined && targetLebar > this.lebarMaks) targetLebar = this.lebarMaks;
    if (this.tinggiMin !== undefined && targetTinggi < this.tinggiMin) targetTinggi = this.tinggiMin;
    if (this.tinggiMaks !== undefined && targetTinggi > this.tinggiMaks) targetTinggi = this.tinggiMaks;

    this.lebar = targetLebar;
    this.tinggi = targetTinggi;

    this.picu('jendela_ubah_ukuran', { lebar: this.lebar, tinggi: this.tinggi });
    return this;
  }

  public setPosisi(x: number, y: number): this {
    this.posisiX = x;
    this.posisiY = y;
    return this;
  }

  public maksimalkan(): this {
    this.status = 'dimaksimalkan';
    this.picu('jendela_dimaksimalkan');
    return this;
  }

  public minimalkan(): this {
    this.status = 'diminimalkan';
    this.picu('jendela_diminimalkan');
    return this;
  }

  public layarPenuh(): this {
    this.status = 'layar_penuh';
    return this;
  }

  public pulihkan(): this {
    this.status = 'normal';
    return this;
  }

  public sembunyikan(): this {
    this.status = 'tersembunyi';
    return this;
  }

  public tampilkan(): this {
    if (this.status === 'tersembunyi') {
      this.status = 'normal';
    }
    return this;
  }

  public onSebelumTutup(fn: () => boolean | Promise<boolean>): this {
    this.penutupKustom = fn;
    return this;
  }

  public async tutup(): Promise<boolean> {
    if (this.penutupKustom) {
      const bolehTutup = await this.penutupKustom();
      if (!bolehTutup) return false;
    }

    await this.picu('jendela_ditutup');
    this.status = 'tersembunyi';
    return true;
  }

  public pasang(jenis: JenisPeristiwaGUI, penangan: PenanganPeristiwaGUI): () => void {
    return this.peristiwa.pasang(jenis, penangan);
  }

  public async picu(jenis: JenisPeristiwaGUI, data?: any): Promise<void> {
    const evt = buatPeristiwaGUI(this.id, jenis, { data });
    await this.peristiwa.picu(evt);
  }

  public serialisasi(): Record<string, any> {
    return {
      id: this.id,
      judul: this.judul,
      lebar: this.lebar,
      tinggi: this.tinggi,
      status: this.status,
      dapatDiubahUkuran: this.dapatDiubahUkuran,
      modal: this.modal,
      selaluDiAtas: this.selaluDiAtas,
      ikon: this.ikon,
      bilahMenu: this.bilahMenu ? this.bilahMenu.serialisasi() : null,
      bilahAlat: this.bilahAlat ? this.bilahAlat.serialisasi() : null,
      konten: this.kontenUtama ? this.kontenUtama.serialisasi() : null,
    };
  }

  public hancurkan(): void {
    if (this.kontenUtama) {
      this.kontenUtama.hancurkan();
      this.kontenUtama = null;
    }
    this.peristiwa.bersihkan();
    this.bilahMenu = null;
    this.bilahAlat = null;
  }
}
