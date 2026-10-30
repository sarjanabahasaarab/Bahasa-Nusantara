/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Antrean Tugas Latar Belakang (Task Queue with Idempotency & Capacity Limit)
 */

import { TugasLatarBelakang, StatistikAntrean } from '../types';
import { tandaiDibatalkan } from './task';

export interface EntriAntrean {
  tugas: TugasLatarBelakang;
  tersediaPada: number;
}

export interface PenyimpananAntrean {
  tambah(tugas: TugasLatarBelakang, tundaMs?: number): boolean;
  ambil(): TugasLatarBelakang | null;
  dapatkan(id: string): TugasLatarBelakang | undefined;
  batalkan(id: string, alasan?: string): boolean;
  dapatkanStatistik(): StatistikAntrean;
  panjang(): number;
  bersihkan(): void;
}

export class AntreanTugasMemori implements PenyimpananAntrean {
  private antrean: EntriAntrean[] = [];
  private tugasMap: Map<string, TugasLatarBelakang> = new Map();
  private kunciIdempotensiMap: Map<string, string> = new Map(); // kunci -> idTugas
  private readonly batasKapasitas: number;

  constructor(opsi?: { batasKapasitas?: number; kapasitasMaksimum?: number }) {
    this.batasKapasitas = opsi?.kapasitasMaksimum ?? opsi?.batasKapasitas ?? 10000;
  }

  public tambah(tugas: TugasLatarBelakang, tundaMs: number = 0): boolean {
    if (this.antrean.length >= this.batasKapasitas) {
      return false;
    }

    // Pemeriksaan idempotensi
    const kunci = tugas.kunciIdempotensi || (tugas as any).kunciIdempoten;
    if (kunci) {
      const idAda = this.kunciIdempotensiMap.get(kunci);
      if (idAda) {
        const tugasAda = this.tugasMap.get(idAda);
        if (
          tugasAda &&
          (tugasAda.status === 'antre' ||
            tugasAda.status === 'pending' ||
            tugasAda.status === 'berjalan' ||
            tugasAda.status === 'running' ||
            tugasAda.status === 'selesai' ||
            tugasAda.status === 'completed')
        ) {
          // Idempoten: Jangan masukkan duplikat
          return false;
        }
      }
      this.kunciIdempotensiMap.set(kunci, tugas.id);
    }

    const tersediaPada = Date.now() + Math.max(0, tundaMs);
    this.tugasMap.set(tugas.id, tugas);
    this.antrean.push({ tugas, tersediaPada });

    return true;
  }

  public ambil(): TugasLatarBelakang | null {
    const sekarang = Date.now();
    let indeksTerpilih = -1;
    let prioritasTertinggi = -Infinity;

    for (let i = 0; i < this.antrean.length; i++) {
      const entri = this.antrean[i];
      if (
        entri.tersediaPada <= sekarang &&
        (entri.tugas.status === 'antre' || entri.tugas.status === 'pending')
      ) {
        const prio = entri.tugas.prioritas ?? 0;
        if (prio > prioritasTertinggi) {
          prioritasTertinggi = prio;
          indeksTerpilih = i;
        }
      }
    }

    if (indeksTerpilih >= 0) {
      const [terpilih] = this.antrean.splice(indeksTerpilih, 1);
      return terpilih.tugas;
    }
    return null;
  }

  public dapatkan(id: string): TugasLatarBelakang | undefined {
    return this.tugasMap.get(id);
  }

  public batalkan(id: string, alasan?: string): boolean {
    const tugas = this.tugasMap.get(id);
    if (!tugas) return false;

    if (
      tugas.status === 'selesai' ||
      tugas.status === 'completed' ||
      tugas.status === 'gagal' ||
      tugas.status === 'failed'
    ) {
      return false; // Tidak dapat membatalkan tugas yang sudah selesai
    }

    tandaiDibatalkan(tugas, alasan);

    // Hapus dari antrean aktif
    this.antrean = this.antrean.filter((e) => e.tugas.id !== id);
    return true;
  }

  public dapatkanStatistik(): StatistikAntrean {
    let menunggu = 0;
    let sedangBerjalan = 0;
    let selesai = 0;
    let gagal = 0;
    let dibatalkan = 0;

    for (const t of this.tugasMap.values()) {
      switch (t.status) {
        case 'pending':
          menunggu++;
          break;
        case 'running':
          sedangBerjalan++;
          break;
        case 'completed':
          selesai++;
          break;
        case 'failed':
          gagal++;
          break;
        case 'cancelled':
          dibatalkan++;
          break;
      }
    }

    return {
      totalTugas: this.tugasMap.size,
      menunggu,
      sedangBerjalan,
      selesai,
      gagal,
      dibatalkan,
    };
  }

  public panjang(): number {
    return this.antrean.length;
  }

  public bersihkan(): void {
    this.antrean = [];
    this.tugasMap.clear();
    this.kunciIdempotensiMap.clear();
  }
}
