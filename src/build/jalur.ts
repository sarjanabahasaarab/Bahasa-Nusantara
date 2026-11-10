/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Utilitas Manipulasi Jalur Berkas Portabel (Cross-Platform Path Helpers)
 */

export function normalisasiJalur(jalur: string): string {
  if (!jalur) return '';
  let hasil = jalur.replace(/\\/g, '/');
  // Hapus dobel slash
  hasil = hasil.replace(/\/+/g, '/');
  // Selesaikan dot dan double dot
  const bagian = hasil.split('/');
  const stack: string[] = [];
  const adalahAbsolut = hasil.startsWith('/');

  for (const b of bagian) {
    if (b === '' || b === '.') continue;
    if (b === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') {
        stack.pop();
      } else if (!adalahAbsolut) {
        stack.push('..');
      }
    } else {
      stack.push(b);
    }
  }

  const res = (adalahAbsolut ? '/' : '') + stack.join('/');
  return res || (adalahAbsolut ? '/' : '.');
}

export function gabungJalur(...bagian: string[]): string {
  const difilter = bagian.filter(b => typeof b === 'string' && b.length > 0);
  if (difilter.length === 0) return '.';
  return normalisasiJalur(difilter.join('/'));
}

export function dapatkanDirektori(jalur: string): string {
  const norm = normalisasiJalur(jalur);
  const idx = norm.lastIndexOf('/');
  if (idx === -1) return '.';
  if (idx === 0) return '/';
  return norm.substring(0, idx);
}

export function dapatkanNamaBerkas(jalur: string): string {
  const norm = normalisasiJalur(jalur);
  const idx = norm.lastIndexOf('/');
  if (idx === -1) return norm;
  return norm.substring(idx + 1);
}

export function dapatkanEkstensi(jalur: string): string {
  const nama = dapatkanNamaBerkas(jalur);
  const idx = nama.lastIndexOf('.');
  if (idx <= 0) return '';
  return nama.substring(idx);
}
