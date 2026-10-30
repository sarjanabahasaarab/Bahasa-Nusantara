/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Kebijakan Percobaan Ulang HTTP (Retry Policy with Idempotency & Jitter)
 */

import { KebijakanRetryHTTP, MetodeHTTP } from '../types';

export class PengelolaRetryHTTP {
  public readonly maksimalPercobaan: number;
  public readonly jedaAwalMs: number;
  public readonly faktorEksponensial: number;
  public readonly jedaMaksimalMs: number;
  public readonly gunakanJitter: boolean;
  public readonly metodeDiizinkan: Set<MetodeHTTP>;
  public readonly statusBolehUlang: Set<number>;

  constructor(opsi?: KebijakanRetryHTTP) {
    this.maksimalPercobaan = opsi?.maksimalPercobaan ?? 3;
    this.jedaAwalMs = opsi?.jedaAwalMs ?? 500;
    this.faktorEksponensial = opsi?.faktorEksponensial ?? 2;
    this.jedaMaksimalMs = opsi?.jedaMaksimalMs ?? 10000;
    this.gunakanJitter = opsi?.gunakanJitter ?? true;

    // Metode aman & idempoten secara default
    this.metodeDiizinkan = new Set<MetodeHTTP>(
      opsi?.metodeDiizinkan ?? (opsi as any)?.metodeBolehCobaUlang ?? ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']
    );

    // Status HTTP yang menandakan kegagalan sementara
    this.statusBolehUlang = new Set<number>(
      opsi?.statusBolehUlang ?? [408, 429, 500, 502, 503, 504]
    );
  }

  /**
   * Menilai apakah permintaan layak dicoba ulang berdasarkan jumlah percobaan, metode, dan status/galat.
   */
  public apakahLayakUlang(
    percobaanKe: number,
    metode: MetodeHTTP,
    status?: number,
    galat?: any
  ): boolean {
    if (percobaanKe >= this.maksimalPercobaan) {
      return false;
    }

    // Hanya metode idempoten yang boleh diulang secara otomatis (mencegah double payment/charge)
    if (!this.metodeDiizinkan.has(metode)) {
      return false;
    }

    // Jika terjadi galat jaringan (misal ECONNRESET, ETIMEDOUT)
    if (galat) {
      const kode = galat?.kode || galat?.code;
      if (kode === 'ECONNRESET' || kode === 'ETIMEDOUT' || kode === 'ECONNREFUSED' || kode === 'GALAT_TIMEOUT') {
        return true;
      }
    }

    // Jika menerima respon dengan kode status yang boleh diulang
    if (status && this.statusBolehUlang.has(status)) {
      return true;
    }

    return false;
  }

  /**
   * Menghitung durasi jeda percobaan berikutnya (mendukung Retry-After dan Jitter).
   */
  public hitungJedaMs(percobaanKe: number, headerRetryAfter?: string): number {
    // 1. Periksa tajuk Retry-After jika ada
    if (headerRetryAfter) {
      const jedaHeader = this.uraiRetryAfter(headerRetryAfter);
      if (jedaHeader !== null && jedaHeader > 0) {
        return Math.min(jedaHeader, this.jedaMaksimalMs);
      }
    }

    // 2. Rumus Exponential Backoff: jedaAwal * (faktor ^ (percobaan - 1))
    const eksponen = Math.max(0, percobaanKe - 1);
    let jeda = this.jedaAwalMs * Math.pow(this.faktorEksponensial, eksponen);

    // 3. Tambahkan Jitter (acak 0% - 25%) untuk mencegah thundering herd problem
    if (this.gunakanJitter) {
      const jitter = Math.random() * 0.25 * jeda;
      jeda += jitter;
    }

    return Math.min(Math.round(jeda), this.jedaMaksimalMs);
  }

  private uraiRetryAfter(header: string): number | null {
    const bersih = header.trim();
    // Format detik (misal: '120')
    const detik = parseInt(bersih, 10);
    if (!isNaN(detik)) {
      return detik * 1000;
    }

    // Format tanggal HTTP (misal: 'Wed, 21 Oct 2026 07:28:00 GMT')
    const tanggal = new Date(bersih);
    if (!isNaN(tanggal.getTime())) {
      const diff = tanggal.getTime() - Date.now();
      return Math.max(0, diff);
    }

    return null;
  }
}

export { PengelolaRetryHTTP as KebijakanCobaUlangHTTP };
