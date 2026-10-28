/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Database API & Data Access (Phase 29)
 * Adaptor Basis Data SQLite terpadu berbasis node:sqlite (C-Native SQLite 3)
 * dengan Fallback In-Memory untuk Kompatibilitas Peramban (Browser Vite).
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  AdaptorBasisdata,
  HasilEksekusiBasisdata,
  OpsiKoneksiBasisdata,
  ParameterBindingSQL,
  GalatBasisdata,
  JenisGalatBasisdata,
} from './jenis';

// Tipe alias agar kompatibel dengan TypeScript tanpa named import node:sqlite
type DatabaseSync = any;

let _DatabaseSyncClass: any = undefined;

/**
 * Memuat DatabaseSync secara aman tanpa impor statis yang memicu eksternalisasi Vite di peramban.
 */
function dapatkanKelasDatabaseSync(): any {
  if (_DatabaseSyncClass !== undefined) {
    return _DatabaseSyncClass;
  }

  // Jika berjalan di lingkungan browser client (Vite)
  if (typeof window !== 'undefined' || typeof document !== 'undefined') {
    _DatabaseSyncClass = null;
    return null;
  }

  try {
    // 1. Coba melalui process.getBuiltinModule (Node 22+)
    if (typeof (process as any)?.getBuiltinModule === 'function') {
      const mod = (process as any).getBuiltinModule('node:sqlite');
      if (mod?.DatabaseSync) {
        _DatabaseSyncClass = mod.DatabaseSync;
        return _DatabaseSyncClass;
      }
    }
    // 2. Coba melalui require jika tersedia
    if (typeof require === 'function') {
      const mod = require('node:sqlite');
      if (mod?.DatabaseSync) {
        _DatabaseSyncClass = mod.DatabaseSync;
        return _DatabaseSyncClass;
      }
    }
  } catch {
    _DatabaseSyncClass = null;
  }

  _DatabaseSyncClass = null;
  return null;
}

/**
 * Mesin SQL In-Memory mandiri sebagai fallback peramban (client browser).
 * Mendukung DDL, INSERT, SELECT, UPDATE, DELETE, dan Transaksi dasar.
 */
class InMemoriDatabaseSync {
  private tabel = new Map<string, Array<Record<string, any>>>();
  private autoincrement = new Map<string, number>();
  private skemaKolom = new Map<string, { unik: Set<string>; notNull: Set<string> }>();
  private snapshotTransaksi: string | null = null;
  private ditutup = false;

  constructor(_jalur?: string) {}

  public exec(sqlSemua: string): void {
    if (this.ditutup) throw new Error('database is closed');
    const daftarSql = sqlSemua.split(';').map(s => s.trim()).filter(Boolean);
    for (const sql of daftarSql) {
      this.eksekusiDDL(sql);
    }
  }

  private eksekusiDDL(sql: string): void {
    const s = sql.trim();
    if (!s) return;
    if (/^PRAGMA/i.test(s)) return;
    if (/^CREATE\s+INDEX/i.test(s)) return;

    if (/^BEGIN/i.test(s)) {
      this.snapshotTransaksi = JSON.stringify({
        tabel: Array.from(this.tabel.entries()),
        auto: Array.from(this.autoincrement.entries()),
      });
      return;
    }
    if (/^COMMIT/i.test(s)) {
      this.snapshotTransaksi = null;
      return;
    }
    if (/^ROLLBACK/i.test(s)) {
      if (this.snapshotTransaksi) {
        const snap = JSON.parse(this.snapshotTransaksi);
        this.tabel = new Map(snap.tabel);
        this.autoincrement = new Map(snap.auto);
        this.snapshotTransaksi = null;
      }
      return;
    }

    const matchCreate = s.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"']?([a-zA-Z0-9_]+)[`"']?)\s*\((.*)\)/is);
    if (matchCreate) {
      const namaTabel = matchCreate[2].toLowerCase();
      if (!this.tabel.has(namaTabel)) {
        this.tabel.set(namaTabel, []);
        this.autoincrement.set(namaTabel, 0);

        const definisiKolom = matchCreate[3] || '';
        const setUnik = new Set<string>();
        const setNotNull = new Set<string>();

        const barisDefinisi = definisiKolom.split(',');
        for (const baris of barisDefinisi) {
          const bagian = baris.trim();
          const matchKolom = bagian.match(/^([a-zA-Z0-9_]+)/);
          if (matchKolom) {
            const namaKol = matchKolom[1].toLowerCase();
            if (/PRIMARY\s+KEY/i.test(bagian) || /UNIQUE/i.test(bagian)) {
              setUnik.add(namaKol);
            }
            if (/NOT\s+NULL/i.test(bagian) || /PRIMARY\s+KEY/i.test(bagian)) {
              setNotNull.add(namaKol);
            }
          }
        }
        this.skemaKolom.set(namaTabel, { unik: setUnik, notNull: setNotNull });
      }
    }
  }

  public prepare(sql: string): any {
    if (this.ditutup) throw new Error('database is closed');
    const self = this;
    const sqlTeks = sql.trim();

    return {
      run(...params: any[]) {
        if (self.ditutup) throw new Error('database is closed');
        return self.jalankanRun(sqlTeks, params);
      },
      all(...params: any[]) {
        if (self.ditutup) throw new Error('database is closed');
        return self.jalankanAll(sqlTeks, params);
      },
      get(...params: any[]) {
        if (self.ditutup) throw new Error('database is closed');
        const rows = self.jalankanAll(sqlTeks, params);
        return rows.length > 0 ? rows[0] : undefined;
      },
    };
  }

  private ekstraksiParameter(params: any[]): any[] {
    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
      return Object.values(params[0]);
    }
    return params;
  }

  private jalankanRun(sql: string, paramsRaw: any[]): { changes: number; lastInsertRowid?: number } {
    const params = this.ekstraksiParameter(paramsRaw);

    // INSERT INTO ...
    const matchInsert = sql.match(/^INSERT\s+INTO\s+([`"']?([a-zA-Z0-9_]+)[`"']?)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([^)]+)\)/i);
    if (matchInsert) {
      const namaTabel = matchInsert[2].toLowerCase();
      if (!this.tabel.has(namaTabel)) {
        this.tabel.set(namaTabel, []);
        this.autoincrement.set(namaTabel, 0);
        this.skemaKolom.set(namaTabel, { unik: new Set(['id']), notNull: new Set(['id']) });
      }

      const kolomList = matchInsert[3]
        ? matchInsert[3].split(',').map(c => c.trim().replace(/[`"']/g, '').toLowerCase())
        : [];

      const daftarBaris = this.tabel.get(namaTabel)!;
      let nextId = (this.autoincrement.get(namaTabel) || 0) + 1;
      this.autoincrement.set(namaTabel, nextId);

      const barisBaru: Record<string, any> = { id: nextId };

      kolomList.forEach((kolom, i) => {
        barisBaru[kolom] = params[i] !== undefined ? params[i] : null;
      });

      if (barisBaru.id === undefined || barisBaru.id === null) {
        barisBaru.id = nextId;
      }

      // Validasi UNIQUE constraint
      const skema = this.skemaKolom.get(namaTabel);
      if (skema) {
        for (const kolUnik of skema.unik) {
          const val = barisBaru[kolUnik];
          if (val !== undefined && val !== null) {
            const adaDuplikat = daftarBaris.some(r => r[kolUnik] === val);
            if (adaDuplikat) {
              throw new Error(`UNIQUE constraint failed: ${namaTabel}.${kolUnik}`);
            }
          }
        }
      }

      daftarBaris.push(barisBaru);
      return { changes: 1, lastInsertRowid: Number(barisBaru.id) };
    }

    // UPDATE ... SET ... WHERE ...
    const matchUpdate = sql.match(/^UPDATE\s+([`"']?([a-zA-Z0-9_]+)[`"']?)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (matchUpdate) {
      const namaTabel = matchUpdate[2].toLowerCase();
      const setKlausul = matchUpdate[3];
      const whereKlausul = matchUpdate[4];

      const daftarBaris = this.tabel.get(namaTabel) || [];
      let jumlahPerubahan = 0;

      const pasangSet = setKlausul.split(',').map(s => s.trim());
      let paramIdx = 0;

      for (const baris of daftarBaris) {
        if (this.evaluasiWhere(baris, whereKlausul, params, pasangSet.length)) {
          pasangSet.forEach(p => {
            const m = p.match(/^([a-zA-Z0-9_]+)\s*=\s*\?/);
            if (m) {
              const kol = m[1].toLowerCase();
              baris[kol] = params[paramIdx++];
            }
          });
          jumlahPerubahan++;
        }
      }
      return { changes: jumlahPerubahan };
    }

    // DELETE FROM ... WHERE ...
    const matchDelete = sql.match(/^DELETE\s+FROM\s+([`"']?([a-zA-Z0-9_]+)[`"']?)(?:\s+WHERE\s+(.+))?$/i);
    if (matchDelete) {
      const namaTabel = matchDelete[2].toLowerCase();
      const whereKlausul = matchDelete[3];
      const daftarBaris = this.tabel.get(namaTabel) || [];
      const barisTersisa: Record<string, any>[] = [];
      let jumlahHapus = 0;

      for (const baris of daftarBaris) {
        if (this.evaluasiWhere(baris, whereKlausul, params, 0)) {
          jumlahHapus++;
        } else {
          barisTersisa.push(baris);
        }
      }
      this.tabel.set(namaTabel, barisTersisa);
      return { changes: jumlahHapus };
    }

    return { changes: 0 };
  }

  private jalankanAll(sql: string, paramsRaw: any[]): Record<string, any>[] {
    const params = this.ekstraksiParameter(paramsRaw);

    const matchSelect = sql.match(/^SELECT\s+(.+?)\s+FROM\s+([`"']?([a-zA-Z0-9_]+)[`"']?)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!matchSelect) {
      return [];
    }

    const kolomPilih = matchSelect[1].trim();
    const namaTabel = matchSelect[3].toLowerCase();
    const whereKlausul = matchSelect[4];
    const orderByKlausul = matchSelect[5];
    const limitKlausul = matchSelect[6];

    const daftarBaris = this.tabel.get(namaTabel) || [];
    let barisHasil = daftarBaris.filter(baris => this.evaluasiWhere(baris, whereKlausul, params, 0));

    if (orderByKlausul) {
      const bagianOrder = orderByKlausul.trim().split(/\s+/);
      const kolOrder = bagianOrder[0].toLowerCase();
      const desc = bagianOrder[1] && /^DESC$/i.test(bagianOrder[1]);

      barisHasil.sort((a, b) => {
        const va = a[kolOrder];
        const vb = b[kolOrder];
        if (va < vb) return desc ? 1 : -1;
        if (va > vb) return desc ? -1 : 1;
        return 0;
      });
    }

    if (limitKlausul) {
      barisHasil = barisHasil.slice(0, parseInt(limitKlausul, 10));
    }

    if (kolomPilih === '*') {
      return barisHasil.map(r => ({ ...r }));
    }

    const cols = kolomPilih.split(',').map(c => c.trim().toLowerCase());
    return barisHasil.map(r => {
      const obj: Record<string, any> = {};
      for (const c of cols) {
        obj[c] = r[c] !== undefined ? r[c] : null;
      }
      return obj;
    });
  }

  private evaluasiWhere(baris: Record<string, any>, where?: string, params?: any[], offsetParam = 0): boolean {
    if (!where) return true;
    const w = where.trim();
    if (!w) return true;

    // Sederhana: cocokkan kondisi "kolom = ?"
    const matchSimple = w.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/);
    if (matchSimple && params) {
      const kol = matchSimple[1].toLowerCase();
      const val = params[offsetParam];
      return baris[kol] == val;
    }

    // Kondisi "kolom = 'nilai'"
    const matchEq = w.match(/^([a-zA-Z0-9_]+)\s*=\s*['"]?([^'"]+)['"]?$/);
    if (matchEq) {
      const kol = matchEq[1].toLowerCase();
      const val = matchEq[2];
      return baris[kol] == val;
    }

    return true;
  }

  public close(): void {
    this.ditutup = true;
    this.tabel.clear();
    this.skemaKolom.clear();
  }
}

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
    const DatabaseSyncClass = dapatkanKelasDatabaseSync() || InMemoriDatabaseSync;

    if (jalur === '' || jalur === ':memory:') {
      this.jalurAktif = ':memory:';
      try {
        this.db = new DatabaseSyncClass(':memory:');
        this.inisialisasiPragma();
        return;
      } catch (err) {
        throw this.terjemahkanGalat(err, 'BUKA_KONEKSI');
      }
    }

    // Jika berjalan di browser dan meminta berkas, gunakan in-memory virtual
    const apakahBrowser = typeof window !== 'undefined' || typeof document !== 'undefined';
    if (apakahBrowser) {
      this.jalurAktif = jalur;
      try {
        this.db = new InMemoriDatabaseSync(jalur);
        this.inisialisasiPragma();
        return;
      } catch (err) {
        throw this.terjemahkanGalat(err, `BUKA_KONEKSI: ${jalur}`);
      }
    }

    // Validasi keamanan direktori dan proteksi path traversal di Node.js
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
      this.db = new DatabaseSyncClass(jalurDiselesaikan);
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
