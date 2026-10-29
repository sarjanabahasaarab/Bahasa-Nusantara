/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Definisi Tipe Data ORM, Model, Field, dan Relasi.
 */

import { AdaptorBasisdata } from '../database/jenis';
import { QueryBuilder } from '../database/queryBuilder';

export type TipeFieldORM =
  | 'string'
  | 'text'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'datetime'
  | 'json';

export interface DefinisiField {
  nama: string;
  tipe: TipeFieldORM;
  primaryKey?: boolean;
  autoincrement?: boolean;
  nullable?: boolean;
  default?: any;
  unique?: boolean;
  index?: boolean;
  panjangMaksimal?: number;
  validasi?: (nilai: any) => boolean | string;
}

export type JenisRelasi =
  | 'memilikiSatu'   // HasOne
  | 'memilikiBanyak' // HasMany
  | 'milikDari'      // BelongsTo
  | 'banyakKeBanyak'; // BelongsToMany / ManyToMany

export interface DefinisiRelasi {
  nama: string;
  jenis: JenisRelasi;
  modelTarget: () => KelasModel<any>;
  foreignKey: string;
  localKey?: string;
  tabelPivot?: string;
  pivotForeignKey?: string;
  pivotOtherKey?: string;
}

export interface KonfigurasiModel {
  namaTabel: string;
  primaryKey?: string;
  fields: Record<string, DefinisiField>;
  timestamps?: boolean;
  namaDibuatPada?: string;
  namaDiperbaruiPada?: string;
  adaptor?: AdaptorBasisdata;
  relasi?: Record<string, DefinisiRelasi>;
}

export interface EntitasModel {
  [kunci: string]: any;
}

export interface KelasModel<T extends EntitasModel = any> {
  readonly namaTabel: string;
  readonly primaryKey: string;
  readonly konfigurasi: KonfigurasiModel;
  tetapkanAdaptor(adaptor: AdaptorBasisdata): void;
  dapatkanAdaptor(): AdaptorBasisdata;
  kueri(): QueryBuilder;
  buat(data: Partial<T>): InstansiModel<T>;
  hidupkan(baris: Record<string, any>): InstansiModel<T>;
  temukan(id: any): InstansiModel<T> | null;
  temukanBerdasarkan(kolom: string, nilai: any): InstansiModel<T> | null;
  semua(): InstansiModel<T>[];
  diMana(kolom: string, opAtauNilai: any, nilai?: any): QueryBuilder;
  hitung(kolom?: string): number;
  ada(kondisi?: Record<string, any>): boolean;
  halaman(halaman?: number, perHalaman?: number): {
    data: InstansiModel<T>[];
    total: number;
    halaman: number;
    perHalaman: number;
    totalHalaman: number;
  };
}

export interface InstansiModel<T extends EntitasModel = any> {
  dapatkan(kunci: string): any;
  tetapkan(kunci: string, nilai: any): this;
  simpan(): boolean;
  hapus(): boolean;
  keObjek(): T;
  keJSON(): string;
  apakahBaru(): boolean;
  muat(namaRelasi: string): any;
  id: any;
  [kunci: string]: any;
}
