/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Mesin Tata Letak Geometris Desktop (Box Model, Flex, Grid, Stack & Scroll Solver)
 */

import { Widget } from '../widgets/base';
import { JendelaGUI } from '../core/window';
import { GayaWidget, PerataanLayout } from '../types';
import { BarisLayout } from './row';
import { KolomLayout } from './column';
import { GridLayout } from './grid';
import { WadahGulirWidget } from './scroll';
import { LabelWidget } from '../widgets/label';
import { TombolWidget } from '../widgets/button';
import { InputTeksWidget } from '../widgets/text_input';
import { AreaTeksWidget } from '../widgets/text_area';
import { KotakCentangWidget } from '../widgets/checkbox';
import { TombolRadioWidget } from '../widgets/radio_button';
import { PilihanDropdownWidget } from '../widgets/select';
import { DaftarWidget } from '../widgets/list';
import { TabelWidget } from '../widgets/table';
import { GambarWidget } from '../widgets/image';
import { TabWidget } from '../widgets/tab';

export interface KotakTataLetak {
  x: number;
  y: number;
  lebar: number;
  tinggi: number;
}

export interface NodeTataLetak {
  widget: Widget;
  kotak: KotakTataLetak;
  kotakKonten: KotakTataLetak;
  anak: NodeTataLetak[];
}

export interface TataLetakJendela {
  idJendela: string;
  lebar: number;
  tinggi: number;
  kotakBilahMenu: KotakTataLetak | null;
  kotakBilahAlat: KotakTataLetak | null;
  kotakKonten: KotakTataLetak;
  akarKonten: NodeTataLetak | null;
  petaKotak: Map<string, NodeTataLetak>;
}

interface PaddingMargin {
  atas: number;
  kanan: number;
  bawah: number;
  kiri: number;
}

function uraiSpasi(nilai?: number | [number, number] | [number, number, number, number]): PaddingMargin {
  if (typeof nilai === 'number') {
    return { atas: nilai, kanan: nilai, bawah: nilai, kiri: nilai };
  }
  if (Array.isArray(nilai)) {
    if (nilai.length === 2) {
      return { atas: nilai[0], kanan: nilai[1], bawah: nilai[0], kiri: nilai[1] };
    }
    if (nilai.length === 4) {
      return { atas: nilai[0], kanan: nilai[1], bawah: nilai[2], kiri: nilai[3] };
    }
  }
  return { atas: 0, kanan: 0, bawah: 0, kiri: 0 };
}

function uraiUkuran(nilai: number | string | undefined, referensi: number): number | undefined {
  if (typeof nilai === 'number' && Number.isFinite(nilai)) {
    return Math.max(0, nilai);
  }
  if (typeof nilai === 'string') {
    const trimmed = nilai.trim();
    if (trimmed.endsWith('%')) {
      const persen = parseFloat(trimmed.slice(0, -1));
      if (Number.isFinite(persen)) {
        return Math.max(0, Math.round((referensi * persen) / 100));
      }
    }
    if (trimmed.endsWith('px')) {
      const px = parseFloat(trimmed.slice(0, -2));
      if (Number.isFinite(px)) return Math.max(0, px);
    }
    const num = parseFloat(trimmed);
    if (Number.isFinite(num)) return Math.max(0, num);
  }
  return undefined;
}

function jepitUkuran(gaya: GayaWidget, lebar: number, tinggi: number): { lebar: number; tinggi: number } {
  let l = lebar;
  let t = tinggi;
  if (gaya.lebarMin !== undefined) l = Math.max(l, gaya.lebarMin);
  if (gaya.lebarMaks !== undefined) l = Math.min(l, gaya.lebarMaks);
  if (gaya.tinggiMin !== undefined) t = Math.max(t, gaya.tinggiMin);
  if (gaya.tinggiMaks !== undefined) t = Math.min(t, gaya.tinggiMaks);
  return { lebar: Math.max(0, Math.round(l)), tinggi: Math.max(0, Math.round(t)) };
}

export class MesinTataLetak {
  public static readonly TINGGI_BILAH_MENU = 28;
  public static readonly TINGGI_BILAH_ALAT = 36;
  public static readonly TINGGI_HEADER_TAB = 32;

  /**
   * Menghitung ukuran intrinsik minimum/wajar suatu widget berdasarkan jenis & isinya.
   */
  public ukurIntrinsik(widget: Widget, lebarTersedia: number = 400): { lebar: number; tinggi: number } {
    if (!widget.terlihat) return { lebar: 0, tinggi: 0 };

    const pad = uraiSpasi(widget.gaya.padding);
    const eksplisitLebar = uraiUkuran(widget.gaya.lebar, lebarTersedia);
    const eksplisitTinggi = uraiUkuran(widget.gaya.tinggi, lebarTersedia);

    let lebar = 120;
    let tinggi = 32;

    switch (widget.jenis) {
      case 'label': {
        const lbl = widget as LabelWidget;
        const fontSize = widget.gaya.ukuranFont ?? 14;
        const lebarKarakter = fontSize * 0.6;
        const teks = lbl.teks || '';
        const estimasiLebar = Math.ceil(teks.length * lebarKarakter) + 8;
        lebar = Math.min(lebarTersedia, Math.max(40, estimasiLebar));
        const baris = lbl.bungkusTeks && lebar > 0 ? Math.max(1, Math.ceil(estimasiLebar / lebar)) : 1;
        tinggi = Math.ceil(baris * (fontSize * 1.45)) + 4;
        break;
      }
      case 'tombol': {
        const btn = widget as TombolWidget;
        const teks = btn.teks || '';
        lebar = Math.max(88, Math.ceil(teks.length * 8.2) + 32);
        tinggi = 36;
        break;
      }
      case 'input_teks': {
        const inp = widget as InputTeksWidget;
        const panjang = Math.max(inp.nilai.length, inp.placeholder.length, 16);
        lebar = Math.min(lebarTersedia, Math.max(180, panjang * 8 + 24));
        tinggi = 36;
        break;
      }
      case 'area_teks': {
        const area = widget as AreaTeksWidget;
        lebar = Math.min(lebarTersedia, 320);
        tinggi = Math.max(84, (area.baris || 4) * 20 + 16);
        break;
      }
      case 'kotak_centang': {
        const cb = widget as KotakCentangWidget;
        lebar = Math.max(100, cb.label.length * 8 + 34);
        tinggi = 28;
        break;
      }
      case 'tombol_radio': {
        const rb = widget as TombolRadioWidget;
        lebar = Math.max(100, rb.label.length * 8 + 34);
        tinggi = 28;
        break;
      }
      case 'pilihan': {
        const sel = widget as PilihanDropdownWidget;
        const terpanjang = sel.opsi.reduce((m: number, o) => Math.max(m, o.label.length), 10);
        lebar = Math.max(150, terpanjang * 8 + 40);
        tinggi = 36;
        break;
      }
      case 'daftar': {
        const dft = widget as DaftarWidget;
        lebar = Math.min(lebarTersedia, 280);
        tinggi = Math.max(60, Math.min(260, dft.item.length * 28 + 12));
        break;
      }
      case 'tabel': {
        const tbl = widget as TabelWidget;
        lebar = Math.min(lebarTersedia, Math.max(240, tbl.kolom.length * 110));
        tinggi = Math.max(72, Math.min(320, (tbl.baris.length + 1) * 30 + 8));
        break;
      }
      case 'gambar': {
        const gbr = widget as GambarWidget;
        lebar = gbr.lebar ?? 120;
        tinggi = gbr.tinggi ?? 90;
        break;
      }
      case 'progres': {
        lebar = Math.min(lebarTersedia, 240);
        tinggi = 18;
        break;
      }
      case 'slider': {
        lebar = Math.min(lebarTersedia, 220);
        tinggi = 28;
        break;
      }
      case 'tab': {
        const tab = widget as TabWidget;
        const aktif = tab.dapatkanTabAktif();
        const ukKonten = aktif ? this.ukurIntrinsik(aktif.konten, lebarTersedia) : { lebar: 240, tinggi: 120 };
        lebar = Math.max(240, ukKonten.lebar);
        tinggi = MesinTataLetak.TINGGI_HEADER_TAB + ukKonten.tinggi + 16;
        break;
      }
      case 'baris': {
        const br = widget as BarisLayout;
        let totL = 0;
        let maksT = 0;
        const anakVisible = br.anak.filter((a) => a.terlihat);
        for (let i = 0; i < anakVisible.length; i++) {
          const uk = this.ukurIntrinsik(anakVisible[i], lebarTersedia);
          totL += uk.lebar + (i > 0 ? br.jarak : 0);
          maksT = Math.max(maksT, uk.tinggi);
        }
        lebar = Math.max(80, totL + pad.kiri + pad.kanan);
        tinggi = Math.max(36, maksT + pad.atas + pad.bawah);
        break;
      }
      case 'kolom': {
        const kl = widget as KolomLayout;
        let maksL = 0;
        let totT = 0;
        const anakVisible = kl.anak.filter((a) => a.terlihat);
        for (let i = 0; i < anakVisible.length; i++) {
          const uk = this.ukurIntrinsik(anakVisible[i], lebarTersedia);
          maksL = Math.max(maksL, uk.lebar);
          totT += uk.tinggi + (i > 0 ? kl.jarak : 0);
        }
        lebar = Math.max(100, maksL + pad.kiri + pad.kanan);
        tinggi = Math.max(40, totT + pad.atas + pad.bawah);
        break;
      }
      case 'grid': {
        const gr = widget as GridLayout;
        const cols = Math.max(1, gr.jumlahKolom);
        const anakVisible = gr.anak.filter((a) => a.terlihat);
        const rows = Math.max(1, Math.ceil(anakVisible.length / cols));
        let maxCellW = 80;
        let maxCellH = 36;
        for (const a of anakVisible) {
          const uk = this.ukurIntrinsik(a, Math.floor(lebarTersedia / cols));
          maxCellW = Math.max(maxCellW, uk.lebar);
          maxCellH = Math.max(maxCellH, uk.tinggi);
        }
        lebar = cols * maxCellW + (cols - 1) * gr.jarakKolom + pad.kiri + pad.kanan;
        tinggi = rows * maxCellH + (rows - 1) * gr.jarakBaris + pad.atas + pad.bawah;
        break;
      }
      case 'stack':
      case 'wadah':
      case 'gulir': {
        let maksL = 120;
        let maksT = 60;
        for (const a of widget.anak) {
          if (!a.terlihat) continue;
          const uk = this.ukurIntrinsik(a, lebarTersedia);
          maksL = Math.max(maksL, uk.lebar);
          maksT = Math.max(maksT, uk.tinggi);
        }
        lebar = maksL + pad.kiri + pad.kanan;
        tinggi = maksT + pad.atas + pad.bawah;
        break;
      }
    }

    return jepitUkuran(widget.gaya, eksplisitLebar ?? lebar, eksplisitTinggi ?? tinggi);
  }

  /**
   * Menghitung pohon tata letak lengkap untuk sebuah JendelaGUI.
   */
  public hitungTataLetakJendela(jendela: JendelaGUI): TataLetakJendela {
    const lebar = Math.max(1, jendela.lebar);
    const tinggi = Math.max(1, jendela.tinggi);
    const petaKotak = new Map<string, NodeTataLetak>();

    let ySaatIni = 0;
    let kotakBilahMenu: KotakTataLetak | null = null;
    if (jendela.bilahMenu && jendela.bilahMenu.daftarMenu.length > 0) {
      kotakBilahMenu = { x: 0, y: ySaatIni, lebar, tinggi: MesinTataLetak.TINGGI_BILAH_MENU };
      ySaatIni += MesinTataLetak.TINGGI_BILAH_MENU;
    }

    let kotakBilahAlat: KotakTataLetak | null = null;
    if (jendela.bilahAlat && jendela.bilahAlat.daftarTombol.length > 0) {
      kotakBilahAlat = { x: 0, y: ySaatIni, lebar, tinggi: MesinTataLetak.TINGGI_BILAH_ALAT };
      ySaatIni += MesinTataLetak.TINGGI_BILAH_ALAT;
    }

    const kotakKonten: KotakTataLetak = {
      x: 12,
      y: ySaatIni + 12,
      lebar: Math.max(1, lebar - 24),
      tinggi: Math.max(1, tinggi - ySaatIni - 24),
    };

    const akarKonten = jendela.kontenUtama
      ? this.hitungWidget(jendela.kontenUtama, kotakKonten, petaKotak)
      : null;

    return {
      idJendela: jendela.id,
      lebar,
      tinggi,
      kotakBilahMenu,
      kotakBilahAlat,
      kotakKonten,
      akarKonten,
      petaKotak,
    };
  }

  public hitungWidget(
    widget: Widget,
    batas: KotakTataLetak,
    petaKotak: Map<string, NodeTataLetak> = new Map()
  ): NodeTataLetak {
    const margin = uraiSpasi(widget.gaya.margin);
    const pad = uraiSpasi(widget.gaya.padding);

    const kotak: KotakTataLetak = {
      x: Math.round(batas.x + margin.kiri),
      y: Math.round(batas.y + margin.atas),
      lebar: Math.max(0, Math.round(batas.lebar - margin.kiri - margin.kanan)),
      tinggi: Math.max(0, Math.round(batas.tinggi - margin.atas - margin.bawah)),
    };

    const kotakKonten: KotakTataLetak = {
      x: kotak.x + pad.kiri,
      y: kotak.y + pad.atas,
      lebar: Math.max(0, kotak.lebar - pad.kiri - pad.kanan),
      tinggi: Math.max(0, kotak.tinggi - pad.atas - pad.bawah),
    };

    const node: NodeTataLetak = {
      widget,
      kotak,
      kotakKonten,
      anak: [],
    };
    petaKotak.set(widget.id, node);

    if (!widget.terlihat || widget.anak.length === 0) {
      return node;
    }

    const anakTerlihat = widget.anak.filter((a) => a.terlihat);
    if (anakTerlihat.length === 0) {
      return node;
    }

    if (widget.jenis === 'baris') {
      const br = widget as BarisLayout;
      const jarak = br.jarak ?? widget.gaya.gap ?? 8;
      this.letakkanLinear(anakTerlihat, kotakKonten, 'horizontal', jarak, br.perataan, br.perataanSilang, node, petaKotak);
    } else if (widget.jenis === 'kolom') {
      const kl = widget as KolomLayout;
      const jarak = kl.jarak ?? widget.gaya.gap ?? 8;
      this.letakkanLinear(anakTerlihat, kotakKonten, 'vertikal', jarak, kl.perataan, kl.perataanSilang, node, petaKotak);
    } else if (widget.jenis === 'grid') {
      const gr = widget as GridLayout;
      this.letakkanGrid(anakTerlihat, kotakKonten, gr, node, petaKotak);
    } else if (widget.jenis === 'tab') {
      const tab = widget as TabWidget;
      const aktif = tab.dapatkanTabAktif();
      if (aktif) {
        const batasTab: KotakTataLetak = {
          x: kotakKonten.x + 8,
          y: kotakKonten.y + MesinTataLetak.TINGGI_HEADER_TAB + 8,
          lebar: Math.max(0, kotakKonten.lebar - 16),
          tinggi: Math.max(0, kotakKonten.tinggi - MesinTataLetak.TINGGI_HEADER_TAB - 16),
        };
        node.anak.push(this.hitungWidget(aktif.konten, batasTab, petaKotak));
      }
    } else if (widget.jenis === 'stack') {
      for (const a of anakTerlihat) {
        node.anak.push(this.hitungWidget(a, kotakKonten, petaKotak));
      }
    } else if (widget.jenis === 'gulir') {
      const gr = widget as WadahGulirWidget;
      let cursorY = kotakKonten.y;
      for (const a of anakTerlihat) {
        const uk = this.ukurIntrinsik(a, kotakKonten.lebar);
        const childBatas: KotakTataLetak = {
          x: kotakKonten.x,
          y: cursorY,
          lebar: gr.gulirHorizontal ? Math.max(kotakKonten.lebar, uk.lebar) : kotakKonten.lebar,
          tinggi: gr.gulirVertikal ? uk.tinggi : Math.min(kotakKonten.tinggi, uk.tinggi),
        };
        node.anak.push(this.hitungWidget(a, childBatas, petaKotak));
        cursorY += uk.tinggi + 8;
      }
    } else {
      // wadah / container default: vertikal berurutan
      this.letakkanLinear(anakTerlihat, kotakKonten, 'vertikal', widget.gaya.gap ?? 8, 'awal', 'awal', node, petaKotak);
    }

    return node;
  }

  private letakkanLinear(
    anak: Widget[],
    area: KotakTataLetak,
    arah: 'horizontal' | 'vertikal',
    jarak: number,
    perataanUtama: PerataanLayout,
    perataanSilang: PerataanLayout,
    indukNode: NodeTataLetak,
    petaKotak: Map<string, NodeTataLetak>
  ): void {
    const totalJarak = Math.max(0, anak.length - 1) * jarak;
    const ukuranUtamaArea = arah === 'horizontal' ? area.lebar : area.tinggi;
    const ukuranSilangArea = arah === 'horizontal' ? area.tinggi : area.lebar;

    const ukuranAnak = anak.map((a) => {
      const uk = this.ukurIntrinsik(a, area.lebar);
      const flex = a.gaya.flex ?? 0;
      const utama = arah === 'horizontal' ? uk.lebar : uk.tinggi;
      const silang = arah === 'horizontal' ? uk.tinggi : uk.lebar;
      return { widget: a, utama, silang, flex };
    });

    const totalFlex = ukuranAnak.reduce((s, item) => s + (item.flex > 0 ? item.flex : 0), 0);
    const totalTetap = ukuranAnak.reduce((s, item) => s + (item.flex > 0 ? 0 : item.utama), 0);
    const sisaUntukFlex = Math.max(0, ukuranUtamaArea - totalJarak - totalTetap);

    const ukuranFinal = ukuranAnak.map((item) => {
      let u = item.utama;
      if (perataanUtama === 'sama_rata') {
        u = Math.max(16, Math.floor((ukuranUtamaArea - totalJarak) / anak.length));
      } else if (item.flex > 0 && totalFlex > 0) {
        u = Math.max(16, Math.floor((sisaUntukFlex * item.flex) / totalFlex));
      } else if (arah === 'horizontal' && item.utama > area.lebar) {
        u = area.lebar;
      }
      const s = item.widget.gaya.lebar === '100%' && arah === 'vertikal'
        ? ukuranSilangArea
        : Math.min(ukuranSilangArea, item.silang);
      return { widget: item.widget, utama: u, silang: s };
    });

    const totalTerpakai = ukuranFinal.reduce((s, item) => s + item.utama, 0) + totalJarak;
    const ruangKosong = Math.max(0, ukuranUtamaArea - totalTerpakai);

    let offsetUtama = 0;
    let jarakEfektif = jarak;
    if (perataanUtama === 'tengah') {
      offsetUtama = Math.floor(ruangKosong / 2);
    } else if (perataanUtama === 'akhir') {
      offsetUtama = ruangKosong;
    } else if (perataanUtama === 'renggang' && anak.length > 1) {
      jarakEfektif = jarak + Math.floor(ruangKosong / (anak.length - 1));
    }

    let cursor = (arah === 'horizontal' ? area.x : area.y) + offsetUtama;
    for (const item of ukuranFinal) {
      let silangPos = arah === 'horizontal' ? area.y : area.x;
      const sisaSilang = Math.max(0, ukuranSilangArea - item.silang);
      if (perataanSilang === 'tengah') {
        silangPos += Math.floor(sisaSilang / 2);
      } else if (perataanSilang === 'akhir') {
        silangPos += sisaSilang;
      }

      const batasAnak: KotakTataLetak =
        arah === 'horizontal'
          ? {
              x: cursor,
              y: silangPos,
              lebar: item.utama,
              tinggi: item.widget.gaya.tinggi === '100%' ? area.tinggi : item.silang,
            }
          : {
              x: silangPos,
              y: cursor,
              lebar: item.widget.gaya.lebar !== undefined ? item.silang : Math.max(item.silang, Math.min(area.lebar, item.silang)),
              tinggi: item.utama,
            };

      indukNode.anak.push(this.hitungWidget(item.widget, batasAnak, petaKotak));
      cursor += item.utama + jarakEfektif;
    }
  }

  private letakkanGrid(
    anak: Widget[],
    area: KotakTataLetak,
    grid: GridLayout,
    indukNode: NodeTataLetak,
    petaKotak: Map<string, NodeTataLetak>
  ): void {
    const cols = Math.max(1, grid.jumlahKolom);
    const jKol = grid.jarakKolom;
    const jBar = grid.jarakBaris;
    const cellW = Math.max(24, Math.floor((area.lebar - (cols - 1) * jKol) / cols));

    const jumlahBaris = Math.ceil(anak.length / cols);
    const tinggiBaris: number[] = [];
    for (let r = 0; r < jumlahBaris; r++) {
      let maks = 36;
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx < anak.length) {
          maks = Math.max(maks, this.ukurIntrinsik(anak[idx], cellW).tinggi);
        }
      }
      tinggiBaris.push(maks);
    }

    let y = area.y;
    for (let r = 0; r < jumlahBaris; r++) {
      const h = tinggiBaris[r];
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= anak.length) break;
        const x = area.x + c * (cellW + jKol);
        indukNode.anak.push(this.hitungWidget(anak[idx], { x, y, lebar: cellW, tinggi: h }, petaKotak));
      }
      y += h + jBar;
    }
  }

  /**
   * Menemukan node widget terdalam pada koordinat layar (x, y) untuk hit-testing input.
   */
  public cariNodePadaTitik(node: NodeTataLetak | null, x: number, y: number): NodeTataLetak | null {
    if (!node || !node.widget.terlihat) return null;
    const k = node.kotak;
    const diDalam = x >= k.x && x <= k.x + k.lebar && y >= k.y && y <= k.y + k.tinggi;
    if (!diDalam) return null;

    // Telusuri dari belakang ke depan untuk urutan Z-index paling atas
    for (let i = node.anak.length - 1; i >= 0; i--) {
      const kena = this.cariNodePadaTitik(node.anak[i], x, y);
      if (kena) return kena;
    }
    return node;
  }
}
