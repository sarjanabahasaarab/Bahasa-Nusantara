/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Pengelola Koneksi WebSocket (Connection Management, Heartbeat & Rate Limit)
 */

import * as crypto from 'node:crypto';
import type { WebSocket as WSSocket } from 'ws';
import { KoneksiKlienWS, ProfilPenggunaWS, StatusKoneksiWS, KonfigurasiWebSocket } from '../types';

export class KoneksiKlienImpl implements KoneksiKlienWS {
  public readonly id: string;
  public status: StatusKoneksiWS = 'terbuka';
  public readonly tersambungPada: Date;
  public aktivitasTerakhir: Date;
  public readonly ipKlien: string;
  public profil?: ProfilPenggunaWS;
  public daftarRuang: Set<string> = new Set();
  public apakahHidup: boolean = true;

  // Rate limiter per koneksi (sliding window sederhana)
  private hitungPesanDetikIni: number = 0;
  private jendelaWaktuDetik: number = 0;
  private readonly batasPesanPerDetik: number = 60; // Max 60 pesan/detik per koneksi

  constructor(
    private readonly rawSocket: WSSocket,
    ip: string,
    profil?: ProfilPenggunaWS
  ) {
    this.id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    this.tersambungPada = new Date();
    this.aktivitasTerakhir = new Date();
    this.ipKlien = ip || '127.0.0.1';
    this.profil = profil;
  }

  public kirim(data: string | Buffer): void {
    if (this.rawSocket.readyState === 1 /* OPEN */) {
      this.rawSocket.send(data);
    }
  }

  public putus(kode: number = 1000, alasan?: string): void {
    this.status = 'menutup';
    try {
      this.rawSocket.close(kode, alasan);
    } catch {
      // Abaikan jika sudah tertutup
    }
    this.status = 'tertutup';
  }

  public periksaRateLimit(): boolean {
    const sekarangDetik = Math.floor(Date.now() / 1000);
    if (sekarangDetik !== this.jendelaWaktuDetik) {
      this.jendelaWaktuDetik = sekarangDetik;
      this.hitungPesanDetikIni = 1;
      return true;
    }

    this.hitungPesanDetikIni++;
    return this.hitungPesanDetikIni <= this.batasPesanPerDetik;
  }

  public sentuhAktivitas(): void {
    this.aktivitasTerakhir = new Date();
    this.apakahHidup = true;
  }
}

export class PengelolaKoneksiWebSocket {
  private koneksiMap: Map<string, KoneksiKlienImpl> = new Map();
  private intervalDetakJantung?: NodeJS.Timeout;

  constructor(private readonly konfigurasi: KonfigurasiWebSocket) {
    this.mulaiDetakJantung();
  }

  public daftarkan(rawSocket: WSSocket, ip: string, profil?: ProfilPenggunaWS): KoneksiKlienImpl {
    const koneksi = new KoneksiKlienImpl(rawSocket, ip, profil);
    this.koneksiMap.set(koneksi.id, koneksi);
    return koneksi;
  }

  public hapus(id: string): boolean {
    const koneksi = this.koneksiMap.get(id);
    if (!koneksi) return false;

    koneksi.status = 'tertutup';
    return this.koneksiMap.delete(id);
  }

  public dapatkan(id: string): KoneksiKlienImpl | undefined {
    return this.koneksiMap.get(id);
  }

  public tambahKoneksi(koneksi: any): void {
    this.koneksiMap.set(koneksi.id, koneksi);
  }

  public verifikasiLajuPesan(id: string): boolean {
    const k = this.koneksiMap.get(id);
    if (!k) return false;
    if (typeof (k as any).periksaRateLimit === 'function') {
      return (k as any).periksaRateLimit();
    }
    // Fallback tracker
    if ((k as any).pesanPerDetik !== undefined) {
      const maks = (this.konfigurasi as any).maksPesanPerMenit || (this.konfigurasi as any).maksPesanPerDetik || 60;
      (k as any).pesanPerDetik++;
      return (k as any).pesanPerDetik <= maks;
    }
    return true;
  }

  public dapatkanSemua(): IterableIterator<KoneksiKlienImpl> {
    return this.koneksiMap.values();
  }

  public hitung(): number {
    return this.koneksiMap.size;
  }

  public bersihkan(): void {
    if (this.intervalDetakJantung) {
      clearInterval(this.intervalDetakJantung);
      this.intervalDetakJantung = undefined;
    }

    for (const k of this.koneksiMap.values()) {
      k.putus(1001, 'Server berhenti (Graceful Shutdown)');
    }
    this.koneksiMap.clear();
  }

  private mulaiDetakJantung(): void {
    const interval = this.konfigurasi.intervalDetakJantungMs || 30000;

    this.intervalDetakJantung = setInterval(() => {
      for (const [id, koneksi] of this.koneksiMap.entries()) {
        if (!koneksi.apakahHidup) {
          // Klien tidak merespons ping sebelumnya -> putus koneksi mati
          koneksi.putus(1006, 'Detak jantung (heartbeat) timeout');
          this.koneksiMap.delete(id);
          continue;
        }

        // Tandai false dan kirim ping
        koneksi.apakahHidup = false;
        try {
          (koneksi as any).rawSocket?.ping();
        } catch {
          this.koneksiMap.delete(id);
        }
      }
    }, interval);

    // Jangan tahan proses node jika hanya ada timer heartbeat
    if (this.intervalDetakJantung.unref) {
      this.intervalDetakJantung.unref();
    }
  }
}
