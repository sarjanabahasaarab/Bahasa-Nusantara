/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Pengelola State Reaktif Mobile (Mobile Reactive State Management)
 */

export type PendengarStateMobile<T = any> = (nilaiBaru: T, nilaiLama: T, kunci: string) => void;

export class PengelolaStateMobile {
  private state: Map<string, any> = new Map();
  private pendengarPerKunci: Map<string, Set<PendengarStateMobile>> = new Map();
  private pendengarGlobal: Set<PendengarStateMobile> = new Set();

  constructor(stateAwal: Record<string, any> = {}) {
    for (const [k, v] of Object.entries(stateAwal)) {
      this.state.set(k, v);
    }
  }

  private static apakahKunciTerlarang(kunci: string): boolean {
    return kunci === '__proto__' || kunci === 'constructor' || kunci === 'prototype' || !kunci;
  }

  public ambil<T = any>(kunci: string, nilaiBawaan?: T): T {
    if (PengelolaStateMobile.apakahKunciTerlarang(kunci) || !this.state.has(kunci)) {
      return nilaiBawaan as T;
    }
    return this.state.get(kunci);
  }

  public dapatkan<T = any>(kunci: string, nilaiBawaan?: T): T {
    return this.ambil(kunci, nilaiBawaan);
  }

  public tetapkan<T = any>(kunci: string, nilai: T): void {
    if (typeof kunci !== 'string' || PengelolaStateMobile.apakahKunciTerlarang(kunci)) {
      throw new Error(`Kunci state tidak diizinkan: '${String(kunci)}'`);
    }
    const nilaiLama = this.state.get(kunci);
    if (nilaiLama === nilai) return;

    this.state.set(kunci, nilai);

    // Notifikasi pendengar spesifik kunci
    const list = this.pendengarPerKunci.get(kunci);
    if (list) {
      for (const fn of list) {
        try {
          fn(nilai, nilaiLama, kunci);
        } catch (e) {
          console.error(`[StateMobile] Galat pada pendengar kunci '${kunci}':`, e);
        }
      }
    }

    // Notifikasi pendengar global
    for (const fn of this.pendengarGlobal) {
      try {
        fn(nilai, nilaiLama, kunci);
      } catch (e) {
        console.error(`[StateMobile] Galat pada pendengar global:`, e);
      }
    }
  }

  public atur<T = any>(kunci: string, nilai: T): void {
    this.tetapkan(kunci, nilai);
  }

  public pasangPendengar<T = any>(kunci: string, fn: PendengarStateMobile<T>): () => void {
    if (typeof kunci !== 'string' || PengelolaStateMobile.apakahKunciTerlarang(kunci)) {
      throw new Error(`Kunci pendengar state tidak diizinkan: '${String(kunci)}'`);
    }
    let set = this.pendengarPerKunci.get(kunci);
    if (!set) {
      set = new Set();
      this.pendengarPerKunci.set(kunci, set);
    }
    set.add(fn);
    return () => set?.delete(fn);
  }

  public langgananKunci<T = any>(kunci: string, fn: PendengarStateMobile<T>): () => void {
    return this.pasangPendengar(kunci, fn);
  }

  public pasangPendengarGlobal(fn: PendengarStateMobile): () => void {
    this.pendengarGlobal.add(fn);
    return () => this.pendengarGlobal.delete(fn);
  }

  public toJSON(): Record<string, any> {
    const hasil: Record<string, any> = {};
    for (const [k, v] of this.state.entries()) {
      if (!PengelolaStateMobile.apakahKunciTerlarang(k)) {
        Object.defineProperty(hasil, k, { value: v, enumerable: true, configurable: true, writable: true });
      }
    }
    return hasil;
  }

  public bersihkan(): void {
    this.state.clear();
    this.pendengarPerKunci.clear();
    this.pendengarGlobal.clear();
  }
}
