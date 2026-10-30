/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 34
 * Pekerja Tugas Latar Belakang (Task Worker with Retry & Graceful Shutdown)
 */

import { PenanganTugas, TugasLatarBelakang } from '../types';
import { PenyimpananAntrean } from './taskQueue';
import { KebijakanPercobaanUlang } from './retryPolicy';
import { tandaiBerjalan, tandaiSelesai, tandaiGagal } from './task';
import { BusPeristiwa } from '../event/eventBus';

export class PekerjaLatarBelakang {
  private penanganMap: Map<string, PenanganTugas> = new Map();
  private sedangBerjalan: boolean = false;
  private intervalLoop?: NodeJS.Timeout;
  private tugasSedangDiproses: Set<string> = new Set();
  private readonly antrean: PenyimpananAntrean;
  private readonly busPeristiwa?: BusPeristiwa;
  public readonly kebijakanRetry: KebijakanPercobaanUlang;

  constructor(
    antreanAtauOpsi:
      | PenyimpananAntrean
      | {
          antrean: PenyimpananAntrean;
          kebijakanRetry?: KebijakanPercobaanUlang;
          busPeristiwa?: BusPeristiwa;
        },
    opsi?: {
      kebijakanRetry?: KebijakanPercobaanUlang;
      busPeristiwa?: BusPeristiwa;
    },
    busPeristiwa?: BusPeristiwa
  ) {
    if ((antreanAtauOpsi as any).antrean) {
      const cfg = antreanAtauOpsi as {
        antrean: PenyimpananAntrean;
        kebijakanRetry?: KebijakanPercobaanUlang;
        busPeristiwa?: BusPeristiwa;
      };
      this.antrean = cfg.antrean;
      this.kebijakanRetry = cfg.kebijakanRetry || opsi?.kebijakanRetry || new KebijakanPercobaanUlang();
      this.busPeristiwa = cfg.busPeristiwa || opsi?.busPeristiwa || busPeristiwa;
    } else {
      this.antrean = antreanAtauOpsi as PenyimpananAntrean;
      this.kebijakanRetry = opsi?.kebijakanRetry || new KebijakanPercobaanUlang();
      this.busPeristiwa = opsi?.busPeristiwa || busPeristiwa;
    }
  }

  /**
   * Mendaftarkan fungsi penangan khusus untuk jenis pekerjaan tertentu.
   */
  public daftarkanPenangan<T = any, R = any>(
    namaTugas: string,
    penangan: PenanganTugas<T, R>
  ): this {
    if (!namaTugas || typeof namaTugas !== 'string') {
      throw new Error("Nama tugas wajib berupa teks.");
    }
    if (typeof penangan !== 'function') {
      throw new Error("Penangan tugas wajib berupa fungsi callback.");
    }

    this.penanganMap.set(namaTugas.trim().toLowerCase(), penangan);
    return this;
  }

  /** Alias untuk daftarkanPenangan */
  public daftarkanHandler<T = any, R = any>(
    namaTugas: string,
    penangan: PenanganTugas<T, R>
  ): this {
    return this.daftarkanPenangan(namaTugas, penangan);
  }

  /**
   * Menjalankan satu pekerjaan berikutnya yang siap dalam antrean secara atomik.
   * Mengembalikan true jika ada pekerjaan yang diproses, false jika antrean kosong.
   */
  public async prosesSatu(): Promise<boolean> {
    const tugas = this.antrean.ambil();
    if (!tugas) {
      return false;
    }

    const namaKunci = tugas.nama.toLowerCase();
    const penangan = this.penanganMap.get(namaKunci);

    if (!penangan) {
      tandaiGagal(tugas, `Tidak ada penangan terdaftar untuk jenis tugas '${tugas.nama}'.`);
      this.busPeristiwa?.terbitkan('tugas:gagal', { id: tugas.id, nama: tugas.nama, galat: tugas.pesanGalat });
      return true;
    }

    tandaiBerjalan(tugas);
    this.tugasSedangDiproses.add(tugas.id);
    this.busPeristiwa?.terbitkan('tugas:mulai', { id: tugas.id, nama: tugas.nama, percobaan: tugas.jumlahPercobaan });

    try {
      const hasil = await penangan(tugas);
      tandaiSelesai(tugas, hasil);
      this.busPeristiwa?.terbitkan('tugas:selesai', { id: tugas.id, nama: tugas.nama, hasil });
    } catch (err: any) {
      const pesan = err?.message || String(err);

      if (this.kebijakanRetry.apakahBolehUlang(tugas.jumlahPercobaan, err)) {
        // Hitung jeda backoff eksponensial
        const jeda = this.kebijakanRetry.hitungJeda(tugas.jumlahPercobaan);
        tugas.status = 'antre';
        tugas.pesanGalat = `Gagal pada percobaan ${tugas.jumlahPercobaan}: ${pesan}`;

        // Masukkan kembali ke antrean dengan penundaan
        this.antrean.tambah(tugas, jeda);
        this.busPeristiwa?.terbitkan('tugas:ulang', {
          id: tugas.id,
          nama: tugas.nama,
          percobaanBerikutnya: tugas.jumlahPercobaan + 1,
          jedaMs: jeda,
        });
      } else {
        tandaiGagal(tugas, `Gagal setelah ${tugas.jumlahPercobaan} percobaan: ${pesan}`);
        this.busPeristiwa?.terbitkan('tugas:gagal', { id: tugas.id, nama: tugas.nama, galat: tugas.pesanGalat });
      }
    } finally {
      this.tugasSedangDiproses.delete(tugas.id);
    }

    return true;
  }

  /**
   * Memulai siklus worker berkala untuk terus memproses antrean.
   */
  public mulai(intervalPollingMs: number = 200): void {
    if (this.sedangBerjalan) return;

    this.sedangBerjalan = true;

    const siklus = async () => {
      if (!this.sedangBerjalan) return;
      try {
        await this.prosesSatu();
      } catch {
        // Abaikan galat tak terduga dalam loop worker
      }
    };

    this.intervalLoop = setInterval(siklus, Math.max(50, intervalPollingMs));
    if (this.intervalLoop.unref) {
      this.intervalLoop.unref();
    }
  }

  /**
   * Menghentikan siklus worker secara aman (Graceful Shutdown)
   * dengan menunggu tugas yang sedang berjalan selesai.
   */
  public async berhenti(batasWaktuMs: number = 5000): Promise<void> {
    this.sedangBerjalan = false;

    if (this.intervalLoop) {
      clearInterval(this.intervalLoop);
      this.intervalLoop = undefined;
    }

    // Tunggu tugas aktif selesai atau hingga batas waktu tercapai
    const mulaiWaktu = Date.now();
    while (this.tugasSedangDiproses.size > 0 && Date.now() - mulaiWaktu < batasWaktuMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  public apakahAktif(): boolean {
    return this.sedangBerjalan;
  }

  public jumlahTugasAktif(): number {
    return this.tugasSedangDiproses.size;
  }
}
