/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Pengunggah Berkas Aman (File Uploader with Multipart/Form-Data)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { KlienHTTP } from '../client/httpClient';
import { OpsiUnggahBerkas, BagianMultipart, ResponHTTPInterface } from '../types';
import { GalatTransferBerkasHTTP } from '../errors/httpError';

export interface KonfigurasiPengunggah {
  direktoriBasis?: string;
}

export class PengunggahBerkas {
  constructor(
    private readonly klien: KlienHTTP,
    private readonly konfigurasi?: KonfigurasiPengunggah
  ) {}

  /**
   * Mengunggah file lokal ke endpoint HTTP menggunakan format multipart/form-data.
   */
  public async unggah(
    arg0: string | OpsiUnggahBerkas,
    opsiTambahan?: {
      jalurBerkas: string;
      namaField?: string;
      tipeKonten?: string;
      mimeType?: string;
      namaBerkasKustom?: string;
      fieldTambahan?: Record<string, any>;
      padaProgres?: (terunggah: number, total: number) => void;
      headers?: Record<string, string>;
      [key: string]: any;
    }
  ): Promise<ResponHTTPInterface> {
    let opsi: OpsiUnggahBerkas;
    if (typeof arg0 === 'string') {
      if (!opsiTambahan || !opsiTambahan.jalurBerkas) {
        throw new GalatTransferBerkasHTTP("Opsi 'jalurBerkas' wajib diisi untuk unggahan.");
      }
      opsi = {
        url: arg0,
        jalurBerkas: opsiTambahan.jalurBerkas,
        namaField: opsiTambahan.namaField,
        mimeType: opsiTambahan.tipeKonten || opsiTambahan.mimeType,
        namaBerkasKustom: opsiTambahan.namaBerkasKustom,
        fieldTambahan: opsiTambahan.fieldTambahan,
        padaProgres: opsiTambahan.padaProgres,
        headers: opsiTambahan.headers,
      };
    } else {
      opsi = arg0;
    }

    const jalurAman = this.validasiJalurBerkas(opsi.jalurBerkas);

    if (!fs.existsSync(jalurAman)) {
      throw new GalatTransferBerkasHTTP(`Berkas lokal tidak ditemukan pada jalur: '${jalurAman}'.`);
    }

    const stat = fs.statSync(jalurAman);
    if (!stat.isFile()) {
      throw new GalatTransferBerkasHTTP(`Target bukan merupakan berkas reguler: '${jalurAman}'.`);
    }

    const namaBerkas = opsi.namaBerkasKustom || path.basename(jalurAman);
    const mimeType = opsi.mimeType || this.tebakMimeType(namaBerkas);
    const namaField = opsi.namaField || 'file';

    const isiBerkas = fs.readFileSync(jalurAman);

    if (opsi.padaProgres) {
      opsi.padaProgres(0, isiBerkas.length);
    }

    const bagian: BagianMultipart[] = [
      {
        nama: namaField,
        nilai: isiBerkas,
        namaBerkas,
        mimeType,
      },
    ];

    // Tambahkan field form lainnya jika ada
    if (opsi.fieldTambahan) {
      for (const [k, v] of Object.entries(opsi.fieldTambahan)) {
        bagian.push({ nama: k, nilai: v });
      }
    }

    if (!opsi.url) {
      throw new GalatTransferBerkasHTTP("URL unggahan wajib ditentukan.");
    }

    const respon = await this.klien.post(opsi.url, bagian, {
      ...opsi,
      tipeBody: 'multipart',
    });

    if (opsi.padaProgres) {
      opsi.padaProgres(isiBerkas.length, isiBerkas.length);
    }

    return respon;
  }

  private validasiJalurBerkas(jalur: string): string {
    if (!jalur || typeof jalur !== 'string') {
      throw new GalatTransferBerkasHTTP("Jalur berkas unggahan wajib ditentukan.");
    }
    if (jalur.includes('\0')) {
      throw new GalatTransferBerkasHTTP("Jalur berkas mengandung karakter tidak valid.");
    }

    if (this.konfigurasi?.direktoriBasis && !path.isAbsolute(jalur)) {
      return path.resolve(this.konfigurasi.direktoriBasis, jalur);
    }

    return path.resolve(process.cwd(), jalur);
  }

  private tebakMimeType(namaBerkas: string): string {
    const ext = path.extname(namaBerkas).toLowerCase();
    switch (ext) {
      case '.json': return 'application/json';
      case '.txt': return 'text/plain';
      case '.csv': return 'text/csv';
      case '.html': return 'text/html';
      case '.png': return 'image/png';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.gif': return 'image/gif';
      case '.pdf': return 'application/pdf';
      case '.zip': return 'application/zip';
      case '.nusantara': return 'text/x-nusantara';
      default: return 'application/octet-stream';
    }
  }
}
