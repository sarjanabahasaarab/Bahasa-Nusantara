/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Sistem Peristiwa Real-Time (Event Bus & Dispatcher)
 */

import * as crypto from 'node:crypto';
import { Peristiwa, PenanganPeristiwa, OpsiPenerbitan } from '../types';

export class BusPeristiwa {
  private listeners: Map<string, Set<PenanganPeristiwa>> = new Map();
  private riwayatPeristiwaId: Set<string> = new Set();
  private readonly maksRiwayatId: number;
  private readonly pencatatGalat: (pesan: string, galat?: any) => void;

  constructor(opsi?: {
    pencatatGalat?: (pesan: string, galat?: any) => void;
    batasCacheDeduplikasi?: number;
  }) {
    this.maksRiwayatId = opsi?.batasCacheDeduplikasi ?? 1000;
    this.pencatatGalat = opsi?.pencatatGalat || ((pesan, err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error(`[BusPeristiwa] ${pesan}`, err?.message || err);
      }
    });
  }

  /**
   * Mendaftarkan listener untuk suatu jenis peristiwa.
   * Mengembalikan fungsi unbind (pencabut langganan).
   */
  public dengarkan<T = any>(jenis: string, penangan: PenanganPeristiwa<T>): () => void {
    if (!jenis || typeof jenis !== 'string') {
      throw new Error("Parameter 'jenis' peristiwa wajib berupa string teks.");
    }
    if (typeof penangan !== 'function') {
      throw new Error("Parameter 'penangan' peristiwa wajib berupa fungsi callback.");
    }

    const kunci = jenis.trim().toLowerCase();
    if (!this.listeners.has(kunci)) {
      this.listeners.set(kunci, new Set());
    }

    this.listeners.get(kunci)!.add(penangan);

    return () => {
      this.hapusListener(kunci, penangan);
    };
  }

  /**
   * Mendaftarkan listener yang hanya dieksekusi satu kali (once).
   */
  public sekali<T = any>(jenis: string, penangan: PenanganPeristiwa<T>): () => void {
    const penanganSekali: PenanganPeristiwa<T> = async (ev) => {
      this.hapusListener(jenis, penanganSekali);
      await penangan(ev);
    };

    return this.dengarkan(jenis, penanganSekali);
  }

  /**
   * Menghapus listener tertentu dari jenis peristiwa.
   */
  public hapusListener(jenis: string, penangan: PenanganPeristiwa): boolean {
    const kunci = jenis.trim().toLowerCase();
    const himpunan = this.listeners.get(kunci);
    if (!himpunan) return false;

    const terhapus = himpunan.delete(penangan);
    if (himpunan.size === 0) {
      this.listeners.delete(kunci);
    }
    return terhapus;
  }

  /**
   * Menghapus seluruh listener untuk jenis tertentu, atau semua jenis jika tidak ditentukan.
   */
  public hapusSemuaListener(jenis?: string): void {
    if (jenis) {
      this.listeners.delete(jenis.trim().toLowerCase());
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Mendapatkan jumlah listener yang terdaftar untuk suatu jenis peristiwa.
   */
  public hitungListener(jenis: string): number {
    const himpunan = this.listeners.get(jenis.trim().toLowerCase());
    return himpunan ? himpunan.size : 0;
  }

  /**
   * Menerbitkan peristiwa secara asinkron. Menjalankan seluruh listener yang cocok.
   * Kesalahan pada satu listener tidak akan memutus eksekusi listener lainnya.
   */
  public async terbitkan<T = any>(
    jenisAtauObjek: string | any,
    payload?: T,
    opsi?: OpsiPenerbitan
  ): Promise<Peristiwa<T>> {
    const { jenis, isi, opsiGabungan } = this.ekstrakParameter(jenisAtauObjek, payload, opsi);
    const peristiwa = this.validasiDanBangunPeristiwa(jenis, isi, opsiGabungan);

    if (opsiGabungan?.cegahDuplikasi && this.riwayatPeristiwaId.has(peristiwa.id)) {
      return peristiwa;
    }

    this.catatIdPeristiwa(peristiwa.id);

    const penanganList = this.kumpulkanListener(jenis);

    for (const penangan of penanganList) {
      try {
        await penangan(peristiwa);
      } catch (err: any) {
        this.pencatatGalat(`Kesalahan penangan peristiwa pada '${jenis}':`, err);
      }
    }

    return peristiwa;
  }

  /** Alias untuk penerbitan asinkron */
  public async terbitkanAsync<T = any>(
    jenisAtauObjek: string | any,
    payload?: T,
    opsi?: OpsiPenerbitan
  ): Promise<Peristiwa<T>> {
    return this.terbitkan(jenisAtauObjek, payload, opsi);
  }

  /**
   * Menerbitkan peristiwa secara sinkron (sekuensial).
   */
  public terbitkanSinkron<T = any>(
    jenisAtauObjek: string | any,
    payload?: T,
    opsi?: OpsiPenerbitan
  ): Peristiwa<T> {
    const { jenis, isi, opsiGabungan } = this.ekstrakParameter(jenisAtauObjek, payload, opsi);
    const peristiwa = this.validasiDanBangunPeristiwa(jenis, isi, opsiGabungan);

    if (opsiGabungan?.cegahDuplikasi && this.riwayatPeristiwaId.has(peristiwa.id)) {
      return peristiwa;
    }

    this.catatIdPeristiwa(peristiwa.id);

    const penanganList = this.kumpulkanListener(jenis);

    for (const penangan of penanganList) {
      try {
        const hasil = penangan(peristiwa);
        if (hasil && typeof (hasil as any).catch === 'function') {
          (hasil as any).catch((err: any) => {
            this.pencatatGalat(`Penolakan promise pada '${jenis}':`, err);
          });
        }
      } catch (err: any) {
        this.pencatatGalat(`Kesalahan penangan sinkron pada '${jenis}':`, err);
      }
    }

    return peristiwa;
  }

  private ekstrakParameter(jenisAtauObjek: any, payload?: any, opsi?: OpsiPenerbitan) {
    if (typeof jenisAtauObjek === 'object' && jenisAtauObjek !== null) {
      const jenis = jenisAtauObjek.nama || jenisAtauObjek.jenis;
      const isi =
        jenisAtauObjek.data !== undefined
          ? jenisAtauObjek.data
          : jenisAtauObjek.payload !== undefined
          ? jenisAtauObjek.payload
          : payload !== undefined
          ? payload
          : {};
      const id = jenisAtauObjek.id || opsi?.id;
      const opsiGabungan: OpsiPenerbitan = {
        ...opsi,
        id,
        cegahDuplikasi: opsi?.cegahDuplikasi ?? (id ? true : false),
        sumber: jenisAtauObjek.sumber || opsi?.sumber,
        metadata: { ...(jenisAtauObjek.metadata || {}), ...(opsi?.metadata || {}) },
      };
      return { jenis, isi, opsiGabungan };
    }
    return { jenis: jenisAtauObjek, isi: payload, opsiGabungan: opsi };
  }

  private validasiDanBangunPeristiwa<T>(
    jenis: string,
    payload: T,
    opsi?: OpsiPenerbitan
  ): Peristiwa<T> {
    if (!jenis || typeof jenis !== 'string' || !jenis.trim()) {
      throw new Error("Jenis peristiwa wajib berupa teks non-kosong.");
    }

    const id = opsi?.id || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
    const namaJenis = jenis.trim().toLowerCase();

    return {
      id,
      jenis: namaJenis,
      nama: namaJenis,
      payload,
      data: payload,
      waktu: new Date(),
      metadata: opsi?.metadata || {},
      sumber: opsi?.sumber,
    };
  }

  private kumpulkanListener(jenis: string): PenanganPeristiwa[] {
    const kunci = jenis.trim().toLowerCase();
    const hasil: PenanganPeristiwa[] = [];
    const sudahMasuk = new Set<PenanganPeristiwa>();

    for (const [kunciListener, setListener] of this.listeners.entries()) {
      let cocok = false;

      if (kunciListener === '*' || kunciListener === kunci) {
        cocok = true;
      } else if (kunciListener.endsWith('.*')) {
        const prefix = kunciListener.slice(0, -2);
        if (kunci.startsWith(prefix + '.')) {
          cocok = true;
        }
      } else if (kunciListener.endsWith(':*')) {
        const prefix = kunciListener.slice(0, -2);
        if (kunci.startsWith(prefix + ':')) {
          cocok = true;
        }
      }

      if (cocok) {
        for (const p of setListener) {
          if (!sudahMasuk.has(p)) {
            sudahMasuk.add(p);
            hasil.push(p);
          }
        }
      }
    }

    return hasil;
  }

  private catatIdPeristiwa(id: string): void {
    if (this.riwayatPeristiwaId.size >= this.maksRiwayatId) {
      const pertama = this.riwayatPeristiwaId.values().next().value;
      if (pertama) this.riwayatPeristiwaId.delete(pertama);
    }
    this.riwayatPeristiwaId.add(id);
  }
}
