/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Pelari Migrasi Database (Migration Runner) Terpadu.
 */

import {
  DefinisiMigrasi,
  CatatanMigrasi,
  StatusMigrasi,
  HasilEksekusiMigrasi,
  HasilRollbackMigrasi,
} from './types';
import { SchemaBuilder } from './schemaBuilder';
import { AdaptorBasisdata, GalatBasisdata, JenisGalatBasisdata } from '../database/jenis';

const TABEL_MIGRASI = '_migrasi_nusantara';

export class PelariMigrasi {
  private adaptor: AdaptorBasisdata;
  private schemaBuilder: SchemaBuilder;
  private daftarMigrasi: DefinisiMigrasi[] = [];

  constructor(adaptor: AdaptorBasisdata) {
    this.adaptor = adaptor;
    this.schemaBuilder = new SchemaBuilder(adaptor);
    this.inisialisasiTabelRiwayat();
  }

  private inisialisasiTabelRiwayat(): void {
    const sql = `CREATE TABLE IF NOT EXISTS "${TABEL_MIGRASI}" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "nama_migrasi" TEXT UNIQUE NOT NULL,
  "batch" INTEGER NOT NULL,
  "diterapkan_pada" DATETIME DEFAULT CURRENT_TIMESTAMP
);`;
    this.adaptor.eksekusi(sql);
  }

  /**
   * Mendaftarkan satu atau beberapa migrasi ke pelari.
   */
  public daftarkan(migrasi: DefinisiMigrasi | DefinisiMigrasi[]): this {
    const list = Array.isArray(migrasi) ? migrasi : [migrasi];
    for (const m of list) {
      if (!this.daftarMigrasi.some((item) => item.nama === m.nama)) {
        this.daftarMigrasi.push(m);
      }
    }
    return this;
  }

  public dapatkanDaftarTerdaftar(): DefinisiMigrasi[] {
    return [...this.daftarMigrasi];
  }

  /**
   * Mengambil riwayat migrasi yang sudah pernah diterapkan.
   */
  public dapatkanRiwayat(): CatatanMigrasi[] {
    const sql = `SELECT * FROM "${TABEL_MIGRASI}" ORDER BY "batch" ASC, "id" ASC`;
    return this.adaptor.ambilSemua<CatatanMigrasi>(sql);
  }

  /**
   * Mendapatkan status migrasi (apakah sudah diterapkan atau masih tertunda).
   */
  public status(): StatusMigrasi[] {
    const riwayat = this.dapatkanRiwayat();
    const petaRiwayat = new Map<string, CatatanMigrasi>();
    for (const r of riwayat) {
      petaRiwayat.set(r.nama_migrasi, r);
    }

    return this.daftarMigrasi.map((m) => {
      const cat = petaRiwayat.get(m.nama);
      return {
        nama: m.nama,
        deskripsi: m.deskripsi,
        batch: cat ? cat.batch : null,
        status: cat ? 'diterapkan' : 'tertunda',
        diterapkan_pada: cat ? cat.diterapkan_pada : undefined,
      };
    });
  }

  /**
   * Menjalankan seluruh migrasi yang belum diterapkan dalam satu batch baru.
   */
  public migrasi(): HasilEksekusiMigrasi {
    const riwayat = this.dapatkanRiwayat();
    const sudahDiterapkan = new Set(riwayat.map((r) => r.nama_migrasi));

    const tertunda = this.daftarMigrasi.filter((m) => !sudahDiterapkan.has(m.nama));
    if (tertunda.length === 0) {
      return {
        berhasil: [],
        batch: 0,
        pesan: 'Tidak ada migrasi baru yang perlu diterapkan.',
      };
    }

    // Tentukan nomor batch berikutnya
    const batchTerakhir = riwayat.reduce((max, r) => Math.max(max, r.batch), 0);
    const batchBaru = batchTerakhir + 1;
    const berhasil: string[] = [];

    // Jalankan setiap migrasi tertunda
    for (const m of tertunda) {
      this.adaptor.mulaiTransaksi();
      try {
        m.naik(this.schemaBuilder, this.adaptor);

        // Catat keberhasilan ke tabel riwayat
        const sqlCatat = `INSERT INTO "${TABEL_MIGRASI}" ("nama_migrasi", "batch") VALUES (?, ?)`;
        this.adaptor.eksekusi(sqlCatat, [m.nama, batchBaru]);

        this.adaptor.commit();
        berhasil.push(m.nama);
      } catch (err: any) {
        this.adaptor.rollback();
        throw new GalatBasisdata(
          JenisGalatBasisdata.TRANSAKSI_GAGAL,
          `Gagal menerapkan migrasi '${m.nama}': ${err.message}`,
          undefined,
          err
        );
      }
    }

    return {
      berhasil,
      batch: batchBaru,
      pesan: `Berhasil menerapkan ${berhasil.length} migrasi (Batch ${batchBaru}).`,
    };
  }

  /**
   * Membatalkan migrasi (rollback) untuk batch terakhir.
   */
  public rollback(): HasilRollbackMigrasi {
    const riwayat = this.dapatkanRiwayat();
    if (riwayat.length === 0) {
      return {
        dibatalkan: [],
        batch: 0,
        pesan: 'Tidak ada migrasi yang dapat dibatalkan (tabel riwayat kosong).',
      };
    }

    // Cari batch tertinggi
    const batchTertinggi = riwayat.reduce((max, r) => Math.max(max, r.batch), 0);
    const entriBatch = riwayat
      .filter((r) => r.batch === batchTertinggi)
      .reverse(); // Batalkan dengan urutan terbalik

    const petaDefinisi = new Map<string, DefinisiMigrasi>();
    for (const m of this.daftarMigrasi) {
      petaDefinisi.set(m.nama, m);
    }

    const dibatalkan: string[] = [];

    for (const entri of entriBatch) {
      const def = petaDefinisi.get(entri.nama_migrasi);
      if (!def) {
        throw new GalatBasisdata(
          JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
          `Definisi migrasi '${entri.nama_migrasi}' tidak ditemukan di pelari untuk proses rollback.`
        );
      }

      this.adaptor.mulaiTransaksi();
      try {
        def.turun(this.schemaBuilder, this.adaptor);

        // Hapus dari riwayat
        const sqlHapus = `DELETE FROM "${TABEL_MIGRASI}" WHERE "id" = ?`;
        this.adaptor.eksekusi(sqlHapus, [entri.id]);

        this.adaptor.commit();
        dibatalkan.push(entri.nama_migrasi);
      } catch (err: any) {
        this.adaptor.rollback();
        throw new GalatBasisdata(
          JenisGalatBasisdata.TRANSAKSI_GAGAL,
          `Gagal membatalkan migrasi '${entri.nama_migrasi}': ${err.message}`,
          undefined,
          err
        );
      }
    }

    return {
      dibatalkan,
      batch: batchTertinggi,
      pesan: `Berhasil membatalkan ${dibatalkan.length} migrasi pada Batch ${batchTertinggi}.`,
    };
  }

  /**
   * Menjalankan reset menyeluruh (rollback semua batch lalu migrasi ulang dari awal).
   */
  public segar(): { dibatalkan: string[]; berhasil: string[] } {
    const dibatalkanSemua: string[] = [];

    while (this.dapatkanRiwayat().length > 0) {
      const res = this.rollback();
      dibatalkanSemua.push(...res.dibatalkan);
    }

    const resNaik = this.migrasi();
    return {
      dibatalkan: dibatalkanSemua,
      berhasil: resNaik.berhasil,
    };
  }
}
