/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber, RentangPosisi } from '../lexer/posisi';
import { KodeGalat, METADATA_KODE_GALAT } from './kode';

/**
 * Tingkat keparahan diagnostik (Severity).
 */
export enum TingkatDiagnostik {
  INFORMASI = 'INFORMASI',
  PERINGATAN = 'PERINGATAN',
  KESALAHAN = 'KESALAHAN',
  FATAL = 'FATAL',
}

/**
 * Kategori diagnostik Bahasa NUSANTARA.
 */
export enum KategoriDiagnostik {
  LEXER = 'LEXER',
  PARSER = 'PARSER',
  TIPE = 'TIPE',
  NAMA = 'NAMA',
  MODUL = 'MODUL',
  PAKET = 'PAKET',
  RUNTIME = 'RUNTIME',
  BERKAS = 'BERKAS',
  INDEKS = 'INDEKS',
  KONVERSI = 'KONVERSI',
  INTERNAL = 'INTERNAL',
  LINTER = 'LINTER',
}

/**
 * Representasi lokasi sumber kode yang kaya untuk sistem diagnostik.
 */
export interface LokasiSumberKaya {
  berkas?: string;
  baris: number;
  kolom: number;
  panjang?: number;
  posisiAwal?: PosisiSumber;
  posisiAkhir?: PosisiSumber;
}

/**
 * Cuplikan kode sumber dengan visualisasi penunjuk (caret ^^^^).
 */
export interface PotonganKode {
  nomorBaris: number;
  teksBaris: string;
  kolomAwal: number;
  panjang: number;
  teksCaret: string;
}

/**
 * Informasi frame tumpukan eksekusi pemanggilan fungsi.
 */
export interface BingkaiJejak {
  namaFungsi: string;
  namaModul?: string;
  namaPaket?: string;
  versiPaket?: string;
  berkas?: string;
  lokasi?: LokasiSumberKaya;
}

/**
 * Konteks lingkungan eksekusi saat galat terjadi.
 */
export interface KonteksEksekusi {
  berkas?: string;
  namaModul?: string;
  namaFungsi?: string;
  namaPaket?: string;
  versiPaket?: string;
}

/**
 * Model data diagnostik terpusat resmi Bahasa NUSANTARA (Phase 18).
 * Model ini terpisah murni dari format render tampilan (separation of concerns).
 */
export interface Diagnostik {
  tingkat: TingkatDiagnostik;
  kategori: KategoriDiagnostik;
  kode: KodeGalat | string;
  pesan: string;
  penyebabRinci?: string;
  lokasi?: LokasiSumberKaya;
  potonganKode?: PotonganKode;
  saran?: string;
  konteks?: KonteksEksekusi;
  jejakTumpukan?: BingkaiJejak[];
  penyebabAsal?: Diagnostik; // Rantai galat (Error Chain)
  metadata?: Record<string, any>;
  waktu?: Date;
}

/**
 * Kelas error dasar terpadu untuk semua galat resmi bahasa NUSANTARA.
 * Membungkus Diagnostik dan tetap kompatibel dengan kelas bawaan Error JavaScript/TypeScript.
 */
export class GalatNusantara extends Error {
  public readonly diagnostik: Diagnostik;

  constructor(diagnostik: Diagnostik) {
    const lokasiStr = diagnostik.lokasi
      ? ` (${diagnostik.lokasi.berkas ? diagnostik.lokasi.berkas + ':' : ''}${diagnostik.lokasi.baris}:${diagnostik.lokasi.kolom})`
      : '';
    const judul = METADATA_KODE_GALAT[diagnostik.kode as KodeGalat]?.judul || diagnostik.kategori;
    super(`[${diagnostik.kode}] ${judul}${lokasiStr}: ${diagnostik.pesan}`);

    this.name = 'GalatNusantara';
    this.diagnostik = diagnostik;

    // Menjaga prototype chain yang benar untuk instanceof
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public dapatkanKode(): KodeGalat | string {
    return this.diagnostik.kode;
  }

  public dapatkanKategori(): KategoriDiagnostik {
    return this.diagnostik.kategori;
  }
}
