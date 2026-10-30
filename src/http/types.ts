/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Definisi Tipe dan Kontrak HTTP Client, API Integration & External Services
 */

export type MetodeHTTP = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type NilaiHeader = string | number | boolean;
export type PetaHeaderInput = Record<string, NilaiHeader | NilaiHeader[]> | [string, NilaiHeader][];

export interface InfoPengalihan {
  urlAsal: string;
  urlTujuan: string;
  kodeStatus: number;
}

export interface MetrikWaktuHTTP {
  mulai: number;
  selesai: number;
  durasiMs: number;
  dnsMs?: number;
  tlsMs?: number;
}

export type TipeBody = 'json' | 'form' | 'multipart' | 'teks' | 'biner';

export interface BagianMultipart {
  nama: string;
  nilai: string | Buffer;
  namaBerkas?: string;
  mimeType?: string;
}

export interface KredensialDasar {
  tipe: 'basic';
  namaPengguna: string;
  kataSandi: string;
}

export interface KredensialBearer {
  tipe: 'bearer';
  token: string;
}

export interface KredensialApiKey {
  tipe: 'apiKey';
  kunci: string;
  namaParam?: string; // Default: 'X-API-Key' jika di header, 'api_key' jika di query
  lokasi?: 'header' | 'kueri';
}

export interface KredensialOAuth2 {
  tipe: 'oauth2';
  accessToken: string;
  tokenType?: string; // Default: 'Bearer'
  refreshToken?: string;
  kedaluwarsaPada?: Date;
  expiresAt?: number;
  endpointPenyegaran?: string;
  clientId?: string;
  clientSecret?: string;
}

export type KonfigurasiOtentikasi =
  | KredensialDasar
  | KredensialBearer
  | KredensialApiKey
  | KredensialOAuth2;

export interface KebijakanRetryHTTP {
  maksimalPercobaan?: number; // Default: 3
  jedaAwalMs?: number; // Default: 500
  faktorEksponensial?: number; // Default: 2
  jedaMaksimalMs?: number; // Default: 10000
  gunakanJitter?: boolean; // Default: true
  metodeDiizinkan?: MetodeHTTP[]; // Default: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']
  statusBolehUlang?: number[]; // Default: [408, 429, 500, 502, 503, 504]
}

export interface OpsiPermintaanHTTP {
  metode?: MetodeHTTP;
  headers?: PetaHeaderInput;
  kueri?: Record<string, string | number | boolean | (string | number | boolean)[]>;
  body?: any;
  tipeBody?: TipeBody;
  timeoutMs?: number; // Total request timeout (default: 30000ms)
  timeoutKoneksiMs?: number; // Connection timeout (default: 10000ms)
  ikutiPengalihan?: boolean; // Default: true
  maksimalPengalihan?: number; // Default: 10
  abaikanTLS?: boolean; // Hanya untuk development; default: false (wajib verifikasi TLS)
  otentikasi?: KonfigurasiOtentikasi;
  kebijakanRetry?: KebijakanRetryHTTP;
  sertakanCookie?: boolean; // Default: true jika ada cookie jar
  sinyalPembatalan?: AbortSignal;
}

export interface KonfigurasiKlienHTTP {
  baseUrl?: string;
  defaultHeaders?: PetaHeaderInput;
  headerBawaan?: PetaHeaderInput;
  defaultTimeout?: number;
  batasWaktuMs?: number;
  batasUkuranTubuhBytes?: number;
  retryPolicy?: KebijakanRetryHTTP;
  cobaUlang?: KebijakanRetryHTTP;
  otentikasi?: KonfigurasiOtentikasi;
  autentikasi?: KonfigurasiOtentikasi;
}

export type OpsiRequestHTTP = OpsiPermintaanHTTP & {
  url?: string;
  tubuh?: any;
  header?: any;
  [key: string]: any;
};

export interface ResponHTTPInterface<T = any> {
  readonly status: number;
  readonly statusTeks: string;
  readonly teksStatus?: string;
  readonly headers: Map<string, string>;
  readonly header?: any;
  readonly urlAkhir: string;
  readonly urlTerakhir?: string;
  readonly durasiMs: number;
  readonly apakahSukses: boolean;
  readonly berhasil?: boolean;
  readonly pengalihan: InfoPengalihan[];
  teks(): string;
  json<R = T>(): R;
  buffer(): Buffer;
  dapatkanHeader(nama: string): string | undefined;
}

export interface CookieItem {
  nama: string;
  nilai: string;
  domain?: string;
  jalur?: string;
  kedaluwarsa?: Date;
  maksUsiaDetik?: number;
  aman?: boolean; // Secure
  hanyaHttp?: boolean; // HttpOnly
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface OpsiUnduhBerkas extends OpsiPermintaanHTTP {
  url?: string;
  jalurTujuan: string;
  timpaJikaAda?: boolean;
  batasUkuranBytes?: number; // Default: 100 MB
  padaProgres?: (terunduhBytes: number, totalBytes: number) => void;
  lanjutkanJikaAda?: boolean; // Resume download via Range header
}

export interface OpsiUnggahBerkas extends OpsiPermintaanHTTP {
  url?: string;
  jalurBerkas: string;
  namaField?: string; // Default: 'file'
  namaBerkasKustom?: string;
  mimeType?: string;
  fieldTambahan?: Record<string, any>;
  padaProgres?: (terunggahBytes: number, totalBytes: number) => void;
}

export type TipePaginasi = 'halaman' | 'offset' | 'kursor' | 'header_link';

export interface KonfigurasiPaginasi {
  tipe: TipePaginasi;
  namaParamHalaman?: string; // Default: 'halaman' atau 'page'
  namaParamBatas?: string; // Default: 'batas' atau 'limit'
  namaParamOffset?: string; // Default: 'offset'
  namaParamKursor?: string; // Default: 'kursor' atau 'cursor'
  batasPerHalaman?: number; // Default: 20
  maksimalHalaman?: number; // Default: 100 (mencegah loop tak terhingga)
  ekstrakKursor?: (respon: any) => string | undefined;
  ekstrakData?: (respon: any) => any[];
}

export interface KonfigurasiKlienAPI {
  baseUrl: string;
  headersBawaan?: PetaHeaderInput;
  timeoutBawaanMs?: number;
  otentikasi?: KonfigurasiOtentikasi;
  kebijakanRetry?: KebijakanRetryHTTP;
  paginasiBawaan?: KonfigurasiPaginasi;
  abaikanTLS?: boolean;
}

export interface OpsiVerifikasiWebhook {
  secret: string;
  headerTandaTangan?: string; // Default: 'x-hub-signature-256' atau 'x-signature'
  toleransiWaktuDetik?: number; // Default: 300 (5 menit)
  headerWaktu?: string; // Default: 'x-timestamp'
}

export interface HasilVerifikasiWebhook<T = any> {
  sah: boolean;
  pesan?: string;
  payload?: T;
  idEvent?: string;
}

export interface AdaptorLayananEksternalInterface {
  readonly nama: string;
  readonly deskripsi: string;
  readonly terkonfigurasi: boolean;
  periksaKoneksi(): Promise<boolean>;
  eksekusi(aksi: string, parameter: Record<string, any>): Promise<any>;
}
