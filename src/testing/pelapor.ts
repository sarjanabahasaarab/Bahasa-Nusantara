/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RingkasanUji, HasilUji, HasilBerkasUji } from './types';

/**
 * Pelapor Hasil Pengujian Konsol Terminal Bahasa NUSANTARA (Phase 21).
 */
export class PelaporKonsol {
  private readonly penulisLog: (pesan: string) => void;
  private readonly penulisGalat: (pesan: string) => void;
  private readonly verbose: boolean;
  private readonly gunakanWarna: boolean;

  constructor(opsi?: {
    penulisLog?: (pesan: string) => void;
    penulisGalat?: (pesan: string) => void;
    verbose?: boolean;
    warna?: boolean;
  }) {
    this.penulisLog = opsi?.penulisLog || (typeof console !== 'undefined' ? console.log : () => {});
    this.penulisGalat = opsi?.penulisGalat || (typeof console !== 'undefined' ? console.error : () => {});
    this.verbose = Boolean(opsi?.verbose);
    this.gunakanWarna = opsi?.warna !== false;
  }

  /**
   * Menghasilkan teks laporan berformat rapi dari RingkasanUji.
   */
  public static format(
    ringkasan: RingkasanUji,
    opsi?: { warna?: boolean; verbose?: boolean }
  ): string {
    const baris: string[] = [];
    const pelapor = new PelaporKonsol({
      penulisLog: (m) => baris.push(m),
      penulisGalat: (m) => baris.push(m),
      verbose: opsi?.verbose,
      warna: opsi?.warna,
    });
    pelapor.laporkan(ringkasan);
    return baris.join('\n');
  }

  /**
   * Menampilkan laporan pengujian lengkap ke terminal/konsol.
   */
  /**
   * Menampilkan laporan pengujian lengkap ke terminal/konsol.
   */
  public laporkan(ringkasan: RingkasanUji): void {
    const daftarBerkas = (ringkasan.daftarBerkas || ringkasan.berkas || []) as any[];
    const total = ringkasan.totalUji ?? ringkasan.total ?? 0;
    const lulus = ringkasan.lulus ?? 0;
    const gagal = (ringkasan.gagal ?? 0) + (ringkasan.galat ?? 0);
    const dilewati = ringkasan.dilewati ?? 0;
    const durasiTotalMs = ringkasan.durasiTotalMs ?? ringkasan.durasiMs ?? 0;
    const persenLulus = total > 0 ? ((lulus / total) * 100).toFixed(1) : '100.0';

    this.penulisLog('');
    this.penulisLog('=============================================================================');
    this.penulisLog('LAPORAN PENGUJIAN OTOMATIS NUSANTARA');
    this.penulisLog('Target Milestone: v0.21.0');
    this.penulisLog('=============================================================================');
    this.penulisLog('');

    for (const berkas of daftarBerkas) {
      const nama = berkas.namaBerkas || (berkas.jalur ? berkas.jalur.split('/').pop() : 'uji.nusantara');
      const durasi = berkas.durasiTotalMs ?? berkas.durasiMs ?? 0;
      this.penulisLog(`--- Berkas: ${nama} (${durasi}ms) ---`);

      const daftarHasil = berkas.daftarHasil || berkas.daftarUji || [];
      for (const uji of daftarHasil) {
        this.cetakBarisHasilUji(uji);
      }

      if (berkas.galatFatal) {
        this.penulisGalat('');
        this.penulisGalat(`  [!] GALAT FATAL: ${berkas.galatFatal}`);
      }
      this.penulisLog('');
    }

    // Detail Kegagalan (jika ada)
    const daftarGagal = this.kumpulkanKegagalan(daftarBerkas);
    if (daftarGagal.length > 0) {
      this.penulisLog('-----------------------------------------------------------------------------');
      this.penulisLog('RINCIAN KEGAGALAN PENGUJIAN:');
      this.penulisLog('-----------------------------------------------------------------------------');

      for (const item of daftarGagal) {
        this.penulisLog('');
        this.penulisLog(`UJI GAGAL`);
        this.penulisLog(`  Nama       : ${item.nama}`);
        this.penulisLog(`  Berkas     : ${item.berkas}`);
        if (item.lokasi) {
          this.penulisLog(`  Lokasi     : ${item.lokasi.baris}:${item.lokasi.kolom}`);
        }
        if (item.diharapkan !== undefined) {
          this.penulisLog(`  Diharapkan : ${this.formatNilai(item.diharapkan)}`);
        }
        if (item.ditemukan !== undefined) {
          this.penulisLog(`  Ditemukan  : ${this.formatNilai(item.ditemukan)}`);
        }
        this.penulisLog(`  Pesan      : ${item.pesan || 'Penegasan gagal.'}`);
      }
      this.penulisLog('');
    }

    // Ringkasan Statistik
    const durasiDetik = (durasiTotalMs / 1000).toFixed(2);
    this.penulisLog('=============================================================================');
    this.penulisLog(`RINGKASAN HASIL:`);
    this.penulisLog(`Total Uji : ${total}`);
    this.penulisLog(`Lulus     : ${lulus} (${persenLulus}%)`);
    this.penulisLog(`Gagal     : ${gagal}`);
    this.penulisLog(`Dilewati  : ${dilewati}`);
    this.penulisLog(
      `TOTAL PENGUJIAN: ${total} | LULUS: ${lulus} | GAGAL: ${gagal} | DILEWATI: ${dilewati}`
    );
    this.penulisLog(`Waktu Eksekusi : ${durasiDetik} detik`);
    this.penulisLog('=============================================================================');

    if (gagal === 0) {
      this.penulisLog('[✓ SUKSES] Seluruh pengujian NUSANTARA BERHASIL 100%!');
    } else {
      this.penulisLog('[✗ GAGAL] Terdapat pengujian yang belum memenuhi spesifikasi.');
    }
    this.penulisLog('');
  }

  private cetakBarisHasilUji(uji: HasilUji): void {
    let simbol = '✓';
    let label = 'LULUS';
    const st = String(uji.status || '').toLowerCase();
    if (st === 'gagal') {
      simbol = '✗';
      label = 'GAGAL';
    } else if (st === 'galat') {
      simbol = '!';
      label = 'GALAT';
    } else if (st === 'dilewati') {
      simbol = '⊘';
      label = 'LEWAT';
    }

    const durasi = `${uji.durasiMs || 0}ms`;
    if (this.verbose) {
      this.penulisLog(`  ${simbol} [${label}] ${(uji.nama || '').padEnd(40)} (${durasi}) - ${uji.berkas || ''}`);
      if (st !== 'lulus' && uji.pesan) {
        this.penulisLog(`      └─ ${uji.pesan}`);
      }
    } else {
      this.penulisLog(`  ${simbol} ${uji.nama || 'Pengujian'} (${durasi})`);
      if (st !== 'lulus' && uji.pesan) {
        this.penulisLog(`      └─ ${uji.pesan}`);
      }
    }
  }

  private kumpulkanKegagalan(daftarBerkas: any[]): HasilUji[] {
    const gagal: HasilUji[] = [];
    for (const b of daftarBerkas) {
      const daftarHasil = b.daftarHasil || b.daftarUji || [];
      for (const u of daftarHasil) {
        const st = String(u.status || '').toLowerCase();
        if (st === 'gagal' || st === 'galat') {
          gagal.push(u);
        }
      }
    }
    return gagal;
  }

  private formatNilai(v: any): string {
    if (v === null || v === undefined) return 'kosong';
    if (typeof v === 'boolean') return v ? 'benar' : 'salah';
    if (typeof v === 'string') return `"${v}"`;
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
}

/**
 * Pelapor Format JSON Terstruktur untuk Tooling & Integrasi CI/CD.
 */
export class PelaporJSON {
  public static format(ringkasan: RingkasanUji): string {
    const daftarBerkas = (ringkasan.daftarBerkas || ringkasan.berkas || []) as any[];
    const total = ringkasan.totalUji ?? ringkasan.total ?? 0;
    const lulus = ringkasan.lulus ?? 0;
    const gagal = (ringkasan.gagal ?? 0) + (ringkasan.galat ?? 0);
    const dilewati = ringkasan.dilewati ?? 0;
    const galat = ringkasan.galat ?? 0;
    const durasiTotalMs = ringkasan.durasiTotalMs ?? ringkasan.durasiMs ?? 0;
    const berkasTotal = ringkasan.berkasTotal ?? ringkasan.totalBerkas ?? daftarBerkas.length;
    const status = ringkasan.status ? String(ringkasan.status).toUpperCase() : (gagal === 0 ? 'LULUS' : 'GAGAL');

    return JSON.stringify(
      {
        skema: 'nusantara.testing.v1',
        status,
        versi: '0.21.0',
        total,
        lulus,
        gagal,
        dilewati,
        galat,
        durasiTotalMs,
        berkasTotal,
        berkasLulus: ringkasan.berkasLulus ?? (gagal === 0 ? berkasTotal : 0),
        berkasGagal: ringkasan.berkasGagal ?? (gagal > 0 ? 1 : 0),
        daftarBerkas: daftarBerkas.map(b => ({
          namaBerkas: b.namaBerkas || (b.jalur ? b.jalur.split('/').pop() : 'uji.nusantara'),
          jalurBerkas: b.jalurBerkas || b.jalur || '',
          sukses: b.sukses ?? (b.status === 'lulus' || b.status === 'LULUS'),
          durasiMs: b.durasiTotalMs ?? b.durasiMs ?? 0,
          galatFatal: b.galatFatal,
          daftarHasil: (b.daftarHasil || b.daftarUji || []).map((h: any) => ({
            nama: h.nama,
            status: h.status,
            durasiMs: h.durasiMs,
            pesan: h.pesan,
            diharapkan: h.diharapkan,
            ditemukan: h.ditemukan,
            lokasi: h.lokasi
              ? {
                  baris: h.lokasi.baris,
                  kolom: h.lokasi.kolom,
                  namaBerkas: h.lokasi.berkas || h.lokasi.namaBerkas,
                }
              : undefined,
          })),
        })),
      },
      null,
      2
    );
  }
}
