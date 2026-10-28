/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Mesin Template HTML Terpadu dengan Escaping Otomatis (Anti-XSS),
 * Pengisian Variabel Bersarang, Percabangan (jika/selain), Perulangan (untuk), dan Layout.
 */

export function lepasHTML(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return '';
  const teks = String(nilai);
  return teks
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface OpsiRenderTemplate {
  layout?: string;
  partials?: Record<string, string>;
}

export class MesinTemplate {
  private templates: Map<string, string> = new Map();
  private partials: Map<string, string> = new Map();
  private layouts: Map<string, string> = new Map();

  public daftarkan(nama: string, konten: string): this {
    this.templates.set(nama, konten);
    return this;
  }

  public daftarkanPartial(nama: string, konten: string): this {
    this.partials.set(nama, konten);
    return this;
  }

  public daftarkanLayout(nama: string, konten: string): this {
    this.layouts.set(nama, konten);
    return this;
  }

  public evaluasiJalur(obj: any, pathStr: string): any {
    if (!obj || !pathStr) return undefined;
    const bagian = pathStr.trim().split('.');
    let kursor = obj;
    for (const b of bagian) {
      if (kursor === null || kursor === undefined) return undefined;
      if (kursor instanceof Map) {
        kursor = kursor.get(b);
      } else if (typeof kursor === 'object') {
        kursor = kursor[b];
      } else {
        return undefined;
      }
    }
    return kursor;
  }

  public renderTeks(template: string, data: Record<string, any> = {}): string {
    let hasil = template;

    // 1. Partial inclusion: {{> namaPartial }}
    hasil = hasil.replace(/\{\{>\s*([a-zA-Z0-9_\-\.]+)\s*\}\}/g, (_, namaPart) => {
      const part = this.partials.get(namaPart);
      return part !== undefined ? this.renderTeks(part, data) : `<!-- partial '${namaPart}' tidak ditemukan -->`;
    });

    // 2. Blok Perulangan: {{#untuk item dalam list}} ... {{/untuk}}
    const regexUntuk = /\{\{#untuk\s+([a-zA-Z0-9_]+)\s+dalam\s+([a-zA-Z0-9_\.]+)\s*\}\}([\s\S]*?)\{\{\/untuk\}\}/g;
    hasil = hasil.replace(regexUntuk, (_, namaItem, jalurList, isiBlok) => {
      const koleksi = this.evaluasiJalur(data, jalurList);
      if (!Array.isArray(koleksi)) {
        return '';
      }
      return koleksi
        .map((elem, idx) => {
          const konteksLokal = {
            ...data,
            [namaItem]: elem,
            indeks: idx,
            nomor: idx + 1,
            terakhir: idx === koleksi.length - 1,
          };
          return this.renderTeks(isiBlok, konteksLokal);
        })
        .join('');
    });

    // 3. Blok Kondisional: {{#jika kondisi}} ... {{#selain}} ... {{/jika}} atau {{#jika kondisi}} ... {{/jika}}
    const regexJika = /\{\{#jika\s+([a-zA-Z0-9_\.\!]+)\s*\}\}([\s\S]*?)(?:\{\{#selain\}\}([\s\S]*?))?\{\{\/jika\}\}/g;
    hasil = hasil.replace(regexJika, (_, namaKondisi, isiBenar, isiSalah) => {
      let negasi = false;
      let pathBersih = namaKondisi;
      if (pathBersih.startsWith('!')) {
        negasi = true;
        pathBersih = pathBersih.slice(1);
      }
      const val = this.evaluasiJalur(data, pathBersih);
      const kondisi = negasi ? !val : Boolean(val);

      if (kondisi) {
        return this.renderTeks(isiBenar, data);
      } else if (isiSalah !== undefined) {
        return this.renderTeks(isiSalah, data);
      }
      return '';
    });

    // 4. Raw HTML Interpolation (Unescaped): {{{ variabel }}}
    hasil = hasil.replace(/\{\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}\}/g, (_, jalurVar) => {
      const val = this.evaluasiJalur(data, jalurVar);
      return val !== undefined && val !== null ? String(val) : '';
    });

    // 5. Escaped HTML Interpolation (Safe by default): {{ variabel }}
    hasil = hasil.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, jalurVar) => {
      const val = this.evaluasiJalur(data, jalurVar);
      return lepasHTML(val);
    });

    return hasil;
  }

  public render(
    namaAtauKonten: string,
    data: Record<string, any> = {},
    opsi: OpsiRenderTemplate = {}
  ): string {
    const templateMentah = this.templates.get(namaAtauKonten) ?? namaAtauKonten;
    const bodyRendered = this.renderTeks(templateMentah, data);

    const namaLayout = opsi.layout;
    if (namaLayout && this.layouts.has(namaLayout)) {
      const layoutTemplate = this.layouts.get(namaLayout)!;
      return this.renderTeks(layoutTemplate, {
        ...data,
        konten: bodyRendered,
      });
    }

    return bodyRendered;
  }
}
