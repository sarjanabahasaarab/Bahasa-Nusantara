/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Manajer Permintaan Jaringan Mobile (Mobile Network Request Manager)
 */

import * as crypto from 'node:crypto';
import { PrioritasPermintaan } from '../types';

export interface TugasPermintaan<T = any> {
  id: string;
  prioritas: PrioritasPermintaan;
  eksekutor: (sinyal?: AbortSignal) => Promise<T>;
  resolve: (nilai: T) => void;
  reject: (alasan: any) => void;
  idempotencyKey?: string;
  sinyalPembatal?: AbortController;
  stempelWaktu: number;
}

export class ManajerPermintaanMobile {
  private static instance: ManajerPermintaanMobile;
  private antrean: TugasPermintaan[] = [];
  private permintaanAktif: number = 0;
  private pengendaliAktif: Set<AbortController> = new Set();
  private readonly batasKonkurensi: number = 4;
  private readonly maksCacheIdempotency: number = 500;
  private cacheIdempotency: Map<string, any> = new Map();

  private constructor() {}

  public static dapatkanInstance(): ManajerPermintaanMobile {
    if (!this.instance) {
      this.instance = new ManajerPermintaanMobile();
    }
    return this.instance;
  }

  public buatIdempotencyKey(awalan = 'req'): string {
    const gCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as any) : null;
    if (gCrypto && typeof gCrypto.randomUUID === 'function') {
      return `${awalan}_${gCrypto.randomUUID()}`;
    }
    try {
      if (typeof (crypto as any)?.randomUUID === 'function') {
        return `${awalan}_${(crypto as any).randomUUID()}`;
      }
    } catch {
      // Abaikan jika modul externalized
    }
    const acak = Math.random().toString(36).substring(2, 10);
    return `${awalan}_${Date.now()}_${acak}`;
  }

  public jadwalkan<T>(
    eksekutor: (sinyal?: AbortSignal) => Promise<T>,
    prioritas: PrioritasPermintaan = 'normal',
    idempotencyKey?: string
  ): Promise<T> {
    if (idempotencyKey && this.cacheIdempotency.has(idempotencyKey)) {
      return Promise.resolve(this.cacheIdempotency.get(idempotencyKey));
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;

    return new Promise<T>((resolve, reject) => {
      const tugas: TugasPermintaan<T> = {
        id: this.buatIdempotencyKey('task'),
        prioritas,
        eksekutor,
        resolve: (val) => {
          if (idempotencyKey) {
            if (this.cacheIdempotency.size >= this.maksCacheIdempotency) {
              const kunciPertama = this.cacheIdempotency.keys().next().value;
              if (kunciPertama !== undefined) {
                this.cacheIdempotency.delete(kunciPertama);
              }
            }
            this.cacheIdempotency.set(idempotencyKey, val);
          }
          resolve(val);
        },
        reject,
        idempotencyKey,
        sinyalPembatal: controller,
        stempelWaktu: Date.now(),
      };

      this.masukkanKeAntrean(tugas);
      this.prosesAntrean();
    });
  }

  public batalkanSemua(): void {
    for (const ctrl of this.pengendaliAktif) {
      ctrl.abort();
    }
    for (const tugas of this.antrean) {
      if (tugas.sinyalPembatal) {
        tugas.sinyalPembatal.abort();
      }
      tugas.reject(new Error('Permintaan jaringan dibatalkan oleh aplikasi.'));
    }
    this.antrean = [];
  }

  public dapatkanJumlahAntrean(): number {
    return this.antrean.length;
  }

  public dapatkanPermintaanAktif(): number {
    return this.permintaanAktif;
  }

  private masukkanKeAntrean(tugas: TugasPermintaan): void {
    const bobot = (p: PrioritasPermintaan) => {
      switch (p) {
        case 'tinggi': return 3;
        case 'normal': return 2;
        case 'rendah': return 1;
      }
    };

    const targetBobot = bobot(tugas.prioritas);
    let indeks = this.antrean.length;

    for (let i = 0; i < this.antrean.length; i++) {
      if (bobot(this.antrean[i].prioritas) < targetBobot) {
        indeks = i;
        break;
      }
    }

    this.antrean.splice(indeks, 0, tugas);
  }

  private async prosesAntrean(): Promise<void> {
    if (this.permintaanAktif >= this.batasKonkurensi || this.antrean.length === 0) {
      return;
    }

    const tugas = this.antrean.shift();
    if (!tugas) return;

    this.permintaanAktif += 1;
    if (tugas.sinyalPembatal) {
      this.pengendaliAktif.add(tugas.sinyalPembatal);
    }

    try {
      const hasil = await tugas.eksekutor(tugas.sinyalPembatal?.signal);
      tugas.resolve(hasil);
    } catch (err) {
      tugas.reject(err);
    } finally {
      if (tugas.sinyalPembatal) {
        this.pengendaliAktif.delete(tugas.sinyalPembatal);
      }
      this.permintaanAktif -= 1;
      // Lanjutkan memproses antrean berikutnya
      setTimeout(() => this.prosesAntrean(), 0);
    }
  }

  /**
   * Pembantu retry dengan exponential backoff, jitter, dan dukungan pembatalan AbortSignal
   */
  public async eksekusiDenganRetry<T>(
    operasi: () => Promise<T>,
    opsi: { cobaUlangMaks?: number; jedaAwalMs?: number; faktor?: number; izinkan?: boolean; signal?: AbortSignal } = {}
  ): Promise<T> {
    const maks = opsi.cobaUlangMaks ?? 3;
    const jedaAwal = opsi.jedaAwalMs ?? 400;
    const faktor = opsi.faktor ?? 2;
    const diizinkan = opsi.izinkan ?? true;

    let percobaan = 0;
    let jeda = jedaAwal;

    while (true) {
      if (opsi.signal?.aborted) {
        throw new Error('Permintaan jaringan dibatalkan.');
      }
      try {
        return await operasi();
      } catch (err: any) {
        percobaan++;
        if (opsi.signal?.aborted || !diizinkan || percobaan >= maks) {
          throw err;
        }

        const jitter = jeda * (0.8 + Math.random() * 0.4);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            opsi.signal?.removeEventListener('abort', onAbort);
            resolve();
          }, jitter);
          const onAbort = () => {
            clearTimeout(timer);
            reject(new Error('Permintaan jaringan dibatalkan saat menunggu retry.'));
          };
          if (opsi.signal) {
            opsi.signal.addEventListener('abort', onAbort, { once: true });
          }
        });
        jeda *= faktor;
      }
    }
  }
}
