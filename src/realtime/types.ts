/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Tipe Data dan Struktur Kontrak Sistem Real-Time & Background Processing
 */

// ============================================================================
// 1. EVENT SYSTEM TYPES
// ============================================================================

export interface Peristiwa<T = Record<string, any>> {
  /** Pengenal unik peristiwa (UUID / hash) */
  id: string;
  /** Nama/kategori peristiwa (misal: 'pengguna:masuk', 'pesan:baru') */
  jenis: string;
  /** Alias kompatibilitas untuk jenis */
  nama?: string;
  /** Data muatan peristiwa (tervalidasi) */
  payload: T;
  /** Alias kompatibilitas untuk payload */
  data?: T;
  /** Stempel waktu pembentukan peristiwa */
  waktu: Date;
  /** Metadata tambahan (sumber, penjejakan, dll) */
  metadata: Record<string, any>;
  /** Asal/sumber peristiwa (opsional) */
  sumber?: string;
}

export type PenanganPeristiwa<T = any> = (peristiwa: Peristiwa<T>) => Promise<void> | void;

export interface OpsiPenerbitan {
  id?: string;
  sumber?: string;
  metadata?: Record<string, any>;
  /** Cegah penerbitan jika ID peristiwa sudah pernah diproses */
  cegahDuplikasi?: boolean;
}

// ============================================================================
// 2. WEBSOCKET & CHANNEL TYPES
// ============================================================================

export type StatusKoneksiWS = 'menghubungkan' | 'terbuka' | 'menutup' | 'tertutup';

export interface ProfilPenggunaWS {
  idPengguna: string;
  namaPengguna?: string;
  peran: string;
  izin?: string[];
  metadata?: Record<string, any>;
}

export interface KoneksiKlienWS {
  /** ID unik koneksi (UUID) */
  id: string;
  /** Status koneksi saat ini */
  status: StatusKoneksiWS;
  /** Waktu koneksi pertama kali tersambung */
  tersambungPada: Date;
  /** Waktu pesan/aktivitas terakhir diterima */
  aktivitasTerakhir: Date;
  /** Alamat IP klien */
  ipKlien: string;
  /** Profil terautentikasi (jika berhasil login/handshake) */
  profil?: ProfilPenggunaWS;
  /** Ruang (rooms/channels) yang diikuti oleh klien ini */
  daftarRuang: Set<string>;
  /** Pengirim pesan mentah ke soket fisik */
  kirim(data: string | Buffer): void;
  /** Putus koneksi soket */
  putus(kode?: number, alasan?: string): void;
}

export interface PesanWebSocket<T = any> {
  tipe: 'teks' | 'biner' | 'ping' | 'pong' | 'event' | 'sistem';
  acara?: string; // event name untuk pesan bertipe 'event'
  ruang?: string; // room name jika ditujukan ke ruang tertentu
  data: T;
  stempelWaktu: number;
}

export type KoneksiWebSocketNUSANTARA = KoneksiKlienWS;

export interface KonfigurasiWebSocket {
  jalur?: string; // default '/ws'
  asalDiizinkan?: string[]; // Origin whitelist (misal: ['http://localhost:3000'])
  originDiizinkan?: string[]; // alias
  batasUkuranPesanBytes?: number; // default 1MB (1048576 bytes)
  maksUkuranPesanByte?: number; // alias
  batasKoneksiMaksimal?: number; // default 1000
  maksPesanPerMenit?: number;
  maksPesanPerDetik?: number;
  port?: number;
  host?: string;
  otentikasiWajib?: boolean;
  intervalDetakJantungMs?: number; // ping interval (default 30000ms)
  batasWaktuDetakJantungMs?: number; // pong timeout (default 10000ms)
  autentikator?: (token: string, tajuk: Record<string, string>) => Promise<ProfilPenggunaWS | null> | ProfilPenggunaWS | null;
  otorisasiRuang?: (profil: ProfilPenggunaWS | undefined, namaRuang: string) => Promise<boolean> | boolean;
}

// ============================================================================
// 3. BACKGROUND TASK & QUEUE TYPES
// ============================================================================

export type StatusTugas =
  | 'antre'
  | 'pending'
  | 'berjalan'
  | 'running'
  | 'selesai'
  | 'completed'
  | 'gagal'
  | 'failed'
  | 'dibatalkan'
  | 'cancelled';

export interface TugasLatarBelakang<T = any, R = any> {
  id: string;
  nama: string; // misal: 'kirim_email', 'proses_laporan'
  tipe?: string; // alias kompatibilitas untuk nama
  payload: T;
  status: StatusTugas;
  prioritas: number; // default 0 (lebih tinggi dieksekusi lebih dulu)
  dibuatPada: Date;
  dimulaiPada?: Date;
  selesaiPada?: Date;
  jumlahPercobaan: number;
  maksimalPercobaan: number;
  jedaPercobaanMs: number;
  pesanGalat?: string;
  hasil?: R;
  metadata?: Record<string, any>;
  kunciIdempotensi?: string;
  kunciIdempoten?: string; // alias
}

export interface OpsiTugas {
  maksimalPercobaan?: number; // default 3
  jedaPercobaanMs?: number; // default 1000ms
  prioritas?: number; // default 0
  kunciIdempotensi?: string;
  kunciIdempoten?: string; // alias
  metadata?: Record<string, any>;
  tundaMs?: number; // delay sebelum tugas siap dieksekusi
  tundaDetik?: number; // alias delay dalam detik
}

export type PenanganTugas<T = any, R = any> = (tugas: TugasLatarBelakang<T, R>) => Promise<R> | R;

export interface StatistikAntrean {
  totalTugas: number;
  menunggu: number;
  sedangBerjalan: number;
  selesai: number;
  gagal: number;
  dibatalkan: number;
}

export interface JadwalTugas {
  id: string;
  namaTugas: string;
  payload: any;
  intervalMs?: number;
  eksekusiBerikutnya: Date;
  berulang: boolean;
  aktif: boolean;
  totalEksekusi: number;
}
