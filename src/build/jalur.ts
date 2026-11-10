/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Utilitas Jalur Berkas Portabel (Path Utilities) untuk Sistem Build
 */

export function normalisasiJalur(jalur: string): string {
  if (!jalur) return '';
  let j = jalur.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (j.length > 1 && j.endsWith('/')) {
    j = j.slice(0, -1);
  }
  return j;
}

export function gabungJalur(...bagian: string[]): string {
  const difilter = bagian.filter(Boolean);
  return normalisasiJalur(difilter.join('/'));
}

export function direktoriDari(jalur: string): string {
  const norm = normalisasiJalur(jalur);
  const idx = norm.lastIndexOf('/');
  if (idx === -1) return '.';
  if (idx === 0) return '/';
  return norm.substring(0, idx);
}

export function namaBerkas(jalur: string): string {
  const norm = normalisasiJalur(jalur);
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? norm : norm.substring(idx + 1);
}
