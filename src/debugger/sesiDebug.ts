/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Model Sesi Penelusuran (DebugSession) Bahasa NUSANTARA (Phase 25)
 */

import { NodeProgram, PernyataanAST, EkspresiAST } from '../parser/ast';
import { Parser } from '../parser/parser';
import { Lingkungan } from '../interpreter/environment';
import { Interpreter } from '../interpreter/interpreter';
import { NilaiRuntime, formatNilaiTeks } from '../interpreter/nilai';
import { GalatRuntime, BingkaiTumpukan } from '../interpreter/galat';
import { Diagnostik, MesinDiagnostik, KodeGalat } from '../diagnostik';
import { PengelolaBreakpoint } from './breakpointManager';
import {
  StatusSesiDebug,
  AlasanJeda,
  Breakpoint,
  BingkaiDebug,
  InfoVariabelDebug,
  EkspresiPantau,
  PeristiwaDebug,
  JenisPeristiwaDebug,
  HasilEvaluasiDebug,
} from './types';

export interface OpsiSesiDebug {
  id?: string;
  berkas: string;
  sumber: string;
  ast?: NodeProgram;
  direktoriBasis?: string;
  lingkunganGlobal?: Lingkungan;
  pembacaBerkas?: any;
}

/**
 * Representasi sesi penelusuran aktif (DebugSession).
 * Menyimpan seluruh status eksekusi, breakpoint, frame tumpukan, variabel, watch expression, dan event log.
 */
export class SesiDebug {
  public readonly id: string;
  public status: StatusSesiDebug = 'created';
  public readonly berkasSumber: string;
  public readonly teksSumber: string;
  public ast?: NodeProgram;
  public barisTereksekusi: Set<number> = new Set();

  public barisSaatIni = 1;
  public kolomSaatIni = 1;
  public pernyataanSaatIni?: PernyataanAST;
  public alasanJeda?: AlasanJeda;
  public detailJeda?: string;

  public readonly pengelolaBreakpoint: PengelolaBreakpoint;
  public readonly daftarEkspresiPantau: EkspresiPantau[] = [];
  public tumpukanBingkai: BingkaiDebug[] = [];
  public indeksBingkaiAktif = 0;

  public readonly riwayatPeristiwa: PeristiwaDebug[] = [];
  public readonly daftarDiagnostik: Diagnostik[] = [];
  public galatTerakhir?: GalatRuntime;
  public readonly outputEksekusi: string[] = [];
  public readonly lingkunganGlobal?: Lingkungan;

  private idPantauBerikutnya = 1;

  constructor(opsi: OpsiSesiDebug, pengelolaBP?: PengelolaBreakpoint) {
    this.id = opsi.id || `sesi-debug-${Date.now()}`;
    this.berkasSumber = opsi.berkas;
    this.teksSumber = opsi.sumber;
    this.lingkunganGlobal = opsi.lingkunganGlobal;
    this.pengelolaBreakpoint = pengelolaBP || new PengelolaBreakpoint();

    if (opsi.ast) {
      this.ast = opsi.ast;
      this.barisTereksekusi = PengelolaBreakpoint.temukanBarisTereksekusi(opsi.ast);
    } else {
      try {
        const parser = new Parser(this.teksSumber);
        this.ast = parser.parse();
        this.barisTereksekusi = PengelolaBreakpoint.temukanBarisTereksekusi(this.ast);
      } catch {
        // Abaikan galat parser pada inisialisasi awal; akan ditangani saat mulai
      }
    }
  }

  /**
   * Menambahkan breakpoint pada sesi ini.
   */
  public tambahBreakpoint(
    baris: number,
    opsi?: { kolom?: number; kondisi?: string; sementara?: boolean }
  ) {
    return this.pengelolaBreakpoint.tambahBreakpoint(this.berkasSumber, baris, {
      ...opsi,
      barisTereksekusi: this.barisTereksekusi,
    });
  }

  /**
   * Menghapus breakpoint berdasarkan ID.
   */
  public hapusBreakpoint(id: number): boolean {
    return this.pengelolaBreakpoint.hapusBreakpoint(id);
  }

  /**
   * Menambahkan ekspresi pantau (watch expression).
   */
  public tambahPantau(ekspresi: string): EkspresiPantau {
    const pantau: EkspresiPantau = {
      id: this.idPantauBerikutnya++,
      ekspresi,
      status: 'belum_dievaluasi',
    };
    this.daftarEkspresiPantau.push(pantau);
    this.evaluasiSatuPantau(pantau);
    return pantau;
  }

  /**
   * Menghapus ekspresi pantau berdasarkan ID.
   */
  public hapusPantau(id: number): boolean {
    const idx = this.daftarEkspresiPantau.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.daftarEkspresiPantau.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Memilih bingkai tumpukan aktif untuk inspeksi variabel dan evaluasi ekspresi.
   */
  public pilihBingkai(indeks: number): boolean {
    if (indeks < 0 || indeks >= this.tumpukanBingkai.length) {
      return false;
    }
    this.indeksBingkaiAktif = indeks;
    return true;
  }

  /**
   * Mengembalikan bingkai tumpukan yang sedang dipilih.
   */
  public dapatkanBingkaiAktif(): BingkaiDebug | undefined {
    return this.tumpukanBingkai[this.indeksBingkaiAktif];
  }

  /**
   * Mendapatkan seluruh variabel lokal dari bingkai aktif (atau bingkai tertentu).
   */
  public dapatkanVariabelLokal(indeksBingkai?: number): Map<string, InfoVariabelDebug> {
    const idx = indeksBingkai !== undefined ? indeksBingkai : this.indeksBingkaiAktif;
    const bingkai = this.tumpukanBingkai[idx];
    if (!bingkai) return new Map();
    return bingkai.variabelLokal;
  }

  /**
   * Mendapatkan seluruh variabel dari lingkup global program.
   */
  public dapatkanVariabelGlobal(): Map<string, InfoVariabelDebug> {
    const hasil = new Map<string, InfoVariabelDebug>();
    if (this.tumpukanBingkai.length === 0) return hasil;
    // Lingkup paling bawah adalah induk/global
    const bingkaiDasar = this.tumpukanBingkai[this.tumpukanBingkai.length - 1];
    let lingkup: Lingkungan | undefined = bingkaiDasar.lingkungan;
    while (lingkup?.induk) {
      lingkup = lingkup.induk;
    }

    if (lingkup) {
      for (const [nama, entri] of lingkup.dapatkanSemuaSimbol().entries()) {
        hasil.set(nama, {
          nama,
          tipe: entri.tipeData || entri.nilai.jenis,
          nilai: entri.nilai,
          formatTeks: formatNilaiTeks(entri.nilai),
          tetap: entri.tetap,
        });
      }
    }
    return hasil;
  }

  /**
   * Mengevaluasi sebuah ekspresi NUSANTARA pada konteks bingkai yang aktif.
   */
  public evaluasiEkspresi(
    ekspresiTeks: string,
    indeksBingkai?: number,
    lingkunganEksplisit?: Lingkungan
  ): HasilEvaluasiDebug {
    const teks = (ekspresiTeks || '').trim();
    if (!teks) {
      return {
        berhasil: false,
        galat: 'Ekspresi tidak boleh kosong.',
      };
    }

    const idx = indeksBingkai !== undefined ? indeksBingkai : this.indeksBingkaiAktif;
    const bingkai = this.tumpukanBingkai[idx];
    const lingkunganTarget = lingkunganEksplisit || bingkai?.lingkungan || this.lingkunganGlobal;

    try {
      // Urai ekspresi secara langsung menggunakan Parser resmi NUSANTARA
      const parser = new Parser(teks);
      const nodeEkspresi = parser.parseEkspresi();
      const galat = parser.dapatkanDaftarGalat();
      if (galat.length > 0) {
        return {
          berhasil: false,
          galat: `Sintaks ekspresi tidak valid: ${galat[0].message}`,
        };
      }

      if (!nodeEkspresi) {
        return {
          berhasil: false,
          galat: 'Ekspresi tidak menghasilkan simpul AST yang dapat dievaluasi.',
        };
      }

      // Evaluasi menggunakan lingkungan frame aktif
      const interp = new Interpreter();
      if (lingkunganTarget) {
        interp.tetapkanLingkunganSaatIni(lingkunganTarget);
      }
      const nilai = interp.evaluasiEkspresi(nodeEkspresi);
      return {
        berhasil: true,
        nilai,
        formatTeks: formatNilaiTeks(nilai),
        tipe: nilai.jenis,
      };
    } catch (e: any) {
      return {
        berhasil: false,
        galat: e?.message || String(e),
      };
    }
  }

  /**
   * Memperbarui seluruh ekspresi pantau yang terdaftar.
   */
  public perbaruiSemuaPantau(): void {
    for (const p of this.daftarEkspresiPantau) {
      this.evaluasiSatuPantau(p);
    }
  }

  private evaluasiSatuPantau(p: EkspresiPantau): void {
    const hasil = this.evaluasiEkspresi(p.ekspresi);
    if (hasil.berhasil && hasil.nilai) {
      p.status = 'sukses';
      p.nilai = hasil.formatTeks;
      p.tipe = hasil.tipe;
      p.galat = undefined;
    } else {
      p.status = 'galat';
      p.galat = hasil.galat;
      p.nilai = undefined;
      p.tipe = undefined;
    }
  }

  /**
   * Mencatat peristiwa penting ke dalam jejak audit sesi debug.
   */
  public catatPeristiwa(jenis: JenisPeristiwaDebug, pesan: string, detail?: any): void {
    this.riwayatPeristiwa.push({
      jenis,
      waktu: Date.now(),
      pesan,
      berkas: this.berkasSumber,
      baris: this.barisSaatIni,
      kolom: this.kolomSaatIni,
      detail,
    });
  }

  /**
   * Membangun ringkasan konteks eksekusi saat program dijeda.
   */
  public dapatkanRingkasanKonteks(): string {
    const bingkai = this.dapatkanBingkaiAktif();
    const namaFn = bingkai?.namaFungsi || '<utama>';
    const garis = '='.repeat(60);

    const barisTeks: string[] = [];
    barisTeks.push(garis);
    barisTeks.push(`JEDA (PAUSED) [Alasan: ${this.alasanJeda || 'manual'}${this.detailJeda ? ` - ${this.detailJeda}` : ''}]`);
    barisTeks.push(`Berkas  : ${this.berkasSumber}`);
    barisTeks.push(`Posisi  : baris ${this.barisSaatIni}, kolom ${this.kolomSaatIni}`);
    barisTeks.push(`Fungsi  : ${namaFn}`);
    barisTeks.push(`Bingkai : Frame #${this.indeksBingkaiAktif} (Total: ${this.tumpukanBingkai.length})`);
    barisTeks.push(garis);

    // Ambil cuplikan baris kode jika tersedia
    const barisKode = this.teksSumber.split('\n');
    const barisMulai = Math.max(1, this.barisSaatIni - 2);
    const barisAkhir = Math.min(barisKode.length, this.barisSaatIni + 2);

    for (let b = barisMulai; b <= barisAkhir; b++) {
      const penanda = b === this.barisSaatIni ? ' -> ' : '    ';
      const bp = this.pengelolaBreakpoint.temukanBreakpoint(this.berkasSumber, b) ? '●' : ' ';
      barisTeks.push(`${penanda}${bp} ${String(b).padStart(4)} | ${barisKode[b - 1] || ''}`);
    }
    barisTeks.push(garis);

    return barisTeks.join('\n');
  }
}
