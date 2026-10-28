/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Definisi antarmuka, tipe data, dan kontrak komponen framework web.
 */

export type MetodeHTTP =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export interface OpsiKuki {
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  domain?: string;
}

export interface PermintaanWeb {
  readonly id: string;
  readonly metode: MetodeHTTP;
  readonly jalur: string;
  readonly urlLengkap: string;
  readonly kueri: Record<string, string>;
  readonly parameter: Record<string, string>;
  readonly tajuk: Record<string, string>;
  readonly tipeKonten?: string;
  readonly badan: any;
  readonly badanMentah?: string;
  readonly kuki: Record<string, string>;
  readonly ipKlien: string;

  ambilKueri(kunci: string, bawaan?: string): string | undefined;
  ambilParam(kunci: string, bawaan?: string): string | undefined;
  ambilTajuk(kunci: string, bawaan?: string): string | undefined;
  ambilKuki(kunci: string, bawaan?: string): string | undefined;
  badanJSON<T = Record<string, any>>(): T | null;
}

export interface ResponsWeb {
  readonly sudahTerkirim: boolean;
  readonly kodeStatus: number;
  readonly seluruhTajuk: Record<string, string | string[]>;

  status(kode: number): this;
  tajuk(kunci: string, nilai: string | string[]): this;
  tipe(tipeMime: string): this;
  kuki(nama: string, nilai: string, opsi?: OpsiKuki): this;
  hapusKuki(nama: string, opsi?: OpsiKuki): this;

  teks(konten: string, status?: number): void;
  html(kontenHTML: string, status?: number): void;
  json(data: any, status?: number): void;
  alihkan(tujuanURL: string, status?: number): void;
  berkas(jalurBerkas: string, opsi?: { batasAman?: string }): void;
  kirimStatus(kode: number): void;
}

export type PenanganRute = (
  req: PermintaanWeb,
  res: ResponsWeb
) => Promise<void> | void;

export type FungsiLanjut = () => Promise<void> | void;

export type MiddlewareWeb = (
  req: PermintaanWeb,
  res: ResponsWeb,
  lanjut: FungsiLanjut
) => Promise<void> | void;

export interface OpsiServerWeb {
  port?: number;
  host?: string;
  batasUkuranBadanBytes?: number; // Default 1MB (1048576)
  batasWaktuMilidetik?: number;   // Default 30000ms (30s)
  direktoriStatis?: string;
  prefixStatis?: string;
  kepercayaanProxy?: boolean;     // Validasi header X-Forwarded-For
  aktifkanPencatatAkses?: boolean;
  kredensialCORS?: boolean;
  asalCORS?: string | string[];
}

export interface KonfigurasiRute {
  metode: MetodeHTTP | 'SEMUA';
  pola: string;
  penangan: PenanganRute;
  middleware?: MiddlewareWeb[];
}

export interface HasilPencocokanRute {
  rute: KonfigurasiRute;
  parameter: Record<string, string>;
}

export enum JenisGalatWeb {
  RUTE_TIDAK_DITEMUKAN = 'RUTE_TIDAK_DITEMUKAN',
  METODE_TIDAK_DIIZINKAN = 'METODE_TIDAK_DIIZINKAN',
  BADAN_TERLALU_BESAR = 'BADAN_TERLALU_BESAR',
  SINTAKS_BADAN_TIDAK_VALID = 'SINTAKS_BADAN_TIDAK_VALID',
  AKSES_JALUR_ILEGAL = 'AKSES_JALUR_ILEGAL',
  BATAS_WAKTU_TERLAMPAUI = 'BATAS_WAKTU_TERLAMPAUI',
  SERVER_GAGAL = 'SERVER_GAGAL',
}

export class GalatWeb extends Error {
  constructor(
    public readonly jenis: JenisGalatWeb,
    public readonly kodeHTTP: number,
    pesan: string,
    public readonly detail?: unknown
  ) {
    super(`[Web: ${jenis}] ${pesan}`);
    this.name = 'GalatWeb';
  }
}
