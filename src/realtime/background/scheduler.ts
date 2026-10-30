/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Penjadwal Tugas Berkala & Tertunda (Task Scheduler)
 */

import * as crypto from 'node:crypto';
import { JadwalTugas } from '../types';
import { PenyimpananAntrean } from './taskQueue';
import { buatTugas } from './task';

export class PenjadwalTugas {
  private jadwalMap: Map<string, JadwalTugas> = new Map();
  private intervalTick?: NodeJS.Timeout;
  private sedangBerjalan: boolean = false;

  private readonly antrean: PenyimpananAntrean;

  constructor(
    antreanAtauOpsi: PenyimpananAntrean | { antrean: PenyimpananAntrean },
    opsi?: { intervalPemeriksaanMs?: number }
  ) {
    if ((antreanAtauOpsi as any).antrean) {
      this.antrean = (antreanAtauOpsi as any).antrean;
    } else {
      this.antrean = antreanAtauOpsi as PenyimpananAntrean;
    }
    this.mulai(opsi?.intervalPemeriksaanMs ?? 500);
  }

  /**
   * Menjadwalkan tugas dengan penundaan detik atau milidetik.
   */
  public jadwalkanTugas(
    namaTugas: string,
    payload: any,
    tunda: number | Date,
    idKustom?: string
  ): string {
    let waktuEksekusi: Date;
    if (tunda instanceof Date) {
      waktuEksekusi = tunda;
    } else {
      // Jika < 100, anggap detik
      const ms = tunda < 100 ? tunda * 1000 : tunda;
      waktuEksekusi = new Date(Date.now() + ms);
    }
    return this.jadwalkan(namaTugas, payload, waktuEksekusi, idKustom);
  }

  /**
   * Menjadwalkan tugas satu kali pada stempel waktu tertentu.
   */
  public jadwalkan(
    namaTugas: string,
    payload: any,
    waktuEksekusi: Date,
    idKustom?: string
  ): string {
    const id = idKustom || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex'));

    this.jadwalMap.set(id, {
      id,
      namaTugas,
      payload,
      eksekusiBerikutnya: waktuEksekusi,
      berulang: false,
      aktif: true,
      totalEksekusi: 0,
    });

    return id;
  }

  /**
   * Menjadwalkan tugas berulang dengan interval waktu tetap (misal tiap 60 detik).
   */
  public jadwalkanBerulang(
    namaTugas: string,
    payload: any,
    intervalMs: number,
    idKustom?: string
  ): string {
    if (intervalMs < 100) {
      throw new Error("Interval jadwal berulang minimal adalah 100ms.");
    }

    const id = idKustom || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex'));
    const eksekusiBerikutnya = new Date(Date.now() + intervalMs);

    this.jadwalMap.set(id, {
      id,
      namaTugas,
      payload,
      intervalMs,
      eksekusiBerikutnya,
      berulang: true,
      aktif: true,
      totalEksekusi: 0,
    });

    return id;
  }

  /**
   * Memeriksa dan memproses jadwal yang jatuh tempo secara langsung (manual trigger).
   */
  public periksaJadwal(): void {
    this.periksaDanKirimTugas();
  }

  /**
   * Membatalkan jadwal tertentu.
   */
  public batalkan(id: string): boolean {
    const j = this.jadwalMap.get(id);
    if (!j) return false;

    j.aktif = false;
    return this.jadwalMap.delete(id);
  }

  /** Alias untuk batalkan */
  public batalkanJadwal(id: string): boolean {
    return this.batalkan(id);
  }

  public dapatkan(id: string): JadwalTugas | undefined {
    return this.jadwalMap.get(id);
  }

  public dapatkanSemua(): JadwalTugas[] {
    return Array.from(this.jadwalMap.values());
  }

  public hitung(): number {
    return this.jadwalMap.size;
  }

  public mulai(intervalTickMs: number = 500): void {
    if (this.sedangBerjalan) return;

    this.sedangBerjalan = true;
    this.intervalTick = setInterval(() => {
      this.periksaDanKirimTugas();
    }, intervalTickMs);

    if (this.intervalTick.unref) {
      this.intervalTick.unref();
    }
  }

  public hentikan(): void {
    this.sedangBerjalan = false;
    if (this.intervalTick) {
      clearInterval(this.intervalTick);
      this.intervalTick = undefined;
    }
  }

  private periksaDanKirimTugas(): void {
    const sekarang = Date.now();

    for (const jadwal of this.jadwalMap.values()) {
      if (!jadwal.aktif) continue;

      if (jadwal.eksekusiBerikutnya.getTime() <= sekarang) {
        // Buat tugas dan masukkan ke antrean
        const tugas = buatTugas(jadwal.namaTugas, jadwal.payload, {
          metadata: { idJadwal: jadwal.id, eksekusiKe: jadwal.totalEksekusi + 1 },
        });

        this.antrean.tambah(tugas);
        jadwal.totalEksekusi++;

        if (jadwal.berulang && jadwal.intervalMs) {
          jadwal.eksekusiBerikutnya = new Date(sekarang + jadwal.intervalMs);
        } else {
          jadwal.aktif = false;
          this.jadwalMap.delete(jadwal.id);
        }
      }
    }
  }
}
