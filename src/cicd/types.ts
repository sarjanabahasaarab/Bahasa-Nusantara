/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definisi Tipe Data CI/CD, Alur Kerja GitHub Actions & Validasi Rilis NUSANTARA (Phase 24)
 * Target Milestone: v0.24.0
 */

import { PlatformTarget, ModeBuild, ArtefakBuild, ManifestRilis } from '../build/types';

export type StatusPemeriksaanCI = 'PASS' | 'FAIL' | 'NOT SUPPORTED' | 'NOT VERIFIED' | 'SKIPPED';

export type EventTrigger = 'push' | 'pull_request' | 'workflow_dispatch' | 'release';

export interface MasukanWorkflowDispatch {
  nama: string;
  deskripsi: string;
  wajib: boolean;
  tipe: 'string' | 'boolean' | 'choice' | 'environment';
  bawaan?: string | boolean;
  opsi?: string[];
}

export interface PermissionWorkflow {
  contents?: 'read' | 'write' | 'none';
  pullRequests?: 'read' | 'write' | 'none';
  issues?: 'read' | 'write' | 'none';
  packages?: 'read' | 'write' | 'none';
  deployments?: 'read' | 'write' | 'none';
  idToken?: 'read' | 'write' | 'none';
  [kunci: string]: any;
}

export interface LangkahJobWorkflow {
  name: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string>;
  if?: string;
  continueOnError?: boolean;
}

export interface DefinisiJobWorkflow {
  name?: string;
  needs?: string | string[];
  runsOn?: string;
  permissions?: PermissionWorkflow;
  environment?: string | { name: string; url?: string };
  strategy?: {
    matrix?: Record<string, any[]>;
    failFast?: boolean;
    maxParallel?: number;
  };
  steps: LangkahJobWorkflow[];
  if?: string;
  concurrency?: any;
}

export interface DefinisiWorkflowGitHub {
  name: string;
  on: Record<string, any>;
  permissions?: PermissionWorkflow;
  concurrency?: {
    group: string;
    cancelInProgress?: boolean | string;
  };
  jobs: Record<string, DefinisiJobWorkflow>;
}

export interface TemuanAuditKeamananCI {
  tingkat: 'info' | 'peringatan' | 'kritis';
  pesan: string;
  lokasi?: string;
}

export interface HasilValidasiWorkflow {
  namaBerkas: string;
  valid: boolean;
  namaWorkflow: string;
  daftarTrigger: string[];
  leastPrivilegeTercapai: boolean;
  adaRahasiaBocor: boolean;
  concurrencyAman: boolean;
  persetujuanRilisAman: boolean;
  daftarJob: {
    id: string;
    nama: string;
    needs: string[];
    runsOn?: string;
    jumlahLangkah: number;
    matrix?: Record<string, any[]>;
  }[];
  temuan: TemuanAuditKeamananCI[];
}

export interface HasilLangkahCI {
  id: string;
  nama: string;
  kategori: 'static-checks' | 'test' | 'quality-gate' | 'build-matrix' | 'artifact-validation' | 'checksum' | 'release-gate';
  status: StatusPemeriksaanCI;
  durasiMs: number;
  pesan?: string;
  detail?: any;
}

export interface HasilMatriksPlatform {
  platform: PlatformTarget;
  runner: string;
  status: StatusPemeriksaanCI;
  namaArtefak?: string;
  ukuranBytes?: number;
  sha256?: string;
  catatan?: string;
}

export interface LaporanEksekusiCI {
  versi: string;
  idWorkflow: string;
  event: EventTrigger;
  cabang: string;
  waktuMulai: string;
  durasiTotalMs: number;
  statusAkhir: 'PASS' | 'FAIL';
  langkah: HasilLangkahCI[];
  matriksPlatform: HasilMatriksPlatform[];
  statusRilis: 'NOT PUBLISHED' | 'PUBLISHED' | 'READY FOR APPROVAL';
  artefak: ArtefakBuild[];
  manifestRilis?: ManifestRilis;
  sha256sums?: string;
  ringkasanTeks: string;
  ringkasanMarkdown: string;
}
