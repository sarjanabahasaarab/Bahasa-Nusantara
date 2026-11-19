/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatLogika,
  buatTeks,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';
import { muatModulNode } from './modulNode';

/**
 * Modul Standar: kripto
 * Menyediakan fungsi kriptografi aman: hashing SHA-256 & MD5, pembangkitan byte acak CSPRNG,
 * dan pembandingan waktu konstan (constant-time compare) untuk mencegah timing attack.
 */
export const simbolEksporKripto: Map<string, InfoSimbolModul> = new Map([
  [
    'sha256',
    {
      nama: 'sha256',
      kategori: 'fungsi',
      parameter: [{ nama: 'pesan', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'md5',
    {
      nama: 'md5',
      kategori: 'fungsi',
      parameter: [{ nama: 'pesan', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'byteAcak',
    {
      nama: 'byteAcak',
      kategori: 'fungsi',
      parameter: [{ nama: 'panjang', tipe: 'bilangan' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'bilanganAcak',
    {
      nama: 'bilanganAcak',
      kategori: 'fungsi',
      parameter: [
        { nama: 'min', tipe: 'bilangan' },
        { nama: 'max', tipe: 'bilangan' },
      ],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'bandingkanWaktuKonstan',
    {
      nama: 'bandingkanWaktuKonstan',
      kategori: 'fungsi',
      parameter: [
        { nama: 'a', tipe: 'teks' },
        { nama: 'b', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
    },
  ],
]);

function hitungHashNode(algoritma: string, pesan: string): string {
  const crypto = muatModulNode('node:crypto');
  if (crypto && typeof crypto.createHash === 'function') {
    return crypto.createHash(algoritma).update(pesan, 'utf-8').digest('hex');
  }
  throw new GalatRuntime(
    JenisGalatRuntime.INTERNAL,
    `Penyedia hash kriptografis '${algoritma}' tidak tersedia pada lingkungan ini.`
  );
}

function dapatkanCryptoWeb(): Crypto | null {
  if (typeof globalThis !== 'undefined' && globalThis.crypto &&
      typeof globalThis.crypto.getRandomValues === 'function') {
    return globalThis.crypto;
  }
  return null;
}

function buatGalatCSPRNG(): GalatRuntime {
  return new GalatRuntime(
    JenisGalatRuntime.INTERNAL,
    'Sumber acak kriptografis yang aman tidak tersedia; operasi dibatalkan tanpa fallback pseudoacak.'
  );
}

function byteAcakAman(panjang: number, cryptoNode: any, cryptoWeb: Crypto | null): Uint8Array {
  if (cryptoNode && typeof cryptoNode.randomBytes === 'function') {
    return new Uint8Array(cryptoNode.randomBytes(panjang));
  }
  if (!cryptoWeb) throw buatGalatCSPRNG();

  const hasil = new Uint8Array(panjang);
  // Web Crypto membatasi satu panggilan getRandomValues hingga 65.536 byte.
  for (let offset = 0; offset < panjang; offset += 65536) {
    cryptoWeb.getRandomValues(hasil.subarray(offset, Math.min(offset + 65536, panjang)));
  }
  return hasil;
}

function bilanganAcakAman(min: number, max: number, cryptoNode: any, cryptoWeb: Crypto | null): number {
  if (cryptoNode && typeof cryptoNode.randomInt === 'function') {
    const rentangNode = max - min + 1;
    if (rentangNode >= 0x1000000000000) {
      throw new GalatRuntime(JenisGalatRuntime.ARGUMEN_TIDAK_VALID, 'Rentang bilanganAcak pada Node.js harus lebih kecil dari 2^48.');
    }
    return cryptoNode.randomInt(min, max + 1);
  }

  if (!cryptoWeb) throw buatGalatCSPRNG();
  const rentang = max - min + 1;
  if (rentang > 0x100000000) {
    throw new GalatRuntime(
      JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
      'Rentang bilanganAcak pada Web Crypto tidak boleh melebihi 2^32.'
    );
  }

  // Rejection sampling menghindari bias modulo.
  const batas = Math.floor(0x100000000 / rentang) * rentang;
  const kata = new Uint32Array(1);
  let kandidat: number;
  do {
    cryptoWeb.getRandomValues(kata);
    kandidat = kata[0];
  } while (kandidat >= batas);
  return min + (kandidat % rentang);
}

export function buatEksporKripto(opsiPenyedia?: { cryptoNode?: any | null; cryptoWeb?: Crypto | null }): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();
  const cryptoNode = opsiPenyedia ? (opsiPenyedia.cryptoNode ?? null) : muatModulNode('node:crypto');
  const cryptoWeb = opsiPenyedia ? (opsiPenyedia.cryptoWeb ?? null) : dapatkanCryptoWeb();

  const fnSha256: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'sha256',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'kripto.sha256' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatTeks(hitungHashNode('sha256', args[0].nilai));
    },
  };
  ekspor.set('sha256', fnSha256);

  const fnMd5: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'md5',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'kripto.md5' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatTeks(hitungHashNode('md5', args[0].nilai));
    },
  };
  ekspor.set('md5', fnMd5);

  const fnByteAcak: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'byteAcak',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'kripto.byteAcak' membutuhkan 1 argumen bertipe bilangan (jumlah byte).`
        );
      }
      const len = args[0].nilai;
      if (!Number.isSafeInteger(len) || len < 1 || len > 0x7fffffff) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          'Panjang kripto.byteAcak harus berupa bilangan bulat aman antara 1 dan 2.147.483.647.'
        );
      }
      const byte = byteAcakAman(len, cryptoNode, cryptoWeb);
      return buatTeks(Array.from(byte, b => b.toString(16).padStart(2, '0')).join(''));
    },
  };
  ekspor.set('byteAcak', fnByteAcak);

  const fnBilanganAcak: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bilanganAcak',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.BILANGAN || args[1].jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'kripto.bilanganAcak' membutuhkan 2 argumen bertipe bilangan: (min, max).`
        );
      }
      const min = Math.min(args[0].nilai, args[1].nilai);
      const max = Math.max(args[0].nilai, args[1].nilai);
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) ||
          max >= Number.MAX_SAFE_INTEGER || max - min + 1 <= 0) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_TIDAK_VALID,
          'Batas kripto.bilanganAcak harus berupa bilangan bulat aman dengan rentang valid.'
        );
      }
      return buatBilangan(bilanganAcakAman(min, max, cryptoNode, cryptoWeb));
    },
  };
  ekspor.set('bilanganAcak', fnBilanganAcak);

  const fnBandingkanWaktuKonstan: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'bandingkanWaktuKonstan',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'kripto.bandingkanWaktuKonstan' membutuhkan 2 argumen bertipe teks.`
        );
      }
      const a = args[0].nilai;
      const b = args[1].nilai;

      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const crypto = muatModulNode('node:crypto');
        if (crypto && crypto.timingSafeEqual && Buffer) {
          const bufA = Buffer.from(a, 'utf-8');
          const bufB = Buffer.from(b, 'utf-8');
          if (bufA.length !== bufB.length) return buatLogika(false);
          return buatLogika(crypto.timingSafeEqual(bufA, bufB));
        }
      } catch {
        // Fallback constant-time algorithm
      }

      // Constant-time XOR comparison
      let diff = a.length ^ b.length;
      for (let i = 0; i < a.length; i++) {
        const charB = i < b.length ? b.charCodeAt(i) : 0;
        diff |= a.charCodeAt(i) ^ charB;
      }
      return buatLogika(diff === 0);
    },
  };
  ekspor.set('bandingkanWaktuKonstan', fnBandingkanWaktuKonstan);

  return ekspor;
}
