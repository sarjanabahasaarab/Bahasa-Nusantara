/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Pengelola Input Mouse, Fokus Keyboard & Pintasan Menu Desktop
 */

import { JendelaGUI } from '../core/window';
import { Widget } from '../widgets/base';
import { MesinTataLetak, TataLetakJendela } from '../layout/layout_engine';
import { TombolWidget } from '../widgets/button';
import { InputTeksWidget } from '../widgets/text_input';
import { AreaTeksWidget } from '../widgets/text_area';
import { KotakCentangWidget } from '../widgets/checkbox';
import { TombolRadioWidget } from '../widgets/radio_button';
import { SliderWidget } from '../widgets/slider';
import { TabWidget } from '../widgets/tab';
import { TabelWidget } from '../widgets/table';
import { DaftarWidget } from '../widgets/list';
import { sesuaikanShortcutOS, temukanWidgetDapatDifokuskan } from '../accessibility/a11y';
import { ItemMenu } from '../menus/menu';

export interface OpsiTombolKeyboard {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export class PengelolaInputGUI {
  private readonly jendela: JendelaGUI;
  private readonly mesinTataLetak = new MesinTataLetak();
  private idWidgetFokus: string | null = null;
  private idWidgetHover: string | null = null;

  constructor(jendela: JendelaGUI) {
    this.jendela = jendela;
  }

  public getIdWidgetFokus(): string | null {
    return this.idWidgetFokus;
  }

  public getIdWidgetHover(): string | null {
    return this.idWidgetHover;
  }

  public async setFokus(widget: Widget | null): Promise<void> {
    if (this.idWidgetFokus === (widget?.id ?? null)) return;
    if (this.idWidgetFokus) {
      const lama = this.cariWidgetById(this.jendela.kontenUtama, this.idWidgetFokus);
      if (lama) await lama.picu('blur');
    }
    this.idWidgetFokus = widget?.id ?? null;
    if (widget) {
      await widget.picu('fokus');
    }
  }

  public async gerakMouse(x: number, y: number): Promise<Widget | null> {
    const layout = this.mesinTataLetak.hitungTataLetakJendela(this.jendela);
    const node = this.mesinTataLetak.cariNodePadaTitik(layout.akarKonten, x, y);
    const targetId = node?.widget.id ?? null;

    if (this.idWidgetHover && this.idWidgetHover !== targetId) {
      const lama = this.cariWidgetById(this.jendela.kontenUtama, this.idWidgetHover);
      if (lama) await lama.picu('mouse_keluar', { posisiX: x, posisiY: y });
    }
    this.idWidgetHover = targetId;
    if (node && node.widget.id) {
      await node.widget.picu('mouse_masuk', { posisiX: x, posisiY: y });
    }
    return node?.widget ?? null;
  }

  public async klikMouse(x: number, y: number, klikGanda: boolean = false): Promise<Widget | null> {
    const layout: TataLetakJendela = this.mesinTataLetak.hitungTataLetakJendela(this.jendela);
    const node = this.mesinTataLetak.cariNodePadaTitik(layout.akarKonten, x, y);
    if (!node || !node.widget.aktif) {
      await this.setFokus(null);
      return null;
    }

    const w = node.widget;
    const dapatFokus = this.jendela.kontenUtama
      ? temukanWidgetDapatDifokuskan(this.jendela.kontenUtama).some((item) => item.id === w.id)
      : false;
    if (dapatFokus) {
      await this.setFokus(w);
    }

    if (w instanceof TombolWidget) {
      await w.klik();
    } else if (w instanceof KotakCentangWidget) {
      w.toggle();
    } else if (w instanceof TombolRadioWidget) {
      w.pilih();
    } else if (w instanceof SliderWidget) {
      const rasio = node.kotak.lebar > 0 ? Math.min(1, Math.max(0, (x - node.kotak.x) / node.kotak.lebar)) : 0;
      const nilaiBaru = Math.round(w.nilaiMin + rasio * (w.nilaiMaks - w.nilaiMin));
      w.setNilai(nilaiBaru);
    } else if (w instanceof TabWidget) {
      if (y <= node.kotak.y + MesinTataLetak.TINGGI_HEADER_TAB) {
        let tx = node.kotak.x + 4;
        for (let i = 0; i < w.daftarTab.length; i++) {
          const tw = Math.max(72, w.daftarTab[i].judul.length * 7 + 20);
          if (x >= tx && x <= tx + tw) {
            w.pilihTab(i);
            break;
          }
          tx += tw + 4;
        }
      }
    } else if (w instanceof TabelWidget) {
      const offsetRow = y - (node.kotak.y + 28);
      if (offsetRow >= 0) {
        const idx = Math.floor(offsetRow / 28);
        if (idx >= 0 && idx < w.baris.length) {
          w.pilihBaris(idx);
        }
      }
    } else if (w instanceof DaftarWidget) {
      const idx = Math.floor((y - (node.kotak.y + 4)) / 26);
      if (idx >= 0 && idx < w.item.length) {
        w.pilih(idx);
      }
    }

    await w.picu(klikGanda ? 'klik_ganda' : 'klik', { posisiX: x, posisiY: y });
    return w;
  }

  public async tekanTombol(kunci: string, mod: OpsiTombolKeyboard = {}): Promise<boolean> {
    // 1. Periksa pintasan menu global terlebih dahulu
    if ((mod.ctrl || mod.meta || mod.alt) && this.jendela.bilahMenu) {
      const prefix: string[] = [];
      if (mod.ctrl) prefix.push('Ctrl');
      if (mod.meta) prefix.push('Cmd');
      if (mod.alt) prefix.push('Alt');
      if (mod.shift) prefix.push('Shift');
      const kombo = `${prefix.join('+')}+${kunci.toUpperCase()}`;
      const komboNorm = sesuaikanShortcutOS(kombo, 'linux').toLowerCase();

      const itemCocok = this.cariShortcutMenu(komboNorm);
      if (itemCocok) {
        itemCocok.jalankanAksi();
        return true;
      }
    }

    // 2. Navigasi fokus Tab / Shift+Tab
    if (kunci === 'Tab' && this.jendela.kontenUtama) {
      const fokusList = temukanWidgetDapatDifokuskan(this.jendela.kontenUtama);
      if (fokusList.length === 0) return false;
      const idxSaatIni = this.idWidgetFokus ? fokusList.findIndex((w) => w.id === this.idWidgetFokus) : -1;
      const arah = mod.shift ? -1 : 1;
      const idxBaru = idxSaatIni === -1 ? 0 : (idxSaatIni + arah + fokusList.length) % fokusList.length;
      await this.setFokus(fokusList[idxBaru]);
      return true;
    }

    // 3. Pengiriman tombol ke widget terfokus
    if (!this.idWidgetFokus) return false;
    const w = this.cariWidgetById(this.jendela.kontenUtama, this.idWidgetFokus);
    if (!w || !w.aktif) return false;

    await w.picu('tombol_ditekan', { kunciKeyboard: kunci });

    if (w instanceof TombolWidget && (kunci === 'Enter' || kunci === ' ')) {
      await w.klik();
      return true;
    }
    if (w instanceof KotakCentangWidget && kunci === ' ') {
      w.toggle();
      return true;
    }
    if (w instanceof TombolRadioWidget && (kunci === 'Enter' || kunci === ' ')) {
      w.pilih();
      return true;
    }
    if (w instanceof InputTeksWidget) {
      if (kunci === 'Backspace') {
        w.setNilai(w.getNilai().slice(0, -1));
        return true;
      }
      if (kunci.length === 1 && !mod.ctrl && !mod.meta) {
        w.setNilai(w.getNilai() + kunci);
        return true;
      }
    }
    if (w instanceof AreaTeksWidget) {
      if (kunci === 'Backspace') {
        w.setNilai(w.getNilai().slice(0, -1));
        return true;
      }
      if (kunci === 'Enter') {
        w.setNilai(w.getNilai() + '\n');
        return true;
      }
      if (kunci.length === 1 && !mod.ctrl && !mod.meta) {
        w.setNilai(w.getNilai() + kunci);
        return true;
      }
    }

    return true;
  }

  private cariShortcutMenu(komboNorm: string): ItemMenu | null {
    if (!this.jendela.bilahMenu) return null;
    for (const menu of this.jendela.bilahMenu.daftarMenu) {
      for (const item of menu.daftarItem) {
        if (item.shortcut && !item.nonaktif && !item.pemisah) {
          const itemNorm = sesuaikanShortcutOS(item.shortcut, 'linux').toLowerCase();
          if (itemNorm === komboNorm) return item;
        }
      }
    }
    return null;
  }

  private cariWidgetById(akar: Widget | null, id: string): Widget | null {
    if (!akar) return null;
    if (akar.id === id) return akar;
    for (const anak of akar.anak) {
      const ketemu = this.cariWidgetById(anak, id);
      if (ketemu) return ketemu;
    }
    return null;
  }
}
