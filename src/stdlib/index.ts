/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatatanModul, StatusPemuatanModul, InfoSimbolModul } from '../modul/jenisModul';
import { NilaiRuntime } from '../interpreter/nilai';
import { Lingkungan } from '../interpreter/environment';

import { simbolEksporTeks, buatEksporTeks } from './teks';
import { simbolEksporMatematika, buatEksporMatematika } from './matematika';
import { simbolEksporKonversi, buatEksporKonversi } from './konversi';
import { simbolEksporWaktu, buatEksporWaktu } from './waktu';
import { simbolEksporAcak, buatEksporAcak } from './acak';
import { simbolEksporKoleksi, buatEksporKoleksi } from './koleksi';
import { simbolEksporBerkas, buatEksporBerkas, SandboxBerkas, sandboxBerkasGlobal } from './berkas';
import { simbolEksporSistem, buatEksporSistem, VERSI_NUSANTARA } from './sistem';
import { simbolEksporUji, buatEksporUji } from './uji';
import { simbolEksporJalur, buatEksporJalur } from './jalur';
import { simbolEksporJson, buatEksporJson } from './json';
import { simbolEksporLingkungan, buatEksporLingkungan } from './lingkungan';
import { simbolEksporProses, buatEksporProses, tetapkanHandlerEksekusiProses } from './proses';
import { simbolEksporJaringan, buatEksporJaringan, tetapkanPengirimHTTPMock } from './jaringan';
import { simbolEksporKripto, buatEksporKripto } from './kripto';
import { simbolEksporBasisdata, buatEksporBasisdata } from './basisdata';
import { simbolEksporWeb, buatEksporWeb } from './web';
import { simbolEksporAutentikasi, buatEksporAutentikasi } from './autentikasi';
import { simbolEksporORM, buatEksporORM } from './orm';
import { simbolEksporRealtime, buatEksporRealtime } from './realtime';

export * from './teks';
export * from './matematika';
export * from './konversi';
export * from './waktu';
export * from './acak';
export * from './koleksi';
export * from './berkas';
export * from './sistem';
export * from './uji';
export * from './jalur';
export * from './json';
export * from './lingkungan';
export * from './proses';
export * from './jaringan';
export * from './kripto';
export * from './basisdata';
export * from './web';
export * from './autentikasi';
export * from './orm';
export * from './realtime';

export interface MetadataModulStandar {
  nama: string;
  deskripsi: string;
  simbolEkspor: Map<string, InfoSimbolModul>;
  pabrikEkspor: (opsi?: any) => Map<string, NilaiRuntime>;
}

export const KATALOG_MODUL_STANDAR: Record<string, MetadataModulStandar> = {
  teks: {
    nama: 'teks',
    deskripsi: 'Manipulasi string, pemotongan, penggabungan, pencarian, dan konversi huruf kapital/kecil.',
    simbolEkspor: simbolEksporTeks,
    pabrikEkspor: () => buatEksporTeks(),
  },
  matematika: {
    nama: 'matematika',
    deskripsi: 'Kalkulasi matematika numerik, konstanta PI & E, trigonometri dasar, pembulatan, pangkat, dan akar.',
    simbolEkspor: simbolEksporMatematika,
    pabrikEkspor: () => buatEksporMatematika(),
  },
  konversi: {
    nama: 'konversi',
    deskripsi: 'Konversi tipe data eksplisit (ke teks, bilangan, desimal, bulat, logika) yang aman dan teruji.',
    simbolEkspor: simbolEksporKonversi,
    pabrikEkspor: () => buatEksporKonversi(),
  },
  waktu: {
    nama: 'waktu',
    deskripsi: 'Akses waktu dan tanggal sekarang, timestamp presisi milidetik, jam, menit, detik, dan pemformatan.',
    simbolEkspor: simbolEksporWaktu,
    pabrikEkspor: () => buatEksporWaktu(),
  },
  acak: {
    nama: 'acak',
    deskripsi: 'Pembangkit bilangan acak pseudorandom, desimal antara 0..1, bilangan dalam rentang, dan pemilihan acak dari daftar.',
    simbolEkspor: simbolEksporAcak,
    pabrikEkspor: () => buatEksporAcak(),
  },
  koleksi: {
    nama: 'koleksi',
    deskripsi: 'Operasi tingkat lanjut pada struktur data daftar dan peta: pengurutan, pembalikan, pencarian, dan pengirisan.',
    simbolEkspor: simbolEksporKoleksi,
    pabrikEkspor: () => buatEksporKoleksi(),
  },
  berkas: {
    nama: 'berkas',
    deskripsi: 'Operasi I/O berkas teks terisolasi dengan perlindungan keamanan Sandbox (pembacaan, penulisan, penambahan, dan direktori).',
    simbolEkspor: simbolEksporBerkas,
    pabrikEkspor: (opsi?: { sandboxBerkas?: SandboxBerkas }) =>
      buatEksporBerkas(opsi?.sandboxBerkas || sandboxBerkasGlobal),
  },
  sistem: {
    nama: 'sistem',
    deskripsi: 'Informasi platform host, arsitektur CPU, versi resmi Nusantara, argumen baris perintah, dan variabel lingkungan.',
    simbolEkspor: simbolEksporSistem,
    pabrikEkspor: (opsi?: { argumenCLI?: string[]; envOverrides?: Record<string, string> }) =>
      buatEksporSistem(opsi?.argumenCLI, opsi?.envOverrides),
  },
  uji: {
    nama: 'uji',
    deskripsi: 'Modul pengujian resmi NUSANTARA: penegasan nilai (pastikan, pastikanSama, pastikanTidakSama, pastikanBenar, pastikanSalah).',
    simbolEkspor: simbolEksporUji,
    pabrikEkspor: () => buatEksporUji(),
  },
  jalur: {
    nama: 'jalur',
    deskripsi: 'Manipulasi jalur berkas (path) lintas platform: gabung, normalisasi, ekstensi, direktori induk, nama berkas.',
    simbolEkspor: simbolEksporJalur,
    pabrikEkspor: () => buatEksporJalur(),
  },
  json: {
    nama: 'json',
    deskripsi: 'Penguraian dan serialisasi format JSON aman dengan pemetaan tipe data resmi NUSANTARA.',
    simbolEkspor: simbolEksporJson,
    pabrikEkspor: () => buatEksporJson(),
  },
  lingkungan: {
    nama: 'lingkungan',
    deskripsi: 'Akses dan manipulasi variabel lingkungan proses, pemeriksaan keberadaan, dan direktori kerja.',
    simbolEkspor: simbolEksporLingkungan,
    pabrikEkspor: (opsi?: { envOverrides?: Record<string, string> }) =>
      buatEksporLingkungan(opsi?.envOverrides),
  },
  proses: {
    nama: 'proses',
    deskripsi: 'Eksekusi sub-proses terisolasi dengan larik argumen aman (pencegahan injeksi perintah shell).',
    simbolEkspor: simbolEksporProses,
    pabrikEkspor: () => buatEksporProses(),
  },
  jaringan: {
    nama: 'jaringan',
    deskripsi: 'Klien HTTP terpadu (GET dan POST) dengan penanganan status, header kustom, dan timeout aman.',
    simbolEkspor: simbolEksporJaringan,
    pabrikEkspor: () => buatEksporJaringan(),
  },
  kripto: {
    nama: 'kripto',
    deskripsi: 'Fungsi kriptografi resmi: hashing SHA-256 & MD5, CSPRNG bilangan dan byte acak, pembandingan waktu konstan.',
    simbolEkspor: simbolEksporKripto,
    pabrikEkspor: () => buatEksporKripto(),
  },
  basisdata: {
    nama: 'basisdata',
    deskripsi: 'Akses dan manipulasi basis data SQL terpadu (SQLite, DDL, DML, transaksi, prepared statements, dan proteksi injeksi).',
    simbolEkspor: simbolEksporBasisdata,
    pabrikEkspor: () => buatEksporBasisdata(),
  },
  database: {
    nama: 'database',
    deskripsi: 'Alias resmi modul basisdata untuk akses basis data SQL (SQLite, DDL, DML, transaksi, dan prepared statements).',
    simbolEkspor: simbolEksporBasisdata,
    pabrikEkspor: () => buatEksporBasisdata(),
  },
  web: {
    nama: 'web',
    deskripsi: 'Web Application Framework NUSANTARA (HTTP server, router dinamis, request/response API, middleware, berkas statis, template HTML aman, dan REST API).',
    simbolEkspor: simbolEksporWeb,
    pabrikEkspor: () => buatEksporWeb(),
  },
  http: {
    nama: 'http',
    deskripsi: 'Alias resmi modul web untuk pembangunan aplikasi web dan REST API di NUSANTARA.',
    simbolEkspor: simbolEksporWeb,
    pabrikEkspor: () => buatEksporWeb(),
  },
  autentikasi: {
    nama: 'autentikasi',
    deskripsi: 'Autentikasi, manajemen sesi, keamanan password (Scrypt), RBAC, CSRF, dan kontrol akses NUSANTARA.',
    simbolEkspor: simbolEksporAutentikasi,
    pabrikEkspor: () => buatEksporAutentikasi(),
  },
  auth: {
    nama: 'auth',
    deskripsi: 'Alias resmi modul autentikasi untuk manajemen akun pengguna, sesi, dan otorisasi.',
    simbolEkspor: simbolEksporAutentikasi,
    pabrikEkspor: () => buatEksporAutentikasi(),
  },
  orm: {
    nama: 'orm',
    deskripsi: 'Object-Relational Mapping (ORM), Query Builder, Model Database, dan Skema Migrasi NUSANTARA.',
    simbolEkspor: simbolEksporORM,
    pabrikEkspor: () => buatEksporORM(),
  },
  migrasi: {
    nama: 'migrasi',
    deskripsi: 'Alias resmi modul orm untuk migrasi dan skema basis data NUSANTARA.',
    simbolEkspor: simbolEksporORM,
    pabrikEkspor: () => buatEksporORM(),
  },
  migration: {
    nama: 'migration',
    deskripsi: 'Alias resmi modul orm untuk migrasi skema basis data.',
    simbolEkspor: simbolEksporORM,
    pabrikEkspor: () => buatEksporORM(),
  },
  realtime: {
    nama: 'realtime',
    deskripsi: 'Sistem peristiwa real-time, event bus, antrean tugas latar belakang, dan pekerja background NUSANTARA.',
    simbolEkspor: simbolEksporRealtime,
    pabrikEkspor: () => buatEksporRealtime(),
  },
  event: {
    nama: 'event',
    deskripsi: 'Alias resmi modul realtime untuk bus peristiwa dan pub-sub event listener.',
    simbolEkspor: simbolEksporRealtime,
    pabrikEkspor: () => buatEksporRealtime(),
  },
  antrean: {
    nama: 'antrean',
    deskripsi: 'Alias resmi modul realtime untuk antrean pekerjaan latar belakang (task queue).',
    simbolEkspor: simbolEksporRealtime,
    pabrikEkspor: () => buatEksporRealtime(),
  },
  queue: {
    nama: 'queue',
    deskripsi: 'Alias resmi modul realtime untuk background task queue.',
    simbolEkspor: simbolEksporRealtime,
    pabrikEkspor: () => buatEksporRealtime(),
  },
};

/**
 * Memeriksa apakah nama modul yang diminta merupakan modul resmi standard library NUSANTARA.
 */
export function apakahModulStandar(namaAtauJalur: string): boolean {
  return normalisasiNamaModulStandar(namaAtauJalur) !== undefined;
}

/**
 * Menormalisasi string referensi modul menjadi nama modul standar murni.
 * Mendukung format: "teks", "std:teks", "stdlib:teks", "nusantara:teks", "std/teks", "stdlib/teks".
 */
export function normalisasiNamaModulStandar(namaAtauJalur: string): string | undefined {
  let bersih = namaAtauJalur.trim();
  if (bersih.startsWith('"') && bersih.endsWith('"')) {
    bersih = bersih.slice(1, -1).trim();
  }
  if (bersih.startsWith("'") && bersih.endsWith("'")) {
    bersih = bersih.slice(1, -1).trim();
  }

  // Jangan tangani jalur relatif lokal sebagai stdlib kecuali ber-prefix std:
  const berAwalanJalurLokal =
    bersih.startsWith('./') ||
    bersih.startsWith('.\\') ||
    bersih.startsWith('../') ||
    bersih.startsWith('..\\');

  // Hilangkan prefix resmi jika ada
  const prefixDikenal = ['std:', 'stdlib:', 'nusantara:', 'std/', 'stdlib/', 'nusantara/'];
  let adaPrefixResmi = false;
  for (const p of prefixDikenal) {
    if (bersih.startsWith(p)) {
      bersih = bersih.slice(p.length).trim();
      adaPrefixResmi = true;
      break;
    }
  }

  if (berAwalanJalurLokal && !adaPrefixResmi) {
    return undefined;
  }

  // Hilangkan ekstensi .nusantara jika ada
  if (bersih.endsWith('.nusantara')) {
    bersih = bersih.replace(/\.nusantara$/, '');
  }

  if (Object.prototype.hasOwnProperty.call(KATALOG_MODUL_STANDAR, bersih)) {
    return bersih;
  }
  return undefined;
}

export const DAFTAR_MODUL_STANDAR_INTI = [
  'teks',
  'matematika',
  'konversi',
  'waktu',
  'acak',
  'koleksi',
  'berkas',
  'sistem',
];

export const DAFTAR_MODUL_STANDAR_FASE28 = [
  'jalur',
  'json',
  'lingkungan',
  'proses',
  'jaringan',
  'kripto',
];

export const DAFTAR_MODUL_STANDAR_FASE29 = [
  'basisdata',
  'database',
];

export const DAFTAR_MODUL_STANDAR_FASE30 = [
  'web',
  'http',
];

export const DAFTAR_MODUL_STANDAR_FASE31 = [
  'autentikasi',
  'auth',
];

export const DAFTAR_SEMUA_MODUL_STANDAR = [
  ...DAFTAR_MODUL_STANDAR_INTI,
  ...DAFTAR_MODUL_STANDAR_FASE28,
  ...DAFTAR_MODUL_STANDAR_FASE29,
  ...DAFTAR_MODUL_STANDAR_FASE30,
  ...DAFTAR_MODUL_STANDAR_FASE31,
];

/**
 * Mengembalikan seluruh nama modul standar resmi yang tersedia (8 modul inti Phase 17).
 */
export function dapatkanDaftarNamaModulStandar(sertakanPengujian: boolean = false): string[] {
  if (sertakanPengujian) {
    return Object.keys(KATALOG_MODUL_STANDAR);
  }
  return [...DAFTAR_MODUL_STANDAR_INTI];
}

/**
 * Mengembalikan seluruh modul standar resmi NUSANTARA termasuk ekspansi Phase 28.
 */
export function dapatkanSemuaModulStandar(): string[] {
  return [...DAFTAR_SEMUA_MODUL_STANDAR];
}

/**
 * Membuat catatan modul runtime (CatatanModul) untuk modul standar.
 */
export function buatCatatanModulStandar(
  namaStandar: string,
  opsi?: {
    sandboxBerkas?: SandboxBerkas;
    argumenCLI?: string[];
    envOverrides?: Record<string, string>;
  }
): CatatanModul {
  const meta = KATALOG_MODUL_STANDAR[namaStandar];
  if (!meta) {
    throw new Error(`Modul standar '${namaStandar}' tidak terdaftar dalam Standard Library Nusantara.`);
  }

  const ekspor = meta.pabrikEkspor(opsi);
  const lingkungan = new Lingkungan();

  for (const [k, v] of ekspor.entries()) {
    lingkungan.definisikan(k, v, true);
  }

  return {
    id: `stdlib:${namaStandar}`,
    nama: namaStandar,
    jalurBerkas: `<stdlib:${namaStandar}>`,
    status: StatusPemuatanModul.SUDAH_DIMUAT,
    ekspor,
    simbolEkspor: new Map(meta.simbolEkspor),
    simbolInternal: new Set<string>(),
    lingkungan,
  };
}
