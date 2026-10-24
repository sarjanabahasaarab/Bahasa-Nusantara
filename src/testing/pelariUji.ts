/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../parser/parser';
import { PemeriksaTipe } from '../tipe/pemeriksaTipe';
import { Interpreter } from '../interpreter/interpreter';
import { PenulisOutputBuffer } from '../interpreter/outputWriter';
import { PembacaBerkas, PembacaBerkasNode, ResolverModul, PemuatModul } from '../modul';
import { mesinDiagnostikDefault } from '../diagnostik';
import { PenemuUji } from './penemuUji';
import { GalatPenegasan } from './galatPenegasan';
import { HasilUji, HasilBerkasUji, RingkasanUji, OpsiRunnerUji, StatusUji } from './types';
import { KodeGalat } from '../diagnostik/kode';

/**
 * Mesin Pelari Pengujian (Test Runner & Executor) Resmi Bahasa NUSANTARA (Phase 21).
 */
export class PelariUji {
  private readonly pembaca: PembacaBerkas;
  private readonly opsi: OpsiRunnerUji;

  constructor(
    pembacaAtauOpsi?: PembacaBerkas | (OpsiRunnerUji & { pembaca?: PembacaBerkas }),
    opsi?: OpsiRunnerUji
  ) {
    if (pembacaAtauOpsi && typeof (pembacaAtauOpsi as any).apakahAda === 'function') {
      this.pembaca = pembacaAtauOpsi as PembacaBerkas;
      this.opsi = {
        timeoutMs: 5000,
        hentikanSaatGagal: false,
        ...opsi,
      };
    } else if (pembacaAtauOpsi) {
      const opt = pembacaAtauOpsi as (OpsiRunnerUji & { pembaca?: PembacaBerkas });
      this.pembaca = opt.pembaca || new PembacaBerkasNode();
      this.opsi = {
        timeoutMs: 5000,
        hentikanSaatGagal: false,
        ...opt,
        ...opsi,
      };
    } else {
      this.pembaca = new PembacaBerkasNode();
      this.opsi = {
        timeoutMs: 5000,
        hentikanSaatGagal: false,
        ...opsi,
      };
    }
  }

  /**
   * Menjalankan seluruh pengujian berdasarkan target berkas/direktori atau pencarian otomatis.
   */
  public async jalankan(
    targetPath?: string | string[],
    opsiLokal?: { filter?: string }
  ): Promise<RingkasanUji> {
    const filterAktif = opsiLokal?.filter || this.opsi.filter;
    const penemu = new PenemuUji(this.pembaca);
    const daftarBerkas = penemu.temukanBerkasUji(targetPath, filterAktif);

    const awalTotal = performance.now();
    const hasilBerkas: HasilBerkasUji[] = [];

    let totalUji = 0;
    let totalLulus = 0;
    let totalGagal = 0;
    let totalDilewati = 0;
    let totalGalat = 0;
    let berkasLulus = 0;
    let berkasGagal = 0;

    for (const jalur of daftarBerkas) {
      const res = await this.eksekusiBerkasUji(jalur);
      this.perkayaHasilBerkas(res);
      hasilBerkas.push(res);

      let berkasAdaGagal = false;
      for (const item of res.daftarHasil) {
        totalUji++;
        if (item.status === 'lulus' || item.status === StatusUji.LULUS) {
          totalLulus++;
        } else if (item.status === 'gagal' || item.status === StatusUji.GAGAL) {
          totalGagal++;
          berkasAdaGagal = true;
        } else if (item.status === 'galat' || item.status === StatusUji.GALAT) {
          totalGalat++;
          berkasAdaGagal = true;
        } else if (item.status === 'dilewati' || item.status === StatusUji.DILEWATI) {
          totalDilewati++;
        }
      }

      if (res.sukses && !berkasAdaGagal) {
        berkasLulus++;
      } else {
        berkasGagal++;
        if (this.opsi.hentikanSaatGagal) {
          break;
        }
      }
    }

    const durasiTotalMs = Math.round((performance.now() - awalTotal) * 100) / 100;
    const status = totalGagal > 0 || totalGalat > 0 ? StatusUji.GAGAL : StatusUji.LULUS;

    return {
      total: totalUji,
      totalUji,
      lulus: totalLulus,
      gagal: totalGagal + totalGalat,
      dilewati: totalDilewati,
      galat: totalGalat,
      durasiTotalMs,
      durasiMs: durasiTotalMs,
      berkasTotal: daftarBerkas.length,
      totalBerkas: daftarBerkas.length,
      berkasLulus,
      berkasGagal,
      daftarBerkas: hasilBerkas,
      berkas: hasilBerkas,
      status,
    };
  }

  /**
   * Menjalankan seluruh pengujian secara sinkron (berguna untuk CLI dan pengujian deterministik).
   */
  public jalankanSinkron(
    targetPath?: string | string[],
    opsiLokal?: { filter?: string }
  ): RingkasanUji {
    const filterAktif = opsiLokal?.filter || this.opsi.filter;
    const penemu = new PenemuUji(this.pembaca);
    const daftarBerkas = penemu.temukanBerkasUji(targetPath, filterAktif);

    const awalTotal = performance.now();
    const hasilBerkas: HasilBerkasUji[] = [];

    let totalUji = 0;
    let totalLulus = 0;
    let totalGagal = 0;
    let totalDilewati = 0;
    let totalGalat = 0;
    let berkasLulus = 0;
    let berkasGagal = 0;

    for (const jalur of daftarBerkas) {
      const res = this.eksekusiBerkasUjiSinkron(jalur);
      this.perkayaHasilBerkas(res);
      hasilBerkas.push(res);

      let berkasAdaGagal = false;
      for (const item of res.daftarHasil) {
        totalUji++;
        if (item.status === 'lulus' || item.status === StatusUji.LULUS) {
          totalLulus++;
        } else if (item.status === 'gagal' || item.status === StatusUji.GAGAL) {
          totalGagal++;
          berkasAdaGagal = true;
        } else if (item.status === 'galat' || item.status === StatusUji.GALAT) {
          totalGalat++;
          berkasAdaGagal = true;
        } else if (item.status === 'dilewati' || item.status === StatusUji.DILEWATI) {
          totalDilewati++;
        }
      }

      if (res.sukses && !berkasAdaGagal) {
        berkasLulus++;
      } else {
        berkasGagal++;
        if (this.opsi.hentikanSaatGagal) {
          break;
        }
      }
    }

    const durasiTotalMs = Math.round((performance.now() - awalTotal) * 100) / 100;
    const status = totalGagal > 0 || totalGalat > 0 ? StatusUji.GAGAL : StatusUji.LULUS;

    return {
      total: totalUji,
      totalUji,
      lulus: totalLulus,
      gagal: totalGagal + totalGalat,
      dilewati: totalDilewati,
      galat: totalGalat,
      durasiTotalMs,
      durasiMs: durasiTotalMs,
      berkasTotal: daftarBerkas.length,
      totalBerkas: daftarBerkas.length,
      berkasLulus,
      berkasGagal,
      daftarBerkas: hasilBerkas,
      berkas: hasilBerkas,
      status,
    };
  }

  private perkayaHasilBerkas(hb: HasilBerkasUji): void {
    hb.jalur = hb.jalurBerkas;
    hb.durasiMs = hb.durasiTotalMs;
    hb.daftarUji = hb.daftarHasil;
    hb.status = hb.sukses ? StatusUji.LULUS : StatusUji.GAGAL;
    hb.totalPenegasan = hb.daftarHasil.reduce((a, b) => a + (b.penegasanTotal || 1), 0);
    hb.penegasanLulus = hb.daftarHasil.reduce((a, b) => a + (b.penegasanLulus || 0), 0);
    hb.penegasanGagal = hb.totalPenegasan - hb.penegasanLulus;
    hb.daftarGalat = hb.daftarHasil
      .filter(h => h.status === 'gagal' || h.status === 'galat' || h.status === StatusUji.GAGAL || h.status === StatusUji.GALAT)
      .map(h => ({
        pesan: h.pesan || 'Penegasan gagal',
        kodeGalat: h.diagnostik?.kode || KodeGalat.TST_PENEGASAN_GAGAL,
        diharapkan: h.diharapkan,
        ditemukan: h.ditemukan,
        lokasi: h.lokasi,
      }));
    for (const h of hb.daftarHasil) {
      if (h.status === 'gagal' || h.status === 'galat' || h.status === StatusUji.GAGAL || h.status === StatusUji.GALAT) {
        h.galat = {
          pesan: h.pesan,
          diharapkan: h.diharapkan,
          ditemukan: h.ditemukan,
          kodeGalat: h.diagnostik?.kode || KodeGalat.TST_PENEGASAN_GAGAL,
          lokasi: h.lokasi,
        };
      }
    }
  }

  /**
   * Mengeksekusi satu berkas pengujian secara sinkron.
   */
  public eksekusiBerkasUjiSinkron(jalurBerkas: string): HasilBerkasUji {
    const awal = performance.now();
    const namaBerkas = jalurBerkas.split('/').pop() || jalurBerkas;
    const daftarHasil: HasilUji[] = [];

    let kodeSumber = '';
    try {
      if (!this.pembaca.apakahAda(jalurBerkas)) {
        throw new Error(`Berkas pengujian '${jalurBerkas}' tidak ditemukan.`);
      }
      kodeSumber = this.pembaca.baca(jalurBerkas);
    } catch (err: any) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        namaBerkas: jalurBerkas,
      });
      return {
        jalurBerkas,
        namaBerkas,
        sukses: false,
        durasiTotalMs: Math.round((performance.now() - awal) * 100) / 100,
        daftarHasil: [
          {
            nama: namaBerkas,
            berkas: jalurBerkas,
            status: 'galat',
            durasiMs: 0,
            pesan: err.message || 'Gagal membaca berkas uji.',
            diagnostik: diag,
            penegasanTotal: 1,
            penegasanLulus: 0,
          },
        ],
        galatFatal: err.message,
        diagnostikFatal: diag,
      };
    }

    // 1. Parsing Sintaksis
    let programAST: any;
    try {
      const parser = new Parser(kodeSumber);
      programAST = parser.parse();
      const galatParser = parser.dapatkanDaftarGalat();
      if (galatParser.length > 0) {
        throw galatParser[0];
      }
    } catch (err: any) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        kodeSumber,
        namaBerkas: jalurBerkas,
      });
      return {
        jalurBerkas,
        namaBerkas,
        sukses: false,
        durasiTotalMs: Math.round((performance.now() - awal) * 100) / 100,
        daftarHasil: [
          {
            nama: namaBerkas,
            berkas: jalurBerkas,
            status: 'galat',
            durasiMs: Math.round((performance.now() - awal) * 100) / 100,
            pesan: `Kesalahan Sintaksis (Parser): ${err.message}`,
            diagnostik: diag,
            penegasanTotal: 1,
            penegasanLulus: 0,
          },
        ],
        galatFatal: `Kesalahan sintaksis pada ${namaBerkas}`,
        diagnostikFatal: diag,
      };
    }

    // 2. Modul & Type Checking
    const direktoriBerkas = this.pembaca.direktoriDari(jalurBerkas) || '.';
    const resolver = new ResolverModul(this.pembaca, {
      direktoriAkarProyek: direktoriBerkas,
    });
    const pemuat = new PemuatModul(resolver, this.pembaca);

    try {
      const pemeriksaTipe = new PemeriksaTipe(pemuat);
      const galatTipe = pemeriksaTipe.periksa(programAST, direktoriBerkas);
      if (galatTipe.length > 0) {
        throw galatTipe[0];
      }
    } catch (err: any) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        kodeSumber,
        namaBerkas: jalurBerkas,
      });
      return {
        jalurBerkas,
        namaBerkas,
        sukses: false,
        durasiTotalMs: Math.round((performance.now() - awal) * 100) / 100,
        daftarHasil: [
          {
            nama: namaBerkas,
            berkas: jalurBerkas,
            status: 'galat',
            durasiMs: Math.round((performance.now() - awal) * 100) / 100,
            pesan: `Kesalahan Tipe (Type Error): ${err.message}`,
            diagnostik: diag,
            penegasanTotal: 1,
            penegasanLulus: 0,
          },
        ],
        galatFatal: `Kesalahan sistem tipe pada ${namaBerkas}`,
        diagnostikFatal: diag,
      };
    }

    // 3. Eksekusi Runtime Terisolasi
    const buffer = new PenulisOutputBuffer();
    const interpreter = new Interpreter(buffer, {
      pembacaBerkas: this.pembaca,
      resolverModul: resolver,
      pemuatModul: pemuat,
      direktoriBasis: direktoriBerkas,
    });

    const namaUji = programAST.namaProgram || namaBerkas.replace(/\.(uji|test)\.nusantara$/, '');

    try {
      interpreter.interpretasikan(programAST);

      const durasiMs = Math.round((performance.now() - awal) * 100) / 100;
      daftarHasil.push({
        nama: namaUji,
        berkas: jalurBerkas,
        status: 'lulus',
        durasiMs,
        penegasanTotal: 1,
        penegasanLulus: 1,
      });

      return {
        jalurBerkas,
        namaBerkas,
        sukses: true,
        durasiTotalMs: durasiMs,
        daftarHasil,
      };
    } catch (err: any) {
      const durasiMs = Math.round((performance.now() - awal) * 100) / 100;

      if (err instanceof GalatPenegasan) {
        const diag = err.keDiagnostik();
        daftarHasil.push({
          nama: err.namaUji || namaUji,
          berkas: jalurBerkas,
          status: 'gagal',
          durasiMs,
          pesan: err.pesanKhusus || err.message,
          diharapkan: err.diharapkan,
          ditemukan: err.ditemukan,
          lokasi: err.lokasi,
          diagnostik: diag,
          penegasanTotal: 1,
          penegasanLulus: 0,
        });

        return {
          jalurBerkas,
          namaBerkas,
          sukses: false,
          durasiTotalMs: durasiMs,
          daftarHasil,
          galatFatal: err.formatLaporanTeks(),
          diagnostikFatal: diag,
        };
      }

      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        kodeSumber,
        namaBerkas: jalurBerkas,
      });

      daftarHasil.push({
        nama: namaUji,
        berkas: jalurBerkas,
        status: 'galat',
        durasiMs,
        pesan: err.message || 'Terjadi kesalahan runtime selama pengujian.',
        diagnostik: diag,
        penegasanTotal: 1,
        penegasanLulus: 0,
      });

      return {
        jalurBerkas,
        namaBerkas,
        sukses: false,
        durasiTotalMs: durasiMs,
        daftarHasil,
        galatFatal: err.message,
        diagnostikFatal: diag,
      };
    }
  }

  /**
   * Mengeksekusi satu berkas pengujian dalam lingkungan runtime terisolasi.
   */
  public async eksekusiBerkasUji(jalurBerkas: string): Promise<HasilBerkasUji> {
    const awal = performance.now();
    const namaBerkas = jalurBerkas.split('/').pop() || jalurBerkas;
    const daftarHasil: HasilUji[] = [];

    let kodeSumber = '';
    try {
      if (!this.pembaca.apakahAda(jalurBerkas)) {
        throw new Error(`Berkas pengujian '${jalurBerkas}' tidak ditemukan.`);
      }
      kodeSumber = this.pembaca.baca(jalurBerkas);
    } catch (err: any) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        namaBerkas: jalurBerkas,
      });
      return {
        jalurBerkas,
        namaBerkas,
        sukses: false,
        durasiTotalMs: Math.round((performance.now() - awal) * 100) / 100,
        daftarHasil: [
          {
            nama: namaBerkas,
            berkas: jalurBerkas,
            status: 'galat',
            durasiMs: 0,
            pesan: err.message || 'Gagal membaca berkas uji.',
            diagnostik: diag,
            penegasanTotal: 1,
            penegasanLulus: 0,
          },
        ],
        galatFatal: err.message,
        diagnostikFatal: diag,
      };
    }

    // 1. Parsing Sintaksis
    let programAST: any;
    try {
      const parser = new Parser(kodeSumber);
      programAST = parser.parse();
      const galatParser = parser.dapatkanDaftarGalat();
      if (galatParser.length > 0) {
        throw galatParser[0];
      }
    } catch (err: any) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        kodeSumber,
        namaBerkas: jalurBerkas,
      });
      return {
        jalurBerkas,
        namaBerkas,
        sukses: false,
        durasiTotalMs: Math.round((performance.now() - awal) * 100) / 100,
        daftarHasil: [
          {
            nama: namaBerkas,
            berkas: jalurBerkas,
            status: 'galat',
            durasiMs: Math.round((performance.now() - awal) * 100) / 100,
            pesan: `Kesalahan Sintaksis (Parser): ${err.message}`,
            diagnostik: diag,
            penegasanTotal: 1,
            penegasanLulus: 0,
          },
        ],
        galatFatal: `Kesalahan sintaksis pada ${namaBerkas}`,
        diagnostikFatal: diag,
      };
    }

    // 2. Modul & Type Checking
    const direktoriBerkas = this.pembaca.direktoriDari(jalurBerkas) || '.';
    const resolver = new ResolverModul(this.pembaca, {
      direktoriAkarProyek: direktoriBerkas,
    });
    const pemuat = new PemuatModul(resolver, this.pembaca);

    try {
      const pemeriksaTipe = new PemeriksaTipe(pemuat);
      const galatTipe = pemeriksaTipe.periksa(programAST, direktoriBerkas);
      if (galatTipe.length > 0) {
        throw galatTipe[0];
      }
    } catch (err: any) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        kodeSumber,
        namaBerkas: jalurBerkas,
      });
      return {
        jalurBerkas,
        namaBerkas,
        sukses: false,
        durasiTotalMs: Math.round((performance.now() - awal) * 100) / 100,
        daftarHasil: [
          {
            nama: namaBerkas,
            berkas: jalurBerkas,
            status: 'galat',
            durasiMs: Math.round((performance.now() - awal) * 100) / 100,
            pesan: `Kesalahan Tipe (Type Error): ${err.message}`,
            diagnostik: diag,
            penegasanTotal: 1,
            penegasanLulus: 0,
          },
        ],
        galatFatal: `Kesalahan sistem tipe pada ${namaBerkas}`,
        diagnostikFatal: diag,
      };
    }

    // 3. Eksekusi Runtime Terisolasi dengan Perlindungan Batas Waktu (Timeout)
    const buffer = new PenulisOutputBuffer();
    const interpreter = new Interpreter(buffer, {
      pembacaBerkas: this.pembaca,
      resolverModul: resolver,
      pemuatModul: pemuat,
      direktoriBasis: direktoriBerkas,
    });

    const namaUji = programAST.namaProgram || namaBerkas.replace(/\.(uji|test)\.nusantara$/, '');

    try {
      // Jalankan dengan batas waktu
      await this.eksekusiDenganTimeout(
        () => interpreter.interpretasikan(programAST),
        this.opsi.timeoutMs || 5000
      );

      const durasiMs = Math.round((performance.now() - awal) * 100) / 100;
      daftarHasil.push({
        nama: namaUji,
        berkas: jalurBerkas,
        status: 'lulus',
        durasiMs,
        penegasanTotal: 1,
        penegasanLulus: 1,
      });

      return {
        jalurBerkas,
        namaBerkas,
        sukses: true,
        durasiTotalMs: durasiMs,
        daftarHasil,
      };
    } catch (err: any) {
      const durasiMs = Math.round((performance.now() - awal) * 100) / 100;

      if (err instanceof GalatPenegasan) {
        // Kegagalan Assertion Penegasan
        const diag = err.keDiagnostik();
        daftarHasil.push({
          nama: err.namaUji || namaUji,
          berkas: jalurBerkas,
          status: 'gagal',
          durasiMs,
          pesan: err.pesanKhusus || err.message,
          diharapkan: err.diharapkan,
          ditemukan: err.ditemukan,
          lokasi: err.lokasi,
          diagnostik: diag,
          penegasanTotal: 1,
          penegasanLulus: 0,
        });

        return {
          jalurBerkas,
          namaBerkas,
          sukses: false,
          durasiTotalMs: durasiMs,
          daftarHasil,
          galatFatal: err.formatLaporanTeks(),
          diagnostikFatal: diag,
        };
      }

      // Galat Runtime / Timeout / Crash
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        kodeSumber,
        namaBerkas: jalurBerkas,
      });

      const apakahTimeout = err.message && err.message.includes('Batas waktu eksekusi');
      if (apakahTimeout) {
        diag.kode = KodeGalat.TST_BATAS_WAKTU_TERLAMPAUI;
      }

      daftarHasil.push({
        nama: namaUji,
        berkas: jalurBerkas,
        status: apakahTimeout ? 'gagal' : 'galat',
        durasiMs,
        pesan: err.message || 'Terjadi kesalahan runtime selama pengujian.',
        diagnostik: diag,
        penegasanTotal: 1,
        penegasanLulus: 0,
      });

      return {
        jalurBerkas,
        namaBerkas,
        sukses: false,
        durasiTotalMs: durasiMs,
        daftarHasil,
        galatFatal: err.message,
        diagnostikFatal: diag,
      };
    }
  }

  /**
   * Menjalankan aksi dengan proteksi batas waktu (timeout).
   */
  private async eksekusiDenganTimeout<T>(aksi: () => T, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let selesai = false;
      const timer = setTimeout(() => {
        if (!selesai) {
          selesai = true;
          reject(new Error(`Batas waktu eksekusi pengujian terlampaui (${timeoutMs}ms).`));
        }
      }, timeoutMs);

      try {
        const res = aksi();
        selesai = true;
        clearTimeout(timer);
        resolve(res);
      } catch (err) {
        selesai = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  }
}
