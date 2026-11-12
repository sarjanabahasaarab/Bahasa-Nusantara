/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Mesin Perender Antarmuka Mobile (HTML5 WebView Shell, SVG Wireframe & Pohon UI Native)
 */

import { AplikasiMobile } from '../core/application';
import { KomponenMobile } from '../ui/component';
import { TeksMobile } from '../ui/text';
import { TombolMobile } from '../ui/button';
import { InputTeksMobile, InputSandiMobile } from '../ui/input';
import { SakelarMobile, KotakCentangMobile, TombolRadioMobile } from '../ui/toggle';
import { DropdownMobile } from '../ui/select';
import { KartuMobile } from '../ui/card';
import { IndikatorProgresMobile } from '../ui/feedback';
import { DialogMobile, SnackbarMobile } from '../ui/overlay';
import { NavigatorTumpukanMobile } from '../navigation/stack_navigator';
import { NavigatorTabMobile } from '../navigation/tab_navigator';
import { NavigasiBawahMobile } from '../navigation/bottom_nav';
import { AreaAmanMobile } from '../layout/safe_area';

function esc(teks: string): string {
  return String(teks ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface NodeUIMobileTerukur {
  id: string;
  jenis: string;
  label?: string;
  anak: NodeUIMobileTerukur[];
}

export class PerenderMobile {
  public bangunPohonUINative(app: AplikasiMobile): Record<string, any> {
    return {
      aplikasi: app.konfigurasi.nama,
      idAplikasi: app.konfigurasi.id,
      versi: app.konfigurasi.versi,
      statusLifecycle: app.getStatus(),
      tema: app.konteks.temaAktif,
      state: app.konteks.state.toJSON(),
      navigator: app.navigatorUtama ? app.navigatorUtama.toJson() : null,
      komponenAkar: app.dapatkanKomponenAkar().map((k) =>
        typeof k?.toJson === 'function' ? k.toJson() : k
      ),
    };
  }

  public renderKomponenKeHTML(komp: KomponenMobile, gelap: boolean = false): string {
    if (!komp || !komp.terlihat) return '';
    const bgKartu = gelap ? '#1e293b' : '#ffffff';
    const teksUtama = gelap ? '#f8fafc' : '#0f172a';
    const borderCol = gelap ? '#334155' : '#cbd5e1';

    switch (komp.jenis) {
      case 'teks': {
        const t = komp as TeksMobile;
        const size = t.gaya.ukuranFont ?? 15;
        const weight = t.gaya.beratFont === 'tebal' ? '700' : t.gaya.beratFont === 'tipis' ? '300' : '400';
        return `<p data-mobile-id="${esc(t.id)}" style="margin:4px 0;font-size:${size}px;font-weight:${weight};color:${t.gaya.warnaTeks || teksUtama};">${esc(t.teks)}</p>`;
      }
      case 'tombol': {
        const b = komp as TombolMobile;
        const bg = b.varian === 'bahaya' ? '#dc2626' : b.varian === 'sekunder' ? '#64748b' : '#2563eb';
        return `<button data-mobile-id="${esc(b.id)}" onclick="nusantaraMobileKirim('klik',{idKomponen:'${esc(b.id)}'})" style="width:100%;padding:12px 16px;border:none;border-radius:10px;background:${bg};color:#ffffff;font-weight:600;cursor:pointer;">${esc(b.label)}</button>`;
      }
      case 'input_teks':
      case 'input_sandi': {
        const inp = komp as InputTeksMobile;
        const isPass = komp instanceof InputSandiMobile || komp.jenis === 'input_sandi';
        return `<input data-mobile-id="${esc(inp.id)}" type="${isPass ? 'password' : 'text'}" value="${esc(inp.nilai)}" placeholder="${esc(inp.placeholder)}" oninput="nusantaraMobileKirim('teks_berubah',{idKomponen:'${esc(inp.id)}',nilaiTeks:this.value})" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid ${borderCol};background:${bgKartu};color:${teksUtama};"/>`;
      }
      case 'sakelar': {
        const s = komp as SakelarMobile;
        return `<label data-mobile-id="${esc(s.id)}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;"><span>${esc(s.label || 'Aktifkan')}</span><input type="checkbox" ${s.aktifStatus ? 'checked' : ''} onchange="nusantaraMobileKirim('nilai_berubah',{idKomponen:'${esc(s.id)}',nilaiLogika:this.checked})"/></label>`;
      }
      case 'kotak_centang': {
        const cb = komp as KotakCentangMobile;
        return `<label data-mobile-id="${esc(cb.id)}" style="display:flex;align-items:center;gap:8px;"><input type="checkbox" ${cb.dicentang ? 'checked' : ''} onchange="nusantaraMobileKirim('nilai_berubah',{idKomponen:'${esc(cb.id)}',nilaiLogika:this.checked})"/><span>${esc(cb.label)}</span></label>`;
      }
      case 'tombol_radio': {
        const rb = komp as TombolRadioMobile;
        return `<label data-mobile-id="${esc(rb.id)}" style="display:flex;align-items:center;gap:8px;"><input type="radio" name="${esc(rb.grup)}" ${rb.terpilih ? 'checked' : ''} onchange="nusantaraMobileKirim('nilai_berubah',{idKomponen:'${esc(rb.id)}',nilaiLogika:true})"/><span>${esc(rb.label)}</span></label>`;
      }
      case 'dropdown': {
        const sel = komp as DropdownMobile;
        const opts = sel.daftarOpsi
          .map((o) => `<option value="${esc(o.nilai)}" ${o.nilai === sel.nilaiTerpilih ? 'selected' : ''}>${esc(o.label)}</option>`)
          .join('');
        return `<select data-mobile-id="${esc(sel.id)}" onchange="nusantaraMobileKirim('seleksi_berubah',{idKomponen:'${esc(sel.id)}',nilaiTeks:this.value})" style="width:100%;padding:10px;border-radius:8px;border:1px solid ${borderCol};background:${bgKartu};color:${teksUtama};">${opts}</select>`;
      }
      case 'progres': {
        const pr = komp as IndikatorProgresMobile;
        return `<div data-mobile-id="${esc(pr.id)}" style="width:100%;height:8px;background:${borderCol};border-radius:99px;overflow:hidden;"><div style="width:${pr.getPersentase()}%;height:100%;background:#2563eb;"></div></div>`;
      }
      case 'kartu': {
        const kt = komp as KartuMobile;
        const anakHtml = kt.anak.map((a) => this.renderKomponenKeHTML(a, gelap)).join('');
        const judul = kt.judul ? `<div style="font-weight:700;margin-bottom:8px;">${esc(kt.judul)}</div>` : '';
        return `<section data-mobile-id="${esc(kt.id)}" style="padding:14px;border-radius:12px;background:${bgKartu};border:1px solid ${borderCol};display:flex;flex-direction:column;gap:8px;">${judul}${anakHtml}</section>`;
      }
      case 'area_aman': {
        const sa = komp as AreaAmanMobile;
        const [t, r, b, l] = sa.dapatkanPaddingEfektif();
        const anakHtml = sa.anak.map((a) => this.renderKomponenKeHTML(a, gelap)).join('');
        return `<div data-mobile-id="${esc(sa.id)}" style="padding:${Math.min(t, 24)}px ${r}px ${Math.min(b, 24)}px ${l}px;display:flex;flex-direction:column;gap:10px;">${anakHtml}</div>`;
      }
      case 'navigator_tumpukan': {
        const nav = komp as NavigatorTumpukanMobile;
        const aktif = nav.dapatkanRuteAktif();
        const header = `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid ${borderCol};background:${bgKartu};">${nav.bisaKembali() ? `<button onclick="nusantaraMobileKirim('nav_kembali',{})" style="border:none;background:transparent;color:#2563eb;font-weight:600;cursor:pointer;">&larr; Kembali</button>` : ''}<strong style="font-size:15px;">${esc(aktif?.namaRute || 'Beranda')}</strong></div>`;
        const body = aktif ? this.renderKomponenKeHTML(aktif.halaman, gelap) : '';
        return `<div data-mobile-id="${esc(nav.id)}">${header}<div style="padding:12px;display:flex;flex-direction:column;gap:10px;">${body}</div></div>`;
      }
      case 'navigator_tab': {
        const tn = komp as NavigatorTabMobile;
        const bar = tn.daftarTab
          .map((t) => `<button onclick="nusantaraMobileKirim('pilih_tab',{idKomponen:'${esc(tn.id)}',kunci:'${esc(t.kunci)}'})" style="flex:1;padding:10px;border:none;background:transparent;color:${t.kunci === tn.tabAktif ? tn.warnaAktif : tn.warnaTidakAktif};font-weight:${t.kunci === tn.tabAktif ? '700' : '400'};cursor:pointer;">${esc(t.label)}</button>`)
          .join('');
        const body = tn.anak.map((a) => this.renderKomponenKeHTML(a, gelap)).join('');
        return `<div data-mobile-id="${esc(tn.id)}"><div>${body}</div><nav style="display:flex;border-top:1px solid ${borderCol};background:${bgKartu};">${bar}</nav></div>`;
      }
      case 'navigasi_bawah': {
        const bn = komp as NavigasiBawahMobile;
        const btns = bn.items
          .map((it) => `<button onclick="nusantaraMobileKirim('pilih_tab',{idKomponen:'${esc(bn.id)}',kunci:'${esc(it.kunci)}'})" style="flex:1;padding:10px 4px;border:none;background:transparent;color:${it.kunci === bn.kunciAktif ? bn.warnaAktif : bn.warnaTidakAktif};font-weight:${it.kunci === bn.kunciAktif ? '700' : '400'};cursor:pointer;">${esc(it.label)}</button>`)
          .join('');
        return `<nav data-mobile-id="${esc(bn.id)}" style="display:flex;border-top:1px solid ${borderCol};background:${bgKartu};">${btns}</nav>`;
      }
      case 'dialog': {
        const d = komp as DialogMobile;
        if (!d.terbuka) return '';
        return `<div data-mobile-id="${esc(d.id)}" style="padding:16px;border-radius:14px;background:${bgKartu};border:2px solid #2563eb;"><strong>${esc(d.judul)}</strong><p>${esc(d.pesanTeks || '')}</p></div>`;
      }
      case 'snackbar': {
        const sb = komp as SnackbarMobile;
        if (!sb.terbuka) return '';
        return `<div data-mobile-id="${esc(sb.id)}" style="padding:10px 14px;border-radius:8px;background:#1e293b;color:#ffffff;">${esc(sb.pesan)}</div>`;
      }
      default: {
        const isRow = komp.jenis === 'tata_letak_horizontal';
        const anakHtml = komp.anak.map((a) => this.renderKomponenKeHTML(a, gelap)).join('');
        return `<div data-mobile-id="${esc(komp.id)}" style="display:flex;flex-direction:${isRow ? 'row' : 'column'};gap:8px;">${anakHtml}</div>`;
      }
    }
  }

  public renderKontenUtamaHTML(app: AplikasiMobile): string {
    const gelap = app.konteks.temaAktif === 'gelap';
    const parts: string[] = [];
    if (app.navigatorUtama) {
      parts.push(this.renderKomponenKeHTML(app.navigatorUtama, gelap));
    }
    for (const k of app.dapatkanKomponenAkar()) {
      parts.push(this.renderKomponenKeHTML(k, gelap));
    }
    return parts.join('');
  }

  public renderKeHTML(app: AplikasiMobile, wsUrl?: string): string {
    const gelap = app.konteks.temaAktif === 'gelap';
    const bgViewport = gelap ? '#0f172a' : '#f1f5f9';
    const fgViewport = gelap ? '#f8fafc' : '#0f172a';
    const content = this.renderKontenUtamaHTML(app);
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(app.konfigurasi.nama)}</title>
  <style>
    body{margin:0;background:#020617;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;}
    .phone{width:390px;min-height:760px;background:${bgViewport};color:${fgViewport};border-radius:28px;border:4px solid #334155;overflow:hidden;display:flex;flex-direction:column;}
    .statusbar{padding:8px 16px;font-size:12px;font-weight:600;display:flex;justify-content:space-between;background:${gelap ? '#020617' : '#e2e8f0'};}
    #mobile-root{flex:1;padding:12px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;}
  </style>
</head>
<body>
  <div class="phone">
    <div class="statusbar"><span>${esc(app.konfigurasi.nama)}</span><span>v${esc(app.konfigurasi.versi)}</span></div>
    <main id="mobile-root">${content}</main>
  </div>
  <script>
    const ws = ${wsUrl ? `new WebSocket('${wsUrl}')` : 'null'};
    const __pendingCallbacks = {};
    window.__nusantaraNativeCallback = (raw) => {
      try {
        const res = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (res && res.id && __pendingCallbacks[res.id]) {
          __pendingCallbacks[res.id](res);
          delete __pendingCallbacks[res.id];
        }
      } catch {}
    };
    window.__nusantaraNativeEvent = () => {};
    function nusantaraMobileKirim(jenis, data) {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ tipe: 'peristiwa', jenis, ...data }));
      } else if (window.NusantaraAndroidBridge && typeof window.NusantaraAndroidBridge.postMessage === 'function') {
        window.NusantaraAndroidBridge.postMessage(JSON.stringify({ id: 'ev_' + Date.now(), modul: 'ui', metode: jenis, argumen: data }));
      } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nusantaraBridge) {
        window.webkit.messageHandlers.nusantaraBridge.postMessage({ id: 'ev_' + Date.now(), modul: 'ui', metode: jenis, argumen: data });
      }
    }
    if (ws) {
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.tipe === 'sinkronisasi' && msg.html !== undefined) {
            document.getElementById('mobile-root').innerHTML = msg.html;
          }
        } catch {}
      };
    }
  </script>
</body>
</html>`;
  }

  public renderKeSVG(app: AplikasiMobile): string {
    const teksKumpul: string[] = [];
    const scan = (k: KomponenMobile) => {
      if (!k || !k.terlihat) return;
      if (k instanceof TeksMobile) teksKumpul.push(k.teks);
      else if (k instanceof TombolMobile) teksKumpul.push(`[${k.label}]`);
      for (const a of k.anak || []) scan(a);
    };
    if (app.navigatorUtama) scan(app.navigatorUtama);
    for (const k of app.dapatkanKomponenAkar()) scan(k);

    const rows = teksKumpul
      .slice(0, 12)
      .map((t, i) => `<text x="28" y="${96 + i * 28}" font-family="sans-serif" font-size="14" fill="#0f172a">${esc(t)}</text>`)
      .join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect x="0" y="0" width="390" height="844" rx="32" fill="#f1f5f9" stroke="#334155" stroke-width="6"/>
  <rect x="4" y="4" width="382" height="44" fill="#e2e8f0"/>
  <text x="24" y="32" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${esc(app.konfigurasi.nama)}</text>
  ${rows}
</svg>`;
  }
}
