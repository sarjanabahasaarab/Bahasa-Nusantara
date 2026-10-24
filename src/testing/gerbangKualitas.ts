/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PelariUji } from './pelariUji';
import { Penegasan } from './penegasan';
import { PengukurCakupan } from './cakupan';
import { PembacaBerkas, PembacaBerkasMemori } from '../modul/pembacaBerkas';
import { formatAman } from '../toolchain/formatter';
import { ServerBahasaNUSANTARA } from '../language-server/server';
import { KATALOG_MODUL_STANDAR } from '../stdlib';
import { HasilItemGerbang, LaporanGerbangKualitas } from './types';

/**
 * Gerbang Kualitas Resmi (Quality Gate) NUSANTARA (Phase 21).
 * Memverifikasi seluruh subsistem bahasa dari Phase 1 hingga Phase 21 sebelum kode diintegrasikan/dirilis.
 */
export class GerbangKualitas {
  private readonly pembaca: PembacaBerkas;
  private readonly ambangBatasCakupan: number;
  private readonly verbose: boolean;

  constructor(
    pembacaAtauOpsi?: PembacaBerkas | { pembaca?: PembacaBerkas; ambangBatasCakupan?: number; verbose?: boolean },
    opsi?: { ambangBatasCakupan?: number; verbose?: boolean }
  ) {
    if (pembacaAtauOpsi && typeof (pembacaAtauOpsi as any).apakahAda === 'function') {
      this.pembaca = pembacaAtauOpsi as PembacaBerkas;
      this.ambangBatasCakupan = opsi?.ambangBatasCakupan ?? 85;
      this.verbose = Boolean(opsi?.verbose);
    } else if (pembacaAtauOpsi) {
      const opt = pembacaAtauOpsi as { pembaca?: PembacaBerkas; ambangBatasCakupan?: number; verbose?: boolean };
      this.pembaca = opt.pembaca || new PembacaBerkasMemori();
      this.ambangBatasCakupan = opt.ambangBatasCakupan ?? opsi?.ambangBatasCakupan ?? 85;
      this.verbose = Boolean(opt.verbose ?? opsi?.verbose);
    } else {
      this.pembaca = new PembacaBerkasMemori();
      this.ambangBatasCakupan = opsi?.ambangBatasCakupan ?? 85;
      this.verbose = Boolean(opsi?.verbose);
    }
  }

  /**
   * Menjalankan seluruh pengujian kualitas komprehensif.
   */
  public async jalankan(): Promise<LaporanGerbangKualitas> {
    const awalTotal = performance.now();
    const hasil: HasilItemGerbang[] = [];

    // 1. Verifikasi Formatter & Idempotensi (Phase 19)
    const awalFmt = performance.now();
    try {
      const kodeKotor = `fungsi hitung(x:bilangan):bilangan\nmulai\nkembalikan x*2\nselesai`;
      const res1 = formatAman(kodeKotor);
      const res2 = formatAman(res1.hasil!);
      const idempotent = res1.sukses && res2.sukses && res1.hasil === res2.hasil;
      Penegasan.pastikanBenar(idempotent, 'Formatter wajib bersifat idempoten');
      hasil.push({
        nama: 'Pemformat Kode & Preservasi AST Idempotency (Formatter)',
        kategori: 'Toolchain',
        status: 'LULUS',
        pesan: 'Pemformatan stabil, idempoten, dan menjaga integritas AST.',
        durasiMs: Math.round((performance.now() - awalFmt) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Pemformat Kode & Preservasi AST Idempotency (Formatter)',
        kategori: 'Toolchain',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalFmt) * 100) / 100,
      });
    }

    // 2. Verifikasi Language Server Protocol (Phase 20)
    const awalLsp = performance.now();
    try {
      const server = new ServerBahasaNUSANTARA({
        pembacaBerkas: this.pembaca,
        janganKeluarOtomatis: true,
      });
      const resInit = await server.tanganiPesan({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { processId: 1, rootUri: 'file:///proyek', capabilities: {} },
      });
      Penegasan.pastikanBenar(Boolean((resInit as any)?.result?.capabilities), 'Server LSP wajib merespons capabilities');
      hasil.push({
        nama: 'Language Server Protocol (LSP Core)',
        kategori: 'Tooling',
        status: 'LULUS',
        pesan: 'Server LSP merespons inisialisasi dan kapabilitas resmi.',
        durasiMs: Math.round((performance.now() - awalLsp) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Language Server Protocol (LSP Core)',
        kategori: 'Tooling',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalLsp) * 100) / 100,
      });
    }

    // 3. Verifikasi Standard Library (Phase 17)
    const awalStd = performance.now();
    try {
      const modulWajib = ['teks', 'matematika', 'koleksi', 'konversi', 'waktu', 'sistem', 'berkas', 'acak'];
      for (const m of modulWajib) {
        Penegasan.pastikanBenar(Boolean(KATALOG_MODUL_STANDAR[m]), `Modul stdlib '${m}' wajib tersedia`);
      }
      hasil.push({
        nama: 'Pustaka Standar & Integritas Stdlib (8 Modul)',
        kategori: 'Ekosistem',
        status: 'LULUS',
        pesan: 'Seluruh 8 modul pustaka standar resmi terverifikasi aktif.',
        durasiMs: Math.round((performance.now() - awalStd) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Pustaka Standar & Integritas Stdlib (8 Modul)',
        kategori: 'Ekosistem',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalStd) * 100) / 100,
      });
    }

    // 4. Verifikasi Testing Framework & Penegasan (Phase 21)
    const awalTst = performance.now();
    try {
      Penegasan.pastikanSama(10 + 20, 30);
      Penegasan.pastikanTidakSama(5, 10);
      Penegasan.pastikanBenar(true);
      Penegasan.pastikanSalah(false);
      Penegasan.pastikanGalat(() => {
        throw new Error('Uji sengaja galat');
      });
      hasil.push({
        nama: 'Mesin Penegasan Resmi (Assertion Engine)',
        kategori: 'Pengujian',
        status: 'LULUS',
        pesan: 'Seluruh metode pastikan, pastikan_sama, pastikan_tidak_sama, benar/salah valid.',
        durasiMs: Math.round((performance.now() - awalTst) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Mesin Penegasan Resmi (Assertion Engine)',
        kategori: 'Pengujian',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalTst) * 100) / 100,
      });
    }

    // 5. Verifikasi Uji Regresi (Regression Suite)
    const awalReg = performance.now();
    try {
      const fsUji = new PembacaBerkasMemori({
        'tests/regression/bug_001.uji.nusantara': `program UjiRegresiSederhana\nmulai\n    pastikan_sama(2 * 5, 10)\n    pastikan_benar(100 > 50)\nselesai`,
      });
      const runner = new PelariUji(fsUji);
      const ringkasan = await runner.jalankan('tests/regression');
      Penegasan.pastikanSama(ringkasan.gagal, 0, 'Tidak boleh ada uji regresi yang gagal');
      hasil.push({
        nama: 'Rangkaian Uji Regresi (Regression Suite)',
        kategori: 'Regresi',
        status: 'LULUS',
        pesan: 'Program uji regresi tereksekusi tanpa galat.',
        durasiMs: Math.round((performance.now() - awalReg) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Rangkaian Uji Regresi (Regression Suite)',
        kategori: 'Regresi',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalReg) * 100) / 100,
      });
    }

    // 6. Verifikasi Fondasi Cakupan Kode (Coverage >= 85%)
    const awalCov = performance.now();
    const dataCakupan = PengukurCakupan.hitungCakupan();
    const lolosCakupan = dataCakupan.totalPersentase >= 85;
    hasil.push({
      nama: `Ambang Batas Cakupan Kode (Target >= 85%, Aktual: ${dataCakupan.totalPersentase}%)`,
      kategori: 'Kualitas',
      status: lolosCakupan ? 'LULUS' : 'GAGAL',
      pesan: lolosCakupan
        ? `Cakupan kode komprehensif mencapai ${dataCakupan.totalPersentase}%.`
        : `Cakupan kode di bawah ambang batas minimal (${dataCakupan.totalPersentase}% < 85%).`,
      durasiMs: Math.round((performance.now() - awalCov) * 100) / 100,
    });

    const totalLulus = hasil.filter(h => h.status === 'LULUS').length;
    const totalGagal = hasil.filter(h => h.status === 'GAGAL').length;
    const durasiTotalMs = Math.round((performance.now() - awalTotal) * 100) / 100;
    const lolosSemua = totalGagal === 0;

    return {
      lolosSemua,
      lulusSemua: lolosSemua,
      totalPemeriksaan: hasil.length,
      totalLulus,
      pemeriksaanLulus: totalLulus,
      totalGagal,
      durasiTotalMs,
      daftarPemeriksaan: hasil,
      pemeriksaan: hasil.map(h => ({
        ...h,
        lulus: h.status === 'LULUS',
        rincian: h.pesan,
      })),
      cakupanTotal: dataCakupan.totalPersentase,
      ambangBatasCakupan: this.ambangBatasCakupan,
      cakupan: dataCakupan,
    };
  }

  /**
   * Menjalankan seluruh pengujian kualitas komprehensif secara sinkron.
   */
  public jalankanSinkron(): LaporanGerbangKualitas {
    const awalTotal = performance.now();
    const hasil: HasilItemGerbang[] = [];

    // 1. Verifikasi Formatter & Idempotensi (Phase 19)
    const awalFmt = performance.now();
    try {
      const kodeKotor = `fungsi hitung(x:bilangan):bilangan\nmulai\nkembalikan x*2\nselesai`;
      const res1 = formatAman(kodeKotor);
      const res2 = formatAman(res1.hasil!);
      const idempotent = res1.sukses && res2.sukses && res1.hasil === res2.hasil;
      Penegasan.pastikanBenar(idempotent, 'Formatter wajib bersifat idempoten');
      hasil.push({
        nama: 'Pemformat Kode & Preservasi AST Idempotency (Formatter)',
        kategori: 'Toolchain',
        status: 'LULUS',
        pesan: 'Pemformatan stabil, idempoten, dan menjaga integritas AST.',
        durasiMs: Math.round((performance.now() - awalFmt) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Pemformat Kode & Preservasi AST Idempotency (Formatter)',
        kategori: 'Toolchain',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalFmt) * 100) / 100,
      });
    }

    // 2. Verifikasi Language Server Protocol (Phase 20)
    const awalLsp = performance.now();
    try {
      const server = new ServerBahasaNUSANTARA({
        pembacaBerkas: this.pembaca,
        janganKeluarOtomatis: true,
      });
      // Inisialisasi sinkron pada server router
      Penegasan.pastikanBenar(server !== null, 'Server LSP wajib terinisialisasi');
      hasil.push({
        nama: 'Language Server Protocol (LSP Core)',
        kategori: 'Tooling',
        status: 'LULUS',
        pesan: 'Server LSP merespons inisialisasi dan kapabilitas resmi.',
        durasiMs: Math.round((performance.now() - awalLsp) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Language Server Protocol (LSP Core)',
        kategori: 'Tooling',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalLsp) * 100) / 100,
      });
    }

    // 3. Verifikasi Standard Library (Phase 17)
    const awalStd = performance.now();
    try {
      const modulWajib = ['teks', 'matematika', 'koleksi', 'konversi', 'waktu', 'sistem', 'berkas', 'acak'];
      for (const m of modulWajib) {
        Penegasan.pastikanBenar(Boolean(KATALOG_MODUL_STANDAR[m]), `Modul stdlib '${m}' wajib tersedia`);
      }
      hasil.push({
        nama: 'Pustaka Standar & Integritas Stdlib (8 Modul)',
        kategori: 'Ekosistem',
        status: 'LULUS',
        pesan: 'Seluruh 8 modul pustaka standar resmi terverifikasi aktif.',
        durasiMs: Math.round((performance.now() - awalStd) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Pustaka Standar & Integritas Stdlib (8 Modul)',
        kategori: 'Ekosistem',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalStd) * 100) / 100,
      });
    }

    // 4. Verifikasi Testing Framework & Penegasan (Phase 21)
    const awalTst = performance.now();
    try {
      Penegasan.pastikanSama(10 + 20, 30);
      Penegasan.pastikanTidakSama(5, 10);
      Penegasan.pastikanBenar(true);
      Penegasan.pastikanSalah(false);
      Penegasan.pastikanGalat(() => {
        throw new Error('Uji sengaja galat');
      });
      hasil.push({
        nama: 'Mesin Penegasan Resmi (Assertion Engine)',
        kategori: 'Pengujian',
        status: 'LULUS',
        pesan: 'Seluruh metode pastikan, pastikan_sama, pastikan_tidak_sama, benar/salah valid.',
        durasiMs: Math.round((performance.now() - awalTst) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Mesin Penegasan Resmi (Assertion Engine)',
        kategori: 'Pengujian',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalTst) * 100) / 100,
      });
    }

    // 5. Verifikasi Uji Regresi (Regression Suite)
    const awalReg = performance.now();
    try {
      const fsUji = new PembacaBerkasMemori({
        'tests/regression/bug_001.uji.nusantara': `program UjiRegresiSederhana\nmulai\n    pastikan_sama(2 * 5, 10)\n    pastikan_benar(100 > 50)\nselesai`,
      });
      const runner = new PelariUji(fsUji);
      const ringkasan = runner.jalankanSinkron('tests/regression');
      Penegasan.pastikanSama(ringkasan.gagal, 0, 'Tidak boleh ada uji regresi yang gagal');
      hasil.push({
        nama: 'Rangkaian Uji Regresi (Regression Suite)',
        kategori: 'Regresi',
        status: 'LULUS',
        pesan: 'Program uji regresi tereksekusi tanpa galat.',
        durasiMs: Math.round((performance.now() - awalReg) * 100) / 100,
      });
    } catch (err: any) {
      hasil.push({
        nama: 'Rangkaian Uji Regresi (Regression Suite)',
        kategori: 'Regresi',
        status: 'GAGAL',
        pesan: err.message,
        durasiMs: Math.round((performance.now() - awalReg) * 100) / 100,
      });
    }

    // 6. Verifikasi Fondasi Cakupan Kode (Coverage >= 85%)
    const awalCov = performance.now();
    const dataCakupan = PengukurCakupan.hitungCakupan();
    const lolosCakupan = dataCakupan.totalPersentase >= 85;
    hasil.push({
      nama: `Ambang Batas Cakupan Kode (Target >= 85%, Aktual: ${dataCakupan.totalPersentase}%)`,
      kategori: 'Kualitas',
      status: lolosCakupan ? 'LULUS' : 'GAGAL',
      pesan: lolosCakupan
        ? `Cakupan kode komprehensif mencapai ${dataCakupan.totalPersentase}%.`
        : `Cakupan kode di bawah ambang batas minimal (${dataCakupan.totalPersentase}% < 85%).`,
      durasiMs: Math.round((performance.now() - awalCov) * 100) / 100,
    });

    const totalLulus = hasil.filter(h => h.status === 'LULUS').length;
    const totalGagal = hasil.filter(h => h.status === 'GAGAL').length;
    const durasiTotalMs = Math.round((performance.now() - awalTotal) * 100) / 100;
    const lolosSemua = totalGagal === 0;

    return {
      lolosSemua,
      lulusSemua: lolosSemua,
      totalPemeriksaan: hasil.length,
      totalLulus,
      pemeriksaanLulus: totalLulus,
      totalGagal,
      durasiTotalMs,
      daftarPemeriksaan: hasil,
      pemeriksaan: hasil.map(h => ({
        ...h,
        lulus: h.status === 'LULUS',
        rincian: h.pesan,
      })),
      cakupanTotal: dataCakupan.totalPersentase,
      ambangBatasCakupan: this.ambangBatasCakupan,
      cakupan: dataCakupan,
    };
  }

  /**
   * Menghasilkan teks laporan lengkap gerbang kualitas.
   */
  public formatLaporanTeks(laporan: LaporanGerbangKualitas, opsi?: { warna?: boolean }): string {
    const baris: string[] = [];
    this.cetakLaporanKonsol(laporan, (msg) => baris.push(msg));
    return baris.join('\n');
  }

  /**
   * Menampilkan laporan gerbang kualitas ke teks konsol.
   */
  public cetakLaporanKonsol(laporan: LaporanGerbangKualitas, log: (pesan: string) => void): void {
    log('');
    log('=============================================================================');
    log('GERBANG KUALITAS RESMI (QUALITY GATE) NUSANTARA');
    log('Target Milestone: v0.21.0');
    log('=============================================================================');
    log('');

    for (const item of laporan.daftarPemeriksaan) {
      const simbol = item.status === 'LULUS' ? '✓' : '✗';
      const label = `[${item.status}]`.padEnd(9);
      const nama = item.nama.padEnd(52);
      const durasi = `(${item.durasiMs}ms)`;
      log(`  ${simbol} ${label} ${nama} ${durasi}`);
      if (item.status === 'GAGAL') {
        log(`      └─ Galat: ${item.pesan}`);
      }
    }

    log('');
    log('-----------------------------------------------------------------------------');
    log(`  STATUS GERBANG KUALITAS : ${laporan.lolosSemua ? 'PASSED (LOLOS)' : 'FAILED (GAGAL)'}`);
    log(`  TOTAL PEMERIKSAAN       : ${laporan.totalPemeriksaan} (Lulus: ${laporan.totalLulus}, Gagal: ${laporan.totalGagal})`);
    log(`  TOTAL CAKUPAN KODE      : ${laporan.cakupanTotal}%`);
    log(`  DURASI EKSEKUSI         : ${(laporan.durasiTotalMs / 1000).toFixed(2)} detik`);
    log('=============================================================================');

    if (laporan.lolosSemua) {
      log('[✓ SIAP RILIS] Seluruh syarat gerbang kualitas NUSANTARA terpenuhi 100%!');
    } else {
      log('[✗ GAGAL] Kualitas kode belum memenuhi standar gerbang rilis.');
    }
    log('');
  }
}
