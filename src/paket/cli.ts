/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PengelolaPaket, OpsiPengelolaPaket } from './pengelolaPaket';
import { Parser } from '../parser/parser';
import { PemeriksaTipe } from '../tipe/pemeriksaTipe';
import { Interpreter } from '../interpreter/interpreter';
import { PenulisOutputKonsol, PenulisOutputBuffer } from '../interpreter/outputWriter';
import { PembacaBerkas, PembacaBerkasNode, PembacaBerkasMemori, ResolverModul, PemuatModul } from '../modul';
import { mesinDiagnostikDefault, formatDiagnostikKeJSON, formatDiagnostik } from '../diagnostik';
import {
  formatAman,
  formatKode,
  muatKonfigurasiFormatDariTOML,
  PemeriksaProyek,
} from '../toolchain';
import { jalankanServerBahasaStdio } from '../language-server';
import { PelariUji, PenemuUji, PelaporKonsol, PelaporJSON, GerbangKualitas } from '../testing';
import {
  VERSI_NUSANTARA,
  LABEL_VERSI_NUSANTARA,
  FASE_TERAKHIR,
  NAMA_FASE_TERAKHIR,
  dapatkanBannerCLI,
  dapatkanInfoHost,
} from '../konstanta/versi';
import { MesinBuild, PlatformTarget } from '../build';
import { MesinCI, ValidatorAlurKerjaGitHub } from '../cicd';
import { PelariDebuggerCLI, PelariProfilerCLI } from '../debugger';

export interface OpsiCLI {
  pengelola?: PengelolaPaket;
  penulisLog?: (pesan: string) => void;
  penulisGalat?: (pesan: string) => void;
  pembaca?: PembacaBerkas;
  log?: (pesan: string) => void;
  error?: (pesan: string) => void;
}

/**
 * Antarmuka Baris Perintah (CLI) Resmi Bahasa NUSANTARA: 'nusantara'
 */
export class NusantaraCLI {
  private readonly pengelola: PengelolaPaket;
  private readonly log: (pesan: string) => void;
  private readonly error: (pesan: string) => void;
  private readonly pembaca: PembacaBerkas;

  constructor(
    opsiAtauPembaca?: PembacaBerkas | (OpsiCLI & OpsiPengelolaPaket),
    opsiKedua?: OpsiCLI & OpsiPengelolaPaket
  ) {
    let opsiFinal: any = {};
    if (opsiAtauPembaca && typeof (opsiAtauPembaca as any).apakahAda === 'function') {
      opsiFinal = { pembaca: opsiAtauPembaca, ...opsiKedua };
    } else {
      opsiFinal = { ...opsiAtauPembaca, ...opsiKedua };
    }

    const pembacaTerpilih =
      opsiFinal.pembaca ||
      opsiFinal.pembacaBerkas ||
      (opsiFinal.pengelola && typeof (opsiFinal.pengelola as any).dapatkanPembaca === 'function'
        ? (opsiFinal.pengelola as any).dapatkanPembaca()
        : null) ||
      (typeof window !== 'undefined' ? new PembacaBerkasMemori() : new PembacaBerkasNode());

    this.pengelola =
      opsiFinal.pengelola ||
      new PengelolaPaket({
        ...opsiFinal,
        pembacaBerkas: pembacaTerpilih,
      });
    this.pembaca = pembacaTerpilih;
    this.log = opsiFinal.log || opsiFinal.penulisLog || opsiFinal.logger || (typeof console !== 'undefined' ? console.log : () => {});
    this.error = opsiFinal.error || opsiFinal.penulisGalat || opsiFinal.logger || (typeof console !== 'undefined' ? console.error : () => {});
  }

  public dapatkanPengelola(): PengelolaPaket {
    return this.pengelola;
  }

  /**
   * Menjalankan perintah baris perintah berdasarkan argumen array string.
   * Mengembalikan kode status keluar (0 untuk sukses, non-nol untuk gagal).
   */
  public jalankan(args: string[]): number {
    if (!args || args.length === 0) {
      this.cetakBantuan();
      return 0;
    }

    const opsiDebug = args.includes('--debug');
    const opsiJSON = args.includes('--json') || args.includes('--format=json') || (args.includes('--format') && args[args.indexOf('--format') + 1] === 'json');
    const opsiTanpaWarna = args.includes('--tanpa-warna') || args.includes('--no-color');
    const opsiWarna = args.includes('--warna') ? true : opsiTanpaWarna ? false : undefined;
    const opsiTulis = args.includes('--tulis') || args.includes('--write') || args.includes('-w');
    const opsiCek = args.includes('--cek') || args.includes('--check');
    const opsiVerbose = args.includes('--verbose');

    let opsiCari: string | undefined;
    const idxCari = args.indexOf('--cari') !== -1 ? args.indexOf('--cari') : args.indexOf('--filter');
    if (idxCari !== -1 && args[idxCari + 1] && !args[idxCari + 1].startsWith('-')) {
      opsiCari = args[idxCari + 1];
    }

    let opsiTimeout: number | undefined;
    const idxTimeout = args.indexOf('--timeout');
    if (idxTimeout !== -1 && args[idxTimeout + 1]) {
      const parsed = parseInt(args[idxTimeout + 1], 10);
      if (!isNaN(parsed)) opsiTimeout = parsed;
    }

    let opsiPerintahDebug: string[] | undefined;
    for (const a of args) {
      if (a.startsWith('--perintah=')) {
        opsiPerintahDebug = a.slice(11).split(';').map(c => c.trim()).filter(Boolean);
      } else if (a.startsWith('--commands=')) {
        opsiPerintahDebug = a.slice(11).split(';').map(c => c.trim()).filter(Boolean);
      }
    }

    let opsiAmbang: number | undefined;
    for (const a of args) {
      if (a.startsWith('--ambang=')) {
        const val = parseFloat(a.slice(9));
        if (!isNaN(val)) opsiAmbang = val;
      }
    }

    // Bersihkan flags dari argumen posisi
    const argumenBersih = args.filter((a, idx) => {
      if (a.startsWith('-') || a === 'json') return false;
      if (idx > 0 && (args[idx - 1] === '--cari' || args[idx - 1] === '--filter' || args[idx - 1] === '--timeout' || args[idx - 1] === '--format')) {
        return false;
      }
      return true;
    });
    const perintah = argumenBersih[0]?.toLowerCase();
    const argumenTambahan = argumenBersih.slice(1);

    try {
      // Jika argumen pertama adalah berkas .nusantara, jalankan langsung
      if (
        perintah &&
        (perintah.endsWith('.nusantara') ||
          (![
            'buat',
            'inisialisasi',
            'pasang',
            'instal',
            'tambah',
            'add',
            'hapus',
            'buang',
            'perbarui',
            'update',
            'daftar',
            'list',
            'pohon',
            'tree',
            'graf',
            'audit',
            'bersihkan-cache',
            'cache-clean',
            'info',
            'versi',
            '-v',
            '--version',
            'bantuan',
            'bantu',
            '-h',
            '--help',
            'jalankan',
            'run',
            'periksa',
            'check',
            'cek',
            'format',
            'bahasa-server',
            'lsp',
            'server',
            'uji',
            'test',
            'uji-semua',
            'quality-gate',
            'paket',
            'bangun',
            'build',
            'terbit',
            'publikasi',
            'publish',
            'cari',
            'search',
            'arsip',
            'bersihkan',
            'clean',
            'rilis',
            'release',
            'ci',
            'alur-kerja',
            'workflow',
            'debug',
            'debig',
            'telusur',
            'profil',
            'profile',
            'profiler',
          ].includes(perintah) &&
            this.pembaca.apakahAda(perintah)))
      ) {
        return this.jalankanBerkasProgram(perintah, argumenTambahan, {
          debug: opsiDebug,
          json: opsiJSON,
          warna: opsiWarna,
        });
      }

      switch (perintah) {
        case 'debug':
        case 'debig':
        case 'telusur': {
          const target = argumenTambahan[0];
          return this.eksekusiDebug(target, {
            perintahAwal: opsiPerintahDebug,
            verbose: opsiVerbose,
          });
        }

        case 'profil':
        case 'profile':
        case 'profiler': {
          const target = argumenTambahan[0];
          return this.eksekusiProfil(target, {
            json: opsiJSON,
            ambangMs: opsiAmbang,
            tanpaWarna: opsiTanpaWarna,
          });
        }

        case 'uji':
        case 'test': {
          const target = argumenTambahan[0];
          return this.eksekusiUji(target, {
            filter: opsiCari,
            verbose: opsiVerbose,
            json: opsiJSON,
            timeoutMs: opsiTimeout,
            warna: opsiWarna,
          });
        }

        case 'uji-semua':
        case 'quality-gate': {
          return this.eksekusiGerbangKualitas({
            verbose: opsiVerbose,
            json: opsiJSON,
            warna: opsiWarna,
          });
        }

        case 'bahasa-server':
        case 'lsp':
        case 'server': {
          // Menjalankan Language Server Protocol via stdio
          if (typeof process !== 'undefined' && process.stdin && process.stdout) {
            jalankanServerBahasaStdio();
            return 0;
          }
          this.log('NUSANTARA Language Server v0.20.0 (LSP) siap digunakan.');
          return 0;
        }

        case 'format': {
          const target = argumenTambahan[0];
          return this.eksekusiFormat(target, {
            tulis: opsiTulis,
            cek: opsiCek,
            json: opsiJSON,
            warna: opsiWarna,
            debug: opsiDebug,
          });
        }

        case 'cek':
        case 'periksa':
        case 'check': {
          const berkasTarget = argumenTambahan[0];
          return this.eksekusiCek(berkasTarget, {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
          });
        }

        case 'jalankan':
        case 'run': {
          const berkasTarget = argumenTambahan[0];
          if (!berkasTarget) {
            this.laporkanGalatCLI(
              new Error("Perintah 'nusantara jalankan' memerlukan argumen <berkas.nusantara>.\nContoh: nusantara jalankan utama.nusantara"),
              { json: opsiJSON, warna: opsiWarna }
            );
            return 2;
          }
          return this.jalankanBerkasProgram(berkasTarget, argumenTambahan.slice(1), {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
          });
        }
        case 'layani':
        case 'serve':
        case 'web': {
          const berkasTarget = argumenTambahan[0];
          if (!berkasTarget) {
            this.laporkanGalatCLI(
              new Error("Perintah 'nusantara layani' memerlukan argumen <berkas.nusantara>.\nContoh: nusantara layani aplikasi.nusantara --port 3000"),
              { json: opsiJSON, warna: opsiWarna }
            );
            return 2;
          }
          this.log(`[NUSANTARA Web] Memulai server web dari '${berkasTarget}'...`);
          return this.jalankanBerkasProgram(berkasTarget, argumenTambahan.slice(1), {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
          });
        }

        case 'paket':
        case 'package': {
          const subPerintah = argumenTambahan[0]?.toLowerCase();
          const sisaArgumen = argumenTambahan.slice(1);
          return this.eksekusiPaket(subPerintah, sisaArgumen, {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
            verbose: opsiVerbose,
            tanpaUji: args.includes('--tanpa-uji') || args.includes('--no-test'),
            offline: args.includes('--offline'),
            terkunci: args.includes('--terkunci'),
          });
        }

        case 'bangun':
        case 'build': {
          if (argumenTambahan[0] === 'paket') {
            return this.eksekusiBangunPaket(argumenTambahan[1], {
              debug: opsiDebug,
              json: opsiJSON,
              warna: opsiWarna,
              tanpaUji: args.includes('--tanpa-uji') || args.includes('--no-test'),
            });
          }
          return this.eksekusiBangunDistribusi(args, argumenTambahan, {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
            tanpaUji: args.includes('--tanpa-uji') || args.includes('--no-test'),
          });
        }

        case 'bersihkan':
        case 'clean': {
          return this.eksekusiBersihkan(args, argumenTambahan, {
            json: opsiJSON,
            warna: opsiWarna,
          });
        }

        case 'rilis':
        case 'release': {
          return this.eksekusiBangunDistribusi(args, argumenTambahan, {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
            mode: 'release',
            tanpaUji: args.includes('--tanpa-uji') || args.includes('--no-test'),
          });
        }

        case 'ci':
        case 'alur-kerja':
        case 'workflow': {
          const subPerintah = argumenTambahan[0]?.toLowerCase();
          const sisaArgumen = argumenTambahan.slice(1);
          return this.eksekusiCI(subPerintah, sisaArgumen, {
            json: opsiJSON,
            warna: opsiWarna,
            verbose: opsiVerbose,
            debug: opsiDebug,
            markdown: args.includes('--markdown'),
            simulasikanRilis: args.includes('--rilis') || args.includes('--release'),
            persetujuanRilis: args.includes('--setujui') || args.includes('--confirm'),
          });
        }

        case 'terbit':
        case 'publikasi':
        case 'publish': {
          const target = argumenTambahan[0];
          return this.eksekusiTerbitPaket(target, {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
            tanpaUji: args.includes('--tanpa-uji') || args.includes('--no-test'),
          });
        }

        case 'cari':
        case 'search': {
          const kueri = argumenTambahan[0];
          return this.eksekusiCariPaket(kueri, {
            json: opsiJSON,
            warna: opsiWarna,
          });
        }

        case 'arsip': {
          const target = argumenTambahan[0];
          return this.eksekusiBangunPaket(target, {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
            tanpaUji: true,
          });
        }

        case 'buat':
        case 'inisialisasi': {
          const nama = argumenTambahan[0];
          if (!nama) {
            this.error("Kesalahan argumen:\nPerintah 'nusantara buat' memerlukan argumen <nama-paket>.\nContoh: nusantara buat proyekku");
            return 1;
          }
          const hasil = this.pengelola.buat(nama, argumenTambahan[1]);
          this.log(`[✓ SUKSES] ${hasil.pesan}`);
          return 0;
        }

        case 'pasang':
        case 'instal': {
          const namaPaket = argumenTambahan[0];
          if (namaPaket && !namaPaket.startsWith('-')) {
            return this.eksekusiPasangPaketRegistri(namaPaket, {
              versi: argumenTambahan[1],
              offline: args.includes('--offline'),
              json: opsiJSON,
              warna: opsiWarna,
            });
          }
          const apakahTerkunci = args.includes('--terkunci');
          const hasil = this.pengelola.pasang({ terkunci: apakahTerkunci });
          this.log(`[✓ SUKSES] ${hasil.pesan}`);
          return 0;
        }

        case 'tambah':
        case 'add': {
          const nama = argumenTambahan[0];
          if (!nama) {
            this.error("Kesalahan argumen:\nPerintah 'nusantara tambah' memerlukan argumen <nama-paket> [<batasan-versi>].\nContoh: nusantara tambah matematika ^1.0.0");
            return 1;
          }
          const batasan = argumenTambahan[1];
          const hasil = this.pengelola.tambah(nama, batasan);
          this.log(`[✓ SUKSES] ${hasil.pesan}`);
          return 0;
        }

        case 'hapus':
        case 'buang': {
          const nama = argumenTambahan[0];
          if (!nama) {
            this.error("Kesalahan argumen:\nPerintah 'nusantara hapus' memerlukan argumen <nama-paket>.\nContoh: nusantara hapus matematika");
            return 1;
          }
          const hasil = this.pengelola.hapus(nama);
          this.log(`[✓ SUKSES] ${hasil.pesan}`);
          return 0;
        }

        case 'perbarui':
        case 'update': {
          const nama = argumenTambahan[0];
          const hasil = this.pengelola.perbarui(nama);
          this.log(`[✓ SUKSES] ${hasil.pesan}`);
          return 0;
        }

        case 'daftar':
        case 'list': {
          const daftar = this.pengelola.daftar();
          if (daftar.length === 0) {
            this.log('Tidak ada dependensi yang didefinisikan dalam nusantara.toml.');
            return 0;
          }

          this.log('Dependency proyek:\n');
          for (const item of daftar) {
            const status = item.terpasang ? `(terpasang: ${item.versiTerpasang || 'ok'})` : `(belum terpasang)`;
            this.log(`  ${item.nama.padEnd(16)} ${item.batasan.padEnd(10)} ${status}`);
          }
          return 0;
        }

        case 'pohon':
        case 'tree':
        case 'graf': {
          const pohon = this.pengelola.dapatkanPohonDependensi(argumenTambahan[0]);
          this.log('Pohon Dependensi Proyek NUSANTARA:\n');
          this.log(pohon);
          return 0;
        }

        case 'audit': {
          const hasil = this.pengelola.audit();
          if (opsiJSON) {
            this.log(JSON.stringify(hasil, null, 2));
            return hasil.aman ? 0 : 1;
          }
          this.log('Audit Keamanan & Integritas Dependensi NUSANTARA:');
          this.log(`  Total Paket Terpasang : ${hasil.totalPaket}`);
          this.log(`  Status Integritas     : ${hasil.integritasLockValid ? '[✓ VALID]' : '[✗ RUSAK / BERBEDA]'}`);
          this.log(`  Siklus Dependensi     : ${hasil.adaSiklus ? '[✗ TERDETEKSI]' : '[✓ BERSIH]'}`);
          this.log(`  Konflik Versi         : ${hasil.konflikVersi.length === 0 ? '[✓ TIDAK ADA]' : `[✗ ${hasil.konflikVersi.length} KONFLIK]`}`);
          this.log(`  Status Keamanan       : ${hasil.aman ? '[✓ AMAN]' : '[✗ PERLU TINDAKAN]'}`);

          if (hasil.temuan.length > 0) {
            this.log('\nDaftar Temuan Masalah:');
            for (const t of hasil.temuan) {
              this.log(`  • ${t}`);
            }
          }
          return hasil.aman ? 0 : 1;
        }

        case 'bersihkan-cache':
        case 'cache-clean': {
          const hasil = this.pengelola.bersihkanCache();
          this.log(`[✓ SUKSES] ${hasil.pesan}`);
          return 0;
        }

        case 'info': {
          const namaPaket = argumenTambahan[0];
          if (namaPaket && !namaPaket.startsWith('-')) {
            return this.eksekusiInfoPaketRegistri(namaPaket, {
              json: opsiJSON,
              warna: opsiWarna,
            });
          }
          const jalurToml = this.pembaca.gabungJalur(this.pengelola.dapatkanDirektoriProyek(), 'nusantara.toml');
          if (this.pembaca.apakahAda(jalurToml)) {
            const info = this.pengelola.info();
            const hostInfo = dapatkanInfoHost();
            if (opsiJSON) {
              this.log(JSON.stringify({ ...info, host: hostInfo }, null, 2));
              return 0;
            }
            this.log('Informasi Paket NUSANTARA:\n');
            this.log(`  Nama             : ${info.nama}`);
            this.log(`  Versi            : ${info.versi} (${LABEL_VERSI_NUSANTARA})`);
            this.log(`  Fase             : ${FASE_TERAKHIR} (${NAMA_FASE_TERAKHIR} / CI/CD & Build System)`);
            this.log(`  Deskripsi        : ${info.deskripsi}`);
            this.log(`  Lisensi          : ${info.lisensi}`);
            this.log(`  Jml Dependensi   : ${info.jumlahDependensi}`);
            this.log(`  Lokasi Proyek    : ${info.lokasiProyek}`);
            this.log(`  Platform Host    : ${hostInfo.namaPlatform}`);
            this.log(`  Arsitektur       : ${hostInfo.arsitektur}`);
            this.log(`  Mode Build       : release`);
            return 0;
          } else {
            return this.eksekusiInfoSistem(opsiJSON);
          }
        }

        case 'versi':
        case '--version':
        case '-v': {
          this.log(dapatkanBannerCLI());
          return 0;
        }

        case 'bantuan':
        case 'bantu':
        case '--help':
        case '-h':
        case undefined: {
          this.cetakBantuan();
          return 0;
        }

        default: {
          this.error(`Perintah '${perintah}' tidak dikenal.\nKetik 'nusantara bantuan' untuk melihat daftar perintah yang tersedia.`);
          return 1;
        }
      }
    } catch (err: any) {
      this.laporkanGalatCLI(err, { json: opsiJSON, debug: opsiDebug, warna: opsiWarna });
      return 1;
    }
  }

  /**
   * Eksekusi berkas program NUSANTARA dengan penanganan diagnostik lengkap.
   */
  private jalankanBerkasProgram(
    jalurBerkas: string,
    argumenEksekusi: string[],
    opsi: { debug?: boolean; json?: boolean; warna?: boolean }
  ): number {
    let kodeSumber = '';
    try {
      if (!this.pembaca.apakahAda(jalurBerkas)) {
        throw new Error(`Berkas '${jalurBerkas}' tidak ditemukan.`);
      }
      kodeSumber = this.pembaca.baca(jalurBerkas);

      // 1. Parsing
      const parser = new Parser(kodeSumber);
      const ast = parser.parse();
      const galatParser = parser.dapatkanDaftarGalat();
      if (galatParser.length > 0) {
        throw galatParser[0];
      }

      // 2. Modul & Resolusi
      const direktoriBerkas = this.pembaca.direktoriDari(jalurBerkas) || '.';
      const resolver = new ResolverModul(this.pembaca, {
        direktoriAkarProyek: direktoriBerkas,
      });
      const pemuat = new PemuatModul(resolver, this.pembaca, {
        argumenCLI: argumenEksekusi,
      });

      // 3. Type Checking
      const pemeriksaTipe = new PemeriksaTipe(pemuat);
      const galatTipe = pemeriksaTipe.periksa(ast, direktoriBerkas);
      if (galatTipe.length > 0) {
        throw galatTipe[0];
      }

      // 4. Interpreter
      const penulis = new PenulisOutputKonsol();
      const interpreter = new Interpreter(penulis, {
        pemuatModul: pemuat,
        resolverModul: resolver,
        pembacaBerkas: this.pembaca,
        direktoriBasis: direktoriBerkas,
        argumenCLI: argumenEksekusi,
      });

      interpreter.interpretasikan(ast, direktoriBerkas);
      return 0;
    } catch (err: any) {
      this.laporkanGalatCLI(err, {
        kodeSumber,
        namaBerkas: jalurBerkas,
        debug: opsi.debug,
        json: opsi.json,
        warna: opsi.warna,
      });
      return 1;
    }
  }

  /**
   * Pemformatan kode sumber NUSANTARA (Phase 19).
   */
  private eksekusiFormat(
    target: string | undefined,
    opsi: { tulis?: boolean; cek?: boolean; json?: boolean; warna?: boolean; debug?: boolean }
  ): number {
    const targetPath = target || '.';
    const pemeriksa = new PemeriksaProyek(this.pembaca);

    let konfigurasiFormat: any = undefined;
    if (this.pembaca.apakahAda('nusantara.toml')) {
      try {
        const tomlStr = this.pembaca.baca('nusantara.toml');
        konfigurasiFormat = muatKonfigurasiFormatDariTOML(tomlStr);
      } catch {
        // Abaikan galat parsing konfigurasi
      }
    }

    let daftarBerkas: string[] = [];
    if (this.pembaca.apakahAda(targetPath) && targetPath.endsWith('.nusantara')) {
      daftarBerkas = [targetPath];
    } else {
      daftarBerkas = pemeriksa.temukanBerkasNusantara(targetPath);
    }

    if (daftarBerkas.length === 0) {
      if (targetPath.endsWith('.nusantara')) {
        this.laporkanGalatCLI(new Error(`Berkas '${targetPath}' tidak ditemukan.`), {
          json: opsi.json,
          warna: opsi.warna,
        });
        return 1;
      }
      this.log(`Tidak ditemukan berkas .nusantara pada direktori '${targetPath}'.`);
      return 0;
    }

    // Mode Pemeriksaan: --cek
    if (opsi.cek) {
      let semuaTerformat = true;
      for (const berkas of daftarBerkas) {
        try {
          const kodeAsli = this.pembaca.baca(berkas);
          const hasil = formatKode(kodeAsli, konfigurasiFormat);
          if (hasil !== kodeAsli) {
            semuaTerformat = false;
            this.log(`File belum mengikuti format standar: ${berkas}`);
          } else {
            this.log(`File sudah terformat: ${berkas}`);
          }
        } catch (err) {
          semuaTerformat = false;
          this.laporkanGalatCLI(err, { namaBerkas: berkas, json: opsi.json, warna: opsi.warna });
        }
      }
      return semuaTerformat ? 0 : 1;
    }

    // Mode Tulis In-Place: --tulis / -w
    if (opsi.tulis) {
      let adaKegagalan = false;
      for (const berkas of daftarBerkas) {
        try {
          const kodeAsli = this.pembaca.baca(berkas);
          const hasilAman = formatAman(kodeAsli, konfigurasiFormat);
          if (!hasilAman.sukses) {
            adaKegagalan = true;
            this.laporkanGalatCLI(hasilAman.galat, {
              kodeSumber: kodeAsli,
              namaBerkas: berkas,
              json: opsi.json,
              warna: opsi.warna,
            });
            continue;
          }

          if (hasilAman.apakahBerubah && typeof this.pembaca.tulis === 'function') {
            this.pembaca.tulis(berkas, hasilAman.hasil!);
            this.log(`[✓ SUKSES] Berkas '${berkas}' berhasil diformat.`);
          } else {
            this.log(`Berkas '${berkas}' sudah rapi.`);
          }
        } catch (err) {
          adaKegagalan = true;
          this.laporkanGalatCLI(err, { namaBerkas: berkas, json: opsi.json, warna: opsi.warna });
        }
      }
      return adaKegagalan ? 1 : 0;
    }

    // Mode Standar (Cetak ke stdout untuk satu berkas)
    if (daftarBerkas.length === 1) {
      const berkas = daftarBerkas[0];
      try {
        const kodeAsli = this.pembaca.baca(berkas);
        const hasilAman = formatAman(kodeAsli, konfigurasiFormat);
        if (!hasilAman.sukses) {
          this.laporkanGalatCLI(hasilAman.galat, {
            kodeSumber: kodeAsli,
            namaBerkas: berkas,
            json: opsi.json,
            warna: opsi.warna,
          });
          return 1;
        }
        this.log(hasilAman.hasil!);
        return 0;
      } catch (err) {
        this.laporkanGalatCLI(err, { namaBerkas: berkas, json: opsi.json, warna: opsi.warna });
        return 1;
      }
    } else {
      this.log(
        `Ditemukan ${daftarBerkas.length} berkas .nusantara.\nGunakan '--tulis' untuk memformat berkas langsung, atau '--cek' untuk memeriksa.`
      );
      return 0;
    }
  }

  /**
   * Pemeriksaan sintaksis, sistem tipe, dan linter tanpa eksekusi (Phase 19).
   */
  private eksekusiCek(
    target: string | undefined,
    opsi: { debug?: boolean; json?: boolean; warna?: boolean }
  ): number {
    const pemeriksa = new PemeriksaProyek(this.pembaca);

    // Kasus 1: Berkas tunggal
    if (target && target.endsWith('.nusantara')) {
      const hasil = pemeriksa.periksaBerkas(target);
      if (!hasil.sukses || hasil.galat.length > 0) {
        if (opsi.json) {
          this.error(JSON.stringify(hasil.diagnostik, null, 2));
        } else {
          for (const d of hasil.galat) {
            this.error(formatDiagnostik(d, { warna: opsi.warna, modeDebug: opsi.debug }));
          }
        }
        return 1;
      }

      if (hasil.peringatan.length > 0) {
        if (opsi.json) {
          this.log(JSON.stringify(hasil.diagnostik, null, 2));
        } else {
          for (const p of hasil.peringatan) {
            this.log(formatDiagnostik(p, { warna: opsi.warna, modeDebug: opsi.debug }));
          }
          this.log(`[✓ VALID] Pemeriksaan selesai dengan ${hasil.peringatan.length} peringatan. Tidak ditemukan kesalahan fatal.`);
        }
        return 0;
      }

      if (opsi.json) {
        this.log(JSON.stringify({ status: 'sukses', pesan: 'Tidak ditemukan kesalahan.', berkas: target }, null, 2));
      } else {
        this.log(`[✓ VALID] Berkas '${target}' sah dan valid. Tidak ditemukan kesalahan.`);
      }
      return 0;
    }

    // Kasus 2: Pemeriksaan proyek
    const targetDir = target || '.';
    const hasilProyek = pemeriksa.periksaProyek(targetDir);

    if (!hasilProyek.sukses || hasilProyek.galat.length > 0) {
      if (opsi.json) {
        this.error(JSON.stringify(hasilProyek.diagnostik, null, 2));
      } else {
        for (const g of hasilProyek.galat) {
          this.error(formatDiagnostik(g, { warna: opsi.warna, modeDebug: opsi.debug }));
        }
      }
      return 1;
    }

    if (hasilProyek.peringatan.length > 0) {
      if (opsi.json) {
        this.log(JSON.stringify(hasilProyek.diagnostik, null, 2));
      } else {
        for (const p of hasilProyek.peringatan) {
          this.log(formatDiagnostik(p, { warna: opsi.warna, modeDebug: opsi.debug }));
        }
        this.log(
          `[✓ VALID] Pemeriksaan proyek selesai (${hasilProyek.totalBerkasDiperiksa} berkas) dengan ${hasilProyek.peringatan.length} peringatan. Tidak ditemukan kesalahan fatal.`
        );
      }
      return 0;
    }

    if (opsi.json) {
      this.log(
        JSON.stringify(
          {
            status: 'sukses',
            pesan: 'Tidak ditemukan kesalahan.',
            totalBerkas: hasilProyek.totalBerkasDiperiksa,
          },
          null,
          2
        )
      );
    } else {
      this.log('[✓ VALID] Proyek valid. Tidak ditemukan kesalahan.');
    }
    return 0;
  }

  /**
   * Eksekusi pengujian otomatis unit/integrasi/regresi NUSANTARA.
   */
  private eksekusiUji(
    target: string | undefined,
    opsi: {
      filter?: string;
      verbose?: boolean;
      json?: boolean;
      timeoutMs?: number;
      warna?: boolean;
    }
  ): number {
    const penemu = new PenemuUji(this.pembaca);
    let daftarBerkas: string[] = [];

    if (target) {
      const apakahDir = typeof this.pembaca.apakahDirektori === 'function' ? this.pembaca.apakahDirektori(target) : false;
      if (this.pembaca.apakahAda(target) && !apakahDir) {
        daftarBerkas = [target];
      } else {
        daftarBerkas = penemu.temukan(target);
      }
    } else {
      daftarBerkas = penemu.temukan('.');
    }

    if (daftarBerkas.length === 0) {
      const pesan = `Tidak ada berkas pengujian (*.uji.nusantara atau *_test.nusantara) yang ditemukan${
        target ? ` di target '${target}'` : ''
      }.`;
      if (opsi.json) {
        this.log(JSON.stringify({ sukses: true, total: 0, pesan }));
      } else {
        this.log(`[i] ${pesan}`);
      }
      return 0;
    }

    const runner = new PelariUji({
      timeoutMs: opsi.timeoutMs ?? 5000,
      verbose: opsi.verbose,
      pembaca: this.pembaca,
    });

    const ringkasan = runner.jalankanSinkron(daftarBerkas, { filter: opsi.filter });

    if (opsi.json) {
      this.log(PelaporJSON.format(ringkasan));
    } else {
      this.log(PelaporKonsol.format(ringkasan, { warna: opsi.warna, verbose: opsi.verbose }));
    }

    return ringkasan.gagal > 0 ? 1 : 0;
  }

  /**
   * Eksekusi Quality Gate lengkap untuk verifikasi kualitas NUSANTARA.
   */
  private eksekusiGerbangKualitas(opsi: {
    verbose?: boolean;
    json?: boolean;
    warna?: boolean;
  }): number {
    const gerbang = new GerbangKualitas({
      pembaca: this.pembaca,
      verbose: opsi.verbose,
      ambangBatasCakupan: 85,
    });

    const hasil = gerbang.jalankanSinkron();

    if (opsi.json) {
      this.log(JSON.stringify(hasil, null, 2));
    } else {
      this.log(gerbang.formatLaporanTeks(hasil, { warna: opsi.warna }));
    }

    return hasil.lulusSemua ? 0 : 1;
  }

  private laporkanGalatCLI(
    err: unknown,
    opsi: { kodeSumber?: string; namaBerkas?: string; debug?: boolean; json?: boolean; warna?: boolean }
  ): void {
    if (opsi.json) {
      const jsonStr = mesinDiagnostikDefault.formatGalatKeJSON(err, {
        kodeSumber: opsi.kodeSumber,
        namaBerkas: opsi.namaBerkas,
        modeDebug: opsi.debug,
      });
      this.error(jsonStr);
    } else {
      const teksFormat = mesinDiagnostikDefault.formatGalat(err, {
        kodeSumber: opsi.kodeSumber,
        namaBerkas: opsi.namaBerkas,
        modeDebug: opsi.debug,
        warna: opsi.warna,
        tampilkanJejak: true,
      });
      this.error(teksFormat);
    }
  }

  // ==========================================================================
  // PHASE 22: EKOSISTEM PAKET & REGISTRI
  // ==========================================================================

  private eksekusiPaket(
    subPerintah: string | undefined,
    argumen: string[],
    opsi: {
      debug?: boolean;
      json?: boolean;
      warna?: boolean;
      verbose?: boolean;
      tanpaUji?: boolean;
      offline?: boolean;
      terkunci?: boolean;
    }
  ): number {
    switch (subPerintah) {
      case 'bangun':
      case 'build':
        return this.eksekusiBangunPaket(argumen[0], opsi);

      case 'cek':
      case 'check':
      case 'periksa':
        return this.eksekusiCekPaket(argumen[0], opsi);

      case 'terbit':
      case 'publish':
      case 'publikasi':
        return this.eksekusiTerbitPaket(argumen[0], opsi);

      case 'cari':
      case 'search':
        return this.eksekusiCariPaket(argumen[0], opsi);

      case 'info':
        return this.eksekusiInfoPaketRegistri(argumen[0], opsi);

      case 'pasang':
      case 'instal':
        if (argumen[0] && !argumen[0].startsWith('-')) {
          return this.eksekusiPasangPaketRegistri(argumen[0], {
            versi: argumen[1],
            offline: opsi.offline,
            json: opsi.json,
            warna: opsi.warna,
          });
        }
        return this.pengelola.pasang({ terkunci: opsi.terkunci }).sukses ? 0 : 1;

      case 'buat':
      case 'inisialisasi': {
        const nama = argumen[0];
        if (!nama) {
          this.error("Perintah 'nusantara paket buat' memerlukan argumen <nama-paket>.");
          return 1;
        }
        const hasil = this.pengelola.buat(nama, argumen[1]);
        this.log(`[✓ SUKSES] ${hasil.pesan}`);
        return 0;
      }

      case 'arsip':
        return this.eksekusiBangunPaket(argumen[0], { ...opsi, tanpaUji: true });

      case 'daftar':
      case 'list': {
        const daftar = this.pengelola.daftar();
        if (daftar.length === 0) {
          this.log('Tidak ada dependensi yang didefinisikan dalam nusantara.toml.');
          return 0;
        }
        this.log('Dependency proyek:\n');
        for (const item of daftar) {
          const status = item.terpasang ? `(terpasang: ${item.versiTerpasang || 'ok'})` : `(belum terpasang)`;
          this.log(`  ${item.nama.padEnd(16)} ${item.batasan.padEnd(10)} ${status}`);
        }
        return 0;
      }

      case 'tambah':
      case 'add': {
        const nama = argumen[0];
        if (!nama) {
          this.error("Perintah 'nusantara paket tambah' memerlukan argumen <nama-paket> [<batasan-versi>].");
          return 1;
        }
        const hasil = this.pengelola.tambah(nama, argumen[1]);
        this.log(`[✓ SUKSES] ${hasil.pesan}`);
        return 0;
      }

      case 'pohon':
      case 'tree':
      case 'graf': {
        const pohon = this.pengelola.dapatkanPohonDependensi(argumen[0]);
        this.log('Pohon Dependensi Proyek NUSANTARA:\n');
        this.log(pohon);
        return 0;
      }

      case 'audit': {
        const hasil = this.pengelola.audit();
        if (opsi.json) {
          this.log(JSON.stringify(hasil, null, 2));
          return hasil.aman ? 0 : 1;
        }
        this.log('Audit Keamanan & Integritas Dependensi NUSANTARA:');
        this.log(`  Total Paket Terpasang : ${hasil.totalPaket}`);
        this.log(`  Status Integritas     : ${hasil.integritasLockValid ? '[✓ VALID]' : '[✗ RUSAK / BERBEDA]'}`);
        this.log(`  Siklus Dependensi     : ${hasil.adaSiklus ? '[✗ TERDETEKSI]' : '[✓ BERSIH]'}`);
        this.log(`  Konflik Versi         : ${hasil.konflikVersi.length === 0 ? '[✓ TIDAK ADA]' : `[✗ ${hasil.konflikVersi.length} KONFLIK]`}`);
        this.log(`  Status Keamanan       : ${hasil.aman ? '[✓ AMAN]' : '[✗ PERLU TINDAKAN]'}`);

        if (hasil.temuan.length > 0) {
          this.log('\nDaftar Temuan Masalah:');
          for (const t of hasil.temuan) {
            this.log(`  • ${t}`);
          }
        }
        return hasil.aman ? 0 : 1;
      }

      case 'bersihkan-cache':
      case 'cache-clean': {
        const hasil = this.pengelola.bersihkanCache();
        this.log(`[✓ SUKSES] ${hasil.pesan}`);
        return 0;
      }

      case 'bantuan':
      case 'bantu':
      case '--help':
      case '-h':
      case undefined: {
        this.log(`
Penggunaan Perintah 'nusantara paket':
  nusantara paket bangun [<target>] [--tanpa-uji]   Membangun arsip paket (.npk) dengan verifikasi & test
  nusantara paket cek [<target>]                    Validasi menyeluruh (manifest, semver, kode, uji, rahasia)
  nusantara paket terbit [<target>] [--tanpa-uji]   Menerbitkan paket ke registri lokal (rilis immutable)
  nusantara paket cari <kueri>                      Mencari paket yang tersedia di registri
  nusantara paket info <nama>                       Menampilkan metadata detail paket di registri
  nusantara paket pasang <nama> [<versi>]           Memasang paket dari registri dan memperbarui manifest
  nusantara paket tambah <nama> [<versi>]           Menambahkan dependensi baru ke manifest dan pasang
  nusantara paket hapus <nama>                      Menghapus dependensi dari manifest dan proyek
  nusantara paket buat <nama>                       Membuat struktur paket baru
  nusantara paket daftar                            Menampilkan daftar dependensi proyek saat ini
  nusantara paket pohon                             Menampilkan pohon visual dependensi proyek
  nusantara paket audit                             Audit keamanan graf, siklus, konflik, dan lockfile
  nusantara paket bersihkan-cache                   Membersihkan cache paket offline lokal
`);
        return 0;
      }

      default:
        this.error(`Sub-perintah paket '${subPerintah}' tidak dikenal.\nKetik 'nusantara paket bantuan' untuk panduan.`);
        return 1;
    }
  }

  private eksekusiCekPaket(
    targetDir: string | undefined,
    opsi: { debug?: boolean; json?: boolean; warna?: boolean }
  ): number {
    const hasil = this.pengelola.cek(targetDir);
    if (opsi.json) {
      this.log(JSON.stringify(hasil, null, 2));
      return hasil.valid ? 0 : 1;
    }
    this.log(`Pemeriksaan Paket NUSANTARA:`);
    this.log(`  Paket            : ${hasil.nama} v${hasil.versi}`);
    for (const p of hasil.daftarPemeriksaan) {
      const tanda = p.status === 'LULUS' ? '[✓]' : p.status === 'PERINGATAN' ? '[!]' : '[✗]';
      this.log(`  ${tanda} [${p.kategori.toUpperCase()}] ${p.nama}: ${p.pesan}`);
    }
    this.log(`  Status Akhir     : ${hasil.valid ? '[✓ VALID]' : '[✗ TIDAK VALID]'}`);

    if (hasil.daftarGalat.length > 0) {
      this.error(`\nDitemukan kesalahan validasi paket:`);
      for (const g of hasil.daftarGalat) {
        this.error(`  - ${g}`);
      }
    }
    if (hasil.daftarPeringatan.length > 0) {
      this.log(`\nPeringatan:`);
      for (const p of hasil.daftarPeringatan) {
        this.log(`  - ${p}`);
      }
    }
    return hasil.valid ? 0 : 1;
  }

  private eksekusiBangunPaket(
    targetDir: string | undefined,
    opsi: { debug?: boolean; json?: boolean; warna?: boolean; tanpaUji?: boolean }
  ): number {
    const arsip = this.pengelola.bangun(targetDir, { lewatiUji: opsi.tanpaUji });
    if (opsi.json) {
      this.log(
        JSON.stringify(
          {
            sukses: true,
            nama: arsip.header.nama,
            versi: arsip.header.versi,
            checksum: arsip.checksum,
            totalBerkas: arsip.header.totalBerkas,
          },
          null,
          2
        )
      );
      return 0;
    }
    this.log(`[✓ SUKSES] Berhasil membangun arsip paket '${arsip.header.nama}@${arsip.header.versi}'.`);
    this.log(`  Checksum SHA-256 : ${arsip.checksum}`);
    this.log(`  Total Berkas     : ${arsip.header.totalBerkas} berkas terkemas`);
    return 0;
  }

  private eksekusiTerbitPaket(
    targetDir: string | undefined,
    opsi: { debug?: boolean; json?: boolean; warna?: boolean; tanpaUji?: boolean }
  ): number {
    const hasil = this.pengelola.terbitkan(targetDir, { lewatiUji: opsi.tanpaUji });
    if (opsi.json) {
      this.log(JSON.stringify(hasil, null, 2));
      return hasil.sukses ? 0 : 1;
    }
    this.log(`[✓ SUKSES] ${hasil.pesan}`);
    this.log(`  Paket    : ${hasil.nama}@${hasil.versi}`);
    this.log(`  Checksum : ${hasil.checksum}`);
    this.log(`  Status   : Rilis Immutable tersimpan`);
    return 0;
  }

  private eksekusiCariPaket(
    kueri: string | undefined,
    opsi: { json?: boolean; warna?: boolean }
  ): number {
    if (!kueri) {
      this.error("Kesalahan argumen: Perintah 'cari' memerlukan kueri pencarian.\nContoh: nusantara paket cari matematika");
      return 1;
    }
    const hasil = this.pengelola.cari(kueri);
    if (opsi.json) {
      this.log(JSON.stringify(hasil, null, 2));
      return 0;
    }
    if (hasil.length === 0) {
      this.log(`Tidak ada paket yang cocok dengan kueri '${kueri}'.`);
      return 0;
    }
    this.log(`Hasil Pencarian Paket Registri (${hasil.length} ditemukan):\n`);
    for (const item of hasil) {
      this.log(`  * ${item.nama.padEnd(20)} v${item.versi.padEnd(10)} - ${item.deskripsi}`);
      if (item.kata_kunci && item.kata_kunci.length > 0) {
        this.log(`    Tag: [${item.kata_kunci.join(', ')}]`);
      }
    }
    return 0;
  }

  private eksekusiInfoPaketRegistri(
    namaPaket: string | undefined,
    opsi: { json?: boolean; warna?: boolean }
  ): number {
    if (!namaPaket) {
      return this.jalankan(['info']);
    }
    const metadata = this.pengelola.infoPaketRegistri(namaPaket);
    if (!metadata) {
      this.error(`Paket '${namaPaket}' tidak ditemukan di registri.`);
      return 1;
    }
    if (opsi.json) {
      this.log(JSON.stringify(metadata, null, 2));
      return 0;
    }
    const versiTersedia = Object.keys(metadata.daftarVersi || {});
    this.log(`Informasi Paket Registri: ${metadata.nama}`);
    this.log(`  Nama             : ${metadata.nama}`);
    this.log(`  Deskripsi        : ${metadata.deskripsi || '-'}`);
    this.log(`  Lisensi          : ${metadata.lisensi || '-'}`);
    this.log(`  Penulis          : ${Array.isArray(metadata.penulis) ? metadata.penulis.join(', ') : metadata.penulis || '-'}`);
    this.log(`  Versi Tersedia   : ${versiTersedia.join(', ')}`);
    this.log(`  Versi Terbaru    : ${metadata.versiTerbaru}`);
    if (metadata.daftarVersi && metadata.daftarVersi[metadata.versiTerbaru]) {
      const v = metadata.daftarVersi[metadata.versiTerbaru];
      this.log(`  Checksum SHA-256 : ${v.checksum}`);
      const deps = Object.keys(v.dependensi || {});
      this.log(`  Dependensi (${deps.length})  : ${deps.length > 0 ? deps.map(d => `${d} (${v.dependensi[d]})`).join(', ') : 'tidak ada'}`);
    }
    return 0;
  }

  private eksekusiPasangPaketRegistri(
    namaPaket: string,
    opsi: { versi?: string; offline?: boolean; json?: boolean; warna?: boolean }
  ): number {
    const hasil = this.pengelola.pasangPaket(namaPaket, {
      versi: opsi.versi,
      offline: opsi.offline,
    });
    if (opsi.json) {
      this.log(JSON.stringify(hasil, null, 2));
      return 0;
    }
    this.log(`[✓ SUKSES] ${hasil.pesan}`);
    return 0;
  }

  private eksekusiBangunDistribusi(
    rawArgs: string[],
    argsTambahan: string[],
    opsi: {
      debug?: boolean;
      json?: boolean;
      warna?: boolean;
      mode?: 'debug' | 'release';
      tanpaUji?: boolean;
    }
  ): number {
    const mesin = new MesinBuild(this.pembaca, {
      log: this.log,
      error: this.error,
    });

    let mode: 'debug' | 'release' = opsi.mode || 'release';
    const modeIdx = rawArgs.findIndex(a => a === '--mode' || a === '-m');
    if (modeIdx !== -1 && rawArgs[modeIdx + 1]) {
      const m = rawArgs[modeIdx + 1].toLowerCase();
      if (m === 'debug' || m === 'release') mode = m;
    } else if (rawArgs.includes('--debug') || rawArgs.includes('-d') || opsi.debug) {
      mode = 'debug';
    } else if (rawArgs.includes('--release') || rawArgs.includes('-r')) {
      mode = 'release';
    }

    let targetPlatform: PlatformTarget[] | undefined;
    const targetIdx = rawArgs.findIndex(a => a === '--target' || a === '-t');
    if (targetIdx !== -1 && rawArgs[targetIdx + 1]) {
      targetPlatform = [rawArgs[targetIdx + 1] as PlatformTarget];
    }

    const apakahBersih = rawArgs.includes('--bersih') || rawArgs.includes('--clean');
    if (apakahBersih) {
      mesin.bersihkan();
    }

    const hasil = mesin.bangun({
      mode,
      target: targetPlatform,
      verifikasiUji: !opsi.tanpaUji && !rawArgs.includes('--tanpa-uji'),
      verbose: rawArgs.includes('--verbose') || rawArgs.includes('-V'),
    });

    if (opsi.json) {
      this.log(JSON.stringify(hasil, null, 2));
      return hasil.sukses ? 0 : 1;
    }

    if (hasil.sukses) {
      this.log(hasil.pesan);
      this.log(`\nArtefak Distribusi (${hasil.artefak.length}):`);
      for (const a of hasil.artefak) {
        const kb = (a.ukuranByte / 1024).toFixed(1);
        this.log(`  - ${a.namaBerkas.padEnd(46)} (${kb} KB, sha256: ${a.sha256.substring(0, 16)}...)`);
      }
      if (hasil.manifest) {
        this.log(`\nBerkas Manifest Rilis : dist/release-manifest.json`);
        this.log(`Berkas Checksum Resmi  : dist/SHA256SUMS`);
      }
      return 0;
    } else {
      this.error(hasil.pesan);
      if (hasil.galat) {
        this.error(`Rincian galat: ${hasil.galat}`);
      }
      return 1;
    }
  }

  private eksekusiBersihkan(
    rawArgs: string[],
    argsTambahan: string[],
    opsi: { json?: boolean; warna?: boolean }
  ): number {
    const mesin = new MesinBuild(this.pembaca, {
      log: this.log,
      error: this.error,
    });
    const hasil = mesin.bersihkan();
    if (opsi.json) {
      this.log(JSON.stringify(hasil, null, 2));
      return 0;
    }
    this.log(hasil.pesan);
    return 0;
  }

  private eksekusiInfoSistem(opsiJSON?: boolean): number {
    const hostInfo = dapatkanInfoHost();
    const info = {
      nama: 'NUSANTARA',
      versi: VERSI_NUSANTARA,
      label: LABEL_VERSI_NUSANTARA,
      fase: FASE_TERAKHIR,
      namaFase: NAMA_FASE_TERAKHIR,
      host: hostInfo,
      modeDefault: 'release',
      targetDidukung: ['windows-x64', 'linux-x64', 'macos-x64', 'macos-arm64'],
      direktori: {
        akarProyek: this.pengelola.dapatkanDirektoriProyek(),
        dist: 'dist',
        target: 'target',
        stdlib: 'std',
      },
    };

    if (opsiJSON) {
      this.log(JSON.stringify(info, null, 2));
      return 0;
    }

    this.log('NUSANTARA - Informasi Sistem & Build:');
    this.log(`  Versi            : ${info.label} (${info.namaFase} / CI/CD & Build System)`);
    this.log(`  Platform Host    : ${hostInfo.namaPlatform}`);
    this.log(`  Arsitektur       : ${hostInfo.arsitektur}`);
    this.log(`  Mode Default     : ${info.modeDefault}`);
    this.log(`  Target Resmi     : ${info.targetDidukung.join(', ')}`);
    this.log(`  Direktori Output : ${info.direktori.dist}`);
    this.log(`  Direktori Build  : ${info.direktori.target}`);
    this.log(`  Pustaka Standar  : ${info.direktori.stdlib}`);
    return 0;
  }

  /**
   * Eksekusi alur kerja CI/CD lokal dan verifikasi GitHub Actions (Phase 24).
   */
  private eksekusiCI(
    subPerintah: string | undefined,
    sisaArgumen: string[],
    opsi: {
      json?: boolean;
      warna?: boolean;
      verbose?: boolean;
      debug?: boolean;
      markdown?: boolean;
      simulasikanRilis?: boolean;
      persetujuanRilis?: boolean;
    }
  ): number {
    if (subPerintah === 'periksa-workflow' || subPerintah === 'lint') {
      const validator = new ValidatorAlurKerjaGitHub(this.pembaca);
      const jalurCI = this.pembaca.gabungJalur(this.pengelola.dapatkanDirektoriProyek(), '.github/workflows/ci.yml');
      const jalurRelease = this.pembaca.gabungJalur(this.pengelola.dapatkanDirektoriProyek(), '.github/workflows/release.yml');

      const valCI = validator.validasiBerkas(jalurCI);
      const valRel = validator.validasiBerkas(jalurRelease);

      if (opsi.json) {
        this.log(JSON.stringify({ ci: valCI, release: valRel }, null, 2));
        return valCI.valid && valRel.valid ? 0 : 1;
      }

      this.log('Pemeriksaan Keamanan & Sintaks Alur Kerja GitHub Actions:\n');
      this.log(`  1. .github/workflows/ci.yml       : ${valCI.valid ? '[✓ VALID]' : '[✗ GALAT]'}`);
      this.log(`     - Least Privilege Permissions : ${valCI.leastPrivilegeTercapai ? 'Ya (contents: read)' : 'Tidak'}`);
      this.log(`     - Concurrency Control         : ${valCI.concurrencyAman ? 'Aman' : 'Perlu diperbaiki'}`);
      this.log(`     - Daftar Job                  : ${valCI.daftarJob.map((j) => j.id).join(', ')}`);

      this.log(`\n  2. .github/workflows/release.yml  : ${valRel.valid ? '[✓ VALID]' : '[✗ GALAT]'}`);
      this.log(`     - Least Privilege Permissions : ${valRel.leastPrivilegeTercapai ? 'Ya (contents: read root)' : 'Tidak'}`);
      this.log(`     - Gerbang Persetujuan Manual  : ${valRel.persetujuanRilisAman ? 'Wajib (confirm_release)' : 'Tidak aman'}`);
      this.log(`     - Daftar Job                  : ${valRel.daftarJob.map((j) => j.id).join(', ')}`);

      const semuaTemuan = [...valCI.temuan, ...valRel.temuan];
      if (semuaTemuan.length > 0) {
        this.log('\nTemuan Audit Keamanan & Konfigurasi:');
        for (const t of semuaTemuan) {
          const badge = t.tingkat === 'kritis' ? '[KRITIS]' : t.tingkat === 'peringatan' ? '[PERINGATAN]' : '[INFO]';
          this.log(`  - ${badge} ${t.pesan}`);
        }
      }

      return valCI.valid && valRel.valid ? 0 : 1;
    }

    // Default: Jalankan Mesin CI Pipeline
    const mesin = new MesinCI({
      pembaca: this.pembaca,
      direktoriBasis: this.pengelola.dapatkanDirektoriProyek(),
      verbose: opsi.verbose,
      simulasikanRilis: opsi.simulasikanRilis,
      persetujuanRilis: opsi.persetujuanRilis,
    });

    const hasil = mesin.jalankan();

    if (opsi.json) {
      this.log(JSON.stringify(hasil, null, 2));
    } else if (opsi.markdown) {
      this.log(hasil.ringkasanMarkdown);
    } else {
      this.log(hasil.ringkasanTeks);
    }

    return hasil.statusAkhir === 'PASS' ? 0 : 1;
  }

  /**
   * Eksekusi sesi penelusuran (debugging) interaktif & terarah (Phase 25).
   */
  private eksekusiDebug(
    target: string | undefined,
    opsi: { perintahAwal?: string[]; verbose?: boolean }
  ): number {
    if (!target) {
      this.error(
        "Kesalahan argumen:\nPerintah 'nusantara debug' memerlukan argumen berkas target (.nusantara).\nContoh: nusantara debug program.nusantara"
      );
      return 1;
    }

    if (!this.pembaca.apakahAda(target)) {
      this.error(`Berkas target '${target}' tidak ditemukan.`);
      return 1;
    }

    const sumber = this.pembaca.baca(target);
    const pelari = new PelariDebuggerCLI({
      log: this.log,
      error: this.error,
    });

    try {
      const sesi = pelari.jalankan({
        berkas: target,
        sumber,
        perintahAwal: opsi.perintahAwal,
        verbose: opsi.verbose,
      });
      return sesi.status === 'finished' || sesi.status === 'terminated' ? 0 : 1;
    } catch (e: any) {
      this.error(`Debugging terhenti dengan galat: ${e?.message || e}`);
      return 1;
    }
  }

  /**
   * Eksekusi pengukuran kinerja & profiler waktu eksekusi fungsi (Phase 25).
   */
  private eksekusiProfil(
    target: string | undefined,
    opsi: { json?: boolean; ambangMs?: number; tanpaWarna?: boolean }
  ): number {
    if (!target) {
      this.error(
        "Kesalahan argumen:\nPerintah 'nusantara profil' memerlukan argumen berkas target (.nusantara).\nContoh: nusantara profil program.nusantara"
      );
      return 1;
    }

    if (!this.pembaca.apakahAda(target)) {
      this.error(`Berkas target '${target}' tidak ditemukan.`);
      return 1;
    }

    const sumber = this.pembaca.baca(target);
    const hasil = PelariProfilerCLI.jalankan(target, sumber, {
      json: opsi.json,
      ambangMs: opsi.ambangMs,
      tanpaWarna: opsi.tanpaWarna,
      log: this.log,
      error: this.error,
    });

    return hasil.kodeKeluar;
  }

  private cetakBantuan(): void {
    this.log(`
Bahasa Pemrograman NUSANTARA (${LABEL_VERSI_NUSANTARA})
Antarmuka Baris Perintah (CLI), Debugger & Profiler, CI/CD & Automated Release, Build System & Distribution, Package Ecosystem, Testing & LSP

Penggunaan:
  nusantara <perintah> [argumen...]
  nusantara <berkas.nusantara> [argumen...]

Perintah Debugger & Profiler Runtime (Phase 25):
  debug <berkas> [--perintah="<cmds>"]   Menjalankan sesi penelusuran program interaktif / batch
  profil <berkas> [--json] [--ambang=<ms>] Mengukur waktu eksekusi fungsi, waktu mandiri, dan statistik memori

Perintah Alur Kerja CI/CD & Validasi Rilis (Phase 24):
  ci [--markdown] [--json]     Menjalankan seluruh alur validasi CI lokal (statis, uji, quality gate, matriks build)
  ci periksa-workflow, ci lint Memvalidasi sintaks dan keamanan berkas workflow GitHub Actions (.github/workflows)
  ci --rilis [--setujui]       Mensimulasikan gerbang rilis dan validasi prasyarat persetujuan rilis manual

Perintah Sistem Build & Distribusi (Phase 23):
  bangun [--mode debug|release] [--target <platform>] [--bersih] [--tanpa-uji]
                         Membangun artefak rilis biner resmi untuk Windows, Linux, dan macOS
  bersihkan, clean      Membersihkan direktori artefak kompilasi dan rilis (dist/ dan target/)
  rilis                 Membangun paket rilis distribusi mode release dengan seluruh validasi
  info                  Menampilkan informasi build sistem NUSANTARA atau metadata paket

Perintah Eksekusi, Toolchain, Testing & Developer Tools:
  jalankan <berkas>      Eksekusi program NUSANTARA
  uji [<target>]         Menjalankan pengujian otomatis (*.uji.nusantara / *_test.nusantara)
  uji-semua, quality-gate Menjalankan seluruh Quality Gate & Verifikasi Kualitas NUSANTARA
  format [<berkas>|.]    Format kode sumber NUSANTARA sesuai standar resmi
  cek [<berkas>|.]       Pemeriksaan sintaksis, sistem tipe, dan linter tanpa eksekusi
  bahasa-server, lsp     Menjalankan Language Server Protocol (LSP) via stdio untuk IDE/Editor

Perintah Ekosistem Paket & Dependency Management (Phase 16, 22 & 27):
  paket <subperintah>    Kelola paket & registri (bangun, cek, terbit, cari, info, pasang, tambah, hapus, pohon, audit)
  terbit [<target>]      Menerbitkan paket ke registri (rilis immutable dengan SHA-256)
  cari <kueri>           Mencari paket yang tersedia di registri
  pasang [<nama>]        Memasang dependensi proyek atau memasang paket dari registri (--terkunci)
  tambah <nama> [<versi>] Menambahkan paket ke nusantara.toml dan menginstal dependensi
  buat <nama>            Membuat paket atau proyek baru dengan nusantara.toml
  hapus <nama>           Menghapus paket dari dependensi dan sistem lokal
  perbarui [<nama>]      Memperbarui dependensi ke versi kompatibel terbaru
  daftar                 Menampilkan daftar dependensi proyek saat ini
  pohon [<akar>]         Menampilkan visualisasi hierarki pohon graf dependensi
  audit                  Audit keamanan dependensi, deteksi siklus, konflik versi & hash
  bersihkan-cache        Mengosongkan cache paket offline lokal

Opsi Perintah 'debug':
  --perintah="<cmds>"    Jalankan rentetan perintah debug non-interaktif dipisahkan titik koma (;)

Opsi Perintah 'profil':
  --json                 Keluarkan laporan profiling dalam format JSON terstruktur
  --ambang=<ms>          Hanya tampilkan fungsi yang waktu eksekusinya melebihi ambang batas (ms)

Opsi Perintah 'ci':
  --markdown             Keluarkan ringkasan format Markdown terstandar GitHub Step Summary
  --rilis                Simulasikan gerbang pelepasan rilis resmi
  --setujui              Berikan konfirmasi persetujuan rilis manual eksplisit

Opsi Perintah 'bangun' & 'rilis':
  --mode, -m <mode>      Pilih mode build: 'release' (teroptimasi) atau 'debug' (default: release)
  --target, -t <plt>     Target spesifik: 'windows-x64', 'linux-x64', 'macos-x64', 'macos-arm64'
  --bersih, --clean      Jalankan pembersihan direktori keluaran sebelum memulai build
  --tanpa-uji            Lewati pengujian pra-rilis otomatis (hanya untuk pengujian cepat)

Opsi Perintah 'uji':
  --cari, --filter <teks> Filter pengujian berdasarkan nama atau jalur berkas
  --verbose, -V          Tampilkan rincian detail setiap assertion/penegasan yang diuji
  --timeout <ms>         Batas waktu eksekusi setiap berkas pengujian (default: 5000ms)

Opsi Perintah 'format':
  --tulis, -w            Tulis hasil format langsung ke berkas (in-place) secara aman
  --cek                  Periksa apakah berkas sudah terformat tanpa melakukan modifikasi

Opsi Global:
  --debug                Tampilkan jejak tumpukan lengkap dan info diagnostik rinci
  --json, --format=json  Keluarkan hasil diagnostik dalam format JSON terstruktur
  --warna                Aktifkan penyorotan warna terminal ANSI
  --tanpa-warna          Nonaktifkan pewarnaan terminal (sesuai standar NO_COLOR)
  --help, -h, bantu      Tampilkan petunjuk penggunaan ini
  --version, -v, versi   Tampilkan versi resmi NUSANTARA

Kode Status Keluar (Exit Codes):
  0                      Operasi berhasil tanpa kesalahan (atau semua test lulus)
  1                      Terdapat kesalahan sintaks, tipe, linter, runtime, atau kegagalan penegasan test
  2                      Kesalahan sintaksis argumen atau perintah CLI tidak valid
`);
  }
}

