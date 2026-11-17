/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37/38
 * Abstraksi Penyimpanan Aman Mobile (Mobile Secure Storage / Keychain / Keystore)
 * Mendukung eksekusi isomorfis (Node.js runtime & Browser / Vite SPA) dengan enkripsi terautentikasi.
 */

import * as nodeCrypto from 'node:crypto';

const KUNCI_TERLARANG = new Set(['__proto__', 'constructor', 'prototype']);

function apakahKunciValid(kunci: unknown): kunci is string {
  return typeof kunci === 'string' && kunci.length > 0 && !KUNCI_TERLARANG.has(kunci) && !kunci.includes('\0');
}

function apakahNode(): boolean {
  return (
    typeof window === 'undefined' &&
    typeof document === 'undefined' &&
    typeof process !== 'undefined' &&
    Boolean(process?.versions?.node)
  );
}

function sha256Murni(bytes: Uint8Array): Uint8Array {
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

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  const len = bytes.length;
  const bitLength = len * 8;
  const sisa = (len + 9) % 64;
  const padLength = sisa === 0 ? 0 : 64 - sisa;
  const totalLength = len + 1 + padLength + 8;
  const buf = new Uint8Array(totalLength);
  buf.set(bytes);
  buf[len] = 0x80;

  const view = new DataView(buf.buffer);
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

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, H0, false);
  outView.setUint32(4, H1, false);
  outView.setUint32(8, H2, false);
  outView.setUint32(12, H3, false);
  outView.setUint32(16, H4, false);
  outView.setUint32(20, H5, false);
  outView.setUint32(24, H6, false);
  outView.setUint32(28, H7, false);
  return out;
}

function hmacSha256Murni(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  const k = key.length > blockSize ? sha256Murni(key) : key;
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(k);

  const oKeyPad = new Uint8Array(blockSize + 32);
  const iKeyPad = new Uint8Array(blockSize + message.length);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }
  iKeyPad.set(message, blockSize);
  const innerHash = sha256Murni(iKeyPad);
  oKeyPad.set(innerHash, blockSize);
  return sha256Murni(oKeyPad);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const len = Math.floor(cleanHex.length / 2);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function acakBytesIsomorfis(panjang: number): Uint8Array {
  if (apakahNode() && typeof (nodeCrypto as any)?.randomBytes === 'function') {
    return new Uint8Array((nodeCrypto as any).randomBytes(panjang));
  }
  const gCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as any) : null;
  if (gCrypto && typeof gCrypto.getRandomValues === 'function') {
    const arr = new Uint8Array(panjang);
    gCrypto.getRandomValues(arr);
    return arr;
  }
  const arr = new Uint8Array(panjang);
  for (let i = 0; i < panjang; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

export class PenyimpananAmanMobile {
  private static _defaultInstance: PenyimpananAmanMobile | null = null;
  private penyimpanan: Map<string, string> = new Map();
  private readonly kunciEnkripsiNode?: Buffer;
  private readonly kunciEnkripsiBrowser: Uint8Array;
  private readonly modeNode: boolean;

  public static get defaultInstance(): PenyimpananAmanMobile {
    if (!PenyimpananAmanMobile._defaultInstance) {
      PenyimpananAmanMobile._defaultInstance = new PenyimpananAmanMobile();
    }
    return PenyimpananAmanMobile._defaultInstance;
  }

  public static simpan(kunci: string, nilai: string): boolean {
    if (!apakahKunciValid(kunci) || typeof nilai !== 'string') {
      return false;
    }
    const cipherText = PenyimpananAmanMobile.defaultInstance.enkripsi(nilai, kunci);
    PenyimpananAmanMobile.defaultInstance.penyimpanan.set(kunci, cipherText);
    return true;
  }

  public static ambil(kunci: string): string | null {
    if (!apakahKunciValid(kunci)) return null;
    const cipherText = PenyimpananAmanMobile.defaultInstance.penyimpanan.get(kunci);
    if (!cipherText) return null;
    try {
      return PenyimpananAmanMobile.defaultInstance.dekripsi(cipherText, kunci);
    } catch {
      return null;
    }
  }

  public static hapus(kunci: string): boolean {
    if (!apakahKunciValid(kunci)) return false;
    return PenyimpananAmanMobile.defaultInstance.penyimpanan.delete(kunci);
  }

  public static memiliki(kunci: string): boolean {
    if (!apakahKunciValid(kunci)) return false;
    return PenyimpananAmanMobile.defaultInstance.penyimpanan.has(kunci);
  }

  constructor(frasaKunci?: string) {
    const rahasiaDasar =
      frasaKunci ??
      (typeof process !== 'undefined' && process.env?.NUSANTARA_MOBILE_KEYSTORE_SECRET
        ? process.env.NUSANTARA_MOBILE_KEYSTORE_SECRET
        : `nusantara-mobile-keystore-${typeof (nodeCrypto as any)?.randomBytes === 'function' ? 'runtime' : 'browser'}`);

    let bisaNode = false;
    try {
      if (apakahNode() && typeof (nodeCrypto as any)?.scryptSync === 'function') {
        bisaNode = true;
      }
    } catch {
      bisaNode = false;
    }

    this.modeNode = bisaNode;

    if (bisaNode) {
      // Gunakan garam unik per instance jika menggunakan rahasia runtime, atau terikat frasaKunci
      const garamUnik = frasaKunci ? 'garam_keystore_nusantara_v2' : (nodeCrypto as any).randomBytes(16);
      this.kunciEnkripsiNode = (nodeCrypto as any).scryptSync(rahasiaDasar, garamUnik, 32);
      this.kunciEnkripsiBrowser = new Uint8Array(0);
    } else {
      const garamBytes = new TextEncoder().encode('garam_keystore_nusantara_v2:' + rahasiaDasar);
      this.kunciEnkripsiBrowser = sha256Murni(garamBytes);
    }
  }

  private enkripsi(teksPolos: string, konteksKunci: string = ''): string {
    if (this.modeNode && this.kunciEnkripsiNode) {
      const iv = (nodeCrypto as any).randomBytes(12);
      const cipher = (nodeCrypto as any).createCipheriv('aes-256-gcm', this.kunciEnkripsiNode, iv);
      cipher.setAAD(Buffer.from(konteksKunci, 'utf8'));
      const terenkripsi = Buffer.concat([
        cipher.update(teksPolos, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return `v2:${iv.toString('hex')}:${authTag.toString('hex')}:${terenkripsi.toString('hex')}`;
    }

    // Algoritma enkripsi simetris CTR terautentikasi HMAC-SHA256 untuk browser
    const ivBytes = acakBytesIsomorfis(16);
    const ivHex = bytesToHex(ivBytes);
    const plainBytes = new TextEncoder().encode(teksPolos);
    const cipherBytes = new Uint8Array(plainBytes.length);

    for (let i = 0; i < plainBytes.length; i += 32) {
      const blockIdx = Math.floor(i / 32);
      const counterBuf = new TextEncoder().encode(`${ivHex}:${blockIdx}`);
      const combined = new Uint8Array(this.kunciEnkripsiBrowser.length + counterBuf.length);
      combined.set(this.kunciEnkripsiBrowser, 0);
      combined.set(counterBuf, this.kunciEnkripsiBrowser.length);
      const keyStream = sha256Murni(combined);

      for (let j = 0; j < 32 && i + j < plainBytes.length; j++) {
        cipherBytes[i + j] = plainBytes[i + j] ^ keyStream[j];
      }
    }

    const cipherHex = bytesToHex(cipherBytes);
    const macInput = new TextEncoder().encode(`${konteksKunci}:${ivHex}:${cipherHex}`);
    const macHex = bytesToHex(hmacSha256Murni(this.kunciEnkripsiBrowser, macInput));
    return `v2b:${ivHex}:${macHex}:${cipherHex}`;
  }

  private dekripsi(dataTerenkripsi: string, konteksKunci: string = ''): string {
    if (!dataTerenkripsi || typeof dataTerenkripsi !== 'string') {
      throw new Error('Data penyimpanan aman rusak');
    }

    if (dataTerenkripsi.startsWith('v2:')) {
      const bagian = dataTerenkripsi.split(':');
      if (bagian.length !== 4) throw new Error('Format ciphertext AES-GCM tidak valid');
      const [, ivHex, tagHex, kontenHex] = bagian;
      if (!this.modeNode || !this.kunciEnkripsiNode) {
        throw new Error('Ciphertext Node AES-GCM tidak dapat didekripsi di browser');
      }
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const kontenBuf = Buffer.from(kontenHex, 'hex');
      const decipher = (nodeCrypto as any).createDecipheriv('aes-256-gcm', this.kunciEnkripsiNode, iv);
      decipher.setAAD(Buffer.from(konteksKunci, 'utf8'));
      decipher.setAuthTag(tag);
      const didekripsi = Buffer.concat([decipher.update(kontenBuf), decipher.final()]);
      return didekripsi.toString('utf8');
    }

    if (dataTerenkripsi.startsWith('v2b:')) {
      const bagian = dataTerenkripsi.split(':');
      if (bagian.length !== 4) throw new Error('Format ciphertext browser tidak valid');
      const [, ivHex, macHex, cipherHex] = bagian;
      const macInput = new TextEncoder().encode(`${konteksKunci}:${ivHex}:${cipherHex}`);
      const macHarapan = bytesToHex(hmacSha256Murni(this.kunciEnkripsiBrowser, macInput));
      if (!constantTimeEqualHex(macHex, macHarapan)) {
        throw new Error('Verifikasi integritas HMAC gagal');
      }
      const cipherBytes = hexToBytes(cipherHex);
      const plainBytes = new Uint8Array(cipherBytes.length);
      for (let i = 0; i < cipherBytes.length; i += 32) {
        const blockIdx = Math.floor(i / 32);
        const counterBuf = new TextEncoder().encode(`${ivHex}:${blockIdx}`);
        const combined = new Uint8Array(this.kunciEnkripsiBrowser.length + counterBuf.length);
        combined.set(this.kunciEnkripsiBrowser, 0);
        combined.set(counterBuf, this.kunciEnkripsiBrowser.length);
        const keyStream = sha256Murni(combined);
        for (let j = 0; j < 32 && i + j < cipherBytes.length; j++) {
          plainBytes[i + j] = cipherBytes[i + j] ^ keyStream[j];
        }
      }
      return new TextDecoder().decode(plainBytes);
    }

    throw new Error('Skema enkripsi tidak dikenali atau data termodifikasi');
  }

  public dapatkanCiphertextMentah(kunci: string): string | undefined {
    if (!apakahKunciValid(kunci)) return undefined;
    return this.penyimpanan.get(kunci);
  }

  public timpaCiphertextUntukUji(kunci: string, ciphertextRusak: string): void {
    if (!apakahKunciValid(kunci)) return;
    this.penyimpanan.set(kunci, ciphertextRusak);
  }

  public async simpan(kunci: string, nilai: string): Promise<void> {
    if (!apakahKunciValid(kunci)) {
      throw new Error('Kunci penyimpanan aman tidak valid.');
    }
    if (typeof nilai !== 'string') {
      throw new Error('Nilai penyimpanan aman harus berupa teks.');
    }
    const cipherText = this.enkripsi(nilai, kunci);
    this.penyimpanan.set(kunci, cipherText);
  }

  public async ambil(kunci: string): Promise<string | null> {
    if (!apakahKunciValid(kunci)) return null;
    const cipherText = this.penyimpanan.get(kunci);
    if (!cipherText) return null;
    try {
      return this.dekripsi(cipherText, kunci);
    } catch {
      return null;
    }
  }

  public async hapus(kunci: string): Promise<boolean> {
    if (!apakahKunciValid(kunci)) return false;
    return this.penyimpanan.delete(kunci);
  }

  public async apakahAda(kunci: string): Promise<boolean> {
    if (!apakahKunciValid(kunci)) return false;
    return this.penyimpanan.has(kunci);
  }

  public async bersihkan(): Promise<void> {
    this.penyimpanan.clear();
  }
}
