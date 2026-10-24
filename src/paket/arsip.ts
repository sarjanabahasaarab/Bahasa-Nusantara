/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas } from '../modul/pembacaBerkas';
import { ManifestPaket, bacaManifest } from './manifest';
import { hitungChecksum } from './lockfile';
import { GalatKeamananPaket } from './keamanan';

export const HEADER_FORMAT_NPK = 'nusantara-npk-v1';

export interface HeaderArsipPaket {
  format: 'nusantara-npk-v1';
  nama: string;
  versi: string;
  deskripsi: string;
  lisensi: string;
  penulis?: string | string[];
  waktuDibuat: string;
  totalBerkas: number;
  totalUkuranByte: number;
  checksum: string;
}

export interface ArsipPaketData {
  header: HeaderArsipPaket;
  berkas: Record<string, string>; // jalur relatif -> isi berkas
  kontenSerial: string;
  checksum: string;
}

export class GalatArsipPaket extends Error {
  constructor(pesan: string) {
    super(`Kesalahan arsip paket NUSANTARA (.npk):\n${pesan}`);
    this.name = 'GalatArsipPaket';
  }
}

/**
 * Memvalidasi apakah sebuah jalur berkas dalam arsip aman dari serangan Path Traversal.
 * Menolak traversal ('..'), jalur absolut ('/', '\', 'C:\'), dan karakter kontrol/null byte.
 */
export function validasiJalurArsip(jalurRelatif: string): void {
  const bersih = jalurRelatif.trim();

  if (!bersih) {
    throw new GalatKeamananPaket(`Jalur berkas dalam arsip tidak boleh kosong.`);
  }

  if (bersih.includes('\0')) {
    throw new GalatKeamananPaket(`Jalur berkas '${bersih}' mengandung null byte yang berbahaya.`);
  }

  // Standarisasi pemisah jalur
  const pemisah = bersih.replace(/\\/g, '/');

  // Tolak jalur absolut
  if (pemisah.startsWith('/') || /^[a-zA-Z]:/.test(pemisah)) {
    throw new GalatKeamananPaket(
      `Jalur berkas '${jalurRelatif}' ditolak: jalur absolut dilarang dalam arsip paket demi keamanan sistem.`
    );
  }

  // Periksa segmen jalur untuk '..'
  const segmen = pemisah.split('/');
  for (const s of segmen) {
    if (s === '..') {
      throw new GalatKeamananPaket(
        `Jalur berkas '${jalurRelatif}' ditolak: terdeteksi percobaan Archive Traversal ('..').`
      );
    }
  }
}

/**
 * Daftar pola nama berkas dan direktori yang WAJIB diabaikan saat membuat arsip paket.
 */
export const DAFTAR_ABAIKAN_ARSIP = [
  '.git',
  '.aistudio',
  'node_modules',
  'dist',
  'build',
  'cache',
  '.nusantara',
  '.env',
  '.env.local',
  '.env.production',
  'id_rsa',
  'id_ed25519',
  'nusantara.lock',
];

/**
 * Memeriksa apakah suatu berkas atau direktori harus diabaikan saat pembungkusan arsip.
 */
export function apakahHarusDiabaikan(jalurRelatif: string): boolean {
  const norm = jalurRelatif.replace(/\\/g, '/').replace(/^\/+/, '');
  const segmen = norm.split('/');

  for (const item of DAFTAR_ABAIKAN_ARSIP) {
    if (segmen.includes(item)) return true;
    if (norm.endsWith('/' + item) || norm === item) return true;
    if (norm.endsWith('.key') || norm.endsWith('.pem') || norm.endsWith('.npk')) return true;
  }

  return false;
}

/**
 * Mengemas berkas-berkas proyek menjadi objek arsip paket NUSANTARA (.npk)
 * lengkap dengan metadata header dan checksum integritas SHA-256.
 */
export function buatArsipPaket(
  manifest: ManifestPaket,
  daftarBerkas: Record<string, string>
): ArsipPaketData {
  const berkasBersih: Record<string, string> = {};
  let totalUkuranByte = 0;

  // Pastikan nusantara.toml termuat dalam arsip
  for (const [jalur, konten] of Object.entries(daftarBerkas)) {
    if (apakahHarusDiabaikan(jalur)) {
      continue;
    }

    validasiJalurArsip(jalur);
    const normJalur = jalur.replace(/\\/g, '/').replace(/^\/+/, '');
    berkasBersih[normJalur] = konten;
    totalUkuranByte += Buffer.from ? Buffer.from(konten, 'utf-8').length : konten.length;
  }

  // Urutkan kunci berkas secara deterministik untuk stabilitas hash checksum
  const kunciUrut = Object.keys(berkasBersih).sort();
  const berkasTerurut: Record<string, string> = {};
  for (const k of kunciUrut) {
    berkasTerurut[k] = berkasBersih[k];
  }

  // Hitung payload serial deterministik untuk kalkulasi checksum
  const payloadSerial = JSON.stringify({
    nama: manifest.nusantara.nama,
    versi: manifest.nusantara.versi,
    berkas: berkasTerurut,
  });

  const checksum = hitungChecksum(payloadSerial);

  const header: HeaderArsipPaket = {
    format: HEADER_FORMAT_NPK,
    nama: manifest.nusantara.nama,
    versi: manifest.nusantara.versi,
    deskripsi: manifest.nusantara.deskripsi,
    lisensi: manifest.nusantara.lisensi,
    penulis: manifest.nusantara.penulis,
    waktuDibuat: new Date().toISOString(),
    totalBerkas: kunciUrut.length,
    totalUkuranByte,
    checksum,
  };

  const arsipLengkap = {
    header,
    berkas: berkasTerurut,
  };

  const kontenSerial = JSON.stringify(arsipLengkap, null, 2);

  return {
    header,
    berkas: berkasTerurut,
    kontenSerial,
    checksum,
  };
}

/**
 * Mengurai string arsip paket .npk dan memvalidasi keaslian serta integritasnya.
 */
export function uraiArsipPaket(kontenSerial: string): ArsipPaketData {
  let data: any;
  try {
    data = JSON.parse(kontenSerial);
  } catch (err: any) {
    throw new GalatArsipPaket(`Format arsip tidak valid atau korup: ${err.message}`);
  }

  if (!data || typeof data !== 'object') {
    throw new GalatArsipPaket(`Data arsip kosong atau tidak berformat JSON valid.`);
  }

  if (!data.header || data.header.format !== HEADER_FORMAT_NPK) {
    throw new GalatArsipPaket(
      `Format arsip '${data?.header?.format || 'tidak dikenal'}' tidak didukung. Diharapkan '${HEADER_FORMAT_NPK}'.`
    );
  }

  if (!data.berkas || typeof data.berkas !== 'object') {
    throw new GalatArsipPaket(`Arsip tidak menyertakan daftar berkas paket yang valid.`);
  }

  // Validasi seluruh jalur berkas terhadap traversal
  for (const jalur of Object.keys(data.berkas)) {
    validasiJalurArsip(jalur);
  }

  // Verifikasi integritas checksum
  const kunciUrut = Object.keys(data.berkas).sort();
  const berkasTerurut: Record<string, string> = {};
  for (const k of kunciUrut) {
    berkasTerurut[k] = data.berkas[k];
  }

  const payloadUji = JSON.stringify({
    nama: data.header.nama,
    versi: data.header.versi,
    berkas: berkasTerurut,
  });

  const checksumAktual = hitungChecksum(payloadUji);
  if (data.header.checksum && data.header.checksum !== checksumAktual) {
    throw new GalatArsipPaket(
      `Verifikasi integritas arsip gagal (Checksum Mismatch)!\nDiharapkan: ${data.header.checksum}\nAktual    : ${checksumAktual}`
    );
  }

  return {
    header: data.header,
    berkas: berkasTerurut,
    kontenSerial,
    checksum: data.header.checksum || checksumAktual,
  };
}

/**
 * Mengekstrak seluruh berkas dari arsip paket ke dalam direktori tujuan yang aman.
 */
export function ekstrakArsipPaket(
  arsip: ArsipPaketData,
  pembaca: PembacaBerkas,
  direktoriTujuan: string
): string[] {
  const berkasDibuat: string[] = [];

  for (const [jalurRelatif, konten] of Object.entries(arsip.berkas)) {
    validasiJalurArsip(jalurRelatif);

    const jalurTujuan = pembaca.gabungJalur(direktoriTujuan, jalurRelatif);
    const dirInduk = pembaca.direktoriDari(jalurTujuan);

    // Buat direktori induk jika didukung
    if (typeof (pembaca as any).buatDirektori === 'function') {
      (pembaca as any).buatDirektori(dirInduk);
    }

    if (typeof (pembaca as any).tulis === 'function') {
      (pembaca as any).tulis(jalurTujuan, konten);
    } else if (typeof (pembaca as any).tulisBerkas === 'function') {
      (pembaca as any).tulisBerkas(jalurTujuan, konten);
    }

    berkasDibuat.push(jalurTujuan);
  }

  return berkasDibuat;
}
