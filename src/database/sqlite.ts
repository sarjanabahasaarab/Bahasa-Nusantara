/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Database API & Data Access (Phase 29)
 * Adaptor Basis Data SQLite terpadu berbasis node:sqlite (C-Native SQLite 3)
 * dengan penolakan eksplisit apabila SQLite native tidak tersedia di Node.js,
 * serta fallback peramban (Browser Vite) yang terdokumentasi dan terpisah.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  AdaptorBasisdata,
  HasilEksekusiBasisdata,
  InfoDriverBasisdata,
  OpsiKoneksiBasisdata,
  ParameterBindingSQL,
  GalatBasisdata,
  JenisGalatBasisdata,
} from './jenis';

// Tipe alias agar kompatibel dengan TypeScript tanpa named import node:sqlite
type DatabaseSync = any;

export const VERSI_DRIVER_SQLITE_NATIVE = 'SQLite 3 (node:sqlite)';
export const VERSI_DRIVER_BROWSER_FALLBACK = 'SQLite Fallback In-Memory (Browser)';

/**
 * Mendeteksi apakah kode berjalan di lingkungan peramban (browser/DOM).
 */
export function apakahLingkunganBrowser(): boolean {
  return typeof window !== 'undefined' || typeof document !== 'undefined';
}

/**
 * Memuat kelas DatabaseSync dari modul bawaan Node.js `node:sqlite` tanpa static import
 * agar bundler Vite di sisi klien tidak gagal pada resolusi `node:*`.
 */
export function muatKelasDatabaseSyncNative(): any | null {
  if (apakahLingkunganBrowser()) {
    return null;
  }

  try {
    // 1. Jalur utama resmi: process.getBuiltinModule('node:sqlite') (Node.js 22 LTS+)
    if (typeof (process as any)?.getBuiltinModule === 'function') {
      const mod = (process as any).getBuiltinModule('node:sqlite');
      if (mod && typeof mod.DatabaseSync === 'function') {
        return mod.DatabaseSync;
      }
    }
    // 2. Jalur sekunder CommonJS jika getBuiltinModule tidak tersedia
    if (typeof require === 'function') {
      const mod = require('node:sqlite');
      if (mod && typeof mod.DatabaseSync === 'function') {
        return mod.DatabaseSync;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Memeriksa apakah driver native `node:sqlite` (DatabaseSync) benar-benar tersedia di Node.js.
 */
export function apakahSqliteNativeTersedia(): boolean {
  return muatKelasDatabaseSyncNative() !== null;
}

/**
 * Mengembalikan informasi diagnostik driver SQLite aktual pada runtime saat ini.
 */
export function dapatkanInfoDriverSQLite(): InfoDriverBasisdata {
  if (apakahLingkunganBrowser()) {
    return {
      namaDriver: 'sqlite',
      versiDriver: VERSI_DRIVER_BROWSER_FALLBACK,
      tersedia: true,
      apakahNative: false,
      sumber: 'browser-in-memory',
      versiRuntime: 'browser',
      alasan: 'Berjalan di peramban; menggunakan fallback in-memory tanpa persistensi berkas disk.',
    };
  }

  const versiNode = typeof process !== 'undefined' && process.version ? process.version : 'unknown';
  const dbSync = muatKelasDatabaseSyncNative();
  if (dbSync) {
    return {
      namaDriver: 'sqlite',
      versiDriver: VERSI_DRIVER_SQLITE_NATIVE,
      tersedia: true,
      apakahNative: true,
      sumber: 'node:sqlite',
      versiRuntime: versiNode,
    };
  }

  return {
    namaDriver: 'sqlite',
    versiDriver: `${VERSI_DRIVER_SQLITE_NATIVE} [TIDAK TERSEDIA]`,
    tersedia: false,
    apakahNative: false,
    sumber: 'tidak-tersedia',
    versiRuntime: versiNode,
    alasan: `Modul bawaan Node.js 'node:sqlite' (DatabaseSync) tidak tersedia pada Node.js ${versiNode}. Diperlukan Node.js 22 LTS (>= 22.13.0).`,
  };
}

/**
 * Mesin SQL In-Memory terbatas khusus untuk fallback lingkungan peramban (Browser Vite).
 *
 * Batas kemampuan yang terdokumentasi:
 * - Hanya menyimpan data sementara di memori peramban (tidak menulis berkas fisik).
 * - Mendukung subset SQL dasar: CREATE TABLE (PRIMARY KEY, UNIQUE, NOT NULL),
 *   INSERT INTO ... VALUES (...), UPDATE ... SET col = ? WHERE col = ?,
 *   DELETE FROM ... WHERE col = ?, SELECT cols FROM tbl [WHERE col = ?] [ORDER BY] [LIMIT],
 *   serta transaksi BEGIN / COMMIT / ROLLBACK berbasis snapshot.
 * - Tidak mendukung fungsi agregasi SQL (COUNT/MAX/SUM), JOIN multi-tabel, atau subquery.
 * - Tidak pernah digunakan secara diam-diam di lingkungan Node.js.
 */
export class MesinMemoriBrowserSQLite {
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
      return;
    }

    throw new Error(`near "${s.split(/\s+/)[0] || s}": syntax error`);
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

  private ekstraksiParameter(params: any[]): { positional: any[]; named: Record<string, any> | null } {
    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
      return { positional: Object.values(params[0]), named: params[0] };
    }
    return { positional: params, named: null };
  }

  private ambilNilaiToken(token: string, idxRef: { idx: number }, positional: any[], named: Record<string, any> | null): any {
    const t = token.trim();
    if (t === '?') {
      return positional[idxRef.idx++];
    }
    if (named && (t.startsWith(':') || t.startsWith('@') || t.startsWith('$'))) {
      if (t in named) return named[t];
      const tanpaPrefix = t.slice(1);
      if (tanpaPrefix in named) return named[tanpaPrefix];
    }
    if (/^['"].*['"]$/.test(t)) {
      return t.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?$/.test(t)) {
      return Number(t);
    }
    if (/^NULL$/i.test(t)) return null;
    return undefined;
  }

  private jalankanRun(sql: string, paramsRaw: any[]): { changes: number; lastInsertRowid?: number } {
    const { positional, named } = this.ekstraksiParameter(paramsRaw);

    if (/^(CREATE\s+TABLE|CREATE\s+INDEX|PRAGMA|BEGIN|COMMIT|ROLLBACK)/i.test(sql)) {
      this.eksekusiDDL(sql);
      return { changes: 0 };
    }

    // INSERT INTO ...
    const matchInsert = sql.match(/^INSERT\s+INTO\s+([`"']?([a-zA-Z0-9_]+)[`"']?)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([^)]+)\)/i);
    if (matchInsert) {
      const namaTabel = matchInsert[2].toLowerCase();
      if (!this.tabel.has(namaTabel)) {
        throw new Error(`no such table: ${namaTabel}`);
      }

      const kolomList = matchInsert[3]
        ? matchInsert[3].split(',').map(c => c.trim().replace(/[`"']/g, '').toLowerCase())
        : [];
      const nilaiTokens = matchInsert[4].split(',');

      const daftarBaris = this.tabel.get(namaTabel)!;
      const nextId = (this.autoincrement.get(namaTabel) || 0) + 1;
      this.autoincrement.set(namaTabel, nextId);

      const barisBaru: Record<string, any> = { id: nextId };
      const idxRef = { idx: 0 };

      kolomList.forEach((kolom, i) => {
        const tok = nilaiTokens[i] !== undefined ? nilaiTokens[i] : '?';
        const v = this.ambilNilaiToken(tok, idxRef, positional, named);
        barisBaru[kolom] = v !== undefined ? v : null;
      });

      if (barisBaru.id === undefined || barisBaru.id === null) {
        barisBaru.id = nextId;
      }

      // Validasi UNIQUE & NOT NULL constraint
      const skema = this.skemaKolom.get(namaTabel);
      if (skema) {
        for (const kolNN of skema.notNull) {
          if (barisBaru[kolNN] === null || barisBaru[kolNN] === undefined) {
            throw new Error(`NOT NULL constraint failed: ${namaTabel}.${kolNN}`);
          }
        }
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
      if (!this.tabel.has(namaTabel)) {
        throw new Error(`no such table: ${namaTabel}`);
      }
      const setKlausul = matchUpdate[3];
      const whereKlausul = matchUpdate[4];

      const daftarBaris = this.tabel.get(namaTabel) || [];
      let jumlahPerubahan = 0;

      const pasangSet = setKlausul.split(',').map(s => s.trim());

      for (const baris of daftarBaris) {
        if (this.evaluasiWhere(baris, whereKlausul, positional, named, pasangSet.length)) {
          const idxRef = { idx: 0 };
          pasangSet.forEach(p => {
            const m = p.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
            if (m) {
              const kol = m[1].toLowerCase();
              const val = this.ambilNilaiToken(m[2], idxRef, positional, named);
              if (val !== undefined) {
                baris[kol] = val;
              }
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
      if (!this.tabel.has(namaTabel)) {
        throw new Error(`no such table: ${namaTabel}`);
      }
      const whereKlausul = matchDelete[3];
      const daftarBaris = this.tabel.get(namaTabel) || [];
      const barisTersisa: Record<string, any>[] = [];
      let jumlahHapus = 0;

      for (const baris of daftarBaris) {
        if (this.evaluasiWhere(baris, whereKlausul, positional, named, 0)) {
          jumlahHapus++;
        } else {
          barisTersisa.push(baris);
        }
      }
      this.tabel.set(namaTabel, barisTersisa);
      return { changes: jumlahHapus };
    }

    throw new Error(`near "${sql.split(/\s+/)[0] || sql}": syntax error`);
  }

  private jalankanAll(sql: string, paramsRaw: any[]): Record<string, any>[] {
    const { positional, named } = this.ekstraksiParameter(paramsRaw);

    if (/^SELECT\s+1$/i.test(sql.trim())) {
      return [{ '1': 1 }];
    }

    const matchSelect = sql.match(/^SELECT\s+(.+?)\s+FROM\s+([`"']?([a-zA-Z0-9_]+)[`"']?)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!matchSelect) {
      throw new Error(`near "${sql.split(/\s+/)[0] || sql}": syntax error`);
    }

    const kolomPilih = matchSelect[1].trim();
    const namaTabel = matchSelect[3].toLowerCase();
    const whereKlausul = matchSelect[4];
    const orderByKlausul = matchSelect[5];
    const limitKlausul = matchSelect[6];

    if (!this.tabel.has(namaTabel)) {
      throw new Error(`no such table: ${namaTabel}`);
    }

    const daftarBaris = this.tabel.get(namaTabel) || [];
    let barisHasil = daftarBaris.filter(baris => this.evaluasiWhere(baris, whereKlausul, positional, named, 0));

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

  private evaluasiWhere(
    baris: Record<string, any>,
    where?: string,
    positional?: any[],
    named?: Record<string, any> | null,
    offsetParam = 0
  ): boolean {
    if (!where) return true;
    const w = where.trim();
    if (!w) return true;

    const matchEqParam = w.match(/^([a-zA-Z0-9_]+)\s*=\s*(\?|[:@$][a-zA-Z0-9_]+)$/);
    if (matchEqParam) {
      const kol = matchEqParam[1].toLowerCase();
      const tok = matchEqParam[2];
      const val = this.ambilNilaiToken(tok, { idx: offsetParam }, positional || [], named || null);
      return baris[kol] == val;
    }

    const matchEqLiteral = w.match(/^([a-zA-Z0-9_]+)\s*=\s*['"]([^'"]*)['"]$/);
    if (matchEqLiteral) {
      const kol = matchEqLiteral[1].toLowerCase();
      return baris[kol] == matchEqLiteral[2];
    }

    const matchEqNum = w.match(/^([a-zA-Z0-9_]+)\s*=\s*(-?\d+(?:\.\d+)?)$/);
    if (matchEqNum) {
      const kol = matchEqNum[1].toLowerCase();
      return baris[kol] == Number(matchEqNum[2]);
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
  private _versiDriver = VERSI_DRIVER_SQLITE_NATIVE;

  private db: DatabaseSync | null = null;
  private jalurAktif: string = '';
  private _dalamTransaksiAktif: boolean = false;
  private readonly muatDriverOverride?: () => any | null;

  constructor(opsiInternal?: { muatDriverNative?: () => any | null }) {
    this.muatDriverOverride = opsiInternal?.muatDriverNative;
  }

  public get versiDriver(): string {
    return this._versiDriver;
  }

  public apakahTerbuka(): boolean {
    return this.db !== null;
  }

  public dalamTransaksi(): boolean {
    return this._dalamTransaksiAktif;
  }

  public dapatkanJalurAktif(): string {
    return this.jalurAktif;
  }

  public buka(opsi: OpsiKoneksiBasisdata): void {
    if (this.db) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.KONEKSI_GAGAL,
        'Koneksi basis data sudah terbuka. Tutup koneksi terlebih dahulu sebelum membuka yang baru.'
      );
    }

    const jalur = opsi.jalur ? opsi.jalur.trim() : ':memory:';
    const diBrowser = apakahLingkunganBrowser();

    if (diBrowser) {
      if (opsi.izinkanFallbackBrowser === false) {
        throw new GalatBasisdata(
          JenisGalatBasisdata.DRIVER_TIDAK_TERSEDIA,
          'Driver SQLite native (node:sqlite) tidak tersedia di peramban dan fallback in-memory dinonaktifkan.'
        );
      }
      this.jalurAktif = jalur || ':memory:';
      try {
        this._versiDriver = VERSI_DRIVER_BROWSER_FALLBACK;
        this.db = new MesinMemoriBrowserSQLite(this.jalurAktif);
        this.inisialisasiPragma(opsi);
        return;
      } catch (err) {
        this.db = null;
        throw this.terjemahkanGalat(err, `BUKA_KONEKSI: ${this.jalurAktif}`);
      }
    }

    // Lingkungan Node.js: WAJIB menggunakan node:sqlite (DatabaseSync) asli.
    // Tidak pernah diam-diam beralih ke database in-memory.
    const DatabaseSyncClass =
      this.muatDriverOverride !== undefined ? this.muatDriverOverride() : muatKelasDatabaseSyncNative();

    if (!DatabaseSyncClass || typeof DatabaseSyncClass !== 'function') {
      const versiNode = typeof process !== 'undefined' && process.version ? process.version : 'unknown';
      throw new GalatBasisdata(
        JenisGalatBasisdata.DRIVER_TIDAK_TERSEDIA,
        `Driver SQLite native ('node:sqlite' / DatabaseSync) tidak tersedia pada Node.js ${versiNode}. ` +
          `Operasi untuk '${jalur || ':memory:'}' ditolak dan tidak dialihkan ke database in-memory. ` +
          `Gunakan Node.js 22 LTS (>= 22.13.0) agar process.getBuiltinModule('node:sqlite') tersedia.`
      );
    }

    this._versiDriver = VERSI_DRIVER_SQLITE_NATIVE;

    const opsiDriver: Record<string, any> = {};
    if (opsi.modeBuka === 'baca_saja') {
      opsiDriver.readOnly = true;
    }
    if (typeof opsi.batasWaktuMilidetik === 'number' && opsi.batasWaktuMilidetik > 0) {
      opsiDriver.timeout = Math.floor(opsi.batasWaktuMilidetik);
    }

    if (jalur === '' || jalur === ':memory:') {
      this.jalurAktif = ':memory:';
      try {
        this.db = Object.keys(opsiDriver).length > 0
          ? new DatabaseSyncClass(':memory:', opsiDriver)
          : new DatabaseSyncClass(':memory:');
        this.inisialisasiPragma(opsi);
        return;
      } catch (err) {
        this.db = null;
        throw this.terjemahkanGalat(err, 'BUKA_KONEKSI');
      }
    }

    // Validasi keamanan direktori dan proteksi path traversal di Node.js
    const direktoriAman = path.resolve(opsi.direktoriAman || process.cwd());
    const jalurDiselesaikan = path.isAbsolute(jalur)
      ? path.normalize(jalur)
      : path.resolve(direktoriAman, jalur);

    const relatif = path.relative(direktoriAman, jalurDiselesaikan);
    const lolosKeamanan =
      relatif !== '..' &&
      !relatif.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relatif);

    if (!lolosKeamanan && path.resolve('/') !== direktoriAman) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.AKSES_JALUR_ILEGAL,
        `Akses jalur berkas basis data di luar direktori aman ditolak: '${jalur}'`
      );
    }

    if (opsi.modeBuka === 'baca_saja') {
      if (!fs.existsSync(jalurDiselesaikan)) {
        throw new GalatBasisdata(
          JenisGalatBasisdata.KONEKSI_GAGAL,
          `Berkas basis data mode baca-saja tidak ditemukan: '${jalur}'`
        );
      }
    } else {
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
    }

    this.jalurAktif = jalurDiselesaikan;
    try {
      this.db = Object.keys(opsiDriver).length > 0
        ? new DatabaseSyncClass(jalurDiselesaikan, opsiDriver)
        : new DatabaseSyncClass(jalurDiselesaikan);
      this.inisialisasiPragma(opsi);
    } catch (err) {
      this.db = null;
      throw this.terjemahkanGalat(err, `BUKA_KONEKSI: ${jalur}`);
    }
  }

  private inisialisasiPragma(opsi?: OpsiKoneksiBasisdata): void {
    if (!this.db) return;
    if (opsi?.modeBuka === 'baca_saja') return;
    try {
      this.db.exec('PRAGMA foreign_keys = ON;');
      if (typeof opsi?.batasWaktuMilidetik === 'number' && opsi.batasWaktuMilidetik > 0) {
        this.db.exec(`PRAGMA busy_timeout = ${Math.floor(opsi.batasWaktuMilidetik)};`);
      }
    } catch {
      // Abaikan jika pragma opsional tidak didukung
    }
  }

  public tutup(): void {
    if (!this.db) return;
    try {
      if (this._dalamTransaksiAktif) {
        try {
          this.rollback();
        } catch {
          this._dalamTransaksiAktif = false;
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
          const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          let adaPrefix = false;
          if (new RegExp(`:${esc}(?![A-Za-z0-9_])`).test(sqlText)) {
            objHasil[`:${k}`] = nilaiNormal;
            adaPrefix = true;
          }
          if (new RegExp(`@${esc}(?![A-Za-z0-9_])`).test(sqlText)) {
            objHasil[`@${k}`] = nilaiNormal;
            adaPrefix = true;
          }
          if (new RegExp(`\\$${esc}(?![A-Za-z0-9_])`).test(sqlText)) {
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

      if (/^BEGIN(?:\s+(?:DEFERRED|IMMEDIATE|EXCLUSIVE))?(?:\s+TRANSACTION)?\s*;?$/i.test(sqlBersih)) {
        this._dalamTransaksiAktif = true;
      } else if (
        /^(?:COMMIT|END)(?:\s+TRANSACTION)?\s*;?$/i.test(sqlBersih) ||
        /^ROLLBACK(?:\s+TRANSACTION)?\s*;?$/i.test(sqlBersih)
      ) {
        this._dalamTransaksiAktif = false;
      }

      return {
        barisTerpengaruh: Number(hasil?.changes ?? 0),
        idTerakhir: hasil?.lastInsertRowid !== undefined ? Number(hasil.lastInsertRowid) : undefined,
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
    const nilai = row[kunci[0]];
    if (nilai === undefined || nilai === null) {
      return null;
    }
    return nilai as T;
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
      this._dalamTransaksiAktif = false;
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
      teksBawah.includes('kekangan unik') ||
      teksBawah.includes('primary key must be unique')
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

    if (teksBawah.includes('foreign key constraint') || teksBawah.includes('check constraint')) {
      return new GalatBasisdata(
        JenisGalatBasisdata.KEKANGAN_TERLANGGAR,
        `Pelanggaran kekangan relasi/integritas basis data: ${pesan}`,
        sql,
        err
      );
    }

    if (
      teksBawah.includes('unknown named parameter') ||
      teksBawah.includes('too many parameter') ||
      teksBawah.includes('wrong number of arguments') ||
      teksBawah.includes('bind')
    ) {
      return new GalatBasisdata(
        JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
        `Parameter binding SQL tidak valid: ${pesan}`,
        sql,
        err
      );
    }

    if (
      teksBawah.includes('cannot start a transaction') ||
      teksBawah.includes('cannot commit') ||
      teksBawah.includes('cannot rollback')
    ) {
      return new GalatBasisdata(
        JenisGalatBasisdata.TRANSAKSI_GAGAL,
        `Operasi transaksi SQL gagal: ${pesan}`,
        sql,
        err
      );
    }

    if (
      teksBawah.includes('syntax error') ||
      teksBawah.includes('near ') ||
      teksBawah.includes('unrecognized token') ||
      teksBawah.includes('incomplete input')
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
      teksBawah.includes('no such column') ||
      teksBawah.includes('no such function')
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
