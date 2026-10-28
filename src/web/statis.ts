/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Penangan Berkas Statis dengan Proteksi Path Traversal,
 * Penyaringan Berkas Sensitif/Tersembunyi, dan Pemetaan MIME Type Lengkap.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PermintaanWeb, ResponsWeb, GalatWeb, JenisGalatWeb } from './jenis';

const TABEL_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

export function dapatkanTipeMIME(namaBerkas: string): string {
  const ekstensi = path.extname(namaBerkas).toLowerCase();
  return TABEL_MIME[ekstensi] || 'application/octet-stream';
}

export interface OpsiBerkasStatis {
  direktoriRoot: string;
  prefixUrl?: string; // misal '/publik' atau '/'
  indeksDefault?: string; // default 'index.html'
  izinkanBerkasTersembunyi?: boolean; // default false (menolak .env, .git, dll.)
}

export class PenanganBerkasStatis {
  private readonly rootAman: string;
  private readonly prefix: string;
  private readonly indeksDefault: string;
  private readonly izinkanTersembunyi: boolean;

  constructor(opsi: OpsiBerkasStatis) {
    this.rootAman = path.resolve(opsi.direktoriRoot);
    let p = opsi.prefixUrl || '/';
    if (!p.startsWith('/')) p = '/' + p;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    this.prefix = p;
    this.indeksDefault = opsi.indeksDefault || 'index.html';
    this.izinkanTersembunyi = opsi.izinkanBerkasTersembunyi ?? false;
  }

  public apakahMencakup(jalur: string): boolean {
    if (this.prefix === '/') return true;
    return jalur === this.prefix || jalur.startsWith(this.prefix + '/');
  }

  public tangani(req: PermintaanWeb, res: ResponsWeb): boolean {
    if (req.metode !== 'GET' && req.metode !== 'HEAD') {
      return false;
    }

    if (!this.apakahMencakup(req.jalur)) {
      return false;
    }

    // Ekstrak sub-jalur relatif setelah prefix
    let subJalur = req.jalur;
    if (this.prefix !== '/') {
      subJalur = req.jalur.slice(this.prefix.length);
    }
    if (!subJalur.startsWith('/')) subJalur = '/' + subJalur;

    // Bersihkan URL encoding dan null bytes
    if (subJalur.includes('\0') || subJalur.includes('%00')) {
      throw new GalatWeb(
        JenisGalatWeb.AKSES_JALUR_ILEGAL,
        400,
        'Karakter null byte ilegal pada jalur berkas statis.'
      );
    }

    let jalurDidekode: string;
    try {
      jalurDidekode = decodeURIComponent(subJalur);
    } catch {
      throw new GalatWeb(
        JenisGalatWeb.AKSES_JALUR_ILEGAL,
        400,
        'Jalur berkas statis mengandung encoding URI tidak valid.'
      );
    }

    // Path traversal check
    const jalurTarget = path.normalize(path.join(this.rootAman, jalurDidekode));
    const relatif = path.relative(this.rootAman, jalurTarget);

    if (relatif.startsWith('..') || path.isAbsolute(relatif)) {
      throw new GalatWeb(
        JenisGalatWeb.AKSES_JALUR_ILEGAL,
        403,
        `Percobaan path traversal terdeteksi: akses di luar direktori aman ditolak.`
      );
    }

    // Blokir akses ke file/folder tersembunyi
    if (!this.izinkanTersembunyi) {
      const bagian = relatif.split(path.sep);
      if (bagian.some(b => b.startsWith('.'))) {
        throw new GalatWeb(
          JenisGalatWeb.AKSES_JALUR_ILEGAL,
          403,
          'Akses berkas atau folder tersembunyi/sensitif ditolak.'
        );
      }
    }

    let stat: fs.Stats;
    try {
      if (!fs.existsSync(jalurTarget)) {
        return false;
      }
      stat = fs.statSync(jalurTarget);
    } catch {
      return false;
    }

    let berkasAkhir = jalurTarget;
    if (stat.isDirectory()) {
      berkasAkhir = path.join(jalurTarget, this.indeksDefault);
      if (!fs.existsSync(berkasAkhir)) {
        return false;
      }
      stat = fs.statSync(berkasAkhir);
    }

    const tipeMime = dapatkanTipeMIME(berkasAkhir);
    try {
      const konten = fs.readFileSync(berkasAkhir);
      res.status(200);
      res.tipe(tipeMime);
      res.tajuk('Content-Length', String(stat.size));
      // Security headers default
      res.tajuk('X-Content-Type-Options', 'nosniff');

      if (req.metode === 'HEAD') {
        res.kirimStatus(200);
      } else {
        res.teks(konten.toString('utf-8'));
      }
      return true;
    } catch {
      return false;
    }
  }
}
