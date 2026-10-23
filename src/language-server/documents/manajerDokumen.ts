/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NodeProgram } from '../../parser/ast';
import { DiagnostikLSP, PosisiLSP, RentangLSP, SimbolDokumenLSP } from '../protocol/types';

/**
 * Representasi Dokumen Teks dalam Memori Language Server.
 */
export interface DokumenTeks {
  uri: string;
  jalur: string;
  languageId: string;
  version: number;
  konten: string;
  barisOffset: number[]; // Indeks karakter awal setiap baris (0-based)

  // Cache Terikat Versi
  astCache?: NodeProgram;
  galatParserCache?: any[];
  diagnostikCache?: DiagnostikLSP[];
  simbolCache?: SimbolDokumenLSP[];
}

/**
 * Mengubah URI (file://...) menjadi jalur sistem berkas absolut.
 */
export function uriKeJalurBerkas(uri: string): string {
  if (uri.startsWith('file://')) {
    let jalur = decodeURIComponent(uri.replace(/^file:\/\//, ''));
    // Windows file URI: file:///C:/path -> C:/path
    if (/^\/[a-zA-Z]:/.test(jalur)) {
      jalur = jalur.substring(1);
    }
    return jalur;
  }
  return uri;
}

/**
 * Mengubah jalur berkas menjadi URI skema file://.
 */
export function jalurBerkasKeUri(jalur: string): string {
  if (jalur.startsWith('file://')) {
    return jalur;
  }
  let bersih = jalur.replace(/\\/g, '/');
  if (!bersih.startsWith('/')) {
    bersih = '/' + bersih;
  }
  return 'file://' + encodeURI(bersih);
}

/**
 * Menghitung posisi offset karakter setiap baris dalam teks.
 */
function hitungOffsetBaris(teks: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < teks.length; i++) {
    if (teks[i] === '\n') {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

/**
 * Manajer Dokumen Teks Terbuka untuk Language Server NUSANTARA.
 */
export class ManajerDokumen {
  private readonly dokumenMap = new Map<string, DokumenTeks>();

  /**
   * Menangani peristiwa pembukaan dokumen (textDocument/didOpen).
   */
  public bukaDokumen(uri: string, languageId: string, version: number, konten: string): DokumenTeks {
    const jalur = uriKeJalurBerkas(uri);
    const dokumen: DokumenTeks = {
      uri,
      jalur,
      languageId,
      version,
      konten,
      barisOffset: hitungOffsetBaris(konten),
    };
    this.dokumenMap.set(uri, dokumen);
    return dokumen;
  }

  /**
   * Menangani peristiwa pembaruan isi dokumen (textDocument/didChange).
   */
  public perbaruiDokumen(
    uri: string,
    version: number,
    perubahan: Array<{ range?: RentangLSP; text: string }>
  ): DokumenTeks | null {
    const dokumen = this.dokumenMap.get(uri);
    if (!dokumen) {
      return null;
    }

    // Hindari memperbarui jika version masuk lebih rendah (stale update)
    if (version < dokumen.version) {
      return dokumen;
    }

    let teksBaru = dokumen.konten;
    for (const ubah of perubahan) {
      if (!ubah.range) {
        // Pembaruan dokumen penuh (Full sync)
        teksBaru = ubah.text;
      } else {
        // Pembaruan inkremental berbasis rentang posisi
        const indeksAwal = this.posisiKeIndeks(dokumen, ubah.range.start);
        const indeksAkhir = this.posisiKeIndeks(dokumen, ubah.range.end);
        teksBaru = teksBaru.substring(0, indeksAwal) + ubah.text + teksBaru.substring(indeksAkhir);
      }
    }

    dokumen.version = version;
    dokumen.konten = teksBaru;
    dokumen.barisOffset = hitungOffsetBaris(teksBaru);

    // Invaliasi seluruh cache karena teks berubah
    this.invaliasiCache(dokumen);

    return dokumen;
  }

  /**
   * Menangani peristiwa penutupan dokumen (textDocument/didClose).
   */
  public tutupDokumen(uri: string): boolean {
    return this.dokumenMap.delete(uri);
  }

  /**
   * Mengambil dokumen berdasarkan URI.
   */
  public ambilDokumen(uri: string): DokumenTeks | undefined {
    return this.dokumenMap.get(uri);
  }

  /**
   * Mengambil seluruh dokumen aktif.
   */
  public ambilSemuaDokumen(): DokumenTeks[] {
    return Array.from(this.dokumenMap.values());
  }

  /**
   * Menginvaliasi cache analisis dokumen.
   */
  public invaliasiCache(dokumen: DokumenTeks): void {
    dokumen.astCache = undefined;
    dokumen.galatParserCache = undefined;
    dokumen.diagnostikCache = undefined;
    dokumen.simbolCache = undefined;
  }

  /**
   * Mengonversi PosisiLSP (baris, karakter) menjadi indeks karakter string.
   */
  public posisiKeIndeks(dokumen: DokumenTeks, posisi: PosisiLSP): number {
    const baris = posisi.line;
    if (baris < 0) return 0;
    if (baris >= dokumen.barisOffset.length) {
      return dokumen.konten.length;
    }
    const awalBaris = dokumen.barisOffset[baris];
    return Math.min(awalBaris + Math.max(0, posisi.character), dokumen.konten.length);
  }

  /**
   * Mengonversi indeks karakter string menjadi PosisiLSP (baris, karakter).
   */
  public indeksKePosisi(dokumen: DokumenTeks, indeks: number): PosisiLSP {
    const batasIndeks = Math.max(0, Math.min(indeks, dokumen.konten.length));
    const offsets = dokumen.barisOffset;

    let baris = 0;
    for (let i = 0; i < offsets.length; i++) {
      if (offsets[i] <= batasIndeks) {
        baris = i;
      } else {
        break;
      }
    }

    const character = batasIndeks - offsets[baris];
    return { line: baris, character };
  }
}
