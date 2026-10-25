/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mesin Penelusur (Debugger Engine) Resmi Bahasa NUSANTARA (Phase 25)
 */

import { NodeProgram, PernyataanAST } from '../parser/ast';
import { Parser } from '../parser/parser';
import { Interpreter, KaitDebugInterpreter, KonteksDebugPernyataan } from '../interpreter/interpreter';
import { PenulisOutputBuffer } from '../interpreter/outputWriter';
import { Lingkungan } from '../interpreter/environment';
import { NilaiRuntime, JenisNilaiRuntime, formatNilaiTeks } from '../interpreter/nilai';
import { GalatRuntime, BingkaiTumpukan } from '../interpreter/galat';
import { MesinDiagnostik, KodeGalat, KategoriDiagnostik, TingkatDiagnostik, Diagnostik } from '../diagnostik';
import { SesiDebug, OpsiSesiDebug } from './sesiDebug';
import { PengelolaBreakpoint } from './breakpointManager';
import { ProfilerNUSANTARA } from './profiler';
import {
  StatusSesiDebug,
  AlasanJeda,
  AksiDebug,
  BingkaiDebug,
  InfoVariabelDebug,
  Breakpoint,
} from './types';

export class SinyalTerminasiDebug extends Error {
  constructor(pesan: string = 'Sesi debugging dihentikan oleh pengguna.') {
    super(pesan);
    this.name = 'SinyalTerminasiDebug';
  }
}

export type PenanganJeda = (sesi: SesiDebug, alasan: AlasanJeda) => AksiDebug;

/**
 * Mesin Penelusur Eksekusi (Debugger) Bahasa NUSANTARA.
 * Mengontrol eksekusi program baris-per-baris, jeda titik henti (breakpoint),
 * inspeksi variabel, navigasi call stack, dan evaluasi ekspresi langsung.
 */
export class PenelusurNUSANTARA {
  private sesiAktif?: SesiDebug;
  private interpreter?: Interpreter;
  private modeLangkah: 'none' | 'step_into' | 'step_over' | 'step_out' = 'none';
  private kedalamanTumpukanTarget = 0;
  private penanganJeda?: PenanganJeda;
  private jedaDiminta = false;
  private readonly pengelolaBreakpoint: PengelolaBreakpoint;

  constructor(pengelolaBP?: PengelolaBreakpoint) {
    this.pengelolaBreakpoint = pengelolaBP || new PengelolaBreakpoint();
  }

  public dapatkanPengelolaBreakpoint(): PengelolaBreakpoint {
    return this.pengelolaBreakpoint;
  }

  public dapatkanSesiAktif(): SesiDebug | undefined {
    return this.sesiAktif;
  }

  public pasangPenanganJeda(penangan: PenanganJeda): void {
    this.penanganJeda = penangan;
  }

  /**
   * Membuat dan menginisialisasi sesi penelusuran baru.
   */
  public buatSesi(opsi: OpsiSesiDebug): SesiDebug {
    this.sesiAktif = new SesiDebug(opsi, this.pengelolaBreakpoint);
    this.modeLangkah = 'none';
    this.jedaDiminta = false;
    return this.sesiAktif;
  }

  /**
   * Menambahkan breakpoint melalui debugger engine.
   */
  public tambahBreakpoint(
    berkas: string,
    baris: number,
    opsi?: { kolom?: number; kondisi?: string; sementara?: boolean }
  ) {
    return this.pengelolaBreakpoint.tambahBreakpoint(berkas, baris, {
      ...opsi,
      barisTereksekusi: this.sesiAktif?.barisTereksekusi,
    });
  }

  /**
   * Menghapus breakpoint berdasarkan ID.
   */
  public hapusBreakpoint(id: number): boolean {
    return this.pengelolaBreakpoint.hapusBreakpoint(id);
  }

  /**
   * Membersihkan seluruh breakpoint yang terdaftar.
   */
  public bersihkanBreakpoint(): void {
    this.pengelolaBreakpoint.bersihkan();
  }

  /**
   * Meminta jeda eksekusi sesegera mungkin pada pernyataan berikutnya.
   */
  public mintaJeda(): void {
    this.jedaDiminta = true;
  }

  /**
   * Menjalankan program NUSANTARA dalam mode debugging terkelola.
   */
  public jalankan(sesi?: SesiDebug): SesiDebug {
    const sesiTarget = sesi || this.sesiAktif;
    if (!sesiTarget) {
      throw new Error('Tidak ada sesi debug aktif untuk dijalankan.');
    }
    this.sesiAktif = sesiTarget;

    const outputBuffer = new PenulisOutputBuffer();
    const kaitDebug: KaitDebugInterpreter = {
      sebelumPernyataan: (stmt, konteks) => this.padaSebelumPernyataan(stmt, konteks),
      setelahPernyataan: (stmt, konteks) => this.padaSetelahPernyataan(stmt, konteks),
      sebelumPanggilanFungsi: (namaFn) => {},
      setelahPanggilanFungsi: (namaFn) => {},
      padaGalat: (galat, konteks) => this.padaGalatRuntime(galat, konteks),
    };

    this.interpreter = new Interpreter(outputBuffer, {
      kaitDebug,
    });

    sesiTarget.status = 'running';
    sesiTarget.catatPeristiwa('ExecutionResumed', 'Program mulai dieksekusi.');

    try {
      this.interpreter.jalankanKode(sesiTarget.teksSumber, sesiTarget.berkasSumber);
      sesiTarget.status = 'finished';
      sesiTarget.catatPeristiwa('ProgramFinished', 'Program selesai dieksekusi secara normal.');
    } catch (e: any) {
      if (e instanceof SinyalTerminasiDebug) {
        sesiTarget.status = 'terminated';
        sesiTarget.catatPeristiwa('ProgramTerminated', 'Sesi penelusuran dihentikan oleh pengguna.');
      } else if (e instanceof GalatRuntime) {
        sesiTarget.status = 'failed';
        sesiTarget.galatTerakhir = e;
        sesiTarget.catatPeristiwa('RuntimeError', `Galat runtime: ${e.message}`, { galat: e });
      } else {
        sesiTarget.status = 'failed';
        sesiTarget.catatPeristiwa('RuntimeError', `Galat tak terduga: ${e?.message || e}`);
        throw e;
      }
    } finally {
      // Salin keluaran program ke sesi debug
      sesiTarget.outputEksekusi.push(...outputBuffer.dapatkanSeluruhTeks());
    }

    return sesiTarget;
  }

  private padaSebelumPernyataan(stmt: PernyataanAST, konteks: KonteksDebugPernyataan): void {
    if (!this.sesiAktif) return;
    const baris = stmt.posisi?.awal?.baris || 1;
    const kolom = stmt.posisi?.awal?.kolom || 1;
    const berkas = this.sesiAktif.berkasSumber;
    const kedalaman = konteks.tumpukanPanggilan.length;

    let harusJeda = false;
    let alasanJeda: AlasanJeda = 'langkah';
    let detailJeda: string | undefined;

    // 1. Periksa jeda manual pengguna
    if (this.jedaDiminta) {
      this.jedaDiminta = false;
      harusJeda = true;
      alasanJeda = 'jeda_manual';
      detailJeda = 'Jeda manual diminta oleh pengguna';
    }

    // 2. Periksa Breakpoint pada baris ini
    const bp = this.pengelolaBreakpoint.temukanBreakpoint(berkas, baris);
    if (bp) {
      bp.jumlahHit += 1;
      let kondisiTerpenuhi = true;

      // Evaluasi kondisi breakpoint jika ada (e.g. `x > 5`)
      if (bp.kondisi && bp.kondisi.trim().length > 0) {
        try {
          const hasil = this.sesiAktif.evaluasiEkspresi(bp.kondisi, undefined, konteks.lingkungan);
          kondisiTerpenuhi =
            hasil.berhasil &&
            hasil.nilai !== undefined &&
            hasil.nilai.jenis === JenisNilaiRuntime.LOGIKA &&
            (hasil.nilai as any).nilai === true;
        } catch {
          kondisiTerpenuhi = false;
        }
      }

      if (kondisiTerpenuhi) {
        harusJeda = true;
        alasanJeda = 'breakpoint';
        detailJeda = `Titik henti #${bp.id} tercapai (Hit: ${bp.jumlahHit})${
          bp.kondisi ? ` [Kondisi: ${bp.kondisi}]` : ''
        }`;

        if (bp.sementara) {
          this.pengelolaBreakpoint.hapusBreakpoint(bp.id);
        }

        this.sesiAktif.catatPeristiwa('BreakpointHit', detailJeda, {
          breakpointId: bp.id,
          baris,
          jumlahHit: bp.jumlahHit,
        });
      }
    }

    // 3. Periksa mode langkah eksekusi (Step Execution)
    if (!harusJeda) {
      if (this.modeLangkah === 'step_into') {
        harusJeda = true;
        alasanJeda = 'langkah';
        detailJeda = 'Langkah masuk (step-in) selesai';
      } else if (this.modeLangkah === 'step_over') {
        if (kedalaman <= this.kedalamanTumpukanTarget) {
          harusJeda = true;
          alasanJeda = 'langkah';
          detailJeda = 'Langkah lewati (step-over) selesai';
        }
      } else if (this.modeLangkah === 'step_out') {
        if (kedalaman < this.kedalamanTumpukanTarget) {
          harusJeda = true;
          alasanJeda = 'langkah';
          detailJeda = 'Langkah keluar (step-out) selesai';
        }
      }
    }

    if (harusJeda) {
      this.tanganiJeda(stmt, konteks, alasanJeda, detailJeda);
    }
  }

  private padaSetelahPernyataan(stmt: PernyataanAST, konteks: KonteksDebugPernyataan): void {
    // Dipanggil setelah eksekusi satu pernyataan selesai
  }

  private padaGalatRuntime(galat: GalatRuntime, konteks: KonteksDebugPernyataan): void {
    if (!this.sesiAktif) return;
    this.sesiAktif.status = 'failed';
    this.sesiAktif.galatTerakhir = galat;

    // Perbarui bingkai tumpukan saat galat terjadi
    this.bangunBingkaiTumpukan(this.sesiAktif.pernyataanSaatIni, konteks);

    // Integrasi Diagnostic Engine (Phase 18)
    const diag: Diagnostik = {
      kode: KodeGalat.RUN_OPERASI_TIDAK_VALID,
      pesan: galat.message,
      tingkat: TingkatDiagnostik.KESALAHAN,
      kategori: KategoriDiagnostik.RUNTIME,
      lokasi: galat.posisi ? { baris: galat.posisi.baris, kolom: galat.posisi.kolom } : { baris: 1, kolom: 1 },
      saran: 'Periksa variabel dan operasi tipe data sebelum eksekusi pada baris ini.',
    };
    this.sesiAktif.daftarDiagnostik.push(diag);

    if (this.penanganJeda) {
      const aksi = this.penanganJeda(this.sesiAktif, 'galat_runtime');
      if (aksi === 'terminate') {
        throw new SinyalTerminasiDebug('Penelusuran diakhiri setelah galat runtime.');
      }
    }
  }

  private tanganiJeda(
    stmt: PernyataanAST,
    konteks: KonteksDebugPernyataan,
    alasan: AlasanJeda,
    detail?: string
  ): void {
    if (!this.sesiAktif) return;

    this.sesiAktif.status = 'paused';
    this.sesiAktif.alasanJeda = alasan;
    this.sesiAktif.detailJeda = detail;
    this.sesiAktif.pernyataanSaatIni = stmt;
    this.sesiAktif.barisSaatIni = stmt.posisi?.awal?.baris || 1;
    this.sesiAktif.kolomSaatIni = stmt.posisi?.awal?.kolom || 1;

    // Bangun snapshot bingkai tumpukan dan variabel
    this.bangunBingkaiTumpukan(stmt, konteks);

    // Perbarui watch expressions
    this.sesiAktif.perbaruiSemuaPantau();

    this.sesiAktif.catatPeristiwa('ExecutionPaused', detail || `Dijeda (${alasan})`, {
      baris: this.sesiAktif.barisSaatIni,
      kolom: this.sesiAktif.kolomSaatIni,
      alasan,
    });

    // Panggil penangan jeda jika ada
    let aksi: AksiDebug = 'continue';
    if (this.penanganJeda) {
      aksi = this.penanganJeda(this.sesiAktif, alasan);
    }

    this.terapkanAksiLanjutan(aksi, konteks.tumpukanPanggilan.length);
  }

  private bangunBingkaiTumpukan(
    stmtSaatIni: PernyataanAST | undefined,
    konteks: KonteksDebugPernyataan
  ): void {
    if (!this.sesiAktif) return;
    const daftarBingkai: BingkaiDebug[] = [];
    const tumpukan = konteks.tumpukanPanggilan;
    const lingkungan = konteks.lingkungan;

    // Bingkai 0: Lokasi aktif saat ini
    const namaKonteksTeratas =
      tumpukan.length > 0 ? tumpukan[tumpukan.length - 1].namaKonteks : '<utama>';
    const variabelLokal0 = new Map<string, InfoVariabelDebug>();

    // Kumpulkan seluruh variabel lokal dari rantai lingkup blok aktif
    let lingkupTelusur: Lingkungan | undefined = lingkungan;
    while (lingkupTelusur) {
      for (const [nama, entri] of lingkupTelusur.dapatkanSemuaSimbol().entries()) {
        if (entri.nilai.jenis === JenisNilaiRuntime.FUNGSI_BAWAAN) continue;
        if (!variabelLokal0.has(nama)) {
          variabelLokal0.set(nama, {
            nama,
            tipe: entri.tipeData || entri.nilai.jenis,
            nilai: entri.nilai,
            formatTeks: formatNilaiTeks(entri.nilai),
            tetap: entri.tetap,
          });
        }
      }
      lingkupTelusur = lingkupTelusur.induk;
    }

    daftarBingkai.push({
      indeks: 0,
      namaFungsi: namaKonteksTeratas,
      berkas: this.sesiAktif.berkasSumber,
      baris: stmtSaatIni?.posisi?.awal?.baris || this.sesiAktif.barisSaatIni,
      kolom: stmtSaatIni?.posisi?.awal?.kolom || this.sesiAktif.kolomSaatIni,
      lingkungan,
      variabelLokal: variabelLokal0,
      lingkupNama: 'Lokal',
      nodeAST: stmtSaatIni,
    });

    // Bingkai 1..N: Bingkai pemanggil sebelumnya dalam call stack
    let lingkupInduk = lingkungan.induk;
    for (let i = tumpukan.length - 2; i >= 0; i--) {
      const b = tumpukan[i];
      const varLokal = new Map<string, InfoVariabelDebug>();
      if (lingkupInduk) {
        for (const [nama, entri] of lingkupInduk.dapatkanSemuaSimbol().entries()) {
          varLokal.set(nama, {
            nama,
            tipe: entri.tipeData || entri.nilai.jenis,
            nilai: entri.nilai,
            formatTeks: formatNilaiTeks(entri.nilai),
            tetap: entri.tetap,
          });
        }
      }

      daftarBingkai.push({
        indeks: daftarBingkai.length,
        namaFungsi: b.namaKonteks,
        berkas: b.berkas || this.sesiAktif.berkasSumber,
        baris: b.posisi?.baris || 1,
        kolom: b.posisi?.kolom || 1,
        lingkungan: lingkupInduk || lingkungan,
        variabelLokal: varLokal,
        lingkupNama: `Pemanggil (${b.namaKonteks})`,
      });

      if (lingkupInduk) lingkupInduk = lingkupInduk.induk;
    }

    // Bingkai dasar (Program Utama) jika pemanggilan berada dalam fungsi
    if (tumpukan.length > 0) {
      daftarBingkai.push({
        indeks: daftarBingkai.length,
        namaFungsi: '<utama>',
        berkas: this.sesiAktif.berkasSumber,
        baris: 1,
        kolom: 1,
        lingkungan: this.sesiAktif.lingkunganGlobal || lingkungan,
        variabelLokal: new Map(),
        lingkupNama: 'Utama',
      });
    }

    this.sesiAktif.tumpukanBingkai = daftarBingkai;
    this.sesiAktif.indeksBingkaiAktif = 0;
  }

  private terapkanAksiLanjutan(aksi: AksiDebug, kedalamanTumpukanSaatIni: number): void {
    if (aksi === 'terminate') {
      throw new SinyalTerminasiDebug();
    } else if (aksi === 'step_into') {
      this.modeLangkah = 'step_into';
    } else if (aksi === 'step_over') {
      this.modeLangkah = 'step_over';
      this.kedalamanTumpukanTarget = kedalamanTumpukanSaatIni;
    } else if (aksi === 'step_out') {
      this.modeLangkah = 'step_out';
      this.kedalamanTumpukanTarget = kedalamanTumpukanSaatIni;
    } else {
      // continue
      this.modeLangkah = 'none';
    }
  }
}
