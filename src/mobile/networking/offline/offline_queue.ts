/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Pengelola Antrean Operasi Offline (Mobile Offline Operation Queue)
 */

import { OperasiOffline, StatusOperasiOffline } from '../types';
import { PenyimpananAmanMobile } from '../../security/secure_storage';
import { muatModulNode, apakahNodeRuntime } from '../../../gui/platform/node_bridge';

export class PengelolaOperasiOffline {
  private static instance: PengelolaOperasiOffline;
  private antrean: OperasiOffline[] = [];
  private readonly batasMaksimal: number = 200;
  private readonly kunciPenyimpanan = 'nusantara_mobile_antrean_offline_v1';
  private jalurDiskPersistensi?: string;

  private constructor() {
    this.muatDariPenyimpanan();
  }

  public static dapatkanInstance(): PengelolaOperasiOffline {
    if (!this.instance) {
      this.instance = new PengelolaOperasiOffline();
    }
    return this.instance;
  }

  public tambah(op: Omit<OperasiOffline, 'id' | 'stempelWaktu' | 'percobaan' | 'status'>): OperasiOffline {
    // Periksa duplikasi berdasarkan idempotencyKey
    const duplikat = this.antrean.find((item) => item.idempotencyKey === op.idempotencyKey);
    if (duplikat) {
      return duplikat;
    }

    if (this.antrean.length >= this.batasMaksimal) {
      // Hapus operasi tertua yang sudah sukses atau gagal permanen
      const idxBisaDihapus = this.antrean.findIndex((i) => i.status === 'sukses' || i.percobaan >= 5);
      if (idxBisaDihapus !== -1) {
        this.antrean.splice(idxBisaDihapus, 1);
      } else {
        this.antrean.shift(); // Buang yang paling lama jika penuh
      }
    }

    const baru: OperasiOffline = {
      ...op,
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      stempelWaktu: Date.now(),
      percobaan: 0,
      status: 'tertunda',
    };

    this.antrean.push(baru);
    this.simpanKePenyimpanan();
    return baru;
  }

  public dapatkanSemua(): OperasiOffline[] {
    return [...this.antrean];
  }

  public dapatkanTertunda(): OperasiOffline[] {
    return this.antrean.filter((item) => item.status === 'tertunda' && item.percobaan < 5);
  }

  public tandaiDiproses(id: string): void {
    const item = this.antrean.find((i) => i.id === id);
    if (item) {
      item.status = 'diproses';
      item.percobaan += 1;
      this.simpanKePenyimpanan();
    }
  }

  public tandaiSukses(id: string): void {
    const item = this.antrean.find((i) => i.id === id);
    if (item) {
      item.status = 'sukses';
      this.simpanKePenyimpanan();
    }
  }

  public tandaiGagal(id: string, pesanGalat: string): void {
    const item = this.antrean.find((i) => i.id === id);
    if (item) {
      item.status = 'gagal';
      item.pesanGalat = pesanGalat;
      // Jika belum melewati batas percobaan, kembalikan ke tertunda untuk percobaan berikutnya
      if (item.percobaan < 5) {
        item.status = 'tertunda';
      }
      this.simpanKePenyimpanan();
    }
  }

  public hapus(id: string): boolean {
    const awal = this.antrean.length;
    this.antrean = this.antrean.filter((i) => i.id !== id);
    if (this.antrean.length !== awal) {
      this.simpanKePenyimpanan();
      return true;
    }
    return false;
  }

  public bersihkanOperasiSukses(): number {
    const awal = this.antrean.length;
    this.antrean = this.antrean.filter((i) => i.status !== 'sukses');
    const terhapus = awal - this.antrean.length;
    if (terhapus > 0) {
      this.simpanKePenyimpanan();
    }
    return terhapus;
  }

  public hitung(): { total: number; tertunda: number; diproses: number; sukses: number; gagal: number } {
    return {
      total: this.antrean.length,
      tertunda: this.antrean.filter((i) => i.status === 'tertunda').length,
      diproses: this.antrean.filter((i) => i.status === 'diproses').length,
      sukses: this.antrean.filter((i) => i.status === 'sukses').length,
      gagal: this.antrean.filter((i) => i.status === 'gagal' && i.percobaan >= 5).length,
    };
  }

  public aturJalurPersistensi(jalurBerkas?: string): void {
    this.jalurDiskPersistensi = jalurBerkas;
    if (jalurBerkas) {
      this.muatUlangDariDisk();
    }
  }

  public muatUlangDariDisk(): void {
    if (!this.jalurDiskPersistensi || !apakahNodeRuntime()) return;
    const fs = muatModulNode<any>('fs');
    if (!fs || !fs.existsSync(this.jalurDiskPersistensi)) return;
    try {
      const isi = fs.readFileSync(this.jalurDiskPersistensi, 'utf-8');
      const parsed = JSON.parse(isi);
      if (Array.isArray(parsed)) {
        this.antrean = parsed;
      }
    } catch {
      // Abaikan JSON korup
    }
  }

  public reset(): void {
    this.antrean = [];
    PenyimpananAmanMobile.hapus(this.kunciPenyimpanan);
    if (this.jalurDiskPersistensi && apakahNodeRuntime()) {
      const fs = muatModulNode<any>('fs');
      if (fs && fs.existsSync(this.jalurDiskPersistensi)) {
        try {
          fs.unlinkSync(this.jalurDiskPersistensi);
        } catch {}
      }
    }
  }

  private simpanKePenyimpanan(): void {
    try {
      const serial = JSON.stringify(this.antrean);
      PenyimpananAmanMobile.simpan(this.kunciPenyimpanan, serial);
      if (this.jalurDiskPersistensi && apakahNodeRuntime()) {
        const fs = muatModulNode<any>('fs');
        const path = muatModulNode<any>('path');
        if (fs && path) {
          fs.mkdirSync(path.dirname(this.jalurDiskPersistensi), { recursive: true });
          fs.writeFileSync(this.jalurDiskPersistensi, serial, 'utf-8');
        }
      }
    } catch {
      // Abaikan jika penyimpanan aman belum terinisialisasi di browser
    }
  }

  private muatDariPenyimpanan(): void {
    try {
      const data = PenyimpananAmanMobile.ambil(this.kunciPenyimpanan);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.antrean = parsed;
        }
      }
    } catch {
      this.antrean = [];
    }
  }
}
