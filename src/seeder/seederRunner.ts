/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Pelari Seeder Data Awal (Seeder Runner).
 */

import { DefinisiSeeder, HasilEksekusiSeeder } from './types';
import { AdaptorBasisdata, GalatBasisdata, JenisGalatBasisdata } from '../database/jenis';

export class PelariSeeder {
  private adaptor: AdaptorBasisdata;
  private daftarSeeder: DefinisiSeeder[] = [];

  constructor(adaptor: AdaptorBasisdata) {
    this.adaptor = adaptor;
  }

  public daftarkan(seeder: DefinisiSeeder | DefinisiSeeder[]): this {
    const list = Array.isArray(seeder) ? seeder : [seeder];
    for (const s of list) {
      if (!this.daftarSeeder.some((item) => item.nama === s.nama)) {
        this.daftarSeeder.push(s);
      }
    }
    return this;
  }

  public dapatkanDaftar(): DefinisiSeeder[] {
    return [...this.daftarSeeder];
  }

  /**
   * Menjalankan seluruh seeder atau seeder tertentu dalam transaksi terisolasi.
   */
  public jalankan(namaTertentu?: string): HasilEksekusiSeeder[] {
    const target = namaTertentu
      ? this.daftarSeeder.filter((s) => s.nama === namaTertentu)
      : this.daftarSeeder;

    if (target.length === 0) {
      if (namaTertentu) {
        throw new GalatBasisdata(
          JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
          `Seeder '${namaTertentu}' tidak ditemukan di antara seeder terdaftar.`
        );
      }
      return [];
    }

    const hasil: HasilEksekusiSeeder[] = [];

    for (const s of target) {
      const mulai = Date.now();
      this.adaptor.mulaiTransaksi();
      try {
        s.jalankan(this.adaptor);
        this.adaptor.commit();
        hasil.push({
          nama: s.nama,
          sukses: true,
          pesan: `[✓] Seeder '${s.nama}' selesai dieksekusi.`,
          durasiMs: Date.now() - mulai,
        });
      } catch (err: any) {
        this.adaptor.rollback();
        hasil.push({
          nama: s.nama,
          sukses: false,
          pesan: `[✗] Gagal mengeksekusi seeder '${s.nama}': ${err.message}`,
          durasiMs: Date.now() - mulai,
        });
        throw new GalatBasisdata(
          JenisGalatBasisdata.TRANSAKSI_GAGAL,
          `Seeder '${s.nama}' gagal: ${err.message}`,
          undefined,
          err
        );
      }
    }

    return hasil;
  }
}
