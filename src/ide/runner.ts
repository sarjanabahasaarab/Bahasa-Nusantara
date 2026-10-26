/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mesin Eksekusi & Manajemen Proses IDE NUSANTARA (Phase 26)
 * Mengendalikan Run, Debug, Profiler, Testing, dan Build secara terkontrol tanpa proses zombie.
 */

import { StatusEksekusiIDE, LogKeluaranIDE } from './types';
import { Interpreter } from '../interpreter/interpreter';
import { PenulisOutputBuffer } from '../interpreter/outputWriter';
import { PenelusurNUSANTARA } from '../debugger/penelusur';
import { SesiDebug } from '../debugger/sesiDebug';
import { ProfilerNUSANTARA } from '../debugger/profiler';
import { LaporanProfil } from '../debugger/types';
import { MesinBuild, HasilBuild } from '../build';
import { PembacaBerkasMemori } from '../modul/pembacaBerkas';

export interface HasilEksekusiIDE {
  status: StatusEksekusiIDE;
  kodeKeluar: number;
  durasiMs: number;
  keluaran: LogKeluaranIDE[];
  laporanProfil?: LaporanProfil;
  hasilBuild?: HasilBuild;
  galat?: string;
}

export type PendengarLogIDE = (log: LogKeluaranIDE) => void;
export type PendengarStatusIDE = (status: StatusEksekusiIDE) => void;

export class PelariProsesIDE {
  private status: StatusEksekusiIDE = 'idle';
  private sesiDebugAktif?: SesiDebug;
  private penelusurAktif?: PenelusurNUSANTARA;
  private profilerAktif?: ProfilerNUSANTARA;
  private apakahDihentikan = false;
  private daftarLog: LogKeluaranIDE[] = [];
  private pendengarLogList: PendengarLogIDE[] = [];
  private pendengarStatusList: PendengarStatusIDE[] = [];

  public dapatkanStatus(): StatusEksekusiIDE {
    return this.status;
  }

  public dapatkanDaftarLog(): LogKeluaranIDE[] {
    return [...this.daftarLog];
  }

  public dapatkanSesiDebug(): SesiDebug | undefined {
    return this.sesiDebugAktif;
  }

  public dapatkanPenelusur(): PenelusurNUSANTARA | undefined {
    return this.penelusurAktif;
  }

  public pasangPendengarLog(fn: PendengarLogIDE): () => void {
    this.pendengarLogList.push(fn);
    return () => {
      this.pendengarLogList = this.pendengarLogList.filter(l => l !== fn);
    };
  }

  public pasangPendengarStatus(fn: PendengarStatusIDE): () => void {
    this.pendengarStatusList.push(fn);
    return () => {
      this.pendengarStatusList = this.pendengarStatusList.filter(s => s !== fn);
    };
  }

  public bersihkanLog(): void {
    this.daftarLog = [];
  }

  private setelStatus(s: StatusEksekusiIDE): void {
    this.status = s;
    for (const listener of this.pendengarStatusList) {
      listener(s);
    }
  }

  private catatLog(aliran: LogKeluaranIDE['aliran'], pesan: string): void {
    const item: LogKeluaranIDE = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      waktu: new Date().toLocaleTimeString(),
      aliran,
      pesan,
    };
    this.daftarLog.push(item);
    for (const listener of this.pendengarLogList) {
      listener(item);
    }
  }

  /**
   * Menjalankan program NUSANTARA secara standar (Run).
   */
  public jalankanProgram(
    berkasJalur: string,
    kodeSumber: string,
    direktoriBasis?: string
  ): HasilEksekusiIDE {
    this.apakahDihentikan = false;
    this.setelStatus('running');
    const waktuMulai = performance.now();

    this.catatLog('info', `[Mulai Eksekusi] ${berkasJalur}`);

    const buffer = new PenulisOutputBuffer();
    const interp = new Interpreter(buffer, {
      direktoriBasis: direktoriBasis || '.',
    });

    try {
      interp.jalankanKode(kodeSumber, direktoriBasis);

      // Ambil output eksekusi
      const outputList = buffer.dapatkanSeluruhTeks();
      for (const baris of outputList) {
        this.catatLog('stdout', baris);
      }

      const durasi = performance.now() - waktuMulai;
      this.catatLog('info', `[Selesai] Program keluar dengan kode 0 (${durasi.toFixed(1)}ms)`);
      this.setelStatus('finished');

      return {
        status: 'finished',
        kodeKeluar: 0,
        durasiMs: durasi,
        keluaran: this.dapatkanDaftarLog(),
      };
    } catch (err: any) {
      const durasi = performance.now() - waktuMulai;
      const pesanGalat = err?.message || String(err);
      this.catatLog('stderr', `[Galat Runtime] ${pesanGalat}`);
      this.catatLog('info', `[Gagal] Program keluar dengan kode 1 (${durasi.toFixed(1)}ms)`);
      this.setelStatus('failed');

      return {
        status: 'failed',
        kodeKeluar: 1,
        durasiMs: durasi,
        keluaran: this.dapatkanDaftarLog(),
        galat: pesanGalat,
      };
    }
  }

  /**
   * Menjalankan program dalam mode debugging interaktif (Phase 25).
   */
  public jalankanDebug(
    berkasJalur: string,
    kodeSumber: string,
    daftarTitikHenti: { baris: number; kondisi?: string }[] = [],
    penanganJeda?: (sesi: SesiDebug, alasan: string) => void
  ): HasilEksekusiIDE {
    this.apakahDihentikan = false;
    this.setelStatus('running');
    const waktuMulai = performance.now();

    this.catatLog('info', `[Mulai Sesi Debug] ${berkasJalur}`);

    const penelusur = new PenelusurNUSANTARA();
    this.penelusurAktif = penelusur;

    const sesi = penelusur.buatSesi({
      berkas: berkasJalur,
      sumber: kodeSumber,
    });
    this.sesiDebugAktif = sesi;

    // Daftarkan breakpoints
    for (const bp of daftarTitikHenti) {
      sesi.tambahBreakpoint(bp.baris, { kondisi: bp.kondisi });
    }

    penelusur.pasangPenanganJeda((s, alasan) => {
      this.setelStatus('paused');
      this.catatLog('info', `[Titik Henti Tercapai] Baris ${s.barisSaatIni} (${alasan})`);
      if (penanganJeda) {
        penanganJeda(s, alasan);
      }
      return 'continue';
    });

    try {
      penelusur.jalankan(sesi);
      const durasi = performance.now() - waktuMulai;
      this.setelStatus('finished');
      this.catatLog('info', `[Sesi Debug Selesai] (${durasi.toFixed(1)}ms)`);

      return {
        status: 'finished',
        kodeKeluar: 0,
        durasiMs: durasi,
        keluaran: this.dapatkanDaftarLog(),
      };
    } catch (err: any) {
      const durasi = performance.now() - waktuMulai;
      const pesan = err?.message || String(err);
      this.setelStatus('failed');
      this.catatLog('stderr', `[Debug Terhenti] ${pesan}`);

      return {
        status: 'failed',
        kodeKeluar: 1,
        durasiMs: durasi,
        keluaran: this.dapatkanDaftarLog(),
        galat: pesan,
      };
    }
  }

  /**
   * Menjalankan pengukuran performa fungsi dengan Profiler (Phase 25).
   */
  public jalankanProfiler(berkasJalur: string, kodeSumber: string): HasilEksekusiIDE {
    this.setelStatus('running');
    const waktuMulai = performance.now();

    this.catatLog('info', `[Mulai Pengukuran Profiler] ${berkasJalur}`);

    const profiler = new ProfilerNUSANTARA(true);
    this.profilerAktif = profiler;
    profiler.aktifkan(berkasJalur);

    const buffer = new PenulisOutputBuffer();
    const interp = new Interpreter(buffer, { profiler });

    try {
      interp.jalankanKode(kodeSumber);

      const laporan = profiler.buatLaporan(berkasJalur);
      const durasi = performance.now() - waktuMulai;

      // Cetak tabel profiler ke log
      const tabelTeks = ProfilerNUSANTARA.formatTabelKonsol(laporan);
      this.catatLog('info', '\n' + tabelTeks);

      this.setelStatus('finished');
      return {
        status: 'finished',
        kodeKeluar: 0,
        durasiMs: durasi,
        keluaran: this.dapatkanDaftarLog(),
        laporanProfil: laporan,
      };
    } catch (err: any) {
      const durasi = performance.now() - waktuMulai;
      const pesan = err?.message || String(err);
      this.setelStatus('failed');
      this.catatLog('stderr', `[Profiler Gagal] ${pesan}`);

      return {
        status: 'failed',
        kodeKeluar: 1,
        durasiMs: durasi,
        keluaran: this.dapatkanDaftarLog(),
        galat: pesan,
      };
    }
  }

  /**
   * Menghentikan paksa proses yang sedang berjalan.
   */
  public hentikanProses(): void {
    this.apakahDihentikan = true;
    this.setelStatus('terminated');
    this.catatLog('system', '[Proses Dihentikan oleh Pengguna]');
  }

  public hentikan(): void {
    this.hentikanProses();
  }
}
