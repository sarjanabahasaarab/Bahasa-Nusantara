/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Pengelola Ruang (Channels / Rooms) untuk Komunikasi Kelompok Real-Time
 */

import { KoneksiKlienWS, ProfilPenggunaWS } from '../types';

export class PengelolaRuang {
  // Peta: namaRuang -> Set<KoneksiKlienWS>
  private ruangMap: Map<string, Set<KoneksiKlienWS>> = new Map();
  private otorisasiHook?: (profil: ProfilPenggunaWS | undefined, namaRuang: string, koneksi?: any) => Promise<boolean> | boolean;

  constructor(opsi?: {
    otorisasi?: (profil: ProfilPenggunaWS | undefined, namaRuang: string, koneksi?: any) => Promise<boolean> | boolean;
  }) {
    this.otorisasiHook = opsi?.otorisasi;
  }

  /**
   * Menetapkan hook otorisasi ruang secara fleksibel.
   */
  public tetapkanHookOtorisasi(hook: (namaRuang: string, koneksi: any) => Promise<boolean> | boolean): this {
    this.otorisasiHook = (profil, namaRuang, koneksi) => hook(namaRuang, koneksi || profil);
    return this;
  }

  /**
   * Menambahkan koneksi klien ke dalam ruang tertentu setelah lolos otorisasi.
   * Mendukung kedua urutan parameter: (koneksi, ruang) atau (ruang, koneksi).
   */
  public async gabungRuang(koneksiAtauRuang: any, ruangAtauKoneksi: any): Promise<boolean> {
    const { koneksi, namaRuangMentah } = this.uraiArgumenKoneksiDanRuang(koneksiAtauRuang, ruangAtauKoneksi);
    const namaRuang = this.normalisasiNamaRuang(namaRuangMentah);
    if (!namaRuang || !koneksi) return false;

    // Evaluasi otorisasi jika ada
    if (this.otorisasiHook) {
      const diizinkan = await this.otorisasiHook(koneksi.profil, namaRuang, koneksi);
      if (!diizinkan) {
        return false;
      }
    }

    if (!this.ruangMap.has(namaRuang)) {
      this.ruangMap.set(namaRuang, new Set());
    }

    this.ruangMap.get(namaRuang)!.add(koneksi);
    if (koneksi.daftarRuang) {
      koneksi.daftarRuang.add(namaRuang);
    }
    if (koneksi.ruang && typeof koneksi.ruang.add === 'function') {
      koneksi.ruang.add(namaRuang);
    }
    return true;
  }

  /** Alias sinkron/asinkron masukRuang */
  public masukRuang(arg1: any, arg2: any): boolean {
    const { koneksi, namaRuangMentah } = this.uraiArgumenKoneksiDanRuang(arg1, arg2);
    const namaRuang = this.normalisasiNamaRuang(namaRuangMentah);
    if (!namaRuang || !koneksi) return false;

    if (this.otorisasiHook) {
      const res = this.otorisasiHook(koneksi.profil, namaRuang, koneksi);
      if (typeof res === 'boolean' && !res) {
        return false;
      }
    }

    if (!this.ruangMap.has(namaRuang)) {
      this.ruangMap.set(namaRuang, new Set());
    }

    this.ruangMap.get(namaRuang)!.add(koneksi);
    if (koneksi.daftarRuang) {
      koneksi.daftarRuang.add(namaRuang);
    }
    if (koneksi.ruang && typeof koneksi.ruang.add === 'function') {
      koneksi.ruang.add(namaRuang);
    }
    return true;
  }

  /**
   * Mengeluarkan koneksi klien dari ruang tertentu.
   * Mendukung argumen berupa objek koneksi atau ID string.
   */
  public keluarRuang(arg1: any, arg2: any): boolean {
    let namaRuangMentah: string = '';
    let targetKoneksi: any = null;

    if (typeof arg1 === 'string' && (typeof arg2 === 'object' || typeof arg2 === 'string')) {
      namaRuangMentah = arg1;
      targetKoneksi = arg2;
    } else {
      targetKoneksi = arg1;
      namaRuangMentah = arg2;
    }

    const namaRuang = this.normalisasiNamaRuang(namaRuangMentah);
    if (!namaRuang) return false;

    const anggota = this.ruangMap.get(namaRuang);
    if (!anggota) return false;

    let targetKlien: KoneksiKlienWS | null = null;
    if (typeof targetKoneksi === 'string') {
      for (const k of anggota) {
        if (k.id === targetKoneksi) {
          targetKlien = k;
          break;
        }
      }
    } else {
      targetKlien = targetKoneksi;
    }

    if (!targetKlien) return false;

    const terhapus = anggota.delete(targetKlien);
    if (targetKlien.daftarRuang) {
      targetKlien.daftarRuang.delete(namaRuang);
    }
    if ((targetKlien as any).ruang) {
      (targetKlien as any).ruang.delete(namaRuang);
    }

    // Bersihkan ruang kosong secara otomatis
    if (anggota.size === 0) {
      this.ruangMap.delete(namaRuang);
    }

    return terhapus;
  }

  public jumlahKoneksiDalamRuang(namaRuangMentah: string): number {
    const namaRuang = this.normalisasiNamaRuang(namaRuangMentah);
    const anggota = this.ruangMap.get(namaRuang);
    return anggota ? anggota.size : 0;
  }

  public jumlahRuangAktif(): number {
    return this.ruangMap.size;
  }

  public siarkanKeRuang(namaRuangMentah: string, pesan: any, kecualikanKoneksiId?: string): number {
    return this.kirimKeRuang(namaRuangMentah, pesan, kecualikanKoneksiId);
  }

  private uraiArgumenKoneksiDanRuang(arg1: any, arg2: any): { koneksi: any; namaRuangMentah: string } {
    if (typeof arg1 === 'string') {
      return { namaRuangMentah: arg1, koneksi: arg2 };
    }
    return { koneksi: arg1, namaRuangMentah: arg2 };
  }

  /**
   * Mengeluarkan klien dari seluruh ruang yang diikutinya (misal saat terputus).
   */
  public keluarDariSemuaRuang(koneksi: KoneksiKlienWS): void {
    for (const namaRuang of Array.from(koneksi.daftarRuang)) {
      this.keluarRuang(koneksi, namaRuang);
    }
  }

  /**
   * Mengirimkan pesan terformat kepada seluruh anggota ruang tertentu.
   * Dapat mengecualikan pengirim asli (opsional).
   * Mengembalikan jumlah penerima yang berhasil dikirimkan.
   */
  public kirimKeRuang(
    namaRuangMentah: string,
    pesan: any,
    kecualikanKoneksiId?: string
  ): number {
    const namaRuang = this.normalisasiNamaRuang(namaRuangMentah);
    if (!namaRuang) return 0;

    const anggota = this.ruangMap.get(namaRuang);
    if (!anggota || anggota.size === 0) return 0;

    const pesanStr = typeof pesan === 'string' ? pesan : JSON.stringify(pesan);
    let terkirim = 0;

    for (const klien of anggota) {
      if (kecualikanKoneksiId && klien.id === kecualikanKoneksiId) {
        continue;
      }
      if (klien.status === 'terbuka') {
        try {
          klien.kirim(pesanStr);
          terkirim++;
        } catch {
          // Abaikan kegagalan kirim individual
        }
      }
    }

    return terkirim;
  }

  /**
   * Menyiarkan pesan ke seluruh klien aktif.
   */
  public siarkanKeSemua(
    koneksiList: Iterable<KoneksiKlienWS>,
    pesan: any,
    kecualikanKoneksiId?: string
  ): number {
    const pesanStr = typeof pesan === 'string' ? pesan : JSON.stringify(pesan);
    let terkirim = 0;

    for (const klien of koneksiList) {
      if (kecualikanKoneksiId && klien.id === kecualikanKoneksiId) {
        continue;
      }
      if (klien.status === 'terbuka') {
        try {
          klien.kirim(pesanStr);
          terkirim++;
        } catch {
          // Abaikan klien bermasalah
        }
      }
    }

    return terkirim;
  }

  public dapatkanAnggotaRuang(namaRuangMentah: string): string[] {
    const namaRuang = this.normalisasiNamaRuang(namaRuangMentah);
    if (!namaRuang) return [];
    const anggota = this.ruangMap.get(namaRuang);
    return anggota ? Array.from(anggota).map((k) => k.id) : [];
  }

  public dapatkanSemuaRuang(): string[] {
    return Array.from(this.ruangMap.keys());
  }

  public apakahAnggota(namaRuangMentah: string, koneksiId: string): boolean {
    const namaRuang = this.normalisasiNamaRuang(namaRuangMentah);
    if (!namaRuang) return false;
    const anggota = this.ruangMap.get(namaRuang);
    if (!anggota) return false;
    for (const k of anggota) {
      if (k.id === koneksiId) return true;
    }
    return false;
  }

  private normalisasiNamaRuang(nama: string): string {
    if (!nama || typeof nama !== 'string') return '';
    return nama.trim().toLowerCase().slice(0, 100);
  }
}
