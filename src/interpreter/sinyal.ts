/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NilaiRuntime } from './nilai';

/**
 * Sinyal internal untuk melompat dari fungsi saat instruksi 'kembalikan' dipanggil.
 */
export class SinyalKembalikan {
  constructor(public readonly nilai: NilaiRuntime) {}
}

/**
 * Sinyal internal untuk memutus perulangan saat instruksi 'hentikan' dipanggil.
 */
export class SinyalHentikan {}

/**
 * Sinyal internal untuk melompati iterasi saat instruksi 'lanjutkan' dipanggil.
 */
export class SinyalLanjutkan {}
