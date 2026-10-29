/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Definisi Tipe Data Schema Builder dan Sistem Migrasi Database.
 */

import { AdaptorBasisdata } from '../database/jenis';
import { SchemaBuilder } from './schemaBuilder';

export interface DefinisiKolomSkema {
  nama: string;
  tipeSQL: string;
  primaryKey?: boolean;
  autoincrement?: boolean;
  nullable?: boolean;
  default?: any;
  unique?: boolean;
}

export interface KekanganKunciAsing {
  kolom: string;
  tabelReferensi: string;
  kolomReferensi: string;
  padaHapus?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  padaPerbarui?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface IndeksSkema {
  nama: string;
  kolom: string[];
  unique?: boolean;
}

export interface DefinisiMigrasi {
  nama: string;
  deskripsi?: string;
  naik: (skema: SchemaBuilder, db: AdaptorBasisdata) => void;
  turun: (skema: SchemaBuilder, db: AdaptorBasisdata) => void;
}

export interface CatatanMigrasi {
  id: number;
  nama_migrasi: string;
  batch: number;
  diterapkan_pada: string;
}

export interface StatusMigrasi {
  nama: string;
  deskripsi?: string;
  batch: number | null;
  status: 'diterapkan' | 'tertunda';
  diterapkan_pada?: string;
}

export interface HasilEksekusiMigrasi {
  berhasil: string[];
  batch: number;
  pesan: string;
}

export interface HasilRollbackMigrasi {
  dibatalkan: string[];
  batch: number;
  pesan: string;
}
