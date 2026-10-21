/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatBilangan,
  buatLogika,
  buatTeks,
  buatDaftar,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';
import { PembacaBerkas, PembacaBerkasMemori, PembacaBerkasNode } from '../modul/pembacaBerkas';

export const simbolEksporBerkas: Map<string, InfoSimbolModul> = new Map([
  [
    'ada',
    {
      nama: 'ada',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'logika',
    },
  ],
  [
    'baca',
    {
      nama: 'baca',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'teks',
    },
  ],
  [
    'tulis',
    {
      nama: 'tulis',
      kategori: 'fungsi',
      parameter: [
        { nama: 'jalur', tipe: 'teks' },
        { nama: 'isi', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
    },
  ],
  [
    'tambah',
    {
      nama: 'tambah',
      kategori: 'fungsi',
      parameter: [
        { nama: 'jalur', tipe: 'teks' },
        { nama: 'isi', tipe: 'teks' },
      ],
      tipeKembalian: 'logika',
    },
  ],
  [
    'ukuran',
    {
      nama: 'ukuran',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'bilangan',
    },
  ],
  [
    'buatDirektori',
    {
      nama: 'buatDirektori',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'logika',
    },
  ],
  [
    'daftarDirektori',
    {
      nama: 'daftarDirektori',
      kategori: 'fungsi',
      parameter: [{ nama: 'jalur', tipe: 'teks' }],
      tipeKembalian: 'daftar',
    },
  ],
  [
    'dapatkanJalurBasis',
    {
      nama: 'dapatkanJalurBasis',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'teks',
    },
  ],
]);

export class SandboxBerkas {
  private pembaca: PembacaBerkas;
  private direktoriBasis: string;

  constructor(pembaca?: PembacaBerkas, direktoriBasis?: string) {
    this.pembaca =
      pembaca ||
      (typeof window !== 'undefined' ? new PembacaBerkasMemori() : new PembacaBerkasNode());
    const base = direktoriBasis || (typeof process !== 'undefined' && process.cwd ? process.cwd() : '/proyek');
    this.direktoriBasis = this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(base));
  }

  public tetapkanPembaca(pembaca: PembacaBerkas): void {
    this.pembaca = pembaca;
  }

  public dapatkanDirektoriBasis(): string {
    return this.direktoriBasis;
  }

  public validasiDanSelesaikanJalur(jalurInput: string): string {
    const bersih = jalurInput.trim();
    if (!bersih) {
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Kesalahan berkas: jalur berkas tidak boleh kosong.`
      );
    }

    // Cek percobaan path traversal berbahaya
    if (bersih.includes('..')) {
      const parts = bersih.replace(/\\/g, '/').split('/');
      let level = 0;
      for (const p of parts) {
        if (p === '..') level++;
      }
      if (level > 4) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kesalahan berkas: akses ke jalur '${jalurInput}' ditolak oleh kebijakan keamanan sandbox (indikasi path traversal).`
        );
      }
    }

    // Melarang berkas sistem terlarang
    const lower = bersih.toLowerCase();
    if (
      lower.includes('/etc/shadow') ||
      lower.includes('/etc/passwd') ||
      lower.includes('c:\\windows') ||
      lower.includes('.env.local')
    ) {
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Kesalahan berkas: akses ke berkas sensitif '${jalurInput}' dilarang oleh sandbox keamanan NUSANTARA.`
      );
    }

    const absolut = this.pembaca.jalurAbsolut(
      bersih.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(bersih)
        ? bersih
        : this.pembaca.gabungJalur(this.direktoriBasis, bersih)
    );
    return this.pembaca.normalisasiJalur(absolut);
  }

  public ada(jalur: string): boolean {
    const kanonikal = this.validasiDanSelesaikanJalur(jalur);
    return this.pembaca.apakahAda(kanonikal);
  }

  public baca(jalur: string): string {
    const kanonikal = this.validasiDanSelesaikanJalur(jalur);
    if (!this.pembaca.apakahAda(kanonikal)) {
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Kesalahan berkas: file '${jalur}' tidak ditemukan.`
      );
    }
    try {
      return this.pembaca.baca(kanonikal);
    } catch (err: any) {
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Kesalahan berkas: gagal membaca file '${jalur}': ${err.message}`
      );
    }
  }

  public tulis(jalur: string, isi: string): boolean {
    const kanonikal = this.validasiDanSelesaikanJalur(jalur);
    if (this.pembaca instanceof PembacaBerkasMemori) {
      this.pembaca.tulisBerkas(kanonikal, isi);
      return true;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = typeof window === 'undefined' ? require('fs') : null;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = typeof window === 'undefined' ? require('path') : null;
      if (fs && path) {
        const dir = path.dirname(kanonikal);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(kanonikal, isi, 'utf-8');
        return true;
      }
      return false;
    } catch (err: any) {
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Kesalahan berkas: gagal menulis ke file '${jalur}': ${err.message}`
      );
    }
  }

  public tambah(jalur: string, isi: string): boolean {
    const adaSebelumnya = this.ada(jalur);
    const teksLama = adaSebelumnya ? this.baca(jalur) : '';
    return this.tulis(jalur, teksLama + isi);
  }

  public ukuran(jalur: string): number {
    const kanonikal = this.validasiDanSelesaikanJalur(jalur);
    if (!this.pembaca.apakahAda(kanonikal)) {
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Kesalahan berkas: file '${jalur}' tidak ditemukan.`
      );
    }
    const konten = this.baca(jalur);
    return Buffer.byteLength ? Buffer.byteLength(konten, 'utf8') : konten.length;
  }

  public buatDirektori(jalur: string): boolean {
    const kanonikal = this.validasiDanSelesaikanJalur(jalur);
    if (this.pembaca instanceof PembacaBerkasMemori) {
      this.pembaca.tulisBerkas(this.pembaca.gabungJalur(kanonikal, '.keep'), '');
      return true;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = typeof window === 'undefined' ? require('fs') : null;
      if (fs) {
        fs.mkdirSync(kanonikal, { recursive: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public daftarDirektori(jalur?: string): string[] {
    const sasaran = jalur ? this.validasiDanSelesaikanJalur(jalur) : this.direktoriBasis;
    if (this.pembaca instanceof PembacaBerkasMemori) {
      const hasil: string[] = [];
      const prefix = sasaran.endsWith('/') ? sasaran : `${sasaran}/`;
      for (const k of this.pembaca.dapatkanSemuaBerkas().keys()) {
        if (k.startsWith(prefix)) {
          const sisa = k.slice(prefix.length).split('/')[0];
          if (sisa && !hasil.includes(sisa) && sisa !== '.keep') {
            hasil.push(sisa);
          }
        }
      }
      return hasil;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = typeof window === 'undefined' ? require('fs') : null;
      if (fs && fs.existsSync(sasaran)) {
        return fs.readdirSync(sasaran);
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const sandboxBerkasGlobal = new SandboxBerkas();

export function buatEksporBerkas(sandbox: SandboxBerkas = sandboxBerkasGlobal): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnAda: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ada',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'berkas.ada' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatLogika(sandbox.ada(args[0].nilai));
    },
  };
  ekspor.set('ada', fnAda);

  const fnBaca: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'baca',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'berkas.baca' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatTeks(sandbox.baca(args[0].nilai));
    },
  };
  ekspor.set('baca', fnBaca);

  const fnTulis: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tulis',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'berkas.tulis' membutuhkan 2 argumen bertipe teks (jalur, isi).`
        );
      }
      return buatLogika(sandbox.tulis(args[0].nilai, args[1].nilai));
    },
  };
  ekspor.set('tulis', fnTulis);

  const fnTambah: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'tambah',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 2 || args[0].jenis !== JenisNilaiRuntime.TEKS || args[1].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'berkas.tambah' membutuhkan 2 argumen bertipe teks (jalur, isi).`
        );
      }
      return buatLogika(sandbox.tambah(args[0].nilai, args[1].nilai));
    },
  };
  ekspor.set('tambah', fnTambah);

  const fnUkuran: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'ukuran',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'berkas.ukuran' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatBilangan(sandbox.ukuran(args[0].nilai));
    },
  };
  ekspor.set('ukuran', fnUkuran);

  const fnBuatDirektori: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'buatDirektori',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length !== 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'berkas.buatDirektori' membutuhkan 1 argumen bertipe teks.`
        );
      }
      return buatLogika(sandbox.buatDirektori(args[0].nilai));
    },
  };
  ekspor.set('buatDirektori', fnBuatDirektori);

  const fnDaftarDirektori: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'daftarDirektori',
    eksekusi: (args: NilaiRuntime[]) => {
      const jalur = args.length > 0 && args[0].jenis === JenisNilaiRuntime.TEKS ? args[0].nilai : undefined;
      const list = sandbox.daftarDirektori(jalur);
      return buatDaftar(list.map(s => buatTeks(s)));
    },
  };
  ekspor.set('daftarDirektori', fnDaftarDirektori);

  const fnDapatkanJalurBasis: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'dapatkanJalurBasis',
    eksekusi: () => buatTeks(sandbox.dapatkanDirektoriBasis()),
  };
  ekspor.set('dapatkanJalurBasis', fnDapatkanJalurBasis);

  return ekspor;
}
