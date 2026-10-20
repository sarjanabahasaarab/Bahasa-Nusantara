/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Representasi Versi Semantik (Semantic Versioning 2.0.0) Bahasa NUSANTARA.
 */
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  praRilis?: string;
  metadataBuild?: string;
  mentah: string;
}

const POLA_SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

/**
 * Mengurai string versi semantik menjadi objek SemVer.
 * Melempar Error berbahasa Indonesia jika format tidak valid.
 */
export function uraiVersi(teks: string): SemVer {
  const bersih = teks.trim();
  const kecocokan = bersih.match(POLA_SEMVER);

  if (!kecocokan) {
    throw new Error(
      `Format versi '${teks}' tidak valid. Gunakan format Semantic Versioning (MAJOR.MINOR.PATCH), contoh: 1.0.0`
    );
  }

  return {
    major: parseInt(kecocokan[1], 10),
    minor: parseInt(kecocokan[2], 10),
    patch: parseInt(kecocokan[3], 10),
    praRilis: kecocokan[4],
    metadataBuild: kecocokan[5],
    mentah: bersih,
  };
}

/**
 * Memeriksa apakah string versi merupakan Semantic Versioning yang sah.
 */
export function apakahVersiValid(teks: string): boolean {
  try {
    uraiVersi(teks);
    return true;
  } catch {
    return false;
  }
}

/**
 * Membandingkan dua objek SemVer.
 * Mengembalikan:
 * -1 jika a < b
 *  0 jika a === b
 *  1 jika a > b
 */
export function bandingkanVersi(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) {
    return a.major > b.major ? 1 : -1;
  }
  if (a.minor !== b.minor) {
    return a.minor > b.minor ? 1 : -1;
  }
  if (a.patch !== b.patch) {
    return a.patch > b.patch ? 1 : -1;
  }

  // Versi dengan pra-rilis memiliki prioritas lebih rendah daripada versi rilis normal
  if (a.praRilis && !b.praRilis) return -1;
  if (!a.praRilis && b.praRilis) return 1;
  if (a.praRilis && b.praRilis) {
    if (a.praRilis !== b.praRilis) {
      return a.praRilis.localeCompare(b.praRilis);
    }
  }

  return 0;
}

/**
 * Memformat objek SemVer kembali menjadi teks standar.
 */
export function formatVersi(v: SemVer): string {
  let hasil = `${v.major}.${v.minor}.${v.patch}`;
  if (v.praRilis) hasil += `-${v.praRilis}`;
  if (v.metadataBuild) hasil += `+${v.metadataBuild}`;
  return hasil;
}

/**
 * Memeriksa apakah versi tertentu memenuhi batasan rentang versi (version constraint).
 * Mendukung:
 * - Persis: "1.2.3"
 * - Karat (Caret ^): "^1.2.0" (kompatibel selama major sama untuk >= 1.0.0)
 * - Tilde (~): "~1.2.0" (kompatibel selama major dan minor sama)
 * - Wildcard: "*", "1.x", "1.2.x"
 * - Operator relasional: ">=1.0.0", "<2.0.0", ">=1.0.0 <2.0.0"
 */
export function apakahKompatibel(versiUji: string | SemVer, batasan: string): boolean {
  const v = typeof versiUji === 'string' ? uraiVersi(versiUji) : versiUji;
  const batasanBersih = batasan.trim();

  // Bintang / sembarang versi
  if (batasanBersih === '*' || batasanBersih === '' || batasanBersih === 'terbaru') {
    return true;
  }

  // Format caret ^ (misal ^1.2.0)
  if (batasanBersih.startsWith('^')) {
    const basis = uraiVersi(batasanBersih.slice(1));
    if (bandingkanVersi(v, basis) < 0) return false;

    if (basis.major > 0) {
      return v.major === basis.major;
    }
    // Jika 0.x, maka minor bertindak sebagai batas breaking
    if (basis.minor > 0) {
      return v.major === 0 && v.minor === basis.minor;
    }
    // Jika 0.0.x, maka patch bertindak sebagai batas breaking
    return v.major === 0 && v.minor === 0 && v.patch === basis.patch;
  }

  // Format tilde ~ (misal ~1.2.0)
  if (batasanBersih.startsWith('~')) {
    const basis = uraiVersi(batasanBersih.slice(1));
    if (bandingkanVersi(v, basis) < 0) return false;
    return v.major === basis.major && v.minor === basis.minor;
  }

  // Format wildcard major atau minor (1.x, 1.2.x)
  if (batasanBersih.endsWith('.x') || batasanBersih.endsWith('.*')) {
    const bagian = batasanBersih.split('.');
    if (bagian.length === 2) {
      // 1.x
      const maj = parseInt(bagian[0], 10);
      return v.major === maj;
    }
    if (bagian.length === 3) {
      // 1.2.x
      const maj = parseInt(bagian[0], 10);
      const min = parseInt(bagian[1], 10);
      return v.major === maj && v.minor === min;
    }
  }

  // Format majemuk dengan spasi, misal: ">=1.0.0 <2.0.0"
  if (batasanBersih.includes(' ')) {
    const klausul = batasanBersih.split(/\s+/).filter(Boolean);
    return klausul.every(k => apakahKompatibel(v, k));
  }

  // Format relasional: >=, <=, >, <, ==, =
  if (batasanBersih.startsWith('>=')) {
    const basis = uraiVersi(batasanBersih.slice(2));
    return bandingkanVersi(v, basis) >= 0;
  }
  if (batasanBersih.startsWith('<=')) {
    const basis = uraiVersi(batasanBersih.slice(2));
    return bandingkanVersi(v, basis) <= 0;
  }
  if (batasanBersih.startsWith('>')) {
    const basis = uraiVersi(batasanBersih.slice(1));
    return bandingkanVersi(v, basis) > 0;
  }
  if (batasanBersih.startsWith('<')) {
    const basis = uraiVersi(batasanBersih.slice(1));
    return bandingkanVersi(v, basis) < 0;
  }
  if (batasanBersih.startsWith('=')) {
    const basis = uraiVersi(batasanBersih.replace(/^=+/, ''));
    return bandingkanVersi(v, basis) === 0;
  }

  // Format versi pasti
  try {
    const basis = uraiVersi(batasanBersih);
    return bandingkanVersi(v, basis) === 0;
  } catch {
    return false;
  }
}
