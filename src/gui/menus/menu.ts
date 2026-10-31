/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Sistem Menu Desktop (Menu Bar, Toolbar, Context Menu & Shortcuts)
 */

import { ItemMenuDefinisi } from '../types';

export class ItemMenu {
  public id: string;
  public label: string;
  public shortcut?: string;
  public ikon?: string;
  public nonaktif: boolean = false;
  public tercentang?: boolean;
  public pemisah: boolean = false;
  public submenu?: Menu;
  public aksi?: () => void;

  constructor(definisiOrLabel: string | Partial<ItemMenuDefinisi>, aksi?: () => void, shortcut?: string) {
    let definisi: Partial<ItemMenuDefinisi>;
    if (typeof definisiOrLabel === 'string') {
      definisi = { label: definisiOrLabel, aksi, shortcut };
    } else {
      definisi = definisiOrLabel;
    }

    this.id = definisi.id || `menu_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.label = definisi.label || '';
    this.shortcut = definisi.shortcut;
    this.ikon = definisi.ikon;
    this.nonaktif = definisi.nonaktif ?? false;
    this.tercentang = definisi.tercentang;
    this.pemisah = definisi.pemisah ?? false;
    this.aksi = definisi.aksi;

    if (definisi.submenu) {
      this.submenu = new Menu(this.label);
      for (const item of definisi.submenu) {
        this.submenu.tambahItem(new ItemMenu(item));
      }
    }
  }

  public static buatPemisah(): ItemMenu {
    return new ItemMenu({ pemisah: true, label: '-' });
  }

  public jalankanAksi(): void {
    if (this.nonaktif || this.pemisah) return;
    if (this.tercentang !== undefined) {
      this.tercentang = !this.tercentang;
    }
    if (this.aksi) {
      try {
        this.aksi();
      } catch (err) {
        console.error(`[ItemMenu] Galat saat menjalankan aksi '${this.label}':`, err);
      }
    }
  }

  public eksekusi(): void {
    this.jalankanAksi();
  }

  public toJSON(): ItemMenuDefinisi {
    return {
      id: this.id,
      label: this.label,
      shortcut: this.shortcut,
      ikon: this.ikon,
      nonaktif: this.nonaktif,
      tercentang: this.tercentang,
      pemisah: this.pemisah,
      submenu: this.submenu ? this.submenu.toJSON() : undefined,
    };
  }

  public serialisasi(): ItemMenuDefinisi {
    return this.toJSON();
  }
}

export class Menu {
  public judul: string;
  public daftarItem: ItemMenu[] = [];

  constructor(judul: string) {
    this.judul = judul;
  }

  public get item(): ItemMenu[] {
    return this.daftarItem;
  }

  public tambahItem(item: ItemMenu | Partial<ItemMenuDefinisi>): this {
    const obj = item instanceof ItemMenu ? item : new ItemMenu(item);
    this.daftarItem.push(obj);
    return this;
  }

  public tambahPemisah(): this {
    this.daftarItem.push(ItemMenu.buatPemisah());
    return this;
  }

  public toJSON(): ItemMenuDefinisi[] {
    return this.daftarItem.map((item) => item.toJSON());
  }

  public serialisasi(): ItemMenuDefinisi[] {
    return this.toJSON();
  }
}

export class BilahMenu {
  public daftarMenu: Menu[] = [];

  public tambahMenu(menu: Menu | string): Menu {
    const obj = typeof menu === 'string' ? new Menu(menu) : menu;
    this.daftarMenu.push(obj);
    return obj;
  }

  public toJSON(): Array<{ judul: string; item: ItemMenuDefinisi[] }> {
    return this.daftarMenu.map((m) => ({
      judul: m.judul,
      item: m.toJSON(),
    }));
  }

  public serialisasi(): Array<{ judul: string; item: ItemMenuDefinisi[] }> {
    return this.toJSON();
  }
}

export class BilahAlat {
  public daftarTombol: ItemMenu[] = [];

  public get daftarAksi(): ItemMenu[] {
    return this.daftarTombol;
  }

  public tambahTombol(tombol: ItemMenu | Partial<ItemMenuDefinisi>): ItemMenu {
    const item = tombol instanceof ItemMenu ? tombol : new ItemMenu(tombol);
    this.daftarTombol.push(item);
    return item;
  }

  public tambahAksi(tombol: ItemMenu | Partial<ItemMenuDefinisi>): ItemMenu {
    return this.tambahTombol(tombol);
  }

  public toJSON(): ItemMenuDefinisi[] {
    return this.daftarTombol.map((t) => t.toJSON());
  }

  public serialisasi(): ItemMenuDefinisi[] {
    return this.toJSON();
  }
}

export class MenuKonteks {
  public menu: Menu;

  constructor(judul: string = 'Konteks') {
    this.menu = new Menu(judul);
  }

  public tambahItem(item: ItemMenu | Partial<ItemMenuDefinisi>): this {
    this.menu.tambahItem(item);
    return this;
  }

  public tambahPemisah(): this {
    this.menu.tambahPemisah();
    return this;
  }

  public toJSON(): ItemMenuDefinisi[] {
    return this.menu.toJSON();
  }

  public serialisasi(): ItemMenuDefinisi[] {
    return this.toJSON();
  }
}
