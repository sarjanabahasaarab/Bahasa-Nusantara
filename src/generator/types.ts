/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA CLI Application Generator (Phase 33)
 * Tipe Data dan Struktur Kontrak Generator Proyek
 */

export type KategoriTemplate = 'aplikasi' | 'pustaka' | 'layanan' | 'alat';

export type StatusTemplate = 'siap' | 'terbatas';

export interface BerkasTemplate {
  /** Jalur relatif file terhadap direktori akar proyek */
  jalur: string;
  /** Konten teks template dengan penanda placeholder */
  konten: string;
}

export interface DefinisiTemplate {
  id: string;
  nama: string;
  kategori: KategoriTemplate;
  deskripsi: string;
  versi: string;
  versiMinimumNusantara: string;
  persyaratanRuntime: string[];
  dependensi: Record<string, string>;
  status: StatusTemplate;
  petunjukJalankan: string[];
  batasan: string[];
  berkas: BerkasTemplate[];
}

export interface OpsiGenerator {
  namaProyek: string;
  templateId?: string;
  direktoriBasis?: string;
  direktoriTujuan?: string;
  deskripsi?: string;
  penulis?: string;
  versiAwal?: string;
  force?: boolean;
  nonInteraktif?: boolean;
  tahun?: number;
}

export interface HasilGenerator {
  sukses: boolean;
  pesan: string;
  namaProyek: string;
  direktoriHasil: string;
  templateDigunakan: string;
  berkasDibuat: string[];
  petunjukLangkah: string[];
  galat?: string;
}

export interface LaporanValidasiProyek {
  valid: boolean;
  pesan: string[];
  adaManifest: boolean;
  adaEntryPoint: boolean;
  berkasSumberValid: boolean;
  detail: {
    namaProyek?: string;
    versi?: string;
    template?: string;
    entryPoint?: string;
    jumlahBerkasSumber: number;
    kesalahanSintaks?: string[];
  };
}

export interface KonteksPlaceholder {
  NAMA_PROYEK: string;
  PASCAL_NAME: string;
  SNAKE_NAME: string;
  DESKRIPSI_PROYEK: string;
  VERSI_PROYEK: string;
  PENULIS: string;
  TAHUN: string;
  VERSI_NUSANTARA: string;
  LISENSI: string;
}
