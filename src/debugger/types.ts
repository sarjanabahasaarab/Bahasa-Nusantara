/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definisi Tipe dan Antarmuka Subsistem Debugger & Profiler NUSANTARA (Phase 25)
 */

import { NodeAST, PernyataanAST, NodeProgram } from '../parser/ast';
import { PosisiSumber, RentangPosisi } from '../lexer/posisi';
import { Lingkungan } from '../interpreter/environment';
import { NilaiRuntime } from '../interpreter/nilai';
import { GalatRuntime, BingkaiTumpukan } from '../interpreter/galat';
import { Diagnostik } from '../diagnostik';

/**
 * Status siklus hidup sesi debugging.
 */
export type StatusSesiDebug =
  | 'created'
  | 'running'
  | 'paused'
  | 'finished'
  | 'failed'
  | 'terminated';

/**
 * Alasan eksekusi program dijeda (pause reason).
 */
export type AlasanJeda =
  | 'breakpoint'
  | 'langkah'
  | 'jeda_manual'
  | 'galat_runtime'
  | 'selesai';

/**
 * Perintah/aksi lanjutan yang dipilih oleh pengguna/pengontrol saat program dijeda.
 */
export type AksiDebug =
  | 'continue'
  | 'step_into'
  | 'step_over'
  | 'step_out'
  | 'pause'
  | 'terminate';

/**
 * Representasi Breakpoint source-level pada kode NUSANTARA.
 */
export interface Breakpoint {
  id: number;
  berkas: string;
  baris: number;
  kolom?: number;
  kondisi?: string;
  jumlahHit: number;
  aktif: boolean;
  sementara?: boolean;
}

/**
 * Hasil validasi penempatan breakpoint.
 */
export interface HasilValidasiBreakpoint {
  valid: boolean;
  pesan: string;
  barisDiusulkan?: number;
  breakpoint?: Breakpoint;
}

/**
 * Representasi variabel hasil inspeksi frame debugger.
 */
export interface InfoVariabelDebug {
  nama: string;
  tipe: string;
  nilai: NilaiRuntime;
  formatTeks: string;
  tetap: boolean;
}

/**
 * Bingkai tumpukan panggilan (stack frame) debugger.
 */
export interface BingkaiDebug {
  indeks: number;
  namaFungsi: string;
  berkas: string;
  baris: number;
  kolom: number;
  lingkungan: Lingkungan;
  variabelLokal: Map<string, InfoVariabelDebug>;
  lingkupNama: string;
  nodeAST?: NodeAST;
}

/**
 * Ekspresi pantau (watch expression) yang dievaluasi setiap kali program paused.
 */
export interface EkspresiPantau {
  id: number;
  ekspresi: string;
  nilai?: string;
  tipe?: string;
  status: 'sukses' | 'galat' | 'belum_dievaluasi';
  galat?: string;
}

/**
 * Taksonomi peristiwa internal debugger (Debug Events).
 */
export type JenisPeristiwaDebug =
  | 'BreakpointHit'
  | 'ExecutionPaused'
  | 'ExecutionResumed'
  | 'StepCompleted'
  | 'ProgramFinished'
  | 'RuntimeError'
  | 'ProgramTerminated';

export interface PeristiwaDebug {
  jenis: JenisPeristiwaDebug;
  waktu: number;
  pesan: string;
  berkas?: string;
  baris?: number;
  kolom?: number;
  detail?: any;
}

/**
 * Hasil evaluasi ekspresi pada konteks debugger.
 */
export interface HasilEvaluasiDebug {
  berhasil: boolean;
  nilai?: NilaiRuntime;
  formatTeks?: string;
  tipe?: string;
  galat?: string;
}

/**
 * Data profil eksekusi untuk satu fungsi tertentu.
 */
export interface ProfilFungsi {
  namaFungsi: string;
  jumlahPanggilan: number;
  waktuTotalMs: number;
  waktuMandiriMs: number;
  waktuRataRataMs: number;
  waktuMinMs: number;
  waktuMaksMs: number;
}

/**
 * Statistik memori runtime host.
 */
export interface StatistikMemori {
  didukung: boolean;
  alokasiByte?: number;
  penggunaanPuncakByte?: number;
  rssByte?: number;
  formatTeks?: string;
  pesan?: string;
}

/**
 * Laporan hasil profiling eksekusi program.
 */
export interface LaporanProfil {
  namaProgram: string;
  durasiTotalMs: number;
  jumlahPanggilanTotal: number;
  daftarFungsi: ProfilFungsi[];
  memori: StatistikMemori;
  waktuMulai: string;
  waktuSelesai: string;
  profilerAktif: boolean;
}

/**
 * Debug Adapter Protocol (DAP) message specifications.
 */
export interface PesanDAP {
  seq: number;
  type: 'request' | 'response' | 'event';
  [key: string]: any;
}

export interface PermintaanDAP extends PesanDAP {
  type: 'request';
  command: string;
  arguments?: any;
}

export interface ResponDAP extends PesanDAP {
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: any;
}

export interface PeristiwaDAP extends PesanDAP {
  type: 'event';
  event: string;
  body?: any;
}
