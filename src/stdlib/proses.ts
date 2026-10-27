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
  buatPeta,
  NilaiFungsiBawaan,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { InfoSimbolModul } from '../modul/jenisModul';

export interface HasilEksekusiProses {
  kodeKeluar: number;
  stdout: string;
  stderr: string;
  sukses: boolean;
}

export type HandlerEksekusiProses = (
  perintah: string,
  argumen: string[],
  opsi?: { direktoriKerja?: string; batasWaktuMs?: number; env?: Record<string, string> }
) => HasilEksekusiProses;

let handlerEksekusiProsesKhusus: HandlerEksekusiProses | null = null;

/**
 * Memungkinkan pengujian unit menetapkan handler eksekusi proses terisolasi tanpa spawn riil.
 */
export function tetapkanHandlerEksekusiProses(handler: HandlerEksekusiProses | null): void {
  handlerEksekusiProsesKhusus = handler;
}

/**
 * Modul Standar: proses
 * Eksekusi sub-proses terisolasi secara aman menggunakan larik argumen eksplisit (argv array)
 * untuk mencegah kerentanan Command Injection (CWE-78).
 */
export const simbolEksporProses: Map<string, InfoSimbolModul> = new Map([
  [
    'eksekusi',
    {
      nama: 'eksekusi',
      kategori: 'fungsi',
      parameter: [
        { nama: 'perintah', tipe: 'teks' },
        { nama: 'argumen', tipe: 'daftar' },
        { nama: 'opsi', tipe: 'peta' },
      ],
      tipeKembalian: 'peta',
    },
  ],
  [
    'pid',
    {
      nama: 'pid',
      kategori: 'fungsi',
      parameter: [],
      tipeKembalian: 'bilangan',
    },
  ],
]);

export function buatEksporProses(): Map<string, NilaiRuntime> {
  const ekspor = new Map<string, NilaiRuntime>();

  const fnEksekusi: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'eksekusi',
    eksekusi: (args: NilaiRuntime[]) => {
      if (args.length < 1 || args[0].jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Fungsi 'proses.eksekusi' membutuhkan argumen pertama bertipe teks (nama program yang dijalankan).`
        );
      }
      const perintah = args[0].nilai.trim();
      if (!perintah) {
        throw new GalatRuntime(
          JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
          `Perintah eksekusi tidak boleh kosong.`
        );
      }

      // Ambil argumen sebagai array teks aman
      const argumenList: string[] = [];
      if (args.length > 1 && args[1].jenis === JenisNilaiRuntime.DAFTAR) {
        for (const item of args[1].elemen) {
          argumenList.push(item.jenis === JenisNilaiRuntime.TEKS ? item.nilai : String((item as any).nilai ?? ''));
        }
      }

      // Opsi eksekusi
      let batasWaktuMs = 10000;
      let cwd: string | undefined = undefined;
      const customEnv: Record<string, string> = {};

      if (args.length > 2 && args[2].jenis === JenisNilaiRuntime.PETA) {
        const p = args[2].nilai;
        if (p.has('batasWaktuMs') && p.get('batasWaktuMs')!.jenis === JenisNilaiRuntime.BILANGAN) {
          batasWaktuMs = Math.max(100, (p.get('batasWaktuMs') as any).nilai);
        }
        if (p.has('direktoriKerja') && p.get('direktoriKerja')!.jenis === JenisNilaiRuntime.TEKS) {
          cwd = (p.get('direktoriKerja') as any).nilai;
        }
        if (p.has('env') && p.get('env')!.jenis === JenisNilaiRuntime.PETA) {
          const envMap = (p.get('env') as any).nilai as Map<string, NilaiRuntime>;
          envMap.forEach((v, k) => {
            customEnv[k] = v.jenis === JenisNilaiRuntime.TEKS ? v.nilai : String((v as any).nilai ?? '');
          });
        }
      }

      // 1. Periksa apakah ada handler pengujian khusus
      if (handlerEksekusiProsesKhusus) {
        const hasilMock = handlerEksekusiProsesKhusus(perintah, argumenList, {
          direktoriKerja: cwd,
          batasWaktuMs,
          env: customEnv,
        });
        const peta = new Map<string, NilaiRuntime>([
          ['kodeKeluar', buatBilangan(hasilMock.kodeKeluar)],
          ['stdout', buatTeks(hasilMock.stdout)],
          ['stderr', buatTeks(hasilMock.stderr)],
          ['sukses', buatLogika(hasilMock.sukses)],
        ]);
        return buatPeta(peta);
      }

      // 2. Lingkungan Node.js riil: gunakan child_process.spawnSync secara aman tanpa shell
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cp = typeof window === 'undefined' ? require('child_process') : null;
        if (!cp || !cp.spawnSync) {
          const peta = new Map<string, NilaiRuntime>([
            ['kodeKeluar', buatBilangan(-1)],
            ['stdout', buatTeks('')],
            ['stderr', buatTeks('Eksekusi proses sistem tidak didukung di lingkungan ini.')],
            ['sukses', buatLogika(false)],
          ]);
          return buatPeta(peta);
        }

        const res = cp.spawnSync(perintah, argumenList, {
          cwd: cwd || (typeof process !== 'undefined' ? process.cwd() : undefined),
          timeout: batasWaktuMs,
          shell: false, // KEAMANAN MUTLAK: Shell dimatikan untuk mencegah injeksi shell!
          encoding: 'utf-8',
          env: { ...(typeof process !== 'undefined' ? process.env : {}), ...customEnv },
        });

        const kodeKeluar = res.status !== null ? res.status : res.signal ? 128 : 1;
        const stdout = res.stdout ? String(res.stdout) : '';
        const stderr = res.stderr ? String(res.stderr) : res.error ? res.error.message : '';
        const sukses = kodeKeluar === 0 && !res.error;

        const peta = new Map<string, NilaiRuntime>([
          ['kodeKeluar', buatBilangan(kodeKeluar)],
          ['stdout', buatTeks(stdout)],
          ['stderr', buatTeks(stderr)],
          ['sukses', buatLogika(sukses)],
        ]);
        return buatPeta(peta);
      } catch (err: any) {
        const peta = new Map<string, NilaiRuntime>([
          ['kodeKeluar', buatBilangan(1)],
          ['stdout', buatTeks('')],
          ['stderr', buatTeks(err.message || 'Gagal mengeksekusi proses.')],
          ['sukses', buatLogika(false)],
        ]);
        return buatPeta(peta);
      }
    },
  };
  ekspor.set('eksekusi', fnEksekusi);

  const fnPid: NilaiFungsiBawaan = {
    jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
    nama: 'pid',
    eksekusi: () => {
      const pid = typeof process !== 'undefined' && process.pid ? process.pid : 1000;
      return buatBilangan(pid);
    },
  };
  ekspor.set('pid', fnPid);

  return ekspor;
}
