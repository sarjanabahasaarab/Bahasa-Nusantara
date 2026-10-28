/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Definisi antarmuka, tipe data, dan kontrak sistem autentikasi dan otorisasi.
 */

export type StatusPengguna = 'aktif' | 'nonaktif' | 'tertunda';

export type PeranBawaan = 'pengguna' | 'editor' | 'admin' | string;

export interface Pengguna {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: PeranBawaan;
  status: StatusPengguna;
  created_at: string;
  updated_at: string;
}

export interface PenggunaProfilAman {
  id: number;
  username: string;
  email: string;
  role: PeranBawaan;
  status: StatusPengguna;
  created_at: string;
  updated_at: string;
}

export interface Sesi {
  id: string; // Session ID publik / cookie value
  pengguna_id: number;
  token_hash: string; // SHA-256 dari session ID yang tersimpan di DB
  created_at: string;
  expires_at: string;
  last_activity: string;
  ip_klien?: string;
  user_agent?: string;
}

export interface OpsiPasswordPolicy {
  panjangMinimal?: number; // default 8
  panjangMaksimal?: number; // default 128
  wajibHuruf?: boolean;
  wajibAngka?: boolean;
}

export interface OpsiSesi {
  namaKuki?: string; // default 'nusantara_session'
  umurMaksimalDetik?: number; // absolute timeout, default 7 hari (604800s)
  batasDiamDetik?: number; // idle timeout, default 24 jam (86400s)
  rotasiSetelahLogin?: boolean; // pencegahan session fixation, default true
  kukiHttpOnly?: boolean; // default true
  kukiSecure?: boolean; // default false di dev, true di prod
  kukiSameSite?: 'Strict' | 'Lax' | 'None'; // default 'Lax'
}

export interface OpsiBruteForce {
  maksPercobaanGagal?: number; // default 5 percobaan
  jendelaWaktuDetik?: number; // default 300s (5 menit)
  durasiKunciDetik?: number; // default 900s (15 menit)
}

export interface OpsiAutentikasi {
  namaTabelPengguna?: string; // default 'pengguna'
  namaTabelSesi?: string; // default 'sesi'
  namaTabelReset?: string; // default 'reset_password'
  kebijakanPassword?: OpsiPasswordPolicy;
  opsiSesi?: OpsiSesi;
  opsiBruteForce?: OpsiBruteForce;
}

export interface HasilLogin {
  sukses: boolean;
  pengguna?: PenggunaProfilAman;
  sesi?: Sesi;
  tokenSesi?: string;
  token?: string;
  pesanGalat?: string;
}

export interface HasilRegistrasi {
  sukses: boolean;
  pengguna?: PenggunaProfilAman;
  pesanGalat?: string;
}

export interface TokenResetPassword {
  id: number;
  pengguna_id: number;
  token_hash: string;
  created_at: string;
  expires_at: string;
  digunakan: number; // 0 = belum, 1 = sudah
}

export enum JenisGalatAutentikasi {
  KREDENSIAL_TIDAK_VALID = 'KREDENSIAL_TIDAK_VALID',
  AKUN_NONAKTIF = 'AKUN_NONAKTIF',
  USERNAME_SUDAH_ADA = 'USERNAME_SUDAH_ADA',
  EMAIL_SUDAH_ADA = 'EMAIL_SUDAH_ADA',
  PASSWORD_TIDAK_MEMENUHI_SYARAT = 'PASSWORD_TIDAK_MEMENUHI_SYARAT',
  SESI_KADALUARSA = 'SESI_KADALUARSA',
  SESI_TIDAK_VALID = 'SESI_TIDAK_VALID',
  TIDAK_TERAUTENTIKASI = 'TIDAK_TERAUTENTIKASI',
  AKSES_DITOLAK = 'AKSES_DITOLAK',
  BRUTE_FORCE_TERDETEKSI = 'BRUTE_FORCE_TERDETEKSI',
  CSRF_TIDAK_VALID = 'CSRF_TIDAK_VALID',
  TOKEN_RESET_KADALUARSA = 'TOKEN_RESET_KADALUARSA',
}

export class GalatAutentikasi extends Error {
  constructor(
    public readonly jenis: JenisGalatAutentikasi,
    pesan: string,
    public readonly kodeHTTP: number = 401
  ) {
    super(`[Autentikasi: ${jenis}] ${pesan}`);
    this.name = 'GalatAutentikasi';
  }
}
