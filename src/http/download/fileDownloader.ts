/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Pengunduh Berkas Aman (File Downloader with Path Traversal Protection)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { KlienHTTP } from '../client/httpClient';
import { OpsiUnduhBerkas } from '../types';
import { GalatTransferBerkasHTTP, GalatStatusHTTP } from '../errors/httpError';

export interface KonfigurasiPengunduh {
  direktoriTujuan?: string;
  batasUkuranBytes?: number;
  maksimalUkuranByte?: number;
}

export class PengunduhBerkas {
  constructor(
    private readonly klien: KlienHTTP,
    private readonly konfigurasi?: KonfigurasiPengunduh
  ) {}

  /**
   * Mengunduh file dari URL ke lokasi penyimpanan lokal secara aman.
   */
  public async unduh(
    arg0: string | OpsiUnduhBerkas,
    opsiTambahan?: {
      namaBerkasTujuan?: string;
      jalurTujuan?: string;
      timpaJikaAda?: boolean;
      lanjutkanJikaAda?: boolean;
      padaProgres?: (terunduh: number, total?: number) => void;
      headers?: Record<string, string>;
      [key: string]: any;
    }
  ): Promise<{
    jalurBerkas: string;
    jalurTersimpan: string;
    totalBytes: number;
    status: number;
    durasiMs: number;
  }> {
    const waktuMulai = Date.now();

    let opsi: OpsiUnduhBerkas;
    if (typeof arg0 === 'string') {
      const nama = opsiTambahan?.namaBerkasTujuan || opsiTambahan?.jalurTujuan || 'unduhan.dat';
      // Cek langsung path traversal pada nama berkas tujuan sebelum digabungkan
      if (nama.includes('..') || /(^|[\\/])\.\.([\\/]|$)/.test(nama)) {
        throw new GalatTransferBerkasHTTP(`Path traversal terdeteksi pada nama berkas: '${nama}'.`);
      }

      const jalurTarget = this.konfigurasi?.direktoriTujuan
        ? path.join(this.konfigurasi.direktoriTujuan, nama)
        : nama;

      opsi = {
        url: arg0,
        jalurTujuan: jalurTarget,
        timpaJikaAda: opsiTambahan?.timpaJikaAda,
        lanjutkanJikaAda: opsiTambahan?.lanjutkanJikaAda,
        padaProgres: opsiTambahan?.padaProgres,
        headers: opsiTambahan?.headers,
        batasUkuranBytes: opsiTambahan?.batasUkuranBytes ?? this.konfigurasi?.batasUkuranBytes ?? this.konfigurasi?.maksimalUkuranByte,
      };
    } else {
      opsi = arg0;
    }

    const jalurAman = this.validasiDanAmankanJalur(opsi.jalurTujuan);

    // Cek apakah file sudah ada
    if (fs.existsSync(jalurAman) && !opsi.timpaJikaAda && !opsi.lanjutkanJikaAda) {
      throw new GalatTransferBerkasHTTP(
        `Berkas tujuan '${jalurAman}' sudah ada. Gunakan opsi 'timpaJikaAda' untuk menimpa berkas.`
      );
    }

    // Pastikan direktori induk tersedia
    const dirInduk = path.dirname(jalurAman);
    if (!fs.existsSync(dirInduk)) {
      fs.mkdirSync(dirInduk, { recursive: true });
    }

    // Persiapkan header Range jika ingin melanjutkan unduhan (Resume)
    let bytesAwal = 0;
    const headersUnduh: Record<string, string> = {};
    if (opsi.lanjutkanJikaAda && fs.existsSync(jalurAman)) {
      const stats = fs.statSync(jalurAman);
      bytesAwal = stats.size;
      headersUnduh['Range'] = `bytes=${bytesAwal}-`;
    }

    if (!opsi.url) {
      throw new GalatTransferBerkasHTTP("URL unduhan wajib ditentukan.");
    }

    const respon = await this.klien.get(opsi.url, {
      ...opsi,
      headers: { ...(opsi.headers as any), ...headersUnduh },
    });

    if (respon.status !== 200 && respon.status !== 206) {
      throw new GalatStatusHTTP(
        respon.status,
        respon.statusTeks,
        respon.teks(),
        opsi.url
      );
    }

    const buffer = respon.buffer();
    const batasUkuran = opsi.batasUkuranBytes ?? this.konfigurasi?.batasUkuranBytes ?? this.konfigurasi?.maksimalUkuranByte ?? (100 * 1024 * 1024);

    if (bytesAwal + buffer.length > batasUkuran) {
      throw new GalatTransferBerkasHTTP(
        `Ukuran berkas (${bytesAwal + buffer.length} bytes) melebihi batas unduhan yang diizinkan (${batasUkuran} bytes).`
      );
    }

    // Tulis ke file temporer terlebih dahulu untuk integritas atomik
    const jalurTemp = `${jalurAman}.part.${Date.now()}`;
    try {
      if (bytesAwal > 0 && opsi.lanjutkanJikaAda) {
        fs.appendFileSync(jalurAman, buffer);
      } else {
        fs.writeFileSync(jalurTemp, buffer);
        fs.renameSync(jalurTemp, jalurAman);
      }

      const totalTersimpan = bytesAwal + buffer.length;
      if (opsi.padaProgres) {
        opsi.padaProgres(totalTersimpan, totalTersimpan);
      }

      return {
        jalurBerkas: jalurAman,
        jalurTersimpan: jalurAman,
        totalBytes: totalTersimpan,
        status: respon.status,
        durasiMs: Date.now() - waktuMulai,
      };
    } catch (err: any) {
      if (fs.existsSync(jalurTemp)) {
        try { fs.unlinkSync(jalurTemp); } catch {}
      }
      throw new GalatTransferBerkasHTTP(`Gagal menyimpan berkas unduhan: ${err.message}`, err);
    }
  }

  /**
   * Mencegah serangan Path Traversal (../, null byte injection, root path escape).
   */
  public validasiDanAmankanJalur(jalurMentah: string): string {
    if (!jalurMentah || typeof jalurMentah !== 'string') {
      throw new GalatTransferBerkasHTTP("Jalur tujuan berkas wajib ditentukan.");
    }

    if (jalurMentah.includes('\0')) {
      throw new GalatTransferBerkasHTTP("Jalur berkas mengandung null byte injection.");
    }

    const jalurNormal = path.normalize(jalurMentah);
    // Mencegah traversal direktori keluar batas aman
    if (jalurNormal.startsWith('..') || /(^|[\\/])\.\.([\\/]|$)/.test(jalurNormal) || jalurMentah.includes('..')) {
      throw new GalatTransferBerkasHTTP(
        `Path traversal terdeteksi pada jalur: '${jalurMentah}'.`
      );
    }

    // Resolusi ke absolut
    return path.resolve(process.cwd(), jalurNormal);
  }
}
