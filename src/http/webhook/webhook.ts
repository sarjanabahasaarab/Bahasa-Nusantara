/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Verifikator & Pengelola Webhook (HMAC-SHA256 & Replay Protection)
 */

import * as crypto from 'node:crypto';
import { OpsiVerifikasiWebhook, HasilVerifikasiWebhook } from '../types';

export interface KonfigurasiPengelolaWebhook {
  kunciRahasia?: string;
  secret?: string;
  algoritma?: string;
  toleransiWaktuDetik?: number;
}

export class PengelolaWebhook {
  private riwayatEventId: Set<string> = new Set();
  private readonly maksRiwayatId = 5000;
  public readonly konfigurasi: KonfigurasiPengelolaWebhook;

  constructor(konfigurasi: KonfigurasiPengelolaWebhook = {}) {
    this.konfigurasi = konfigurasi;
  }

  /**
   * Menghitung signature HMAC-SHA256 dari payload mentah.
   */
  public static hitungSignature(payload: string | Buffer, secret: string, algoritma = 'sha256'): string {
    return crypto.createHmac(algoritma, secret).update(payload).digest('hex');
  }

  /**
   * Menghasilkan tanda tangan HMAC berdasarkan konfigurasi kunci rahasia saat ini.
   */
  public buatTandaTangan(payload: string | Buffer, timestamp?: number): string {
    const secret = this.konfigurasi.kunciRahasia || this.konfigurasi.secret || '';
    const alg = this.konfigurasi.algoritma || 'sha256';
    const payloadStr = Buffer.isBuffer(payload) ? payload.toString('utf-8') : payload;
    const data = timestamp !== undefined ? `${timestamp}.${payloadStr}` : payloadStr;
    return crypto.createHmac(alg, secret).update(data).digest('hex');
  }

  /**
   * Memverifikasi tanda tangan webhook dan mengembalikan boolean (true jika sah).
   */
  public verifikasiTandaTangan(
    payloadMentah: string | Buffer,
    tandaTangan: string,
    timestamp?: number | string,
    idEvent?: string
  ): boolean {
    const secret = this.konfigurasi.kunciRahasia || this.konfigurasi.secret || '';
    if (!secret || !tandaTangan) return false;

    // 1. Cek timestamp replay tolerance jika ada
    if (timestamp !== undefined) {
      const ts = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
      if (!isNaN(ts)) {
        const tsDetik = ts > 1000000000000 ? Math.floor(ts / 1000) : ts;
        const sekarangDetik = Math.floor(Date.now() / 1000);
        const selisih = Math.abs(sekarangDetik - tsDetik);
        const toleransi = this.konfigurasi.toleransiWaktuDetik ?? 300;
        if (selisih > toleransi) {
          return false;
        }
      }
    }

    // 2. Cek deduplikasi event ID
    if (idEvent && this.riwayatEventId.has(idEvent)) {
      return false;
    }

    // 3. Normalisasi signature
    let sigDiterima = tandaTangan.trim();
    if (sigDiterima.startsWith('sha256=')) {
      sigDiterima = sigDiterima.slice(7);
    }

    const tsNum = timestamp !== undefined ? (typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10)) : undefined;
    const sigDiharapkan = this.buatTandaTangan(payloadMentah, tsNum);

    const bufDiterima = Buffer.from(sigDiterima, 'hex');
    const bufDiharapkan = Buffer.from(sigDiharapkan, 'hex');

    if (bufDiterima.length === 0 || bufDiterima.length !== bufDiharapkan.length) {
      return false;
    }

    const cocok = crypto.timingSafeEqual(bufDiterima, bufDiharapkan);
    if (cocok && idEvent) {
      this.catatEventId(idEvent);
    }
    return cocok;
  }

  /**
   * Memverifikasi tanda tangan webhook dan mengembalikan objek HasilVerifikasiWebhook
   */
  public verifikasi<T = any>(
    payloadMentah: string | Buffer,
    signatureHeader: string | undefined,
    opsi?: OpsiVerifikasiWebhook,
    timestampHeader?: string,
    idEvent?: string
  ): HasilVerifikasiWebhook<T> {
    const secret = opsi?.secret || this.konfigurasi.kunciRahasia || this.konfigurasi.secret;
    if (!signatureHeader || typeof signatureHeader !== 'string') {
      return { sah: false, pesan: "Header tanda tangan (signature) tidak ditemukan." };
    }

    if (!secret) {
      return { sah: false, pesan: "Kunci rahasia (secret) webhook wajib ditentukan." };
    }

    const sah = this.verifikasiTandaTangan(payloadMentah, signatureHeader, timestampHeader, idEvent);
    if (!sah) {
      return { sah: false, pesan: "Tanda tangan webhook tidak valid atau stempel waktu kedaluwarsa." };
    }

    let parsed: any = undefined;
    const str = Buffer.isBuffer(payloadMentah) ? payloadMentah.toString('utf-8') : payloadMentah;
    try {
      parsed = JSON.parse(str);
    } catch {
      parsed = str;
    }

    return {
      sah: true,
      payload: parsed as T,
      idEvent,
    };
  }

  private catatEventId(id: string): void {
    if (this.riwayatEventId.size >= this.maksRiwayatId) {
      const pertama = this.riwayatEventId.values().next().value;
      if (pertama) this.riwayatEventId.delete(pertama);
    }
    this.riwayatEventId.add(id);
  }
}
