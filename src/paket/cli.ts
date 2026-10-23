/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PengelolaPaket, OpsiPengelolaPaket } from './pengelolaPaket';
import { Parser } from '../parser/parser';
import { PemeriksaTipe } from '../tipe/pemeriksaTipe';
import { Interpreter } from '../interpreter/interpreter';
import { PenulisOutputKonsol, PenulisOutputBuffer } from '../interpreter/outputWriter';
import { PembacaBerkas, PembacaBerkasNode, ResolverModul, PemuatModul } from '../modul';
import { mesinDiagnostikDefault, formatDiagnostikKeJSON, formatDiagnostik } from '../diagnostik';
import {
  formatAman,
  formatKode,
  muatKonfigurasiFormatDariTOML,
  PemeriksaProyek,
} from '../toolchain';
import { jalankanServerBahasaStdio } from '../language-server';

export interface OpsiCLI {
  pengelola?: PengelolaPaket;
  penulisLog?: (pesan: string) => void;
  penulisGalat?: (pesan: string) => void;
  pembaca?: PembacaBerkas;
}

/**
 * Antarmuka Baris Perintah (CLI) Resmi Bahasa NUSANTARA: 'nusantara'
 */
export class NusantaraCLI {
  private readonly pengelola: PengelolaPaket;
  private readonly log: (pesan: string) => void;
  private readonly error: (pesan: string) => void;
  private readonly pembaca: PembacaBerkas;

  constructor(opsi?: OpsiCLI & OpsiPengelolaPaket) {
    this.pengelola = opsi?.pengelola || new PengelolaPaket(opsi);
    this.log = opsi?.penulisLog || (typeof console !== 'undefined' ? console.log : () => {});
    this.error = opsi?.penulisGalat || (typeof console !== 'undefined' ? console.error : () => {});
    this.pembaca =
      opsi?.pembaca ||
      (typeof this.pengelola.dapatkanPembaca === 'function' ? this.pengelola.dapatkanPembaca() : (this.pengelola as any).pembaca) ||
      new PembacaBerkasNode();
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

    // Bersihkan flags dari argumen posisi
    const argumenBersih = args.filter(a => !a.startsWith('-') && a !== 'json');
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
          const info = this.pengelola.info();
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
          this.log('NUSANTARA Language Server, Toolchain & Package Manager (nusantara) v0.20.0 (fondasi v0.19.0)');
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

  private cetakBantuan(): void {
    this.log(`
Bahasa Pemrograman NUSANTARA (v0.20.0)
Antarmuka Baris Perintah (CLI), Toolchain & Language Server

Penggunaan:
  nusantara <perintah> [argumen...]
  nusantara <berkas.nusantara> [argumen...]

Perintah Eksekusi, Toolchain & Developer Tools:
  jalankan <berkas>      Eksekusi program NUSANTARA
  format [<berkas>|.]    Format kode sumber NUSANTARA sesuai standar resmi
  cek [<berkas>|.]       Pemeriksaan sintaksis, sistem tipe, dan linter tanpa eksekusi
  bahasa-server, lsp     Menjalankan Language Server Protocol (LSP) via stdio untuk IDE/Editor

Perintah Manajemen Paket:
  buat <nama>            Membuat paket atau proyek baru dengan nusantara.toml
  pasang                 Memasang dependensi yang tertera dalam nusantara.toml
  pasang --terkunci      Memasang dependensi secara persis mengacu pada nusantara.lock
  hapus <nama>           Menghapus paket dari dependensi dan sistem lokal
  perbarui [<nama>]      Memperbarui dependensi ke versi kompatibel terbaru
  daftar                 Menampilkan daftar dependensi proyek saat ini
  info                   Menampilkan ringkasan metadata paket proyek

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
  0                      Operasi berhasil tanpa kesalahan
  1                      Terdapat kesalahan sintaks, tipe, linter, atau runtime
  2                      Kesalahan sintaksis argumen atau perintah CLI tidak valid
`);
  }
}
