/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Utilitas Kriptografi Aman Lintas Platform (Node.js & Peramban/Browser Client).
 */

let _nodeCrypto: any = undefined;

function dapatkanNodeCrypto(): any {
  if (_nodeCrypto !== undefined) return _nodeCrypto;
  if (typeof window !== 'undefined' || typeof document !== 'undefined') {
    _nodeCrypto = null;
    return null;
  }
  try {
    if (typeof (process as any)?.getBuiltinModule === 'function') {
      const mod = (process as any).getBuiltinModule('node:crypto');
      if (mod?.randomBytes) {
        _nodeCrypto = mod;
        return _nodeCrypto;
      }
    }
    if (typeof require === 'function') {
      const mod = require('node:crypto');
      if (mod?.randomBytes) {
        _nodeCrypto = mod;
        return _nodeCrypto;
      }
    }
  } catch {
    _nodeCrypto = null;
  }
  _nodeCrypto = null;
  return null;
}

/**
 * Menghasilkan byte acak kriptografis (CSPRNG).
 */
export function acakBytes(panjang: number): Uint8Array {
  const node = dapatkanNodeCrypto();
  if (node && typeof node.randomBytes === 'function') {
    return node.randomBytes(panjang);
  }

  const gCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as any) : null;
  if (gCrypto && typeof gCrypto.getRandomValues === 'function') {
    const arr = new Uint8Array(panjang);
    gCrypto.getRandomValues(arr);
    return arr;
  }

  // Fallback darurat jika crypto tidak tersedia
  const arr = new Uint8Array(panjang);
  for (let i = 0; i < panjang; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

/**
 * Menghasilkan string heksadesimal acak sepanjang byte yang ditentukan.
 */
export function acakHex(panjangByte: number): string {
  const bytes = acakBytes(panjangByte);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Perbandingan waktu konstan untuk mencegah serangan timing side-channel.
 */
export function waktuKonstanSama(
  a: Uint8Array | Buffer | string,
  b: Uint8Array | Buffer | string
): boolean {
  const node = dapatkanNodeCrypto();

  const bufA = typeof a === 'string' ? new TextEncoder().encode(a) : new Uint8Array(a);
  const bufB = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  if (node && typeof node.timingSafeEqual === 'function' && typeof Buffer !== 'undefined') {
    try {
      return node.timingSafeEqual(Buffer.from(bufA), Buffer.from(bufB));
    } catch {
      // Fallback ke perbandingan manual bitwise XOR
    }
  }

  let hasil = 0;
  for (let i = 0; i < bufA.length; i++) {
    hasil |= bufA[i] ^ bufB[i];
  }
  return hasil === 0;
}

/**
 * Implementasi murni SHA-256 untuk lingkungan peramban.
 */
function sha256Murni(teks: string | Uint8Array): string {
  // Implementasi SHA-256 mandiri
  const data = typeof teks === 'string' ? new TextEncoder().encode(teks) : teks;

  function rotr(n: number, x: number) {
    return (x >>> n) | (x << (32 - n));
  }
  function choose(x: number, y: number, z: number) {
    return (x & y) ^ (~x & z);
  }
  function majority(x: number, y: number, z: number) {
    return (x & y) ^ (x & z) ^ (y & z);
  }
  function sigma0(x: number) {
    return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
  }
  function sigma1(x: number) {
    return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
  }
  function gamma0(x: number) {
    return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
  }
  function gamma1(x: number) {
    return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  const panjangAwal = data.length;
  const bitLength = panjangAwal * 8;
  const sisa = (panjangAwal + 9) % 64;
  const padLength = sisa === 0 ? 0 : 64 - sisa;
  const totalLength = panjangAwal + 1 + padLength + 8;
  const buffer = new Uint8Array(totalLength);
  buffer.set(data);
  buffer[panjangAwal] = 0x80;

  const view = new DataView(buffer.buffer);
  view.setBigUint64(totalLength - 8, BigInt(bitLength), false);

  const W = new Uint32Array(64);
  for (let i = 0; i < totalLength; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      W[t] = (gamma1(W[t - 2]) + W[t - 7] + gamma0(W[t - 15]) + W[t - 16]) >>> 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;
    for (let t = 0; t < 64; t++) {
      const T1 = (h + sigma1(e) + choose(e, f, g) + K[t] + W[t]) >>> 0;
      const T2 = (sigma0(a) + majority(a, b, c)) >>> 0;
      h = g; g = f; f = e; e = (d + T1) >>> 0;
      d = c; c = b; b = a; a = (T1 + T2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  const out = [H0, H1, H2, H3, H4, H5, H6, H7];
  return out.map(x => x.toString(16).padStart(8, '0')).join('');
}

/**
 * Menghitung SHA-256 heksadesimal.
 */
export function sha256Hex(data: string | Uint8Array): string {
  const node = dapatkanNodeCrypto();
  if (node && typeof node.createHash === 'function') {
    return node.createHash('sha256').update(data).digest('hex');
  }
  return sha256Murni(data);
}

/**
 * Menghitung hash password berbasis Scrypt KDF.
 * Di Node.js menggunakan native crypto.scryptSync.
 * Di lingkungan peramban menggunakan komputasi teriterasi untuk portabilitas.
 */
export function scryptHash(
  password: string,
  saltHex: string,
  keyLength = 64,
  opsi = { N: 16384, r: 8, p: 1 }
): string {
  const node = dapatkanNodeCrypto();
  if (node && typeof node.scryptSync === 'function') {
    const saltBuf = Buffer.from(saltHex, 'hex');
    const hashBuf = node.scryptSync(password, saltBuf, keyLength, {
      N: opsi.N,
      r: opsi.r,
      p: opsi.p,
      maxmem: 32 * 1024 * 1024,
    });
    return hashBuf.toString('hex');
  }

  // Fallback peramban: hashing HMAC/SHA256 berulang
  let hasil = sha256Hex(`${saltHex}:${password}`);
  for (let i = 0; i < 1000; i++) {
    hasil = sha256Hex(`${hasil}:${saltHex}:${i}`);
  }
  // gandakan agar mencapai 64 byte (128 char hex)
  const hasil2 = sha256Hex(`${hasil}:part2`);
  return (hasil + hasil2).slice(0, keyLength * 2);
}
