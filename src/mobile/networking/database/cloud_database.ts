/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Integrasi Database Cloud Mobile Berbasis REST (Mobile Cloud Database Client)
 */

import { KlienAPIMobile } from '../core/api_client';
import { LapisanKeamananMobile } from '../security/cloud_security';

export interface OpsiKueriDatabaseMobile {
  filter?: Record<string, any>;
  halaman?: number;
  perHalaman?: number;
  urutkan?: string;
  arah?: 'asc' | 'desc';
}

export interface HasilKueriDatabaseMobile<T = any> {
  sukses: boolean;
  data: T[];
  total: number;
  halaman: number;
  perHalaman: number;
  galat?: string;
}

function sanitasiSegmenPath(nilai: string | number, label: string): { ok: true; segmen: string } | { ok: false; galat: string } {
  const s = String(nilai ?? '').trim();
  if (!s || s === '.' || s === '..' || /[\\/?#\0]/.test(s) || s.includes('..')) {
    return { ok: false, galat: `${label} mengandung karakter jalur ilegal atau path traversal.` };
  }
  return { ok: true, segmen: encodeURIComponent(s) };
}

export class KlienDatabaseCloudMobile {
  private apiClient: KlienAPIMobile;
  private readonly basisEndpoint: string;

  constructor(apiClient: KlienAPIMobile, basisEndpoint = '/api/db') {
    this.apiClient = apiClient;
    this.basisEndpoint = basisEndpoint.replace(/\/+$/, '');
  }

  public async ambilSemua<T = any>(tabel: string, opsi: OpsiKueriDatabaseMobile = {}): Promise<HasilKueriDatabaseMobile<T>> {
    const cekTabel = sanitasiSegmenPath(tabel, 'Nama tabel');
    if (!cekTabel.ok) {
      return {
        sukses: false,
        data: [],
        total: 0,
        halaman: opsi.halaman || 1,
        perHalaman: opsi.perHalaman || 20,
        galat: cekTabel.galat,
      };
    }

    const query: Record<string, any> = {
      halaman: opsi.halaman || 1,
      perHalaman: opsi.perHalaman || 20,
    };

    if (opsi.urutkan) query['urutkan'] = opsi.urutkan;
    if (opsi.arah) query['arah'] = opsi.arah;

    if (opsi.filter) {
      for (const [k, v] of Object.entries(opsi.filter)) {
        query[`filter_${k}`] = v;
      }
    }

    const res = await this.apiClient.dapatkan(`${this.basisEndpoint}/${cekTabel.segmen}`, { query });
    if (!res.sukses) {
      return {
        sukses: false,
        data: [],
        total: 0,
        halaman: query.halaman,
        perHalaman: query.perHalaman,
        galat: res.galat || 'Gagal mengambil data dari cloud database.',
      };
    }

    const dataArray = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    const total = res.data?.total || dataArray.length;

    return {
      sukses: true,
      data: dataArray,
      total,
      halaman: query.halaman,
      perHalaman: query.perHalaman,
    };
  }

  public async ambilBerdasarkanId<T = any>(tabel: string, id: string | number): Promise<{ sukses: boolean; data?: T; galat?: string }> {
    const cekTabel = sanitasiSegmenPath(tabel, 'Nama tabel');
    if (!cekTabel.ok) return { sukses: false, galat: cekTabel.galat };
    const cekId = sanitasiSegmenPath(id, 'ID rekaman');
    if (!cekId.ok) return { sukses: false, galat: cekId.galat };

    const res = await this.apiClient.dapatkan(`${this.basisEndpoint}/${cekTabel.segmen}/${cekId.segmen}`);
    if (!res.sukses) {
      return { sukses: false, galat: res.galat || 'Data tidak ditemukan.' };
    }
    return { sukses: true, data: res.data };
  }

  public async buat<T = any>(tabel: string, data: Record<string, any>): Promise<{ sukses: boolean; data?: T; galat?: string }> {
    const cekTabel = sanitasiSegmenPath(tabel, 'Nama tabel');
    if (!cekTabel.ok) return { sukses: false, galat: cekTabel.galat };

    const periksa = LapisanKeamananMobile.periksaKlaimKlien(data);
    if (!periksa.aman) {
      return { sukses: false, galat: periksa.peringatan };
    }

    const res = await this.apiClient.kirim(`${this.basisEndpoint}/${cekTabel.segmen}`, data);
    return {
      sukses: res.sukses,
      data: res.data,
      galat: res.galat,
    };
  }

  public async perbarui<T = any>(tabel: string, id: string | number, data: Record<string, any>): Promise<{ sukses: boolean; data?: T; galat?: string }> {
    const cekTabel = sanitasiSegmenPath(tabel, 'Nama tabel');
    if (!cekTabel.ok) return { sukses: false, galat: cekTabel.galat };
    const cekId = sanitasiSegmenPath(id, 'ID rekaman');
    if (!cekId.ok) return { sukses: false, galat: cekId.galat };

    const periksa = LapisanKeamananMobile.periksaKlaimKlien(data);
    if (!periksa.aman) {
      return { sukses: false, galat: periksa.peringatan };
    }

    const res = await this.apiClient.perbarui(`${this.basisEndpoint}/${cekTabel.segmen}/${cekId.segmen}`, data);
    return {
      sukses: res.sukses,
      data: res.data,
      galat: res.galat,
    };
  }

  public async hapus(tabel: string, id: string | number): Promise<{ sukses: boolean; galat?: string }> {
    const cekTabel = sanitasiSegmenPath(tabel, 'Nama tabel');
    if (!cekTabel.ok) return { sukses: false, galat: cekTabel.galat };
    const cekId = sanitasiSegmenPath(id, 'ID rekaman');
    if (!cekId.ok) return { sukses: false, galat: cekId.galat };

    const res = await this.apiClient.hapus(`${this.basisEndpoint}/${cekTabel.segmen}/${cekId.segmen}`);
    return {
      sukses: res.sukses,
      galat: res.galat,
    };
  }
}
