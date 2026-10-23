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
import { mesinDiagnostikDefault } from '../diagnostik';

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
    const opsiJSON = args.includes('--json');
    const opsiTanpaWarna = args.includes('--tanpa-warna') || args.includes('--no-color');
    const opsiWarna = args.includes('--warna') ? true : opsiTanpaWarna ? false : undefined;

    // Bersihkan flags dari argumen posisi
    const argumenBersih = args.filter(a => !a.startsWith('--'));
    const perintah = argumenBersih[0]?.toLowerCase();
    const argumenTambahan = argumenBersih.slice(1);

    try {
      // Jika argumen pertama adalah berkas .nusantara, jalankan langsung
      if (perintah && (perintah.endsWith('.nusantara') || (!['buat', 'inisialisasi', 'pasang', 'instal', 'hapus', 'buang', 'perbarui', 'update', 'daftar', 'list', 'info', 'versi', '-v', 'bantuan', '-h', 'jalankan', 'run', 'periksa', 'check'].includes(perintah) && this.pembaca.apakahAda(perintah)))) {
        return this.jalankanBerkasProgram(perintah, argumenTambahan, {
          debug: opsiDebug,
          json: opsiJSON,
          warna: opsiWarna,
        });
      }

      switch (perintah) {
        case 'jalankan':
        case 'run': {
          const berkasTarget = argumenTambahan[0];
          if (!berkasTarget) {
            this.laporkanGalatCLI(
              new Error("Perintah 'nusantara jalankan' memerlukan argumen <berkas.nusantara>.\nContoh: nusantara jalankan utama.nusantara"),
              { json: opsiJSON, warna: opsiWarna }
            );
            return 1;
          }
          return this.jalankanBerkasProgram(berkasTarget, argumenTambahan.slice(1), {
            debug: opsiDebug,
            json: opsiJSON,
            warna: opsiWarna,
          });
        }

        case 'periksa':
        case 'check': {
          const berkasTarget = argumenTambahan[0];
          if (!berkasTarget) {
            this.laporkanGalatCLI(
              new Error("Perintah 'nusantara periksa' memerlukan argumen <berkas.nusantara>.\nContoh: nusantara periksa utama.nusantara"),
              { json: opsiJSON, warna: opsiWarna }
            );
            return 1;
          }
          return this.periksaBerkasProgram(berkasTarget, {
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
          this.log('NUSANTARA Toolchain & Package Manager (nusantara) v0.18.0');
          return 0;
        }

        case 'bantuan':
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
   * Periksa sintaksis dan validitas tipe program NUSANTARA tanpa mengeksekusinya.
   */
  private periksaBerkasProgram(
    jalurBerkas: string,
    opsi: { debug?: boolean; json?: boolean; warna?: boolean }
  ): number {
    let kodeSumber = '';
    try {
      if (!this.pembaca.apakahAda(jalurBerkas)) {
        throw new Error(`Berkas '${jalurBerkas}' tidak ditemukan.`);
      }
      kodeSumber = this.pembaca.baca(jalurBerkas);

      const parser = new Parser(kodeSumber);
      const ast = parser.parse();
      const galatParser = parser.dapatkanDaftarGalat();
      if (galatParser.length > 0) {
        throw galatParser[0];
      }

      const direktoriBerkas = this.pembaca.direktoriDari(jalurBerkas) || '.';
      const resolver = new ResolverModul(this.pembaca, {
        direktoriAkarProyek: direktoriBerkas,
      });
      const pemuat = new PemuatModul(resolver, this.pembaca);

      const pemeriksaTipe = new PemeriksaTipe(pemuat);
      const galatTipe = pemeriksaTipe.periksa(ast, direktoriBerkas);
      if (galatTipe.length > 0) {
        throw galatTipe[0];
      }

      this.log(`[✓ VALID] Sintaks dan tipe berkas '${jalurBerkas}' sah dan valid.`);
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
Bahasa Pemrograman NUSANTARA (v0.18.0)
Antarmuka Baris Perintah (CLI) & Pengelola Paket

Penggunaan:
  nusantara <perintah> [argumen...]
  nusantara <berkas.nusantara> [argumen...]

Perintah Eksekusi & Pemeriksaan:
  jalankan <berkas> Eksekusi program NUSANTARA
  periksa <berkas>  Validasi sintaksis dan sistem tipe tanpa eksekusi

Perintah Manajemen Paket:
  buat <nama>       Membuat paket atau proyek baru dengan nusantara.toml
  pasang            Memasang dependensi yang tertera dalam nusantara.toml
  pasang --terkunci Memasang dependensi secara persis mengacu pada nusantara.lock
  hapus <nama>      Menghapus paket dari dependensi dan sistem lokal
  perbarui [<nama>] Memperbarui dependensi ke versi kompatibel terbaru
  daftar            Menampilkan daftar dependensi proyek saat ini
  info              Menampilkan ringkasan metadata paket proyek

Opsi Global:
  --debug           Tampilkan jejak tumpukan lengkap dan info diagnostik rinci
  --json            Keluarkan hasil diagnostik dalam format JSON terstruktur
  --warna           Aktifkan warna penyorotan ANSI
  --tanpa-warna     Nonaktifkan pewarnaan terminal (sesuai standar NO_COLOR)
  --help, -h        Tampilkan petunjuk penggunaan ini
  --version, -v     Tampilkan versi resmi NUSANTARA
`);
  }
}
