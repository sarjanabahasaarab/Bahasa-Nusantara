/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Definisi Tipe Data Seeder Basis Data.
 */

import { AdaptorBasisdata } from '../database/jenis';

export interface DefinisiSeeder {
  nama: string;
  deskripsi?: string;
  jalankan: (db: AdaptorBasisdata) => void;
}

export interface HasilEksekusiSeeder {
  nama: string;
  sukses: boolean;
  pesan: string;
  durasiMs: number;
}
