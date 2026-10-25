/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Penggerak CLI Debugger & Profiler Bahasa NUSANTARA (Phase 25)
 */

import { PenelusurNUSANTARA } from './penelusur';
import { SesiDebug } from './sesiDebug';
import { ProfilerNUSANTARA } from './profiler';
import { AksiDebug } from './types';
import { Interpreter } from '../interpreter/interpreter';
import { PenulisOutputKonsol, PenulisOutputBuffer } from '../interpreter/outputWriter';
import { PembacaBerkas } from '../modul';

export interface OpsiEksekusiDebuggerCLI {
  berkas: string;
  sumber: string;
  perintahAwal?: string[]; // Daftar perintah batch otomatis (e.g. ['break 12', 'continue', 'print x', 'quit'])
  log?: (pesan: string) => void;
  error?: (pesan: string) => void;
  verbose?: boolean;
}

/**
 * Driver antarmuka baris perintah (CLI) untuk debugger interaktif & batch.
 */
export class PelariDebuggerCLI {
  private readonly penelusur: PenelusurNUSANTARA;
  private readonly log: (pesan: string) => void;
  private readonly error: (pesan: string) => void;
  private antreanPerintah: string[] = [];

  constructor(opsi?: { log?: (pesan: string) => void; error?: (pesan: string) => void }) {
    this.penelusur = new PenelusurNUSANTARA();
    this.log = opsi?.log || (typeof console !== 'undefined' ? console.log : () => {});
    this.error = opsi?.error || (typeof console !== 'undefined' ? console.error : () => {});
  }

  /**
   * Menjalankan sesi debugging program melalui CLI.
   */
  public jalankan(opsi: OpsiEksekusiDebuggerCLI): SesiDebug {
    const sesi = this.penelusur.buatSesi({
      berkas: opsi.berkas,
      sumber: opsi.sumber,
    });

    if (opsi.perintahAwal && opsi.perintahAwal.length > 0) {
      this.antreanPerintah = [...opsi.perintahAwal];
    }

    this.log(`NUSANTARA Debugger v0.25.0`);
    this.log(`Memulai debugging pada berkas: ${opsi.berkas}`);
    this.log(`Ketik 'bantuan' atau 'help' untuk melihat daftar perintah penelusuran.\n`);

    // Daftarkan penangan jeda interaktif / batch
    this.penelusur.pasangPenanganJeda((s, alasan) => {
      this.log(s.dapatkanRingkasanKonteks());

      // Jika ada watch expressions, tampilkan
      if (s.daftarEkspresiPantau.length > 0) {
        this.log('Ekspresi Pantau (Watch):');
        for (const w of s.daftarEkspresiPantau) {
          const val = w.status === 'sukses' ? `${w.nilai} (${w.tipe})` : `[Galat: ${w.galat}]`;
          this.log(`  #${w.id}: ${w.ekspresi} = ${val}`);
        }
        this.log('');
      }

      // Loop interaktif sampai perintah lanjutan (continue/step/quit) diberikan
      while (true) {
        const barisPerintah = this.ambilPerintahBerikutnya();
        if (!barisPerintah) {
          // Default jika antrean habis: lanjutkan eksekusi
          return 'continue';
        }

        const aksi = this.eksekusiSatuPerintah(s, barisPerintah);
        if (aksi) {
          return aksi;
        }
      }
    });

    return this.penelusur.jalankan(sesi);
  }

  private ambilPerintahBerikutnya(): string | undefined {
    if (this.antreanPerintah.length > 0) {
      return this.antreanPerintah.shift()?.trim();
    }
    return undefined;
  }

  /**
   * Mengeksekusi satu baris perintah debugger.
   * Mengembalikan AksiDebug jika perintah melanjutkan/mengubah langkah eksekusi,
   * atau undefined jika perintah hanya melakukan inspeksi.
   */
  public eksekusiSatuPerintah(sesi: SesiDebug, barisPerintah: string): AksiDebug | undefined {
    const p = barisPerintah.trim();
    if (!p) return undefined;

    const bagian = p.split(/\s+/);
    const cmd = bagian[0].toLowerCase();
    const argumen = p.slice(cmd.length).trim();

    switch (cmd) {
      // 1. Eksekusi lanjutan
      case 'c':
      case 'continue':
      case 'lanjut':
        this.log('(nusantara-debug) Melanjutkan eksekusi...');
        return 'continue';

      case 's':
      case 'step':
      case 'langkah':
      case 'step-in':
        this.log('(nusantara-debug) Melangkah masuk...');
        return 'step_into';

      case 'n':
      case 'next':
      case 'lewati':
      case 'step-over':
        this.log('(nusantara-debug) Melangkah lewati...');
        return 'step_over';

      case 'fin':
      case 'finish':
      case 'keluar-fungsi':
      case 'step-out':
        this.log('(nusantara-debug) Melangkah keluar fungsi...');
        return 'step_out';

      case 'q':
      case 'quit':
      case 'keluar':
        this.log('(nusantara-debug) Menghentikan sesi debugging.');
        return 'terminate';

      // 2. Breakpoint
      case 'b':
      case 'break':
      case 'henti': {
        if (!argumen) {
          this.log("Gunakan: break <nomor_baris> [when <kondisi>] atau henti <baris> [jika <kondisi>]");
          return undefined;
        }

        let barisStr = argumen;
        let kondisi: string | undefined;

        if (argumen.includes('when')) {
          const split = argumen.split(/\bwhen\b/);
          barisStr = split[0].trim();
          kondisi = split[1]?.trim();
        } else if (argumen.includes('jika')) {
          const split = argumen.split(/\bjika\b/);
          barisStr = split[0].trim();
          kondisi = split[1]?.trim();
        }

        const barisNo = parseInt(barisStr, 10);
        if (isNaN(barisNo)) {
          this.log(`Nomor baris tidak valid: '${barisStr}'`);
          return undefined;
        }

        const res = sesi.tambahBreakpoint(barisNo, { kondisi });
        if (res.validasi.valid) {
          this.log(
            `Titik henti #${res.breakpoint.id} dipasang pada baris ${res.breakpoint.baris}${
              kondisi ? ` [Kondisi: ${kondisi}]` : ''
            }`
          );
        } else {
          this.log(res.validasi.pesan);
          if (res.validasi.barisDiusulkan) {
            this.log(`Titik henti dipasang pada baris alternatif: ${res.breakpoint.baris}`);
          }
        }
        return undefined;
      }

      case 'd':
      case 'delete':
      case 'hapus':
      case 'hapus-henti': {
        const id = parseInt(argumen, 10);
        if (isNaN(id)) {
          this.log("Gunakan: delete <id_breakpoint>");
          return undefined;
        }
        const sukses = sesi.hapusBreakpoint(id);
        this.log(sukses ? `Titik henti #${id} dihapus.` : `Titik henti #${id} tidak ditemukan.`);
        return undefined;
      }

      case 'breakpoints':
      case 'daftar-henti':
      case 'info-b': {
        const daftar = sesi.pengelolaBreakpoint.dapatkanSemua();
        if (daftar.length === 0) {
          this.log('Tidak ada titik henti (breakpoint) yang terpasang.');
        } else {
          this.log('Daftar Titik Henti:');
          for (const bp of daftar) {
            this.log(
              `  #${bp.id} | Baris ${bp.baris} | Hit: ${bp.jumlahHit} | ${bp.aktif ? 'Aktif' : 'Non-aktif'}${
                bp.kondisi ? ` | Kondisi: ${bp.kondisi}` : ''
              }`
            );
          }
        }
        return undefined;
      }

      // 3. Inspeksi Variabel
      case 'l':
      case 'locals':
      case 'variabel':
      case 'lokal': {
        const vars = sesi.dapatkanVariabelLokal();
        if (vars.size === 0) {
          this.log('Tidak ada variabel lokal pada bingkai saat ini.');
        } else {
          this.log('Variabel Lokal:');
          for (const [k, v] of vars.entries()) {
            this.log(`  ${k} : ${v.tipe} = ${v.formatTeks}${v.tetap ? ' (tetap)' : ''}`);
          }
        }
        return undefined;
      }

      case 'g':
      case 'globals':
      case 'global': {
        const globals = sesi.dapatkanVariabelGlobal();
        if (globals.size === 0) {
          this.log('Tidak ada variabel global.');
        } else {
          this.log('Variabel Global:');
          for (const [k, v] of globals.entries()) {
            this.log(`  ${k} : ${v.tipe} = ${v.formatTeks}${v.tetap ? ' (tetap)' : ''}`);
          }
        }
        return undefined;
      }

      // 4. Evaluasi Ekspresi
      case 'p':
      case 'print':
      case 'cetak': {
        if (!argumen) {
          this.log("Gunakan: print <ekspresi> atau cetak <ekspresi>");
          return undefined;
        }
        const hasil = sesi.evaluasiEkspresi(argumen);
        if (hasil.berhasil) {
          this.log(`${argumen} = ${hasil.formatTeks} (${hasil.tipe})`);
        } else {
          this.log(`Galat evaluasi: ${hasil.galat}`);
        }
        return undefined;
      }

      // 5. Watch Expressions
      case 'w':
      case 'watch':
      case 'pantau': {
        if (!argumen) {
          this.log("Gunakan: watch <ekspresi> atau pantau <ekspresi>");
          return undefined;
        }
        const pantau = sesi.tambahPantau(argumen);
        this.log(`Ekspresi pantau #${pantau.id} ditambahkan: ${argumen}`);
        return undefined;
      }

      case 'unwatch':
      case 'hapus-pantau': {
        const id = parseInt(argumen, 10);
        if (isNaN(id)) {
          this.log("Gunakan: unwatch <id>");
          return undefined;
        }
        const sukses = sesi.hapusPantau(id);
        this.log(sukses ? `Ekspresi pantau #${id} dihapus.` : `Ekspresi pantau #${id} tidak ditemukan.`);
        return undefined;
      }

      // 6. Call Stack & Navigation
      case 'bt':
      case 'stack':
      case 'tumpukan': {
        const stack = sesi.tumpukanBingkai;
        if (stack.length === 0) {
          this.log('Tumpukan panggilan kosong.');
        } else {
          this.log('Tumpukan Panggilan (Call Stack):');
          for (let i = 0; i < stack.length; i++) {
            const f = stack[i];
            const tanda = i === sesi.indeksBingkaiAktif ? '->' : '  ';
            this.log(
              `${tanda} #${f.indeks} dalam ${f.namaFungsi} pada baris ${f.baris}, kolom ${f.kolom} (${f.berkas})`
            );
          }
        }
        return undefined;
      }

      case 'f':
      case 'frame':
      case 'bingkai': {
        const idx = parseInt(argumen, 10);
        if (isNaN(idx)) {
          this.log("Gunakan: frame <nomor_bingkai>");
          return undefined;
        }
        const sukses = sesi.pilihBingkai(idx);
        if (sukses) {
          const aktif = sesi.dapatkanBingkaiAktif()!;
          this.log(`Berpindah ke Bingkai #${idx} (${aktif.namaFungsi} pada baris ${aktif.baris})`);
        } else {
          this.log(`Nomor bingkai #${idx} tidak valid (Total: ${sesi.tumpukanBingkai.length}).`);
        }
        return undefined;
      }

      // 7. Bantuan
      case 'help':
      case 'bantuan':
      case '?': {
        this.cetakBantuanDebugger();
        return undefined;
      }

      default:
        this.log(`Perintah tidak dikenal: '${cmd}'. Ketik 'bantuan' untuk panduan perintah.`);
        return undefined;
    }
  }

  private cetakBantuanDebugger(): void {
    this.log('=============================================================================');
    this.log('PANDUAN PERINTAH DEBUGGER NUSANTARA');
    this.log('=============================================================================');
    this.log('Eksekusi:');
    this.log('  c, continue, lanjut         Lanjutkan eksekusi hingga titik henti berikutnya');
    this.log('  s, step, langkah            Langkah masuk ke pernyataan berikutnya (step-in)');
    this.log('  n, next, lewati             Langkah lewati pemanggilan fungsi (step-over)');
    this.log('  fin, finish, keluar-fungsi  Langkah keluar dari fungsi saat ini (step-out)');
    this.log('  q, quit, keluar             Hentikan sesi penelusuran program');
    this.log('\nTitik Henti (Breakpoints):');
    this.log('  b, break <baris> [when exp] Pasang titik henti (opsional dengan kondisi)');
    this.log('  d, delete <id>              Hapus titik henti berdasarkan ID');
    this.log('  breakpoints, info b         Tampilkan seluruh titik henti terdaftar');
    this.log('\nInspeksi Data:');
    this.log('  p, print <ekspresi>         Evaluasi ekspresi pada bingkai aktif');
    this.log('  l, locals, variabel         Tampilkan seluruh variabel lokal bingkai aktif');
    this.log('  g, globals, global          Tampilkan seluruh variabel lingkup global');
    this.log('  w, watch <ekspresi>         Tambahkan ekspresi untuk dipantau setiap jeda');
    this.log('  unwatch <id>                Hapus ekspresi pantau berdasarkan ID');
    this.log('\nTumpukan Panggilan (Call Stack):');
    this.log('  bt, stack, tumpukan         Tampilkan call stack lengkap');
    this.log('  f, frame <nomor>            Pilih bingkai aktif untuk inspeksi');
    this.log('=============================================================================');
  }
}

/**
 * Runner CLI untuk profiling eksekusi program NUSANTARA.
 */
export class PelariProfilerCLI {
  public static jalankan(
    berkas: string,
    sumber: string,
    opsi?: {
      json?: boolean;
      ambangMs?: number;
      tanpaWarna?: boolean;
      log?: (pesan: string) => void;
      error?: (pesan: string) => void;
    }
  ): { sukses: boolean; kodeKeluar: number } {
    const log = opsi?.log || (typeof console !== 'undefined' ? console.log : () => {});
    const err = opsi?.error || (typeof console !== 'undefined' ? console.error : () => {});

    const profiler = new ProfilerNUSANTARA(true);
    profiler.aktifkan(berkas);

    const bufferOutput = new PenulisOutputBuffer();
    const interp = new Interpreter(bufferOutput, {
      profiler,
    });

    try {
      interp.jalankanKode(sumber, berkas);
      const laporan = profiler.buatLaporan(berkas);

      if (opsi?.json) {
        log(ProfilerNUSANTARA.formatJSON(laporan));
      } else {
        log(ProfilerNUSANTARA.formatTabelKonsol(laporan, { ambangMs: opsi?.ambangMs, tanpaWarna: opsi?.tanpaWarna }));
      }
      return { sukses: true, kodeKeluar: 0 };
    } catch (e: any) {
      const laporan = profiler.buatLaporan(berkas);
      if (opsi?.json) {
        log(ProfilerNUSANTARA.formatJSON(laporan));
      } else {
        log(ProfilerNUSANTARA.formatTabelKonsol(laporan, { ambangMs: opsi?.ambangMs, tanpaWarna: opsi?.tanpaWarna }));
      }
      err(`Program terhenti dengan galat saat profiling: ${e?.message || e}`);
      return { sukses: false, kodeKeluar: 1 };
    }
  }
}
