/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Entitas dan Lifecycle Tugas Latar Belakang (Background Task)
 */

import * as crypto from 'node:crypto';
import { TugasLatarBelakang, OpsiTugas, StatusTugas } from '../types';

export function buatTugas<T = any>(
  nama: string,
  payload: T,
  opsi?: OpsiTugas
): TugasLatarBelakang<T> {
  if (!nama || typeof nama !== 'string' || !nama.trim()) {
    throw new Error("Nama tugas latar belakang wajib diisi berupa teks.");
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  const namaBersih = nama.trim().toLowerCase();
  const kunciIdem = opsi?.kunciIdempotensi || opsi?.kunciIdempoten;

  return {
    id,
    nama: namaBersih,
    tipe: namaBersih,
    payload,
    status: 'antre',
    prioritas: opsi?.prioritas ?? 0,
    dibuatPada: new Date(),
    jumlahPercobaan: 0,
    maksimalPercobaan: Math.max(1, opsi?.maksimalPercobaan ?? 3),
    jedaPercobaanMs: Math.max(100, opsi?.jedaPercobaanMs ?? 1000),
    metadata: opsi?.metadata || {},
    kunciIdempotensi: kunciIdem,
    kunciIdempoten: kunciIdem,
  };
}

export function tandaiBerjalan(tugas: TugasLatarBelakang): void {
  tugas.status = 'berjalan';
  tugas.dimulaiPada = new Date();
  tugas.jumlahPercobaan++;
}

export function tandaiSelesai<R>(tugas: TugasLatarBelakang<any, R>, hasil?: R): void {
  tugas.status = 'selesai';
  tugas.selesaiPada = new Date();
  tugas.hasil = hasil;
  tugas.pesanGalat = undefined;
}

export function tandaiGagal(tugas: TugasLatarBelakang, pesanGalat: string): void {
  tugas.status = 'gagal';
  tugas.selesaiPada = new Date();
  tugas.pesanGalat = pesanGalat;
}

export function tandaiDibatalkan(tugas: TugasLatarBelakang, alasan: string = 'Dibatalkan oleh pengguna'): void {
  tugas.status = 'dibatalkan';
  tugas.selesaiPada = new Date();
  tugas.pesanGalat = alasan;
}
