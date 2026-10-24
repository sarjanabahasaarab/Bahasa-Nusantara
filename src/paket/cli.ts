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
            'hapus',
            'buang',
            'perbarui',
            'update',
            'daftar',
            'list',
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
          const target = argumenTambahan[0];
          return this.eksekusiBangunPaket(target, {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
            tanpaUji: args.includes('--tanpa-uji') || args.includes('--no-test'),
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

        case 'info': {
          const namaPaket = argumenTambahan[0];
          if (namaPaket && !namaPaket.startsWith('-')) {
            return this.eksekusiInfoPaketRegistri(namaPaket, {
              json: opsiJSON,
              warna: opsiWarna,
            });
          }
          const info = this.pengelola.info();
          if (opsiJSON) {
            this.log(JSON.stringify(info, null, 2));
            return 0;
          }
          this.log('Informasi Paket NUSANTARA:\n');
          this.log(`  Nama             : ${info.nama}`);
          this.log(`  Versi            : ${info.versi}`);
          this.log(`  Deskripsi        : ${info.deskripsi}`);
          this.log(`  Lisensi          : ${info.lisensi}`);
          this.log(`  Jml Dependensi   : ${info.jumlahDependensi}`);
          this.log(`  Lokasi Proyek    : ${info.lokasiProyek}`);
          return 0;
        }

        case 'versi':
        case '--version':
        case '-v': {
          this.log('NUSANTARA Package Ecosystem & Registry, Testing Framework, Language Server & Toolchain (nusantara) v0.22.0 (fondasi v0.21.0, v0.20.0, v0.19.0)');
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
  nusantara paket buat <nama>                       Membuat struktur paket baru
  nusantara paket daftar                            Menampilkan daftar dependensi proyek saat ini
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

  private cetakBantuan(): void {
    this.log(`
Bahasa Pemrograman NUSANTARA (v0.22.0)
Antarmuka Baris Perintah (CLI), Ekosistem Paket & Registri, Testing & Developer Tools

Penggunaan:
  nusantara <perintah> [argumen...]
  nusantara <berkas.nusantara> [argumen...]

Perintah Eksekusi, Toolchain, Testing & Developer Tools:
  jalankan <berkas>      Eksekusi program NUSANTARA
  uji [<target>]         Menjalankan pengujian otomatis (*.uji.nusantara / *_test.nusantara)
  uji-semua, quality-gate Menjalankan seluruh Quality Gate & Verifikasi Kualitas NUSANTARA
  format [<berkas>|.]    Format kode sumber NUSANTARA sesuai standar resmi
  cek [<berkas>|.]       Pemeriksaan sintaksis, sistem tipe, dan linter tanpa eksekusi
  bahasa-server, lsp     Menjalankan Language Server Protocol (LSP) via stdio untuk IDE/Editor

Perintah Ekosistem Paket & Registri:
  paket <subperintah>    Kelola paket & registri (bangun, cek, terbit, cari, info, pasang, buat, daftar)
  bangun [<target>]      Membangun arsip bundle paket (.npk) dengan pengujian otomatis
  terbit [<target>]      Menerbitkan paket ke registri (rilis immutable dengan SHA-256)
  cari <kueri>           Mencari paket yang tersedia di registri
  info [<nama>]          Menampilkan informasi paket proyek lokal atau metadata registri
  pasang [<nama>]        Memasang dependensi proyek atau memasang paket dari registri
  buat <nama>            Membuat paket atau proyek baru dengan nusantara.toml
  hapus <nama>           Menghapus paket dari dependensi dan sistem lokal
  perbarui [<nama>]      Memperbarui dependensi ke versi kompatibel terbaru
  daftar                 Menampilkan daftar dependensi proyek saat ini

Opsi Perintah 'uji':
  --cari, --filter <teks> Filter pengujian berdasarkan nama atau jalur berkas
  --verbose, -V          Tampilkan rincian detail setiap assertion/penegasan yang diuji
  --timeout <ms>         Batas waktu eksekusi setiap berkas pengujian (default: 5000ms)

Opsi Perintah Paket & Registri:
  --tanpa-uji            Lewati pengujian otomatis sebelum pengemasan/penerbitan
  --offline              Gunakan cache lokal tanpa menghubungi registri jaringan
  --terkunci             Kunci resolusi dependensi mengacu pada nusantara.lock

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

