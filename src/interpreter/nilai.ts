/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NodeDeklarasiFungsi } from '../parser/ast';
import { Lingkungan } from './environment';

export enum JenisNilaiRuntime {
  TEKS = 'teks',
  BILANGAN = 'bilangan',
  DESIMAL = 'desimal',
  LOGIKA = 'logika',
  KARAKTER = 'karakter',
  DAFTAR = 'daftar',
  PETA = 'peta',
  KOSONG = 'kosong',
  FUNGSI = 'fungsi',
  FUNGSI_BAWAAN = 'fungsi_bawaan',
  MODUL = 'modul',
}

export interface NilaiTeks {
  jenis: JenisNilaiRuntime.TEKS;
  nilai: string;
}

export interface NilaiBilangan {
  jenis: JenisNilaiRuntime.BILANGAN;
  nilai: number; // Disimpan sebagai integer matematis
}

export interface NilaiDesimal {
  jenis: JenisNilaiRuntime.DESIMAL;
  nilai: number; // Disimpan sebagai pecahan float
}

export interface NilaiLogika {
  jenis: JenisNilaiRuntime.LOGIKA;
  nilai: boolean;
}

export interface NilaiKarakter {
  jenis: JenisNilaiRuntime.KARAKTER;
  nilai: string;
}

export interface NilaiDaftar {
  jenis: JenisNilaiRuntime.DAFTAR;
  elemen: NilaiRuntime[];
}

export interface NilaiPeta {
  jenis: JenisNilaiRuntime.PETA;
  nilai: Map<string, NilaiRuntime>;
}

export interface NilaiKosong {
  jenis: JenisNilaiRuntime.KOSONG;
  nilai: null;
}

export type FungsiEksekutorBawaan = (argumen: NilaiRuntime[]) => NilaiRuntime;

export interface NilaiFungsiBawaan {
  jenis: JenisNilaiRuntime.FUNGSI_BAWAAN;
  nama: string;
  eksekusi: FungsiEksekutorBawaan;
}

export interface NilaiFungsiPengguna {
  jenis: JenisNilaiRuntime.FUNGSI;
  deklarasi: NodeDeklarasiFungsi;
  lingkunganPenutup: Lingkungan;
  namaModul?: string;
  jalurBerkas?: string;
}

export interface NilaiModul {
  jenis: JenisNilaiRuntime.MODUL;
  nama: string;
  ekspor: Map<string, NilaiRuntime>;
  lingkungan: Lingkungan;
  jalurBerkas?: string;
}

export type NilaiRuntime =
  | NilaiTeks
  | NilaiBilangan
  | NilaiDesimal
  | NilaiLogika
  | NilaiKarakter
  | NilaiDaftar
  | NilaiPeta
  | NilaiKosong
  | NilaiFungsiPengguna
  | NilaiFungsiBawaan
  | NilaiModul;

// ============================================================================
// FUNGSI PEMBANTU (HELPERS)
// ============================================================================

export function buatTeks(nilai: string): NilaiTeks {
  return { jenis: JenisNilaiRuntime.TEKS, nilai };
}

export function buatKarakter(nilai: string): NilaiKarakter {
  return { jenis: JenisNilaiRuntime.KARAKTER, nilai };
}

export function buatBilangan(nilai: number): NilaiBilangan {
  return { jenis: JenisNilaiRuntime.BILANGAN, nilai: Math.trunc(nilai) };
}

export function buatDesimal(nilai: number): NilaiDesimal {
  return { jenis: JenisNilaiRuntime.DESIMAL, nilai };
}

export function buatLogika(nilai: boolean): NilaiLogika {
  return { jenis: JenisNilaiRuntime.LOGIKA, nilai };
}

export function buatKosong(): NilaiKosong {
  return { jenis: JenisNilaiRuntime.KOSONG, nilai: null };
}

export function buatDaftar(elemen: NilaiRuntime[] = []): NilaiDaftar {
  return { jenis: JenisNilaiRuntime.DAFTAR, elemen };
}

export function buatPeta(data: Map<string, NilaiRuntime> | [string, NilaiRuntime][] = []): NilaiPeta {
  const map = data instanceof Map ? data : new Map<string, NilaiRuntime>(data);
  return { jenis: JenisNilaiRuntime.PETA, nilai: map };
}

export function buatModul(
  nama: string,
  ekspor: Map<string, NilaiRuntime>,
  lingkungan: Lingkungan,
  jalurBerkas?: string
): NilaiModul {
  return {
    jenis: JenisNilaiRuntime.MODUL,
    nama,
    ekspor,
    lingkungan,
    jalurBerkas,
  };
}

export function formatNilaiTeks(nilai: NilaiRuntime, diDalamKoleksi: boolean = false): string {
  switch (nilai.jenis) {
    case JenisNilaiRuntime.TEKS:
      return diDalamKoleksi ? `"${nilai.nilai}"` : nilai.nilai;
    case JenisNilaiRuntime.BILANGAN:
      return nilai.nilai.toString();
    case JenisNilaiRuntime.DESIMAL:
      return nilai.nilai.toString();
    case JenisNilaiRuntime.LOGIKA:
      return nilai.nilai ? 'benar' : 'salah';
    case JenisNilaiRuntime.KARAKTER:
      return diDalamKoleksi ? `'${nilai.nilai}'` : nilai.nilai;
    case JenisNilaiRuntime.DAFTAR:
      return '[' + nilai.elemen.map(e => formatNilaiTeks(e, true)).join(', ') + ']';
    case JenisNilaiRuntime.PETA: {
      const entri: string[] = [];
      nilai.nilai.forEach((val, key) => {
        entri.push(`"${key}": ${formatNilaiTeks(val, true)}`);
      });
      return '{' + entri.join(', ') + '}';
    }
    case JenisNilaiRuntime.KOSONG:
      return 'kosong';
    case JenisNilaiRuntime.FUNGSI:
      return `<fungsi ${nilai.deklarasi.nama}>`;
    case JenisNilaiRuntime.FUNGSI_BAWAAN:
      return `<fungsi-bawaan ${nilai.nama}>`;
    case JenisNilaiRuntime.MODUL:
      return `<modul '${nilai.nama}'>`;
  }
}
