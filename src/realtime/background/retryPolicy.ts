/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Kebijakan Percobaan Ulang (Retry Policy with Exponential Backoff)
 */

export interface OpsiKebijakanPercobaanUlang {
  maksimalPercobaan?: number;
  jedaAwalMs?: number;
  faktorEksponensial?: number;
  pengali?: number;
  jedaMaksimalMs?: number;
}

export class KebijakanPercobaanUlang {
  public readonly maksimalPercobaan: number;
  public readonly jedaAwalMs: number;
  public readonly faktorEksponensial: number;
  public readonly jedaMaksimalMs: number;

  constructor(opsi?: OpsiKebijakanPercobaanUlang) {
    this.maksimalPercobaan = opsi?.maksimalPercobaan ?? 3;
    this.jedaAwalMs = opsi?.jedaAwalMs ?? 500;
    this.faktorEksponensial = opsi?.pengali ?? opsi?.faktorEksponensial ?? 2;
    this.jedaMaksimalMs = opsi?.jedaMaksimalMs ?? 30000;
  }

  /**
   * Menghitung durasi tunda (backoff) untuk percobaan berikutnya secara eksponensial.
   */
  public hitungJeda(jumlahPercobaanSaatIni: number): number {
    if (jumlahPercobaanSaatIni <= 0) {
      return this.jedaAwalMs;
    }
    const jeda = this.jedaAwalMs * Math.pow(this.faktorEksponensial, jumlahPercobaanSaatIni - 1);
    return Math.min(jeda, this.jedaMaksimalMs);
  }

  /**
   * Mengevaluasi apakah tugas masih diperbolehkan untuk diulang.
   */
  public apakahBolehUlang(jumlahPercobaanSaatIni: number, galat?: any): boolean {
    if (jumlahPercobaanSaatIni >= this.maksimalPercobaan) {
      return false;
    }
    // Jika galat ditandai tidak dapat diulang (non-retryable fatal error)
    if (galat && galat.tidakBolehDiulang === true) {
      return false;
    }
    return true;
  }
}
