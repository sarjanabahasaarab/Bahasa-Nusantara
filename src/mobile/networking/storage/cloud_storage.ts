/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Abstraksi Cloud Storage & Pengelola Transfer Berkas Mobile (Mobile Cloud Storage & File Transfer)
 */

import * as crypto from 'node:crypto';
import {
  HasilTransferBerkas,
  MetadataBerkasCloud,
  OpsiUnggahCloud,
} from '../types';
import { LapisanKeamananMobile } from '../security/cloud_security';

export interface PenyediaStorageNetral {
  readonly namaPenyedia: string;
  unggah(opsi: OpsiUnggahCloud): Promise<HasilTransferBerkas>;
  unduh(urlAtauId: string): Promise<{ sukses: boolean; data?: Buffer | string; mimeType?: string; galat?: string }>;
  hapus(urlAtauId: string): Promise<boolean>;
  dapatkanMetadata(urlAtauId: string): Promise<MetadataBerkasCloud | null>;
  daftarBerkas(folder?: string): Promise<MetadataBerkasCloud[]>;
}

/**
 * Adaptor Mock Storage untuk Pengujian Unit & Offline Simulator
 */
export class AdaptorStorageMock implements PenyediaStorageNetral {
  public readonly namaPenyedia = 'mock_local';
  private berkasPeta: Map<string, { meta: MetadataBerkasCloud; konten: string | Buffer }> = new Map();

  public async unggah(opsi: OpsiUnggahCloud): Promise<HasilTransferBerkas> {
    const namaAman = LapisanKeamananMobile.amankanNamaBerkas(opsi.namaBerkas);
    if (!namaAman) {
      return { sukses: false, galat: 'Nama berkas tidak valid atau memuat path traversal.', stempelWaktu: Date.now() };
    }

    const ukuran = typeof opsi.konten === 'string' ? Buffer.byteLength(opsi.konten, 'utf8') : opsi.konten.length;
    // Batas mobile 50 MB
    if (ukuran > 50 * 1024 * 1024) {
      return { sukses: false, galat: 'Ukuran berkas melebihi batas 50 MB.', stempelWaktu: Date.now() };
    }

    // Simulasi progres transfer jika ada callback
    if (opsi.padaProgres) {
      opsi.padaProgres(25, Math.floor(ukuran * 0.25), ukuran);
      opsi.padaProgres(75, Math.floor(ukuran * 0.75), ukuran);
      opsi.padaProgres(100, ukuran, ukuran);
    }

    let randomPart = '';
    try {
      if (typeof (crypto as any)?.randomBytes === 'function') {
        randomPart = (crypto as any).randomBytes(4).toString('hex');
      }
    } catch {
      // Abaikan jika di browser
    }
    if (!randomPart) {
      randomPart = Math.random().toString(16).substring(2, 10);
    }
    const id = `file_${Date.now()}_${randomPart}`;
    const folder = opsi.folder || 'publik';
    const mimeType = opsi.mimeType || 'application/octet-stream';
    let etag = '';
    try {
      if (typeof (crypto as any)?.createHash === 'function') {
        etag = (crypto as any).createHash('md5').update(opsi.konten).digest('hex');
      }
    } catch {
      // Abaikan jika di browser
    }
    if (!etag) {
      etag = `etag_${Date.now()}_${randomPart}`;
    }

    const meta: MetadataBerkasCloud = {
      id,
      nama: namaAman,
      ukuran,
      mimeType,
      folder,
      url: `https://storage.nusantara.internal/${folder}/${id}/${namaAman}`,
      dibuatPada: new Date().toISOString(),
      etag,
      metaKustom: opsi.metadata,
    };

    this.berkasPeta.set(id, { meta, konten: opsi.konten });

    return {
      sukses: true,
      berkas: meta,
      stempelWaktu: Date.now(),
    };
  }

  public async unduh(urlAtauId: string): Promise<{ sukses: boolean; data?: Buffer | string; mimeType?: string; galat?: string }> {
    let item = this.berkasPeta.get(urlAtauId);
    if (!item) {
      for (const val of this.berkasPeta.values()) {
        if (val.meta.url === urlAtauId) {
          item = val;
          break;
        }
      }
    }

    if (!item) {
      return { sukses: false, galat: 'Berkas tidak ditemukan di cloud storage.' };
    }

    return {
      sukses: true,
      data: item.konten,
      mimeType: item.meta.mimeType,
    };
  }

  public async hapus(urlAtauId: string): Promise<boolean> {
    if (this.berkasPeta.has(urlAtauId)) {
      return this.berkasPeta.delete(urlAtauId);
    }
    for (const [k, v] of this.berkasPeta.entries()) {
      if (v.meta.url === urlAtauId) {
        return this.berkasPeta.delete(k);
      }
    }
    return false;
  }

  public async dapatkanMetadata(urlAtauId: string): Promise<MetadataBerkasCloud | null> {
    const item = this.berkasPeta.get(urlAtauId);
    if (item) return { ...item.meta };
    for (const val of this.berkasPeta.values()) {
      if (val.meta.url === urlAtauId) {
        return { ...val.meta };
      }
    }
    return null;
  }

  public async daftarBerkas(folder?: string): Promise<MetadataBerkasCloud[]> {
    const hasil: MetadataBerkasCloud[] = [];
    for (const v of this.berkasPeta.values()) {
      if (!folder || v.meta.folder === folder) {
        hasil.push({ ...v.meta });
      }
    }
    return hasil;
  }
}

/**
 * Adaptor Kontrak S3 Compatible Storage
 */
export class AdaptorStorageS3 implements PenyediaStorageNetral {
  public readonly namaPenyedia = 's3_compatible';
  private endpoint: string;
  private bucket: string;

  constructor(endpoint: string, bucket: string) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.bucket = bucket;
  }

  public async unggah(opsi: OpsiUnggahCloud): Promise<HasilTransferBerkas> {
    const namaAman = LapisanKeamananMobile.amankanNamaBerkas(opsi.namaBerkas);
    if (!namaAman) {
      return { sukses: false, galat: 'Nama berkas tidak valid atau memuat path traversal.', stempelWaktu: Date.now() };
    }
    const ukuran = typeof opsi.konten === 'string' ? Buffer.byteLength(opsi.konten) : opsi.konten.length;
    if (ukuran > 50 * 1024 * 1024) {
      return { sukses: false, galat: 'Ukuran berkas melebihi batas 50 MB.', stempelWaktu: Date.now() };
    }
    const id = `s3_${Date.now()}`;
    return {
      sukses: true,
      berkas: {
        id,
        nama: namaAman,
        ukuran,
        mimeType: opsi.mimeType || 'application/octet-stream',
        url: `${this.endpoint}/${this.bucket}/${encodeURIComponent(namaAman)}`,
        dibuatPada: new Date().toISOString(),
      },
      stempelWaktu: Date.now(),
    };
  }

  public async unduh(_urlAtauId: string): Promise<{ sukses: boolean; data?: any; galat?: string }> {
    return { sukses: true, data: 'Konten simulasi unduhan S3' };
  }

  public async hapus(_urlAtauId: string): Promise<boolean> {
    return true;
  }

  public async dapatkanMetadata(urlAtauId: string): Promise<MetadataBerkasCloud | null> {
    return {
      id: urlAtauId,
      nama: 'berkas_s3.bin',
      ukuran: 1024,
      mimeType: 'application/octet-stream',
      url: `${this.endpoint}/${this.bucket}/${encodeURIComponent(urlAtauId)}`,
      dibuatPada: new Date().toISOString(),
    };
  }

  public async daftarBerkas(): Promise<MetadataBerkasCloud[]> {
    return [];
  }
}

/**
 * Pengelola Utama Transfer Berkas Mobile (Mobile File Transfer Manager)
 */
export class PengelolaTransferBerkasMobile {
  private static instance: PengelolaTransferBerkasMobile;
  private penyediaAktif: PenyediaStorageNetral = new AdaptorStorageMock();
  private cacheSinkron: Map<string, { meta: MetadataBerkasCloud; konten: string | Buffer }> = new Map();

  public static dapatkanInstance(): PengelolaTransferBerkasMobile {
    if (!this.instance) {
      this.instance = new PengelolaTransferBerkasMobile();
    }
    return this.instance;
  }

  public pasangPenyedia(penyedia: PenyediaStorageNetral): void {
    this.penyediaAktif = penyedia;
  }

  public dapatkanPenyedia(): PenyediaStorageNetral {
    return this.penyediaAktif;
  }

  public unggah(opsi: OpsiUnggahCloud): Promise<HasilTransferBerkas> {
    return this.penyediaAktif.unggah(opsi);
  }

  public unggahSinkron(namaBerkas: string, konten: string | Buffer, folder = 'publik'): HasilTransferBerkas {
    const namaAman = LapisanKeamananMobile.amankanNamaBerkas(namaBerkas);
    if (!namaAman) {
      return { sukses: false, galat: 'Nama berkas tidak valid atau memuat path traversal.', stempelWaktu: Date.now() };
    }
    const ukuran = typeof konten === 'string' ? Buffer.byteLength(konten, 'utf8') : konten.length;
    if (ukuran > 50 * 1024 * 1024) {
      return { sukses: false, galat: 'Ukuran berkas melebihi batas 50 MB.', stempelWaktu: Date.now() };
    }
    const folderAman = LapisanKeamananMobile.amankanNamaBerkas(folder) || 'publik';
    const id = `file_${Date.now()}`;
    const meta: MetadataBerkasCloud = {
      id,
      nama: namaAman,
      ukuran,
      mimeType: namaAman.endsWith('.csv') ? 'text/csv' : 'text/plain',
      folder: folderAman,
      url: `https://storage.nusantara.internal/${folderAman}/${id}/${namaAman}`,
      dibuatPada: new Date().toISOString(),
    };
    this.cacheSinkron.set(id, { meta, konten });
    return {
      sukses: true,
      berkas: meta,
      stempelWaktu: Date.now(),
    };
  }

  public unduhSinkron(urlAtauId: string): { sukses: boolean; data?: Buffer | string; mimeType?: string; galat?: string } {
    const item = this.cacheSinkron.get(urlAtauId);
    if (item) {
      return { sukses: true, data: item.konten, mimeType: item.meta.mimeType };
    }
    for (const val of this.cacheSinkron.values()) {
      if (val.meta.url === urlAtauId) {
        return { sukses: true, data: val.konten, mimeType: val.meta.mimeType };
      }
    }
    return { sukses: false, galat: `Berkas '${urlAtauId}' tidak ditemukan.` };
  }

  public unduh(urlAtauId: string) {
    return this.penyediaAktif.unduh(urlAtauId);
  }

  public hapus(urlAtauId: string): Promise<boolean> {
    return this.penyediaAktif.hapus(urlAtauId);
  }

  public daftarBerkas(folder?: string): Promise<MetadataBerkasCloud[]> {
    return this.penyediaAktif.daftarBerkas(folder);
  }
}
