/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lexer, KomentarSumber } from '../lexer';
import { Parser } from '../parser/parser';
import {
  NodeProgram,
  PernyataanAST,
  EkspresiAST,
  JenisNodeAST,
  NodeDeklarasiVariabel,
  NodeDeklarasiTetap,
  NodePenugasan,
  NodePenugasanIndeks,
  NodePercabanganJika,
  NodePerulanganSelama,
  NodePerulanganUntuk,
  NodeInstruksiKembalikan,
  NodePernyataanEkspresi,
  NodeDeklarasiFungsi,
  NodePernyataanImpor,
  NodePernyataanEkspor,
  NodeLiteral,
  NodePengidentifikasi,
  NodeEkspresiUnari,
  NodeEkspresiBiner,
  NodeEkspresiPengelompokan,
  NodePemanggilanFungsi,
  NodeAksesAnggota,
  NodeAksesIndeks,
  NodeLiteralDaftar,
  NodeLiteralPeta,
} from '../parser/ast';
import { KonfigurasiFormat, KONFIGURASI_FORMAT_DEFAULT } from './konfigurasi';

/**
 * Hasil pemformatan kode aman dengan verifikasi AST ulang.
 */
export interface HasilFormatAman {
  sukses: boolean;
  hasil?: string;
  galat?: unknown;
  apakahBerubah?: boolean;
}

/**
 * Tingkat presedensi operator biner untuk penanganan kurung pengelompokan yang tepat.
 */
const PRESEDENSI_OPERATOR: Record<string, number> = {
  'atau': 1,
  'dan': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

/**
 * Pemformat Kode Resmi Bahasa NUSANTARA (Phase 19).
 * Menggunakan pendekatan AST (Lexer -> Parser -> AST -> Pretty Printer).
 */
export class FormatterNUSANTARA {
  private readonly konfigurasi: KonfigurasiFormat;
  private readonly kodeSumberAsli: string;
  private komentarDaftar: KomentarSumber[] = [];
  private komentarSudahDiproses = new Set<number>(); // indeks komentar

  constructor(kodeSumber: string, konfigurasi?: Partial<KonfigurasiFormat>) {
    this.kodeSumberAsli = kodeSumber;
    this.konfigurasi = { ...KONFIGURASI_FORMAT_DEFAULT, ...konfigurasi };
  }

  /**
   * Memformat kode sumber menjadi representasi standar yang bersih dan konsisten.
   */
  public format(): string {
    // 1. Lexer untuk mengekstrak komentar
    const lexer = new Lexer(this.kodeSumberAsli, { sertakanBarisBaru: false });
    lexer.tokenisasi();
    this.komentarDaftar = [...lexer.dapatkanDaftarKomentar()];
    this.komentarSudahDiproses.clear();

    // 2. Parser untuk membangun AST
    const parser = new Parser(this.kodeSumberAsli);
    const ast = parser.parse();
    const daftarGalat = parser.dapatkanDaftarGalat();
    if (daftarGalat.length > 0) {
      throw daftarGalat[0];
    }

    // 3. Pretty Print AST dengan penyisipan komentar
    return this.formatProgram(ast);
  }

  private buatIndentasi(tingkat: number): string {
    return ' '.repeat(tingkat * this.konfigurasi.indentasi);
  }

  private formatProgram(program: NodeProgram): string {
    const bagian: string[] = [];

    // Komentar di bagian paling awal berkas (sebelum modul, impor, fungsi, atau program)
    const batasAwalBaris = program.deklarasiModul
      ? program.deklarasiModul.posisi.awal.baris
      : program.daftarImpor.length > 0
      ? program.daftarImpor[0].posisi.awal.baris
      : program.daftarFungsi.length > 0
      ? program.daftarFungsi[0].posisi.awal.baris
      : program.tubuhUtama.length > 0
      ? program.tubuhUtama[0].posisi.awal.baris
      : 999999;

    const komentarAwal = this.ambilKomentarSebelumBaris(batasAwalBaris, 0);
    if (komentarAwal.length > 0) {
      bagian.push(komentarAwal.join('\n'));
    }

    // 1. Deklarasi Modul
    if (program.deklarasiModul) {
      bagian.push(`modul ${program.deklarasiModul.namaModul}`);
    }

    // 2. Pernyataan Impor
    if (program.daftarImpor.length > 0) {
      const teksImpor: string[] = [];
      for (const imp of program.daftarImpor) {
        const komSebelum = this.ambilKomentarSebelumBaris(imp.posisi.awal.baris, 0);
        if (komSebelum.length > 0) {
          teksImpor.push(komSebelum.join('\n'));
        }
        let baris = this.formatPernyataanImpor(imp);
        const inlineKom = this.ambilKomentarInlinePadaBaris(imp.posisi.akhir.baris);
        if (inlineKom) {
          baris += ` ${inlineKom}`;
        }
        teksImpor.push(baris);
      }
      bagian.push(teksImpor.join('\n'));
    }

    // 3. Deklarasi Ekspor Top-Level (jika ada yang berdiri sendiri di luar tubuh)
    // Biasanya fungsi ekspor tercatat di daftarEkspor dan daftarFungsi.

    // 4. Deklarasi Fungsi Top-Level
    if (program.daftarFungsi.length > 0) {
      for (const fn of program.daftarFungsi) {
        const komSebelum = this.ambilKomentarSebelumBaris(fn.posisi.awal.baris, 0);
        const teksFn = this.formatDeklarasiFungsi(fn, 0);
        if (komSebelum.length > 0) {
          bagian.push(`${komSebelum.join('\n')}\n${teksFn}`);
        } else {
          bagian.push(teksFn);
        }
      }
    }

    // 5. Tubuh Utama Program
    // Cek apakah kode asli menggunakan kata kunci 'program' atau 'mulai'
    const polaProgram = /\bprogram\s+([a-zA-Z0-9_]+)\b/;
    const cocokProgram = this.kodeSumberAsli.match(polaProgram);
    const adaKataKunciProgram = !!cocokProgram;
    const adaKataKunciMulai = /\bmulai\b/.test(this.kodeSumberAsli);

    // Ambil pernyataan tubuh utama yang bukan impor dan bukan fungsi
    const pernyataanTubuh = program.tubuhUtama.filter(
      p => p.jenis !== JenisNodeAST.PERNYATAAN_IMPOR && (p as any).jenis !== JenisNodeAST.DEKLARASI_FUNGSI
    );

    if (adaKataKunciProgram) {
      const nama = cocokProgram ? cocokProgram[1] : program.namaProgram;
      const teksTubuh = this.formatDaftarPernyataan(pernyataanTubuh, 1);
      bagian.push(`program ${nama}\nmulai\n${teksTubuh}\nselesai`);
    } else if (adaKataKunciMulai) {
      const teksTubuh = this.formatDaftarPernyataan(pernyataanTubuh, 1);
      bagian.push(`mulai\n${teksTubuh}\nselesai`);
    } else if (pernyataanTubuh.length > 0) {
      bagian.push(this.formatDaftarPernyataan(pernyataanTubuh, 0));
    }

    // 6. Komentar di bagian paling akhir berkas
    const sisaKomentar: string[] = [];
    for (let i = 0; i < this.komentarDaftar.length; i++) {
      if (!this.komentarSudahDiproses.has(i)) {
        sisaKomentar.push(this.komentarDaftar[i].teks);
        this.komentarSudahDiproses.add(i);
      }
    }
    if (sisaKomentar.length > 0) {
      bagian.push(sisaKomentar.join('\n'));
    }

    let hasilAkhir = bagian.filter(b => b.trim().length > 0).join('\n\n') + '\n';
    if (this.konfigurasi.karakterBarisBaru === '\r\n') {
      hasilAkhir = hasilAkhir.replace(/\n/g, '\r\n');
    }
    return hasilAkhir;
  }

  private ambilKomentarSebelumBaris(baris: number, tingkatIndentasi: number): string[] {
    const hasil: string[] = [];
    const indent = this.buatIndentasi(tingkatIndentasi);
    for (let i = 0; i < this.komentarDaftar.length; i++) {
      if (this.komentarSudahDiproses.has(i)) continue;
      const kom = this.komentarDaftar[i];
      if (kom.baris < baris && kom.apakahKomentarBarisPenuh) {
        hasil.push(`${indent}${kom.teks}`);
        this.komentarSudahDiproses.add(i);
      }
    }
    return hasil;
  }

  private ambilKomentarInlinePadaBaris(baris: number): string | null {
    for (let i = 0; i < this.komentarDaftar.length; i++) {
      if (this.komentarSudahDiproses.has(i)) continue;
      const kom = this.komentarDaftar[i];
      if (kom.baris === baris && !kom.apakahKomentarBarisPenuh) {
        this.komentarSudahDiproses.add(i);
        return kom.teks;
      }
    }
    return null;
  }

  private formatDaftarPernyataan(daftar: PernyataanAST[], tingkat: number): string {
    const barisHasil: string[] = [];
    const indent = this.buatIndentasi(tingkat);

    for (const stmt of daftar) {
      // Komentar sebelum pernyataan
      const komSebelum = this.ambilKomentarSebelumBaris(stmt.posisi.awal.baris, tingkat);
      for (const k of komSebelum) {
        barisHasil.push(k);
      }

      let teksPernyataan = this.formatPernyataan(stmt, tingkat);
      // Komentar inline di baris yang sama
      const inlineKom = this.ambilKomentarInlinePadaBaris(stmt.posisi.akhir.baris);
      if (inlineKom) {
        teksPernyataan += ` ${inlineKom}`;
      }

      barisHasil.push(teksPernyataan);
    }

    return barisHasil.join('\n');
  }

  private formatPernyataan(stmt: PernyataanAST, tingkat: number): string {
    const indent = this.buatIndentasi(tingkat);
    const spasiTitikDua = this.konfigurasi.spasiSebelumTitikDua ? ' : ' : ': ';

    switch (stmt.jenis) {
      case JenisNodeAST.DEKLARASI_VARIABEL: {
        const v = stmt as NodeDeklarasiVariabel;
        return `${indent}variabel ${v.nama}${spasiTitikDua}${v.tipeData} = ${this.formatEkspresi(v.nilaiAwal)}`;
      }

      case JenisNodeAST.DEKLARASI_TETAP: {
        const t = stmt as NodeDeklarasiTetap;
        return `${indent}tetap ${t.nama}${spasiTitikDua}${t.tipeData} = ${this.formatEkspresi(t.nilaiAwal)}`;
      }

      case JenisNodeAST.PENUGASAN: {
        const p = stmt as NodePenugasan;
        return `${indent}${p.target} = ${this.formatEkspresi(p.nilai)}`;
      }

      case JenisNodeAST.PENUGASAN_INDEKS: {
        const pi = stmt as NodePenugasanIndeks;
        return `${indent}${this.formatEkspresi(pi.koleksi)}[${this.formatEkspresi(pi.indeks)}] = ${this.formatEkspresi(pi.nilai)}`;
      }

      case JenisNodeAST.PERCABANGAN_JIKA: {
        const jika = stmt as NodePercabanganJika;
        const baris: string[] = [];
        baris.push(`${indent}jika ${this.formatEkspresi(jika.kondisi)} maka`);
        const cabangMaka = this.formatDaftarPernyataan(jika.cabangMaka, tingkat + 1);
        if (cabangMaka.length > 0) {
          baris.push(cabangMaka);
        }
        if (jika.cabangSelain && jika.cabangSelain.length > 0) {
          baris.push(`${indent}selain`);
          const cabangSelain = this.formatDaftarPernyataan(jika.cabangSelain, tingkat + 1);
          if (cabangSelain.length > 0) {
            baris.push(cabangSelain);
          }
        }
        baris.push(`${indent}akhir`);
        return baris.join('\n');
      }

      case JenisNodeAST.PERULANGAN_SELAMA: {
        const selama = stmt as NodePerulanganSelama;
        const baris: string[] = [];
        baris.push(`${indent}selama ${this.formatEkspresi(selama.kondisi)} lakukan`);
        const tubuh = this.formatDaftarPernyataan(selama.tubuh, tingkat + 1);
        if (tubuh.length > 0) {
          baris.push(tubuh);
        }
        baris.push(`${indent}akhir`);
        return baris.join('\n');
      }

      case JenisNodeAST.PERULANGAN_UNTUK: {
        const untuk = stmt as NodePerulanganUntuk;
        const baris: string[] = [];
        baris.push(
          `${indent}untuk ${untuk.variabelPenghitung} dari ${this.formatEkspresi(untuk.nilaiAwal)} sampai ${this.formatEkspresi(untuk.nilaiAkhir)} lakukan`
        );
        const tubuh = this.formatDaftarPernyataan(untuk.tubuh, tingkat + 1);
        if (tubuh.length > 0) {
          baris.push(tubuh);
        }
        baris.push(`${indent}akhir`);
        return baris.join('\n');
      }

      case JenisNodeAST.INSTRUKSI_HENTIKAN:
        return `${indent}hentikan`;

      case JenisNodeAST.INSTRUKSI_LANJUTKAN:
        return `${indent}lanjutkan`;

      case JenisNodeAST.INSTRUKSI_KEMBALIKAN: {
        const ret = stmt as NodeInstruksiKembalikan;
        if (ret.nilai) {
          return `${indent}kembalikan ${this.formatEkspresi(ret.nilai)}`;
        }
        return `${indent}kembalikan`;
      }

      case JenisNodeAST.PERNYATAAN_EKSPRESI: {
        const expr = stmt as NodePernyataanEkspresi;
        return `${indent}${this.formatEkspresi(expr.ekspresi)}`;
      }

      case JenisNodeAST.PERNYATAAN_IMPOR:
        return `${indent}${this.formatPernyataanImpor(stmt as NodePernyataanImpor)}`;

      case JenisNodeAST.PERNYATAAN_EKSPOR: {
        const exp = stmt as NodePernyataanEkspor;
        if (exp.deklarasi) {
          if (exp.deklarasi.jenis === JenisNodeAST.DEKLARASI_FUNGSI) {
            return this.formatDeklarasiFungsi(exp.deklarasi as NodeDeklarasiFungsi, tingkat, true);
          }
          return `${indent}ekspor ${this.formatPernyataan(exp.deklarasi as PernyataanAST, 0)}`;
        }
        if (exp.namaEkspor) {
          return `${indent}ekspor { ${exp.namaEkspor.join(', ')} }`;
        }
        return `${indent}ekspor`;
      }

      default:
        return `${indent}/* tidak diketahui */`;
    }
  }

  private formatDeklarasiFungsi(fn: NodeDeklarasiFungsi, tingkat: number, apakahEkspor = false): string {
    const indent = this.buatIndentasi(tingkat);
    const spasiTitikDua = this.konfigurasi.spasiSebelumTitikDua ? ' : ' : ': ';

    const paramTeks = fn.parameter
      .map(p => `${p.nama}${spasiTitikDua}${p.tipeData}`)
      .join(', ');

    const kembalianTeks = fn.tipeKembalian ? `${spasiTitikDua}${fn.tipeKembalian}` : '';
    const awalan = apakahEkspor ? 'ekspor fungsi ' : 'fungsi ';

    const baris: string[] = [];
    baris.push(`${indent}${awalan}${fn.nama}(${paramTeks})${kembalianTeks}`);
    baris.push(`${indent}mulai`);
    const tubuhTeks = this.formatDaftarPernyataan(fn.tubuh, tingkat + 1);
    if (tubuhTeks.length > 0) {
      baris.push(tubuhTeks);
    }
    baris.push(`${indent}selesai`);
    return baris.join('\n');
  }

  private formatPernyataanImpor(imp: NodePernyataanImpor): string {
    if (imp.itemImpor && imp.itemImpor.length > 0) {
      const items = imp.itemImpor
        .map(i => (i.alias ? `${i.nama} sebagai ${i.alias}` : i.nama))
        .join(', ');
      return `impor { ${items} } dari ${imp.sumberModul}`;
    }

    if (imp.aliasModul) {
      return `impor ${imp.sumberModul} sebagai ${imp.aliasModul}`;
    }

    return `impor ${imp.sumberModul}`;
  }

  public formatEkspresi(expr: EkspresiAST, presedensiInduk = 0): string {
    switch (expr.jenis) {
      case JenisNodeAST.LITERAL: {
        const lit = expr as NodeLiteral;
        if (lit.tipeLiteral === 'teks') {
          // Pertahankan karakter persis dari kode sumber asli jika indeks valid
          if (
            typeof lit.posisi?.awal?.indeks === 'number' &&
            typeof lit.posisi?.akhir?.indeks === 'number' &&
            lit.posisi.awal.indeks >= 0 &&
            lit.posisi.akhir.indeks <= this.kodeSumberAsli.length &&
            lit.posisi.awal.indeks < lit.posisi.akhir.indeks
          ) {
            const potongan = this.kodeSumberAsli.substring(lit.posisi.awal.indeks, lit.posisi.akhir.indeks);
            if (potongan.startsWith('"') && potongan.endsWith('"')) {
              return potongan;
            }
          }
          // Cadangan lolos string yang aman
          const isi = String(lit.nilaiTerurai ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            .replace(/\r/g, '\\r');
          return `"${isi}"`;
        }

        if (lit.tipeLiteral === 'karakter') {
          return `'${lit.nilaiTerurai}'`;
        }

        if (lit.tipeLiteral === 'logika') {
          return lit.nilaiTerurai ? 'benar' : 'salah';
        }

        if (lit.tipeLiteral === 'kosong') {
          return 'kosong';
        }

        if (lit.tipeLiteral === 'desimal' || lit.tipeLiteral === 'bilangan') {
          return String(lit.nilaiMentah || lit.nilaiTerurai);
        }

        return String(lit.nilaiTerurai ?? lit.nilaiMentah);
      }

      case JenisNodeAST.PENGIDENTIFIKASI:
        return (expr as NodePengidentifikasi).nama;

      case JenisNodeAST.EKSPRESI_UNARI: {
        const unari = expr as NodeEkspresiUnari;
        if (unari.operator === 'tidak') {
          return `tidak ${this.formatEkspresi(unari.argumen, 10)}`;
        }
        return `${unari.operator}${this.formatEkspresi(unari.argumen, 10)}`;
      }

      case JenisNodeAST.EKSPRESI_BINER: {
        const biner = expr as NodeEkspresiBiner;
        const presedensiIni = PRESEDENSI_OPERATOR[biner.operator] ?? 0;
        const spasi = this.konfigurasi.spasiOperator ? ' ' : '';

        const teksKiri = this.formatEkspresi(biner.kiri, presedensiIni);
        const teksKanan = this.formatEkspresi(biner.kanan, presedensiIni + 1);
        const hasilBiner = `${teksKiri}${spasi}${biner.operator}${spasi}${teksKanan}`;

        if (presedensiIni < presedensiInduk) {
          return `(${hasilBiner})`;
        }
        return hasilBiner;
      }

      case JenisNodeAST.EKSPRESI_PENGELOMPOKAN: {
        const grup = expr as NodeEkspresiPengelompokan;
        return `(${this.formatEkspresi(grup.ekspresi, 0)})`;
      }

      case JenisNodeAST.PEMANGGILAN_FUNGSI: {
        const fn = expr as NodePemanggilanFungsi;
        const argumenTeks = fn.argumen.map(a => this.formatEkspresi(a)).join(', ');
        if (fn.target) {
          return `${this.formatEkspresi(fn.target)}.${fn.namaFungsi}(${argumenTeks})`;
        }
        return `${fn.namaFungsi}(${argumenTeks})`;
      }

      case JenisNodeAST.AKSES_ANGGOTA: {
        const anggota = expr as NodeAksesAnggota;
        return `${this.formatEkspresi(anggota.target)}.${anggota.anggota}`;
      }

      case JenisNodeAST.AKSES_INDEKS: {
        const idx = expr as NodeAksesIndeks;
        return `${this.formatEkspresi(idx.koleksi)}[${this.formatEkspresi(idx.indeks)}]`;
      }

      case JenisNodeAST.LITERAL_DAFTAR: {
        const d = expr as NodeLiteralDaftar;
        const spasi = this.konfigurasi.spasiKoma ? ' ' : '';
        return `[${d.elemen.map(e => this.formatEkspresi(e)).join(',' + spasi)}]`;
      }

      case JenisNodeAST.LITERAL_PETA: {
        const p = expr as NodeLiteralPeta;
        const spasi = this.konfigurasi.spasiKoma ? ' ' : '';
        const pasanganTeks = p.pasangan
          .map(pair => `"${pair.kunci}": ${this.formatEkspresi(pair.nilai)}`)
          .join(',' + spasi);
        return `{${pasanganTeks}}`;
      }

      default:
        return '';
    }
  }
}

/**
 * Fungsi pintas untuk memformat kode sumber NUSANTARA langsung dari string.
 */
export function formatKode(kodeSumber: string, opsi?: Partial<KonfigurasiFormat>): string {
  const formatter = new FormatterNUSANTARA(kodeSumber, opsi);
  return formatter.format();
}

/**
 * Pemformatan aman dengan verifikasi AST ulang (Safety Check).
 * Format -> Parse Ulang -> Valid? -> Kembalikan Hasil; Tidak -> Batalkan dan kembalikan galat.
 */
export function formatAman(kodeSumber: string, opsi?: Partial<KonfigurasiFormat>): HasilFormatAman {
  try {
    const hasilFormat = formatKode(kodeSumber, opsi);

    // Reparse untuk membuktikan keabsahan sintaksis
    const parserUji = new Parser(hasilFormat);
    parserUji.parse();
    const galat = parserUji.dapatkanDaftarGalat();
    if (galat.length > 0) {
      return {
        sukses: false,
        galat: galat[0],
        apakahBerubah: false,
      };
    }

    return {
      sukses: true,
      hasil: hasilFormat,
      apakahBerubah: hasilFormat !== kodeSumber,
    };
  } catch (err) {
    return {
      sukses: false,
      galat: err,
      apakahBerubah: false,
    };
  }
}
