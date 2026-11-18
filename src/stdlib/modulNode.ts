/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Memuat modul bawaan Node.js secara sinkron tanpa mengandalkan require pada ESM.
 * Mengembalikan null saat berjalan di browser atau modul tidak tersedia.
 */
export function muatModulNode(nama: string): any {
  if (typeof window !== 'undefined') return null;
  try {
    const proc = typeof process !== 'undefined' ? (process as any) : null;
    if (typeof proc?.getBuiltinModule === 'function') {
      return proc.getBuiltinModule(nama) ?? proc.getBuiltinModule(nama.replace(/^node:/, ''));
    }
    if (typeof require !== 'undefined') return require(nama);
  } catch {
    // Modul bawaan tidak tersedia pada runtime ini.
  }
  return null;
}
