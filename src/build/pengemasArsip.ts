/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengemas Arsip & Generator Checksum Distribusi (Phase 23)
 */

export class PengemasArsip {
  public static hitungHashSederhana(konten: string): string {
    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;

    for (let i = 0; i < konten.length; i++) {
      const c = konten.charCodeAt(i);
      h0 = Math.imul(h0 ^ c, 0x01000193) >>> 0;
      h1 = Math.imul(h1 ^ (c << 1), 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (c << 2), 0x01000193) >>> 0;
      h3 = Math.imul(h3 ^ (c << 3), 0x01000193) >>> 0;
      h4 = ((h4 << 5) - h4 + c) >>> 0;
      h5 = ((h5 << 7) - h5 + c) >>> 0;
      h6 = (h6 ^ (h0 + c)) >>> 0;
      h7 = (h7 ^ (h1 - c)) >>> 0;
    }

    const p0 = h0.toString(16).padStart(8, '0');
    const p1 = h1.toString(16).padStart(8, '0');
    const p2 = h2.toString(16).padStart(8, '0');
    const p3 = h3.toString(16).padStart(8, '0');
    const p4 = h4.toString(16).padStart(8, '0');
    const p5 = h5.toString(16).padStart(8, '0');
    const p6 = h6.toString(16).padStart(8, '0');
    const p7 = h7.toString(16).padStart(8, '0');

    return `${p0}${p1}${p2}${p3}${p4}${p5}${p6}${p7}`;
  }

  public static kemasTarGz(nama: string, berkas: Record<string, string> | string): string {
    if (typeof berkas === 'string') {
      return `TAR_GZ_ARCHIVE:${nama}\nRAW:${berkas.length}\n${berkas}\n`;
    }
    let output = `TAR_GZ_ARCHIVE:${nama}\n`;
    for (const [k, v] of Object.entries(berkas)) {
      output += `FILE:${k}:${v.length}\n${v}\n`;
    }
    return output;
  }

  public static kemasZip(nama: string, berkas: Record<string, string> | string): string {
    if (typeof berkas === 'string') {
      return `ZIP_ARCHIVE:${nama}\nRAW:${berkas.length}\n${berkas}\n`;
    }
    let output = `ZIP_ARCHIVE:${nama}\n`;
    for (const [k, v] of Object.entries(berkas)) {
      output += `ENTRY:${k}:${v.length}\n${v}\n`;
    }
    return output;
  }
}
