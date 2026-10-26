/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Jembatan Integrasi Language Server Protocol (LSP Bridge) IDE NUSANTARA (Phase 26)
 */

import { ManajerDokumen } from '../language-server/documents/manajerDokumen';
import { LayananDiagnostik } from '../language-server/services/layananDiagnostik';
import { LayananKompleksi } from '../language-server/services/layananKompleksi';
import { LayananHover } from '../language-server/services/layananHover';
import { LayananDefinisi } from '../language-server/services/layananDefinisi';
import { LayananSimbol } from '../language-server/services/layananSimbol';
import { ItemKompleksiLSP, InfoHoverLSP, LokasiDefinisiLSP } from './types';
import { Diagnostik, TingkatDiagnostik, KategoriDiagnostik, KodeGalat } from '../diagnostik';
import { formatAman } from '../toolchain/formatter';
import { PembacaBerkas } from '../modul/pembacaBerkas';

export class JembatanLSP {
  private readonly manajerDokumen: ManajerDokumen;
  private readonly layananDiagnostik: LayananDiagnostik;
  private readonly layananKompleksi: LayananKompleksi;
  private readonly layananHover: LayananHover;
  private readonly layananDefinisi: LayananDefinisi;
  private readonly layananSimbol: LayananSimbol;

  constructor(pembacaBerkas?: PembacaBerkas) {
    this.manajerDokumen = new ManajerDokumen();
    this.layananDiagnostik = new LayananDiagnostik();
    this.layananKompleksi = new LayananKompleksi();
    this.layananHover = new LayananHover();
    this.layananDefinisi = new LayananDefinisi(this.manajerDokumen, pembacaBerkas);
    this.layananSimbol = new LayananSimbol();
  }

  /**
   * Menganalisis dokumen kode sumber dan mengembalikan daftar masalah/diagnostik.
   */
  public dapatkanDiagnostik(uri: string, teks: string): Diagnostik[] {
    const doc = this.manajerDokumen.bukaDokumen(uri, 'nusantara', 1, teks);
    const { diagnostik: lspDiags } = this.layananDiagnostik.analisisDokumen(doc);

    return lspDiags.map((d) => {
      let tingkat = TingkatDiagnostik.KESALAHAN;
      if (d.severity === 2) tingkat = TingkatDiagnostik.PERINGATAN;
      else if (d.severity === 3) tingkat = TingkatDiagnostik.INFORMASI;

      return {
        kode: (d.code as any) || KodeGalat.PAR_TOKEN_TAK_TERDUGA,
        pesan: d.message,
        tingkat,
        kategori: KategoriDiagnostik.PARSER,
        lokasi: {
          baris: d.range.start.line + 1,
          kolom: d.range.start.character + 1,
        },
        saran: d.source || 'Periksa aturan tata bahasa NUSANTARA.',
      };
    });
  }

  /**
   * Menghasilkan saran autocomplete cerdas pada posisi kursor tertentu.
   */
  public dapatkanKompleksi(
    uri: string,
    baris: number,
    kolom: number,
    teks: string
  ): ItemKompleksiLSP[] {
    const doc = this.manajerDokumen.bukaDokumen(uri, 'nusantara', 1, teks);
    const pos = { line: Math.max(0, baris - 1), character: Math.max(0, kolom - 1) };
    const daftar = this.layananKompleksi.dapatkanKompleksi(doc, pos);

    return (daftar.items || []).map((item) => {
      let jenis: ItemKompleksiLSP['jenis'] = 'keyword';
      if (item.kind === 3) jenis = 'fungsi';
      else if (item.kind === 6) jenis = 'variabel';
      else if (item.kind === 7) jenis = 'tipe';
      else if (item.kind === 9) jenis = 'modul';
      else if (item.kind === 15) jenis = 'potongan';

      return {
        label: item.label,
        jenis,
        detail: item.detail,
        dokumentasi: typeof item.documentation === 'string' ? item.documentation : (item.documentation as any)?.value,
        sisipanTeks: item.insertText || item.label,
      };
    });
  }

  /**
   * Mengambil informasi penjelasan saat kursor mengambang di atas simbol kode (Hover).
   */
  public dapatkanHover(
    uri: string,
    baris: number,
    kolom: number,
    teks: string
  ): InfoHoverLSP | undefined {
    const doc = this.manajerDokumen.bukaDokumen(uri, 'nusantara', 1, teks);
    const pos = { line: Math.max(0, baris - 1), character: Math.max(0, kolom - 1) };
    const hover = this.layananHover.dapatkanHover(doc, pos);

    if (!hover) return undefined;

    const isi = typeof hover.contents === 'string'
      ? hover.contents
      : Array.isArray(hover.contents)
      ? hover.contents.map((c: any) => (typeof c === 'string' ? c : c.value)).join('\n')
      : (hover.contents as any)?.value || '';

    return {
      isi,
      rentang: hover.range
        ? {
            barisAwal: hover.range.start.line + 1,
            kolomAwal: hover.range.start.character + 1,
            barisAkhir: hover.range.end.line + 1,
            kolomAkhir: hover.range.end.character + 1,
          }
        : undefined,
    };
  }

  /**
   * Menemukan lokasi deklarasi simbol (Go to Definition).
   */
  public dapatkanDefinisi(
    uri: string,
    baris: number,
    kolom: number,
    teks: string
  ): LokasiDefinisiLSP | undefined {
    const doc = this.manajerDokumen.bukaDokumen(uri, 'nusantara', 1, teks);
    const pos = { line: Math.max(0, baris - 1), character: Math.max(0, kolom - 1) };
    const def = this.layananDefinisi.dapatkanDefinisi(doc, pos);

    if (!def) return undefined;

    return {
      jalurBerkas: def.uri,
      baris: def.range.start.line + 1,
      kolom: def.range.start.character + 1,
    };
  }

  /**
   * Memformat kode sumber menggunakan pemformat resmi Bahasa NUSANTARA (Phase 19).
   */
  public formatDokumen(kodeSumber: string, spasiIndensasi: number = 4): { berhasil: boolean; hasil: string; pesan?: string } {
    const hasil = formatAman(kodeSumber, { indentasi: spasiIndensasi });
    if (hasil.sukses && hasil.hasil) {
      return {
        berhasil: true,
        hasil: hasil.hasil,
      };
    }
    return {
      berhasil: false,
      hasil: kodeSumber,
      pesan: String(hasil.galat || 'Gagal memformat dokumen.'),
    };
  }
}
