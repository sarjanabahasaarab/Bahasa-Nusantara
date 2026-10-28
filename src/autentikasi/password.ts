/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Modul Pengelolaan Keamanan Password Menggunakan Scrypt Memory-Hard KDF
 * dan Perbandingan Waktu Konstan (Timing-Safe Equal).
 */

import { OpsiPasswordPolicy, GalatAutentikasi, JenisGalatAutentikasi } from './jenis';
import { acakHex, waktuKonstanSama, scryptHash } from './kriptoAman';

const DEFAULT_SCRYPT_N = 16384; // Cost parameter (CPU/memory cost)
const DEFAULT_SCRYPT_R = 8;     // Block size parameter
const DEFAULT_SCRYPT_P = 1;     // Parallelization parameter
const KEY_LENGTH = 64;          // Output hash length (bytes)
const SALT_LENGTH = 16;         // Salt length (bytes)

export class PengelolaPassword {
  private policy: Required<OpsiPasswordPolicy>;

  constructor(policy: OpsiPasswordPolicy = {}) {
    this.policy = {
      panjangMinimal: policy.panjangMinimal ?? 8,
      panjangMaksimal: policy.panjangMaksimal ?? 128,
      wajibHuruf: policy.wajibHuruf ?? false,
      wajibAngka: policy.wajibAngka ?? false,
    };
  }

  /**
   * Memvalidasi apakah password memenuhi kebijakan minimum yang ditetapkan.
   */
  public validasiKebijakan(password: string): void {
    if (!password || typeof password !== 'string') {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.PASSWORD_TIDAK_MEMENUHI_SYARAT,
        'Password tidak boleh kosong.',
        400
      );
    }

    if (password.length < this.policy.panjangMinimal) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.PASSWORD_TIDAK_MEMENUHI_SYARAT,
        `Password terlalu pendek. Minimal ${this.policy.panjangMinimal} karakter.`,
        400
      );
    }

    if (password.length > this.policy.panjangMaksimal) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.PASSWORD_TIDAK_MEMENUHI_SYARAT,
        `Password melebihi batas wajar (${this.policy.panjangMaksimal} karakter).`,
        400
      );
    }

    if (this.policy.wajibHuruf && !/[a-zA-Z]/.test(password)) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.PASSWORD_TIDAK_MEMENUHI_SYARAT,
        'Password harus memuat setidaknya satu huruf.',
        400
      );
    }

    if (this.policy.wajibAngka && !/[0-9]/.test(password)) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.PASSWORD_TIDAK_MEMENUHI_SYARAT,
        'Password harus memuat setidaknya satu angka.',
        400
      );
    }
  }

  /**
   * Menghasilkan hash password aman menggunakan Scrypt dengan salt acak kriptografis.
   * Format: $scrypt$N=16384,r=8,p=1$<salt_hex>$<hash_hex>
   */
  public hash(password: string): string {
    this.validasiKebijakan(password);

    const saltHex = acakHex(SALT_LENGTH);
    const hashHex = scryptHash(password, saltHex, KEY_LENGTH, {
      N: DEFAULT_SCRYPT_N,
      r: DEFAULT_SCRYPT_R,
      p: DEFAULT_SCRYPT_P,
    });

    return `$scrypt$N=${DEFAULT_SCRYPT_N},r=${DEFAULT_SCRYPT_R},p=${DEFAULT_SCRYPT_P}$${saltHex}$${hashHex}`;
  }

  /**
   * Memverifikasi apakah password plaintext cocok dengan hash tersimpan
   * menggunakan perbandingan waktu konstan untuk mencegah timing attack.
   */
  public verifikasi(password: string, hashTersimpan: string): boolean {
    if (!password || !hashTersimpan || typeof hashTersimpan !== 'string') {
      return false;
    }

    const bagian = hashTersimpan.split('$');
    // Format: ["", "scrypt", "N=...,r=...,p=...", "salt_hex", "hash_hex"]
    if (bagian.length !== 5 || bagian[1] !== 'scrypt') {
      return false;
    }

    const paramStr = bagian[2];
    const saltHex = bagian[3];
    const hashHexAsli = bagian[4];

    // Ekstrak parameter cost
    let N = DEFAULT_SCRYPT_N;
    let r = DEFAULT_SCRYPT_R;
    let p = DEFAULT_SCRYPT_P;

    for (const item of paramStr.split(',')) {
      const [k, v] = item.split('=');
      if (k === 'N') N = parseInt(v, 10);
      if (k === 'r') r = parseInt(v, 10);
      if (k === 'p') p = parseInt(v, 10);
    }

    try {
      const keyLength = hashHexAsli.length / 2;
      const hashKandidatHex = scryptHash(password, saltHex, keyLength, {
        N,
        r,
        p,
      });

      if (hashHexAsli.length !== hashKandidatHex.length) {
        return false;
      }

      return waktuKonstanSama(hashHexAsli, hashKandidatHex);
    } catch {
      return false;
    }
  }
}
