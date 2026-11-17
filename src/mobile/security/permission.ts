/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Pengelola Izin Akses Perangkat Mobile (Mobile Permission Manager)
 */

import { JenisIzinMobile, StatusIzinMobile, PermintaanIzinMobile, HasilIzinMobile } from '../types';

export class PengelolaIzinMobile {
  private statusIzin: Map<JenisIzinMobile, StatusIzinMobile> = new Map();
  private paraPendengar: Set<(izin: JenisIzinMobile, status: StatusIzinMobile) => void> = new Set();

  constructor() {
    this.inisialisasiIzinBawaan();
  }

  private inisialisasiIzinBawaan(): void {
    // Internet selalu diberikan secara bawaan di mobile
    this.statusIzin.set('internet', 'diberikan');
    // Izin sensitif berstatus belum diminta
    this.statusIzin.set('kamera', 'belum_diminta');
    this.statusIzin.set('lokasi', 'belum_diminta');
    this.statusIzin.set('lokasi_latar', 'belum_diminta');
    this.statusIzin.set('notifikasi', 'belum_diminta');
    this.statusIzin.set('foto_media', 'belum_diminta');
    this.statusIzin.set('mikrofon', 'belum_diminta');
    this.statusIzin.set('bluetooth', 'belum_diminta');
    this.statusIzin.set('penyimpanan', 'belum_diminta');
    this.statusIzin.set('sensor', 'diberikan');
  }

  public periksaIzin(izin: JenisIzinMobile): StatusIzinMobile {
    return this.statusIzin.get(izin) || 'belum_diminta';
  }

  public dapatkanStatus(izin: JenisIzinMobile): StatusIzinMobile {
    return this.periksaIzin(izin);
  }

  public apakahDiberikan(izin: JenisIzinMobile): boolean {
    return this.periksaIzin(izin) === 'diberikan';
  }

  public apakahDiizinkan(izin: JenisIzinMobile): boolean {
    return this.apakahDiberikan(izin);
  }

  public cabutIzin(izin: JenisIzinMobile, permanen: boolean = false): void {
    this.tetapkanStatusIzin(izin, permanen ? 'ditolak_permanen' : 'ditolak');
  }

  public tetapkanStatusIzin(izin: JenisIzinMobile, status: StatusIzinMobile): void {
    this.statusIzin.set(izin, status);
    for (const fn of this.paraPendengar) {
      try {
        fn(izin, status);
      } catch (err) {
        console.error(`[PengelolaIzin] Galat pada pendengar izin '${izin}':`, err);
      }
    }
  }

  public mintaIzinSinkron(permintaan: PermintaanIzinMobile | JenisIzinMobile, _alasan?: string): HasilIzinMobile {
    const izin: JenisIzinMobile = typeof permintaan === 'string' ? permintaan : permintaan.izin;
    const statusSaatIni = this.periksaIzin(izin);

    if (statusSaatIni === 'diberikan') {
      return { izin, status: 'diberikan', diberikan: true };
    }

    if (statusSaatIni === 'ditolak_permanen') {
      return { izin, status: 'ditolak_permanen', diberikan: false };
    }

    // Simulasi respons pengguna (secara default disetujui dalam preview/runtime)
    const statusBaru: StatusIzinMobile = 'diberikan';
    this.tetapkanStatusIzin(izin, statusBaru);

    return {
      izin,
      status: statusBaru,
      diberikan: true,
    };
  }

  public async mintaIzin(permintaan: PermintaanIzinMobile | JenisIzinMobile, alasan?: string): Promise<HasilIzinMobile> {
    return this.mintaIzinSinkron(permintaan, alasan);
  }

  public async mintaBanyakIzin(daftar: JenisIzinMobile[]): Promise<Map<JenisIzinMobile, HasilIzinMobile>> {
    const hasil = new Map<JenisIzinMobile, HasilIzinMobile>();
    for (const izin of daftar) {
      const h = await this.mintaIzin(izin);
      hasil.set(izin, h);
    }
    return hasil;
  }

  public onIzinBerubah(fn: (izin: JenisIzinMobile, status: StatusIzinMobile) => void): () => void {
    this.paraPendengar.add(fn);
    return () => this.paraPendengar.delete(fn);
  }

  public bersihkan(): void {
    this.paraPendengar.clear();
    this.inisialisasiIzinBawaan();
  }
}
