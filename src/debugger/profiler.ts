/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mesin Profiler Eksekusi Runtime Bahasa NUSANTARA (Phase 25)
 */

import { ProfilFungsi, LaporanProfil, StatistikMemori } from './types';

interface BingkaiProfil {
  nama: string;
  waktuMulai: number;
  waktuAnak: number;
}

/**
 * Mesin Profiler untuk mengukur waktu eksekusi fungsi, waktu mandiri (self-time),
 * jumlah pemanggilan, dan penggunaan memori dengan timer monotonik berpresisi tinggi.
 */
export class ProfilerNUSANTARA {
  private aktif = false;
  private waktuMulaiGlobal = 0;
  private tumpukanWaktu: BingkaiProfil[] = [];
  private readonly dataFungsi = new Map<
    string,
    {
      jumlah: number;
      totalMs: number;
      mandiriMs: number;
      minMs: number;
      maksMs: number;
    }
  >();
  private alokasiAwalByte = 0;
  private alokasiPuncakByte = 0;
  private namaProgram = 'program';

  constructor(aktif: boolean = false) {
    this.aktif = aktif;
  }

  public apakahAktif(): boolean {
    return this.aktif;
  }

  public aktifkan(namaProgram: string = 'program'): void {
    this.aktif = true;
    this.namaProgram = namaProgram;
    this.tumpukanWaktu = [];
    this.dataFungsi.clear();
    this.waktuMulaiGlobal = this.dapatkanWaktuMonotonik();

    const mem = this.bacaPenggunaanMemori();
    if (mem) {
      this.alokasiAwalByte = mem.heapUsed;
      this.alokasiPuncakByte = mem.heapUsed;
    }
  }

  public nonaktifkan(): void {
    this.aktif = false;
    this.tumpukanWaktu = [];
  }

  /**
   * Hook sebelum pemanggilan fungsi dieksekusi.
   */
  public mulaiPanggilan(namaFungsi: string): void {
    if (!this.aktif) return;
    const waktu = this.dapatkanWaktuMonotonik();
    this.tumpukanWaktu.push({
      nama: namaFungsi,
      waktuMulai: waktu,
      waktuAnak: 0,
    });

    const mem = this.bacaPenggunaanMemori();
    if (mem && mem.heapUsed > this.alokasiPuncakByte) {
      this.alokasiPuncakByte = mem.heapUsed;
    }
  }

  /**
   * Hook setelah pemanggilan fungsi selesai.
   */
  public selesaiPanggilan(namaFungsi: string): void {
    if (!this.aktif || this.tumpukanWaktu.length === 0) return;
    const waktuSelesai = this.dapatkanWaktuMonotonik();
    const frame = this.tumpukanWaktu.pop();
    if (!frame) return;

    const durasiTotal = Math.max(0, waktuSelesai - frame.waktuMulai);
    const durasiMandiri = Math.max(0, durasiTotal - frame.waktuAnak);

    // Tambahkan durasi total ke frame pemanggil jika ada
    if (this.tumpukanWaktu.length > 0) {
      const pemanggil = this.tumpukanWaktu[this.tumpukanWaktu.length - 1];
      pemanggil.waktuAnak += durasiTotal;
    }

    const entri = this.dataFungsi.get(namaFungsi) || {
      jumlah: 0,
      totalMs: 0,
      mandiriMs: 0,
      minMs: Infinity,
      maksMs: 0,
    };

    entri.jumlah += 1;
    entri.totalMs += durasiTotal;
    entri.mandiriMs += durasiMandiri;
    entri.minMs = Math.min(entri.minMs, durasiTotal);
    entri.maksMs = Math.max(entri.maksMs, durasiTotal);

    this.dataFungsi.set(namaFungsi, entri);

    const mem = this.bacaPenggunaanMemori();
    if (mem && mem.heapUsed > this.alokasiPuncakByte) {
      this.alokasiPuncakByte = mem.heapUsed;
    }
  }

  /**
   * Menghasilkan laporan profil eksekusi akhir.
   */
  public buatLaporan(namaProgram?: string): LaporanProfil {
    const waktuSelesaiGlobal = this.dapatkanWaktuMonotonik();
    const durasiTotalMs = Math.max(0, waktuSelesaiGlobal - this.waktuMulaiGlobal);
    const program = namaProgram || this.namaProgram;

    const daftarFungsi: ProfilFungsi[] = [];
    let jumlahPanggilanTotal = 0;

    for (const [nama, entri] of this.dataFungsi.entries()) {
      jumlahPanggilanTotal += entri.jumlah;
      daftarFungsi.push({
        namaFungsi: nama,
        jumlahPanggilan: entri.jumlah,
        waktuTotalMs: Number(entri.totalMs.toFixed(3)),
        waktuMandiriMs: Number(entri.mandiriMs.toFixed(3)),
        waktuRataRataMs: Number((entri.totalMs / (entri.jumlah || 1)).toFixed(3)),
        waktuMinMs: entri.minMs === Infinity ? 0 : Number(entri.minMs.toFixed(3)),
        waktuMaksMs: Number(entri.maksMs.toFixed(3)),
      });
    }

    // Urutkan berdasarkan waktu mandiri (self-time) tertinggi
    daftarFungsi.sort((a, b) => b.waktuMandiriMs - a.waktuMandiriMs);

    const memori = this.dapatkanStatistikMemori();

    return {
      namaProgram: program,
      durasiTotalMs: Number(durasiTotalMs.toFixed(3)),
      jumlahPanggilanTotal,
      daftarFungsi,
      memori,
      waktuMulai: new Date(Date.now() - durasiTotalMs).toISOString(),
      waktuSelesai: new Date().toISOString(),
      profilerAktif: this.aktif,
    };
  }

  /**
   * Mengambil statistik memori host.
   */
  public dapatkanStatistikMemori(): StatistikMemori {
    const mem = this.bacaPenggunaanMemori();
    if (!mem) {
      return {
        didukung: false,
        pesan: 'Memory profiling: NOT AVAILABLE',
      };
    }

    const alokasiMb = (mem.heapUsed / (1024 * 1024)).toFixed(2);
    const puncakMb = (Math.max(this.alokasiPuncakByte, mem.heapUsed) / (1024 * 1024)).toFixed(2);
    const rssMb = (mem.rss / (1024 * 1024)).toFixed(2);

    return {
      didukung: true,
      alokasiByte: mem.heapUsed,
      penggunaanPuncakByte: Math.max(this.alokasiPuncakByte, mem.heapUsed),
      rssByte: mem.rss,
      formatTeks: `Penggunaan Heap: ${alokasiMb} MB | Puncak: ${puncakMb} MB (RSS: ${rssMb} MB)`,
    };
  }

  /**
   * Memformat laporan profil ke teks tabel konsol yang terstruktur rapi.
   */
  public static formatTabelKonsol(
    laporan: LaporanProfil,
    opsi?: { ambangMs?: number; tanpaWarna?: boolean }
  ): string {
    const barisOutput: string[] = [];
    barisOutput.push('=============================================================================');
    barisOutput.push('LAPORAN PROFILER EKSEKUSI BAHASA NUSANTARA');
    barisOutput.push(`Program       : ${laporan.namaProgram}`);
    barisOutput.push(
      `Durasi Total  : ${laporan.durasiTotalMs.toFixed(2)} ms | Total Panggilan: ${laporan.jumlahPanggilanTotal}`
    );
    barisOutput.push('=============================================================================');

    if (laporan.daftarFungsi.length === 0) {
      barisOutput.push('Tidak ada pemanggilan fungsi yang tercatat selama eksekusi.');
    } else {
      const header = `${'FUNGSI'.padEnd(26)} ${'PANGGILAN'.padStart(10)} ${'TOTAL (ms)'.padStart(12)} ${'MANDIRI (ms)'.padStart(14)} ${'RATA-RATA'.padStart(12)}`;
      barisOutput.push(header);
      barisOutput.push('-'.repeat(77));

      for (const fn of laporan.daftarFungsi) {
        if (opsi?.ambangMs && fn.waktuTotalMs < opsi.ambangMs) continue;
        const barisFn = `${fn.namaFungsi.padEnd(26)} ${String(fn.jumlahPanggilan).padStart(10)} ${fn.waktuTotalMs.toFixed(2).padStart(12)} ${fn.waktuMandiriMs.toFixed(2).padStart(14)} ${fn.waktuRataRataMs.toFixed(2).padStart(12)}`;
        barisOutput.push(barisFn);
      }
    }

    barisOutput.push('-----------------------------------------------------------------------------');
    if (laporan.memori.didukung && laporan.memori.formatTeks) {
      barisOutput.push(`Statistik Memori: ${laporan.memori.formatTeks}`);
    } else {
      barisOutput.push(`Statistik Memori: ${laporan.memori.pesan || 'NOT AVAILABLE'}`);
    }
    barisOutput.push('=============================================================================');

    return barisOutput.join('\n');
  }

  /**
   * Menghasilkan representasi JSON dari laporan profil.
   */
  public static formatJSON(laporan: LaporanProfil): string {
    return JSON.stringify(laporan, null, 2);
  }

  private dapatkanWaktuMonotonik(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  private bacaPenggunaanMemori(): { heapUsed: number; rss: number } | null {
    if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
      try {
        const u = process.memoryUsage();
        return { heapUsed: u.heapUsed, rss: u.rss };
      } catch {
        return null;
      }
    }
    return null;
  }
}
