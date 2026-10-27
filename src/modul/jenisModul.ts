/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NodeProgram } from '../parser/ast';
import { Lingkungan } from '../interpreter/environment';
import { NilaiRuntime } from '../interpreter/nilai';

export enum StatusPemuatanModul {
  BELUM_DIMUAT = 'BELUM_DIMUAT',
  SEDANG_DIMUAT = 'SEDANG_DIMUAT',
  SUDAH_DIMUAT = 'SUDAH_DIMUAT',
  GAGAL_DIMUAT = 'GAGAL_DIMUAT',
}

export interface InfoSimbolModul {
  nama: string;
  kategori: 'fungsi' | 'variabel' | 'tetap';
  tipeData?: string;
  parameter?: Array<{ nama: string; tipe: string }>;
  tipeKembalian?: string;
  tetap?: boolean;
  variadik?: boolean;
  minParameter?: number;
}

export interface CatatanModul {
  id: string; // Kunci kanonikal / jalur absolut
  nama: string; // Nama identifier modul (misal: 'matematika')
  jalurBerkas: string;
  status: StatusPemuatanModul;
  ast?: NodeProgram;
  lingkungan?: Lingkungan;
  ekspor: Map<string, NilaiRuntime>;
  simbolEkspor: Map<string, InfoSimbolModul>;
  simbolInternal: Set<string>;
}
