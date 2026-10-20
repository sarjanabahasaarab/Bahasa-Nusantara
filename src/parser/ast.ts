/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RentangPosisi } from '../lexer/posisi';

/**
 * Taksonomi Jenis Node Abstract Syntax Tree (AST) Bahasa NUSANTARA (Phase 7).
 */
export enum JenisNodeAST {
  PROGRAM = 'PROGRAM',
  PERNYATAAN_BLOK = 'PERNYATAAN_BLOK',
  DEKLARASI_VARIABEL = 'DEKLARASI_VARIABEL',
  DEKLARASI_TETAP = 'DEKLARASI_TETAP',
  PENUGASAN = 'PENUGASAN',
  PERCABANGAN_JIKA = 'PERCABANGAN_JIKA',
  PERULANGAN_SELAMA = 'PERULANGAN_SELAMA',
  PERULANGAN_UNTUK = 'PERULANGAN_UNTUK',
  INSTRUKSI_HENTIKAN = 'INSTRUKSI_HENTIKAN',
  INSTRUKSI_LANJUTKAN = 'INSTRUKSI_LANJUTKAN',
  INSTRUKSI_KEMBALIKAN = 'INSTRUKSI_KEMBALIKAN',
  PERNYATAAN_EKSPRESI = 'PERNYATAAN_EKSPRESI',

  DEKLARASI_FUNGSI = 'DEKLARASI_FUNGSI',
  PARAMETER_FUNGSI = 'PARAMETER_FUNGSI',

  LITERAL = 'LITERAL',
  LITERAL_DAFTAR = 'LITERAL_DAFTAR',
  LITERAL_PETA = 'LITERAL_PETA',
  PENGIDENTIFIKASI = 'PENGIDENTIFIKASI',
  EKSPRESI_UNARI = 'EKSPRESI_UNARI',
  EKSPRESI_BINER = 'EKSPRESI_BINER',
  EKSPRESI_PENGELOMPOKAN = 'EKSPRESI_PENGELOMPOKAN',
  PEMANGGILAN_FUNGSI = 'PEMANGGILAN_FUNGSI',
  AKSES_INDEKS = 'AKSES_INDEKS',
  PENUGASAN_INDEKS = 'PENUGASAN_INDEKS',

  // --- NODE SISTEM MODUL (Phase 15) ---
  DEKLARASI_MODUL = 'DEKLARASI_MODUL',
  PERNYATAAN_IMPOR = 'PERNYATAAN_IMPOR',
  PERNYATAAN_EKSPOR = 'PERNYATAAN_EKSPOR',
  AKSES_ANGGOTA = 'AKSES_ANGGOTA',
}

export interface NodeAST {
  jenis: JenisNodeAST;
  posisi: RentangPosisi;
}

export type EkspresiAST =
  | NodeLiteral
  | NodeLiteralDaftar
  | NodeLiteralPeta
  | NodePengidentifikasi
  | NodeEkspresiUnari
  | NodeEkspresiBiner
  | NodeEkspresiPengelompokan
  | NodePemanggilanFungsi
  | NodeAksesIndeks
  | NodeAksesAnggota;

export interface NodeLiteral extends NodeAST {
  jenis: JenisNodeAST.LITERAL;
  tipeLiteral: 'teks' | 'bilangan' | 'desimal' | 'logika' | 'karakter' | 'kosong';
  nilaiMentah: string;
  nilaiTerurai: string | number | boolean | null;
}

export interface NodePengidentifikasi extends NodeAST {
  jenis: JenisNodeAST.PENGIDENTIFIKASI;
  nama: string;
}

export interface NodeEkspresiUnari extends NodeAST {
  jenis: JenisNodeAST.EKSPRESI_UNARI;
  operator: string;
  argumen: EkspresiAST;
}

export interface NodeEkspresiBiner extends NodeAST {
  jenis: JenisNodeAST.EKSPRESI_BINER;
  operator: string;
  kiri: EkspresiAST;
  kanan: EkspresiAST;
}

export interface NodeEkspresiPengelompokan extends NodeAST {
  jenis: JenisNodeAST.EKSPRESI_PENGELOMPOKAN;
  ekspresi: EkspresiAST;
}

export interface NodePemanggilanFungsi extends NodeAST {
  jenis: JenisNodeAST.PEMANGGILAN_FUNGSI;
  namaFungsi: string;
  argumen: EkspresiAST[];
  target?: EkspresiAST; // Target pemanggilan seperti modul (misal: matematika.tambah())
}

export interface NodeAksesAnggota extends NodeAST {
  jenis: JenisNodeAST.AKSES_ANGGOTA;
  target: EkspresiAST;
  anggota: string;
}

export interface NodeLiteralDaftar extends NodeAST {
  jenis: JenisNodeAST.LITERAL_DAFTAR;
  elemen: EkspresiAST[];
}

export interface PasanganKunciNilaiPeta {
  kunci: string;
  nilai: EkspresiAST;
  posisi: RentangPosisi;
}

export interface NodeLiteralPeta extends NodeAST {
  jenis: JenisNodeAST.LITERAL_PETA;
  pasangan: PasanganKunciNilaiPeta[];
}

export interface NodeAksesIndeks extends NodeAST {
  jenis: JenisNodeAST.AKSES_INDEKS;
  koleksi: EkspresiAST;
  indeks: EkspresiAST;
}

export interface NodePenugasanIndeks extends NodeAST {
  jenis: JenisNodeAST.PENUGASAN_INDEKS;
  koleksi: EkspresiAST;
  indeks: EkspresiAST;
  nilai: EkspresiAST;
}

export type PernyataanAST =
  | NodeDeklarasiVariabel
  | NodeDeklarasiTetap
  | NodePenugasan
  | NodePenugasanIndeks
  | NodePercabanganJika
  | NodePerulanganSelama
  | NodePerulanganUntuk
  | NodeInstruksiHentikan
  | NodeInstruksiLanjutkan
  | NodeInstruksiKembalikan
  | NodePernyataanEkspresi
  | NodePernyataanBlok
  | NodePernyataanImpor
  | NodePernyataanEkspor;

export interface NodeDeklarasiVariabel extends NodeAST {
  jenis: JenisNodeAST.DEKLARASI_VARIABEL;
  nama: string;
  tipeData: string;
  nilaiAwal: EkspresiAST;
}

export interface NodeDeklarasiTetap extends NodeAST {
  jenis: JenisNodeAST.DEKLARASI_TETAP;
  nama: string;
  tipeData: string;
  nilaiAwal: EkspresiAST;
}

export interface NodePenugasan extends NodeAST {
  jenis: JenisNodeAST.PENUGASAN;
  target: string;
  nilai: EkspresiAST;
}

export interface NodePercabanganJika extends NodeAST {
  jenis: JenisNodeAST.PERCABANGAN_JIKA;
  kondisi: EkspresiAST;
  cabangMaka: PernyataanAST[];
  cabangSelain?: PernyataanAST[];
}

export interface NodePerulanganSelama extends NodeAST {
  jenis: JenisNodeAST.PERULANGAN_SELAMA;
  kondisi: EkspresiAST;
  tubuh: PernyataanAST[];
}

export interface NodePerulanganUntuk extends NodeAST {
  jenis: JenisNodeAST.PERULANGAN_UNTUK;
  variabelPenghitung: string;
  nilaiAwal: EkspresiAST;
  nilaiAkhir: EkspresiAST;
  tubuh: PernyataanAST[];
}

export interface NodeInstruksiHentikan extends NodeAST {
  jenis: JenisNodeAST.INSTRUKSI_HENTIKAN;
}

export interface NodeInstruksiLanjutkan extends NodeAST {
  jenis: JenisNodeAST.INSTRUKSI_LANJUTKAN;
}

export interface NodeInstruksiKembalikan extends NodeAST {
  jenis: JenisNodeAST.INSTRUKSI_KEMBALIKAN;
  nilai?: EkspresiAST;
}

export interface NodePernyataanEkspresi extends NodeAST {
  jenis: JenisNodeAST.PERNYATAAN_EKSPRESI;
  ekspresi: EkspresiAST;
}

export interface NodePernyataanBlok extends NodeAST {
  jenis: JenisNodeAST.PERNYATAAN_BLOK;
  daftarPernyataan: PernyataanAST[];
}

export interface NodeParameterFungsi extends NodeAST {
  jenis: JenisNodeAST.PARAMETER_FUNGSI;
  nama: string;
  tipeData: string;
}

export interface NodeDeklarasiFungsi extends NodeAST {
  jenis: JenisNodeAST.DEKLARASI_FUNGSI;
  nama: string;
  parameter: NodeParameterFungsi[];
  tipeKembalian?: string;
  tubuh: PernyataanAST[];
}

export interface NodeDeklarasiModul extends NodeAST {
  jenis: JenisNodeAST.DEKLARASI_MODUL;
  namaModul: string;
}

export interface ItemImpor {
  nama: string;
  alias?: string;
  posisi: RentangPosisi;
}

export interface NodePernyataanImpor extends NodeAST {
  jenis: JenisNodeAST.PERNYATAAN_IMPOR;
  sumberModul: string;
  aliasModul?: string;
  itemImpor?: ItemImpor[];
}

export interface NodePernyataanEkspor extends NodeAST {
  jenis: JenisNodeAST.PERNYATAAN_EKSPOR;
  deklarasi?: NodeDeklarasiFungsi | NodeDeklarasiVariabel | NodeDeklarasiTetap;
  namaEkspor?: string[];
}

export interface NodeProgram extends NodeAST {
  jenis: JenisNodeAST.PROGRAM;
  namaProgram: string;
  deklarasiModul?: NodeDeklarasiModul;
  daftarImpor: NodePernyataanImpor[];
  tubuhUtama: PernyataanAST[];
  daftarFungsi: NodeDeklarasiFungsi[];
  daftarEkspor: NodePernyataanEkspor[];
}
