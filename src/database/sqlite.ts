/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Database API & Data Access (Phase 29)
 * Adaptor Basis Data SQLite terpadu berbasis node:sqlite (C-Native SQLite 3).
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  AdaptorBasisdata,
  HasilEksekusiBasisdata,
  OpsiKoneksiBasisdata,
  ParameterBindingSQL,
  GalatBasisdata,
  JenisGalatBasisdata,
} from './jenis';

export class AdaptorSQLite implements AdaptorBasisdata {
  public readonly namaDriver = 'sqlite';
  public readonly versiDriver = 'SQLite 3 (node:sqlite)';

  private db: DatabaseSync | null = null;
  private jalurAktif: string = '';
  private _dalamTransaksiAktif: boolean = false;

  public apakahTerbuka(): boolean {
    return this.db !== null;
  }

  public dalamTransaksi(): boolean {
    return this._dalamTransaksiAktif;
  }

  public buka(opsi: OpsiKoneksiBasisdata): void {
    if (this.db) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.KONEKSI_GAGAL,
        'Koneksi basis data sudah terbuka. Tutup koneksi terlebih dahulu sebelum membuka yang baru.'
      );
    }

    const jalur = opsi.jalur ? opsi.jalur.trim() : ':memory:';

    if (jalur === '' || jalur === ':memory:') {
      this.jalurAktif = ':memory:';
      try {
        this.db = new DatabaseSync(':memory:');
        this.inisialisasiPragma();
        return;
      } catch (err) {
        throw this.terjemahkanGalat(err, 'BUKA_KONEKSI');
      }
    }

    // Validasi keamanan direktori dan proteksi path traversal
    const direktoriAman = path.resolve(opsi.direktoriAman || process.cwd());
    const jalurDiselesaikan = path.isAbsolute(jalur)
      ? path.normalize(jalur)
      : path.resolve(direktoriAman, jalur);

    const relatif = path.relative(direktoriAman, jalurDiselesaikan);
    const lolosKeamanan = !relatif.startsWith('..') && !path.isAbsolute(relatif);

    if (!lolosKeamanan && path.resolve('/') !== direktoriAman) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.AKSES_JALUR_ILEGAL,
        `Akses jalur berkas basis data di luar direktori aman ditolak: '${jalur}'`
      );
    }

    // Pastikan folder induk ada
    try {
      const folderInduk = path.dirname(jalurDiselesaikan);
      if (!fs.existsSync(folderInduk)) {
        fs.mkdirSync(folderInduk, { recursive: true });
      }
    } catch (err) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.KONEKSI_GAGAL,
        `Gagal membuat direktori untuk berkas basis data: ${(err as Error).message}`
      );
    }

    this.jalurAktif = jalurDiselesaikan;
    try {
      this.db = new DatabaseSync(jalurDiselesaikan);
      this.inisialisasiPragma();
    } catch (err) {
      this.db = null;
      throw this.terjemahkanGalat(err, `BUKA_KONEKSI: ${jalur}`);
    }
  }

  private inisialisasiPragma(): void {
    if (!this.db) return;
    try {
      this.db.exec('PRAGMA foreign_keys = ON;');
    } catch {
      // Abaikan jika pragma opsional
    }
  }

  public tutup(): void {
    if (!this.db) return;
    try {
      if (this._dalamTransaksiAktif) {
        try {
          this.rollback();
        } catch {
          // Abaikan jika rollback gagal saat penutupan
        }
      }
      this.db.close();
    } finally {
      this.db = null;
      this.jalurAktif = '';
      this._dalamTransaksiAktif = false;
    }
  }

  private pastikanTerbuka(): DatabaseSync {
    if (!this.db) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.KONEKSI_TUTUP,
        'Koneksi basis data belum dibuka atau sudah ditutup.'
      );
    }
    return this.db;
  }

  private normalisasiParameter(parameter?: ParameterBindingSQL, sql?: string): any[] {
    if (parameter === undefined || parameter === null) {
      return [];
    }

    if (Array.isArray(parameter)) {
      return parameter.map(val => this.konversiNilaiInput(val));
    }

    if (typeof parameter === 'object') {
      const sqlText = sql || '';
      const objHasil: Record<string, any> = {};
      for (const [k, v] of Object.entries(parameter)) {
        const nilaiNormal = this.konversiNilaiInput(v);
        if (k.startsWith(':') || k.startsWith('@') || k.startsWith('$')) {
          objHasil[k] = nilaiNormal;
        } else {
          let adaPrefix = false;
          if (sqlText.includes(`:${k}`)) {
            objHasil[`:${k}`] = nilaiNormal;
            adaPrefix = true;
          }
          if (sqlText.includes(`@${k}`)) {
            objHasil[`@${k}`] = nilaiNormal;
            adaPrefix = true;
          }
          if (sqlText.includes(`$${k}`)) {
            objHasil[`$${k}`] = nilaiNormal;
            adaPrefix = true;
          }
          if (!adaPrefix) {
            objHasil[k] = nilaiNormal;
          }
        }
      }
      return [objHasil];
    }

    return [this.konversiNilaiInput(parameter)];
  }

  private konversiNilaiInput(val: any): any {
    if (val === undefined || val === null) {
      return null;
    }
    if (typeof val === 'boolean') {
      return val ? 1 : 0;
    }
    if (typeof val === 'bigint') {
      return Number(val);
    }
    return val;
  }

  public eksekusi(sql: string, parameter?: ParameterBindingSQL): HasilEksekusiBasisdata {
    const db = this.pastikanTerbuka();
    const sqlBersih = (sql || '').trim();
    if (!sqlBersih) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        'Perintah SQL tidak boleh kosong.'
      );
    }

    try {
      const params = this.normalisasiParameter(parameter, sqlBersih);
      const stmt = db.prepare(sqlBersih);
      const hasil = (stmt as any).run(...params);
      return {
        barisTerpengaruh: Number(hasil.changes ?? 0),
        idTerakhir: hasil.lastInsertRowid !== undefined ? Number(hasil.lastInsertRowid) : undefined,
        sukses: true,
      };
    } catch (err) {
      throw this.terjemahkanGalat(err, sqlBersih);
    }
  }

  public ambilSemua<T = Record<string, unknown>>(
    sql: string,
    parameter?: ParameterBindingSQL
  ): T[] {
    const db = this.pastikanTerbuka();
    const sqlBersih = (sql || '').trim();
    if (!sqlBersih) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        'Query SQL tidak boleh kosong.'
      );
    }

    try {
      const params = this.normalisasiParameter(parameter, sqlBersih);
      const stmt = db.prepare(sqlBersih);
      const rows = (stmt as any).all(...params) as Record<string, unknown>[];
      return rows as T[];
    } catch (err) {
      throw this.terjemahkanGalat(err, sqlBersih);
    }
  }

  public ambilSatu<T = Record<string, unknown>>(
    sql: string,
    parameter?: ParameterBindingSQL
  ): T | null {
    const db = this.pastikanTerbuka();
    const sqlBersih = (sql || '').trim();
    if (!sqlBersih) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        'Query SQL tidak boleh kosong.'
      );
    }

    try {
      const params = this.normalisasiParameter(parameter, sqlBersih);
      const stmt = db.prepare(sqlBersih);
      const row = (stmt as any).get(...params);
      if (row === undefined || row === null) {
        return null;
      }
      return row as T;
    } catch (err) {
      throw this.terjemahkanGalat(err, sqlBersih);
    }
  }

  public ambilNilai<T = unknown>(
    sql: string,
    parameter?: ParameterBindingSQL
  ): T | null {
    const row = this.ambilSatu<Record<string, unknown>>(sql, parameter);
    if (!row) {
      return null;
    }
    const kunci = Object.keys(row);
    if (kunci.length === 0) {
      return null;
    }
    return (row[kunci[0]] as T) ?? null;
  }

  public mulaiTransaksi(): void {
    const db = this.pastikanTerbuka();
    if (this._dalamTransaksiAktif) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.TRANSAKSI_GAGAL,
        'Transaksi sudah aktif. Tidak mendukung transaksi bersarang tanpa savepoint.'
      );
    }
    try {
      db.exec('BEGIN TRANSACTION;');
      this._dalamTransaksiAktif = true;
    } catch (err) {
      throw this.terjemahkanGalat(err, 'BEGIN TRANSACTION');
    }
  }

  public commit(): void {
    const db = this.pastikanTerbuka();
    if (!this._dalamTransaksiAktif) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.TRANSAKSI_GAGAL,
        'Tidak ada transaksi aktif untuk di-commit.'
      );
    }
    try {
      db.exec('COMMIT;');
      this._dalamTransaksiAktif = false;
    } catch (err) {
      throw this.terjemahkanGalat(err, 'COMMIT');
    }
  }

  public rollback(): void {
    const db = this.pastikanTerbuka();
    if (!this._dalamTransaksiAktif) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.TRANSAKSI_GAGAL,
        'Tidak ada transaksi aktif untuk di-rollback.'
      );
    }
    try {
      db.exec('ROLLBACK;');
      this._dalamTransaksiAktif = false;
    } catch (err) {
      throw this.terjemahkanGalat(err, 'ROLLBACK');
    }
  }

  private terjemahkanGalat(err: unknown, sql?: string): GalatBasisdata {
    if (err instanceof GalatBasisdata) {
      return err;
    }

    const pesan = err instanceof Error ? err.message : String(err);
    const teksBawah = pesan.toLowerCase();

    if (
      teksBawah.includes('unique constraint') ||
      teksBawah.includes('kekangan unik')
    ) {
      return new GalatBasisdata(
        JenisGalatBasisdata.KEKANGAN_TERLANGGAR,
        `Pelanggaran kekangan unik (UNIQUE constraint failed): ${pesan}`,
        sql,
        err
      );
    }

    if (
      teksBawah.includes('not null constraint') ||
      teksBawah.includes('may not be null')
    ) {
      return new GalatBasisdata(
        JenisGalatBasisdata.KEKANGAN_TERLANGGAR,
        `Pelanggaran kekangan NOT NULL: ${pesan}`,
        sql,
        err
      );
    }

    if (teksBawah.includes('foreign key constraint')) {
      return new GalatBasisdata(
        JenisGalatBasisdata.KEKANGAN_TERLANGGAR,
        `Pelanggaran kekangan relasi kunci asing (FOREIGN KEY): ${pesan}`,
        sql,
        err
      );
    }

    if (
      teksBawah.includes('syntax error') ||
      teksBawah.includes('near ') ||
      teksBawah.includes('unrecognized token')
    ) {
      return new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        `Kesalahan sintaks SQL: ${pesan}`,
        sql,
        err
      );
    }

    if (
      teksBawah.includes('no such table') ||
      teksBawah.includes('no such column')
    ) {
      return new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        `Objek basis data tidak ditemukan: ${pesan}`,
        sql,
        err
      );
    }

    if (
      teksBawah.includes('database is closed') ||
      teksBawah.includes('connection closed')
    ) {
      return new GalatBasisdata(
        JenisGalatBasisdata.KONEKSI_TUTUP,
        'Koneksi basis data telah ditutup.',
        sql,
        err
      );
    }

    return new GalatBasisdata(
      JenisGalatBasisdata.KONEKSI_GAGAL,
      `Operasi basis data gagal: ${pesan}`,
      sql,
      err
    );
  }
}
