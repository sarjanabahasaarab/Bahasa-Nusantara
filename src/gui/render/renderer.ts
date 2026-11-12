/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Mesin Perender Desktop (Framebuffer Rasterizer, SVG Vector & Live HTML5 WebView Shell)
 */

import { JendelaGUI } from '../core/window';
import { Widget } from '../widgets/base';
import { SkemaWarnaGUI } from '../types';
import { pengelolaTemaGlobal } from '../styling/theme';
import { MesinTataLetak, NodeTataLetak, TataLetakJendela } from '../layout/layout_engine';
import { KanvasFramebuffer } from './framebuffer';
import { LabelWidget } from '../widgets/label';
import { TombolWidget } from '../widgets/button';
import { InputTeksWidget } from '../widgets/text_input';
import { AreaTeksWidget } from '../widgets/text_area';
import { KotakCentangWidget } from '../widgets/checkbox';
import { TombolRadioWidget } from '../widgets/radio_button';
import { PilihanDropdownWidget } from '../widgets/select';
import { DaftarWidget } from '../widgets/list';
import { TabelWidget } from '../widgets/table';
import { IndikatorProgresWidget } from '../widgets/progress';
import { SliderWidget } from '../widgets/slider';
import { TabWidget } from '../widgets/tab';

export interface OpsiRenderDesktop {
  skemaWarna?: SkemaWarnaGUI;
  idFokus?: string | null;
  idHover?: string | null;
}

function escapeXML(teks: string): string {
  return teks
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class PerenderDesktop {
  private readonly mesinTataLetak = new MesinTataLetak();

  public renderKeFramebuffer(jendela: JendelaGUI, opsi: OpsiRenderDesktop = {}): KanvasFramebuffer {
    const skema = opsi.skemaWarna || pengelolaTemaGlobal.dapatkanSkema();
    const layout = this.mesinTataLetak.hitungTataLetakJendela(jendela);
    const fb = new KanvasFramebuffer(layout.lebar, layout.tinggi, skema.latarBelakang);

    // Bilah Menu
    if (layout.kotakBilahMenu && jendela.bilahMenu) {
      const m = layout.kotakBilahMenu;
      fb.isiPersegi(m.x, m.y, m.lebar, m.tinggi, skema.latarKomponen);
      fb.isiPersegi(m.x, m.y + m.tinggi - 1, m.lebar, 1, skema.border);
      let mx = m.x + 12;
      for (const menu of jendela.bilahMenu.daftarMenu) {
        fb.gambarTeks(menu.judul, mx, m.y + 10, skema.teksUtama, 1);
        mx += menu.judul.length * 7 + 20;
      }
    }

    // Bilah Alat
    if (layout.kotakBilahAlat && jendela.bilahAlat) {
      const tb = layout.kotakBilahAlat;
      fb.isiPersegi(tb.x, tb.y, tb.lebar, tb.tinggi, skema.latarKomponenHover);
      fb.isiPersegi(tb.x, tb.y + tb.tinggi - 1, tb.lebar, 1, skema.border);
      let tx = tb.x + 10;
      for (const aksi of jendela.bilahAlat.daftarTombol) {
        const wBtn = Math.max(54, aksi.label.length * 7 + 16);
        fb.isiPersegi(tx, tb.y + 5, wBtn, tb.tinggi - 10, skema.latarKomponen);
        fb.gambarGarisPersegi(tx, tb.y + 5, wBtn, tb.tinggi - 10, skema.border, 1);
        fb.gambarTeks(aksi.label, tx + 8, tb.y + 13, skema.teksUtama, 1);
        tx += wBtn + 8;
      }
    }

    if (layout.akarKonten) {
      this.gambarNodeFramebuffer(fb, layout.akarKonten, skema, opsi);
    }

    return fb;
  }

  private gambarNodeFramebuffer(
    fb: KanvasFramebuffer,
    node: NodeTataLetak,
    skema: SkemaWarnaGUI,
    opsi: OpsiRenderDesktop
  ): void {
    const w = node.widget;
    if (!w.terlihat) return;
    const { x, y, lebar, tinggi } = node.kotak;
    const fokus = opsi.idFokus === w.id;
    const hover = opsi.idHover === w.id;

    switch (w.jenis) {
      case 'wadah':
      case 'stack':
      case 'gulir':
      case 'kolom':
      case 'baris':
      case 'grid': {
        if (w.gaya.warnaLatar) {
          fb.isiPersegi(x, y, lebar, tinggi, w.gaya.warnaLatar);
        }
        if (w.gaya.warnaBorder) {
          fb.gambarGarisPersegi(x, y, lebar, tinggi, w.gaya.warnaBorder, w.gaya.ketebalanBorder ?? 1);
        }
        break;
      }
      case 'label': {
        const lbl = w as LabelWidget;
        const warna = w.gaya.warnaTeks || skema.teksUtama;
        const skala = (w.gaya.ukuranFont ?? 14) >= 20 ? 2 : 1;
        fb.gambarTeks(lbl.teks, x + 2, y + Math.max(4, Math.floor((tinggi - 7 * skala) / 2)), warna, skala);
        break;
      }
      case 'tombol': {
        const btn = w as TombolWidget;
        let bg = skema.primer;
        let fg = skema.primerTeks;
        if (btn.varian === 'sekunder') {
          bg = skema.latarKomponenAktif;
          fg = skema.teksUtama;
        } else if (btn.varian === 'bahaya') {
          bg = skema.bahaya;
        } else if (btn.varian === 'sukses') {
          bg = skema.sukses;
        } else if (btn.varian === 'outline') {
          bg = skema.latarKomponen;
          fg = skema.primer;
        } else if (hover) {
          bg = skema.primerHover;
        }
        fb.isiPersegi(x, y, lebar, tinggi, w.gaya.warnaLatar || bg);
        if (btn.varian === 'outline' || fokus) {
          fb.gambarGarisPersegi(x, y, lebar, tinggi, fokus ? skema.indikatorFokus : skema.primer, fokus ? 2 : 1);
        }
        const tx = x + Math.max(8, Math.floor((lebar - btn.teks.length * 6) / 2));
        const ty = y + Math.max(4, Math.floor((tinggi - 7) / 2));
        fb.gambarTeks(btn.teks, tx, ty, w.gaya.warnaTeks || fg, 1);
        break;
      }
      case 'input_teks': {
        const inp = w as InputTeksWidget;
        fb.isiPersegi(x, y, lebar, tinggi, skema.latarKomponen);
        fb.gambarGarisPersegi(x, y, lebar, tinggi, fokus ? skema.borderFokus : skema.border, fokus ? 2 : 1);
        const tampil = inp.nilai
          ? inp.modePassword
            ? '*'.repeat(inp.nilai.length)
            : inp.nilai
          : inp.placeholder;
        fb.gambarTeks(tampil, x + 10, y + Math.floor((tinggi - 7) / 2), inp.nilai ? skema.teksUtama : skema.teksMuted, 1);
        break;
      }
      case 'area_teks': {
        const area = w as AreaTeksWidget;
        fb.isiPersegi(x, y, lebar, tinggi, skema.latarKomponen);
        fb.gambarGarisPersegi(x, y, lebar, tinggi, fokus ? skema.borderFokus : skema.border, fokus ? 2 : 1);
        const lines = (area.nilai || area.placeholder).split('\n');
        for (let i = 0; i < lines.length && i * 16 + 14 < tinggi; i++) {
          fb.gambarTeks(lines[i], x + 10, y + 10 + i * 16, area.nilai ? skema.teksUtama : skema.teksMuted, 1);
        }
        break;
      }
      case 'kotak_centang': {
        const cb = w as KotakCentangWidget;
        const cy = y + Math.floor((tinggi - 16) / 2);
        fb.isiPersegi(x, cy, 16, 16, cb.terpilih ? skema.primer : skema.latarKomponen);
        fb.gambarGarisPersegi(x, cy, 16, 16, cb.terpilih ? skema.primer : skema.border, 1);
        if (cb.terpilih) {
          fb.gambarTeks('v', x + 5, cy + 5, skema.primerTeks, 1);
        }
        fb.gambarTeks(cb.label, x + 24, cy + 5, skema.teksUtama, 1);
        break;
      }
      case 'tombol_radio': {
        const rb = w as TombolRadioWidget;
        const rcy = y + Math.floor(tinggi / 2);
        fb.isiLingkaran(x + 8, rcy, 8, skema.border);
        fb.isiLingkaran(x + 8, rcy, 6, skema.latarKomponen);
        if (rb.terpilih) {
          fb.isiLingkaran(x + 8, rcy, 4, skema.primer);
        }
        fb.gambarTeks(rb.label, x + 24, rcy - 3, skema.teksUtama, 1);
        break;
      }
      case 'pilihan': {
        const sel = w as PilihanDropdownWidget;
        fb.isiPersegi(x, y, lebar, tinggi, skema.latarKomponen);
        fb.gambarGarisPersegi(x, y, lebar, tinggi, fokus ? skema.borderFokus : skema.border, 1);
        const labelPilihan = sel.opsi.find((o) => o.nilai === sel.nilaiTerpilih)?.label || sel.getTerpilih() || 'Pilih...';
        fb.gambarTeks(labelPilihan, x + 10, y + 14, skema.teksUtama, 1);
        fb.gambarTeks('v', x + lebar - 16, y + 14, skema.teksSekunder, 1);
        break;
      }
      case 'progres': {
        const prog = w as IndikatorProgresWidget;
        fb.isiPersegi(x, y, lebar, tinggi, skema.latarKomponenAktif);
        const isiW = Math.round((lebar * prog.persentase) / 100);
        if (isiW > 0) fb.isiPersegi(x, y, isiW, tinggi, skema.primer);
        fb.gambarGarisPersegi(x, y, lebar, tinggi, skema.border, 1);
        break;
      }
      case 'slider': {
        const sld = w as SliderWidget;
        const trackY = y + Math.floor(tinggi / 2) - 3;
        fb.isiPersegi(x, trackY, lebar, 6, skema.latarKomponenAktif);
        const span = Math.max(1, sld.nilaiMaks - sld.nilaiMin);
        const rasio = (sld.nilai - sld.nilaiMin) / span;
        const fillW = Math.round(lebar * rasio);
        fb.isiPersegi(x, trackY, fillW, 6, skema.primer);
        fb.isiLingkaran(x + fillW, y + Math.floor(tinggi / 2), 8, skema.primer);
        break;
      }
      case 'tabel': {
        const tbl = w as TabelWidget;
        fb.isiPersegi(x, y, lebar, tinggi, skema.latarKomponen);
        fb.gambarGarisPersegi(x, y, lebar, tinggi, skema.border, 1);
        const colW = Math.max(40, Math.floor(lebar / Math.max(1, tbl.kolom.length)));
        fb.isiPersegi(x, y, lebar, 28, skema.latarKomponenHover);
        tbl.kolom.forEach((col, i) => {
          fb.gambarTeks(col.judul, x + i * colW + 8, y + 10, skema.teksUtama, 1);
        });
        tbl.baris.forEach((row, rIdx) => {
          const ry = y + 28 + rIdx * 28;
          if (ry + 28 > y + tinggi) return;
          if (rIdx === tbl.indeksBarisTerpilih) {
            fb.isiPersegi(x + 1, ry, lebar - 2, 27, skema.latarKomponenAktif);
          }
          tbl.kolom.forEach((col, cIdx) => {
            fb.gambarTeks(String(row[col.id] ?? ''), x + cIdx * colW + 8, ry + 10, skema.teksSekunder, 1);
          });
        });
        break;
      }
      case 'daftar': {
        const dft = w as DaftarWidget;
        fb.isiPersegi(x, y, lebar, tinggi, skema.latarKomponen);
        fb.gambarGarisPersegi(x, y, lebar, tinggi, skema.border, 1);
        dft.item.forEach((it, idx) => {
          const iy = y + 4 + idx * 26;
          if (iy + 24 > y + tinggi) return;
          fb.gambarTeks(String(it), x + 10, iy + 8, skema.teksUtama, 1);
        });
        break;
      }
      case 'tab': {
        const tab = w as TabWidget;
        fb.isiPersegi(x, y, lebar, tinggi, skema.latarKomponen);
        fb.gambarGarisPersegi(x, y, lebar, tinggi, skema.border, 1);
        fb.isiPersegi(x, y, lebar, MesinTataLetak.TINGGI_HEADER_TAB, skema.latarKomponenHover);
        let tx = x + 4;
        tab.daftarTab.forEach((t, idx) => {
          const tw = Math.max(72, t.judul.length * 7 + 20);
          const aktif = idx === tab.indeksAktif;
          fb.isiPersegi(tx, y + 4, tw, MesinTataLetak.TINGGI_HEADER_TAB - 4, aktif ? skema.latarKomponen : skema.latarKomponenHover);
          if (aktif) fb.isiPersegi(tx, y + MesinTataLetak.TINGGI_HEADER_TAB - 2, tw, 2, skema.primer);
          fb.gambarTeks(t.judul, tx + 10, y + 14, aktif ? skema.primer : skema.teksSekunder, 1);
          tx += tw + 4;
        });
        break;
      }
      default: {
        fb.isiPersegi(x, y, lebar, tinggi, skema.latarKomponen);
        fb.gambarGarisPersegi(x, y, lebar, tinggi, skema.border, 1);
      }
    }

    for (const anak of node.anak) {
      this.gambarNodeFramebuffer(fb, anak, skema, opsi);
    }
  }

  public renderKeSVG(jendela: JendelaGUI, opsi: OpsiRenderDesktop = {}): string {
    const skema = opsi.skemaWarna || pengelolaTemaGlobal.dapatkanSkema();
    const layout: TataLetakJendela = this.mesinTataLetak.hitungTataLetakJendela(jendela);
    const bagian: string[] = [];
    bagian.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.lebar}" height="${layout.tinggi}" viewBox="0 0 ${layout.lebar} ${layout.tinggi}">`
    );
    bagian.push(`<rect x="0" y="0" width="${layout.lebar}" height="${layout.tinggi}" fill="${skema.latarBelakang}"/>`);

    const kumpulSVG = (node: NodeTataLetak | null) => {
      if (!node || !node.widget.terlihat) return;
      const { x, y, lebar, tinggi } = node.kotak;
      const w = node.widget;
      if (w.jenis === 'tombol') {
        const btn = w as TombolWidget;
        bagian.push(`<rect x="${x}" y="${y}" width="${lebar}" height="${tinggi}" rx="6" fill="${skema.primer}"/>`);
        bagian.push(
          `<text x="${x + Math.round(lebar / 2)}" y="${y + Math.round(tinggi / 2) + 4}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="${skema.primerTeks}">${escapeXML(btn.teks)}</text>`
        );
      } else if (w.jenis === 'label') {
        const lbl = w as LabelWidget;
        bagian.push(
          `<text x="${x + 2}" y="${y + 18}" font-family="sans-serif" font-size="${w.gaya.ukuranFont ?? 14}" fill="${w.gaya.warnaTeks || skema.teksUtama}">${escapeXML(lbl.teks)}</text>`
        );
      } else if (w.jenis === 'input_teks') {
        const inp = w as InputTeksWidget;
        bagian.push(`<rect x="${x}" y="${y}" width="${lebar}" height="${tinggi}" rx="4" fill="${skema.latarKomponen}" stroke="${skema.border}"/>`);
        bagian.push(
          `<text x="${x + 10}" y="${y + 22}" font-family="sans-serif" font-size="13" fill="${inp.nilai ? skema.teksUtama : skema.teksMuted}">${escapeXML(inp.nilai || inp.placeholder)}</text>`
        );
      } else if (w.jenis === 'progres') {
        const p = w as IndikatorProgresWidget;
        bagian.push(`<rect x="${x}" y="${y}" width="${lebar}" height="${tinggi}" rx="4" fill="${skema.latarKomponenAktif}"/>`);
        bagian.push(`<rect x="${x}" y="${y}" width="${Math.round((lebar * p.persentase) / 100)}" height="${tinggi}" rx="4" fill="${skema.primer}"/>`);
      }
      for (const a of node.anak) kumpulSVG(a);
    };

    kumpulSVG(layout.akarKonten);
    bagian.push(`</svg>`);
    return bagian.join('\n');
  }

  public renderWidgetKeHTML(widget: Widget, skema: SkemaWarnaGUI): string {
    if (!widget.terlihat) return '';
    switch (widget.jenis) {
      case 'label': {
        const lbl = widget as LabelWidget;
        return `<span data-widget-id="${escapeXML(widget.id)}" style="color:${lbl.gaya.warnaTeks || skema.teksUtama};font-size:${lbl.gaya.ukuranFont ?? 14}px;">${escapeXML(lbl.teks)}</span>`;
      }
      case 'tombol': {
        const btn = widget as TombolWidget;
        return `<button data-widget-id="${escapeXML(widget.id)}" onclick="nusantaraKirim('klik',{idWidget:'${escapeXML(widget.id)}'})" style="padding:8px 16px;border-radius:6px;border:1px solid ${skema.border};background:${skema.primer};color:${skema.primerTeks};cursor:pointer;">${escapeXML(btn.teks)}</button>`;
      }
      case 'input_teks': {
        const inp = widget as InputTeksWidget;
        return `<input data-widget-id="${escapeXML(widget.id)}" type="${inp.modePassword ? 'password' : 'text'}" value="${escapeXML(inp.nilai)}" placeholder="${escapeXML(inp.placeholder)}" oninput="nusantaraKirim('teks_berubah',{idWidget:'${escapeXML(widget.id)}',nilaiTeks:this.value})" style="padding:8px 10px;border-radius:6px;border:1px solid ${skema.border};background:${skema.latarKomponen};color:${skema.teksUtama};"/>`;
      }
      case 'kotak_centang': {
        const cb = widget as KotakCentangWidget;
        return `<label data-widget-id="${escapeXML(widget.id)}" style="display:inline-flex;align-items:center;gap:8px;color:${skema.teksUtama};"><input type="checkbox" ${cb.terpilih ? 'checked' : ''} onchange="nusantaraKirim('klik',{idWidget:'${escapeXML(widget.id)}'})"/>${escapeXML(cb.label)}</label>`;
      }
      case 'baris':
      case 'kolom': {
        const dir = widget.jenis === 'baris' ? 'row' : 'column';
        const anakHtml = widget.anak.map((a) => this.renderWidgetKeHTML(a, skema)).join('');
        return `<div data-widget-id="${escapeXML(widget.id)}" style="display:flex;flex-direction:${dir};gap:8px;">${anakHtml}</div>`;
      }
      default: {
        const anakHtml = widget.anak.map((a) => this.renderWidgetKeHTML(a, skema)).join('');
        return `<div data-widget-id="${escapeXML(widget.id)}">${anakHtml}</div>`;
      }
    }
  }

  public renderKeHTML(jendela: JendelaGUI, wsUrl?: string, opsi: OpsiRenderDesktop = {}): string {
    const skema = opsi.skemaWarna || pengelolaTemaGlobal.dapatkanSkema();
    const body = jendela.kontenUtama ? this.renderWidgetKeHTML(jendela.kontenUtama, skema) : '';
    const menuHtml = jendela.bilahMenu
      ? `<nav style="display:flex;gap:16px;padding:6px 12px;background:${skema.latarKomponen};border-bottom:1px solid ${skema.border};">${jendela.bilahMenu.daftarMenu
          .map((m) => `<span>${escapeXML(m.judul)}</span>`)
          .join('')}</nav>`
      : '';
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXML(jendela.judul)}</title>
  <style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:${skema.latarBelakang};color:${skema.teksUtama};}</style>
</head>
<body>
  ${menuHtml}
  <main id="nusantara-root" style="padding:16px;">${body}</main>
  <script>
    const ws = ${wsUrl ? `new WebSocket('${wsUrl}')` : 'null'};
    function nusantaraKirim(jenis, data) {
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ tipe: 'peristiwa', jenis, ...data }));
    }
    if (ws) {
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.tipe === 'sinkronisasi' && msg.html) {
            document.getElementById('nusantara-root').innerHTML = msg.html;
          }
        } catch {}
      };
    }
  </script>
</body>
</html>`;
  }
}
