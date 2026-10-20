/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PengelolaPaket, OpsiPengelolaPaket } from './pengelolaPaket';

export interface OpsiCLI {
  pengelola?: PengelolaPaket;
  penulisLog?: (pesan: string) => void;
  penulisGalat?: (pesan: string) => void;
}

/**
 * Antarmuka Baris Perintah (CLI) Resmi Bahasa NUSANTARA: 'nusantara'
 */
export class NusantaraCLI {
  private readonly pengelola: PengelolaPaket;
  private readonly log: (pesan: string) => void;
  private readonly error: (pesan: string) => void;

  constructor(opsi?: OpsiCLI & OpsiPengelolaPaket) {
    this.pengelola = opsi?.pengelola || new PengelolaPaket(opsi);
    this.log = opsi?.penulisLog || (typeof console !== 'undefined' ? console.log : () => {});
    this.error = opsi?.penulisGalat || (typeof console !== 'undefined' ? console.error : () => {});
  }

  public dapatkanPengelola(): PengelolaPaket {
    return this.pengelola;
  }

  /**
   * Menjalankan perintah baris perintah berdasarkan argumen array string.
   * Mengembalikan kode status keluar (0 untuk sukses, non-nol untuk gagal).
   */
  public jalankan(args: string[]): number {
    const perintah = args[0]?.toLowerCase();
    const argumenTambahan = args.slice(1);

    try {
      switch (perintah) {
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
          const apakahTerkunci = argumenTambahan.includes('--terkunci');
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
          this.log('NUSANTARA Package Manager (nusantara) v0.16.0');
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
      this.error(err.message || String(err));
      return 1;
    }
  }

  private cetakBantuan(): void {
    this.log(`
Pengelola Paket Bahasa Pemrograman NUSANTARA (v0.16.0)

Penggunaan:
  nusantara <perintah> [argumen...]

Perintah Tersedia:
  buat <nama>       Membuat paket atau proyek baru dengan nusantara.toml
  pasang            Memasang dependensi yang tertera dalam nusantara.toml
  pasang --terkunci Memasang dependensi secara persis mengacu pada nusantara.lock
  hapus <nama>      Menghapus paket dari dependensi dan sistem lokal
  perbarui [<nama>] Memperbarui dependensi ke versi kompatibel terbaru
  daftar            Menampilkan daftar dependensi proyek saat ini
  info              Menampilkan ringkasan metadata paket proyek
  bantuan           Menampilkan petunjuk penggunaan ini
  versi             Menampilkan nomor versi CLI
`);
  }
}
