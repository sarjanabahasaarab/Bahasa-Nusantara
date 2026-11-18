/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Memuat modul bawaan Node.js (fs, path, crypto, child_process) secara sinkron.
 * `require` tidak tersedia saat proyek berjalan sebagai ES module ("type": "module"),
 * sehingga process.getBuiltinModule diutamakan. Mengembalikan null di peramban.
 */
export function muatModulNode(nama: string): any {
  if (typeof window !== 'undefined') return null;
  try {
    const proc = typeof process !== 'undefined' ? (process as any) : null;
    if (proc?.getBuiltinModule) {
      return proc.getBuiltinModule(nama);
    }
    if (typeof require !== 'undefined') {
      return require(nama);
    }
  } catch {
    // Modul tidak tersedia di lingkungan ini
  }
  return null;
}
