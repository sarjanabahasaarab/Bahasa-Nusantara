/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Definisi Tipe Data Developer Tools & IDE Foundation NUSANTARA (Phase 26)
 * Target Milestone: v0.26.0
 */

import { Diagnostik } from '../diagnostik';
import { Breakpoint, BingkaiDebug, InfoVariabelDebug, EkspresiPantau, LaporanProfil } from '../debugger/types';

export type TemaIDE = 'dark' | 'light' | 'system';
export type BahasaAntarmuka = 'id' | 'en';

export interface SimpulBerkas {
  jalur: string;
  nama: string;
  apakahDirektori: boolean;
  ekstensi?: string;
  anak?: SimpulBerkas[];
  konten?: string;
  dimodifikasi?: boolean;
}

export interface TabEditor {
  id: string;
  jalurBerkas: string;
  namaBerkas: string;
  konten: string;
  kontenTersimpan: string;
  apakahKotor: boolean;
  barisCursor: number;
  kolomCursor: number;
  pilihanAwal?: { baris: number; kolom: number };
  pilihanAkhir?: { baris: number; kolom: number };
  riwayatUndo: string[];
  riwayatRedo: string[];
  waktuBuka: number;
}

export interface ItemKompleksiLSP {
  label: string;
  jenis: 'keyword' | 'fungsi' | 'variabel' | 'tipe' | 'modul' | 'konstanta' | 'potongan';
  detail?: string;
  dokumentasi?: string;
  sisipanTeks?: string;
}

export interface InfoHoverLSP {
  isi: string;
  rentang?: { barisAwal: number; kolomAwal: number; barisAkhir: number; kolomAkhir: number };
}

export interface LokasiDefinisiLSP {
  jalurBerkas: string;
  baris: number;
  kolom: number;
  panjang?: number;
}

export interface HasilPencarianBerkas {
  jalurBerkas: string;
  namaBerkas: string;
  baris: number;
  kolom: number;
  cuplikanTeks: string;
  panjangCocok: number;
}

export type StatusEksekusiIDE = 'idle' | 'running' | 'paused' | 'finished' | 'failed' | 'terminated';

export interface LogKeluaranIDE {
  id: string;
  waktu: string;
  aliran: 'stdout' | 'stderr' | 'info' | 'system';
  pesan: string;
}

export interface PengaturanIDE {
  editor: {
    ukuranFont: number;
    ukuranTab: number;
    bungkusBaris: boolean;
    minimap: boolean;
    simpanOtomatis: boolean;
    formatSaatSimpan: boolean;
    tampilkanNomorBaris: boolean;
  };
  bahasa: {
    lspAktif: boolean;
    diagnostikLangsung: boolean;
    autocompleteAktif: boolean;
    hoverAktif: boolean;
  };
  debug: {
    berhentiPadaGalat: boolean;
    bukaPanelDebugOtomatis: boolean;
  };
  tampilan: {
    tema: TemaIDE;
    bahasa: BahasaAntarmuka;
  };
}

export interface PerintahIDE {
  id: string;
  judul: string;
  kategori: string;
  pintasan?: string;
  ikon?: string;
  tindakan?: () => void | Promise<void>;
  kondisiTersedia?: () => boolean;
}

export interface BarisTokenHighlight {
  nomorBaris: number;
  tokenList: {
    teks: string;
    kelasCss: string;
    jenisToken?: string;
  }[];
}
