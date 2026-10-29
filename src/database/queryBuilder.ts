/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Query Builder Terpadu dengan Parameter Binding dan Proteksi Injeksi SQL.
 */

import {
  AdaptorBasisdata,
  HasilEksekusiBasisdata,
  TipeParameterSQL,
  GalatBasisdata,
  JenisGalatBasisdata,
} from './jenis';

export type OperatorPerbandingan =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'LIKE'
  | 'NOT LIKE'
  | 'like'
  | 'not like';

export interface KlausulWhere {
  tipe: 'dasar' | 'in' | 'not_in' | 'null' | 'not_null' | 'between';
  kolom: string;
  operator?: string;
  nilai?: any;
  penghubung: 'AND' | 'OR';
}

export interface KlausulJoin {
  jenis: 'INNER' | 'LEFT';
  tabel: string;
  kolomPertama: string;
  operator: string;
  kolomKedua: string;
}

export interface KlausulOrder {
  kolom: string;
  arah: 'ASC' | 'DESC';
}

export interface HasilPaginasi<T> {
  data: T[];
  total: number;
  halaman: number;
  perHalaman: number;
  totalHalaman: number;
}

const REGEX_IDENTIFIER_AMAN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const REGEX_KOLOM_DENGAN_TABEL = /^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/;
const REGEX_ALIAS_KOLOM = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?\s+(?:AS|as)\s+[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validasi ketat nama tabel atau kolom SQL untuk mencegah SQL Injection via Identifier.
 */
export function validasiIdentifierSQL(nama: string, izinkanBintang: boolean = false): string {
  const bersih = nama.trim();
  if (izinkanBintang && bersih === '*') {
    return '*';
  }
  if (REGEX_IDENTIFIER_AMAN.test(bersih)) {
    return `"${bersih}"`;
  }
  if (REGEX_KOLOM_DENGAN_TABEL.test(bersih)) {
    const [t, k] = bersih.split('.');
    return `"${t}"."${k}"`;
  }
  if (REGEX_ALIAS_KOLOM.test(bersih)) {
    const bagian = bersih.split(/\s+(?:AS|as)\s+/i);
    const idAsal = validasiIdentifierSQL(bagian[0], false);
    const alias = bagian[1].trim();
    if (!REGEX_IDENTIFIER_AMAN.test(alias)) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        `Alias identifier SQL tidak valid: "${alias}"`
      );
    }
    return `${idAsal} AS "${alias}"`;
  }

  throw new GalatBasisdata(
    JenisGalatBasisdata.SINTAKS_SQL,
    `Identifier SQL mengandung karakter berbahaya atau tidak valid: "${nama}"`
  );
}

/**
 * Query Builder NUSANTARA untuk menghasilkan query berparameter dan aman.
 */
export class QueryBuilder {
  private adaptor: AdaptorBasisdata;
  private namaTabel: string;
  private kolomDipilih: string[] = ['*'];
  private apakahDistinct: boolean = false;
  private daftarWhere: KlausulWhere[] = [];
  private daftarJoin: KlausulJoin[] = [];
  private daftarOrder: KlausulOrder[] = [];
  private jumlahLimit?: number;
  private jumlahOffset?: number;

  constructor(adaptor: AdaptorBasisdata, tabel: string) {
    this.adaptor = adaptor;
    validasiIdentifierSQL(tabel);
    this.namaTabel = tabel;
  }

  public dapatkanTabel(): string {
    return this.namaTabel;
  }

  public dapatkanAdaptor(): AdaptorBasisdata {
    return this.adaptor;
  }

  /**
   * Menentukan kolom-kolom yang diambil pada query SELECT.
   */
  public select(...kolom: string[]): this {
    if (kolom.length === 0) {
      this.kolomDipilih = ['*'];
    } else {
      this.kolomDipilih = kolom.map((k) => validasiIdentifierSQL(k, true));
    }
    return this;
  }

  public distinct(): this {
    this.apakahDistinct = true;
    return this;
  }

  /**
   * Menambahkan klausa WHERE dengan penghubung AND.
   */
  public where(kolom: string, operatorAtauNilai: any, nilai?: any): this {
    return this.tambahWhere('AND', kolom, operatorAtauNilai, nilai);
  }

  /**
   * Menambahkan klausa WHERE dengan penghubung OR.
   */
  public orWhere(kolom: string, operatorAtauNilai: any, nilai?: any): this {
    return this.tambahWhere('OR', kolom, operatorAtauNilai, nilai);
  }

  private tambahWhere(
    penghubung: 'AND' | 'OR',
    kolom: string,
    operatorAtauNilai: any,
    nilai?: any
  ): this {
    validasiIdentifierSQL(kolom);

    let op = '=';
    let val = operatorAtauNilai;

    if (nilai !== undefined) {
      op = String(operatorAtauNilai).toUpperCase();
      val = nilai;
    }

    const daftarOpSah = ['=', '!=', '<>', '<', '<=', '>', '>=', 'LIKE', 'NOT LIKE'];
    if (!daftarOpSah.includes(op)) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        `Operator perbandingan SQL '${op}' tidak didukung atau tidak aman.`
      );
    }

    if (val === null) {
      if (op === '=' || op === 'IS') {
        this.daftarWhere.push({ tipe: 'null', kolom, penghubung });
        return this;
      }
      if (op === '!=' || op === '<>' || op === 'IS NOT') {
        this.daftarWhere.push({ tipe: 'not_null', kolom, penghubung });
        return this;
      }
    }

    this.daftarWhere.push({
      tipe: 'dasar',
      kolom,
      operator: op,
      nilai: val,
      penghubung,
    });
    return this;
  }

  public whereIn(kolom: string, nilaiList: any[]): this {
    validasiIdentifierSQL(kolom);
    if (!Array.isArray(nilaiList)) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
        `whereIn memerlukan larik nilai.`
      );
    }
    this.daftarWhere.push({
      tipe: 'in',
      kolom,
      nilai: nilaiList,
      penghubung: 'AND',
    });
    return this;
  }

  public whereNotIn(kolom: string, nilaiList: any[]): this {
    validasiIdentifierSQL(kolom);
    if (!Array.isArray(nilaiList)) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
        `whereNotIn memerlukan larik nilai.`
      );
    }
    this.daftarWhere.push({
      tipe: 'not_in',
      kolom,
      nilai: nilaiList,
      penghubung: 'AND',
    });
    return this;
  }

  public whereNull(kolom: string): this {
    validasiIdentifierSQL(kolom);
    this.daftarWhere.push({
      tipe: 'null',
      kolom,
      penghubung: 'AND',
    });
    return this;
  }

  public whereNotNull(kolom: string): this {
    validasiIdentifierSQL(kolom);
    this.daftarWhere.push({
      tipe: 'not_null',
      kolom,
      penghubung: 'AND',
    });
    return this;
  }

  public whereBetween(kolom: string, awal: any, akhir: any): this {
    validasiIdentifierSQL(kolom);
    this.daftarWhere.push({
      tipe: 'between',
      kolom,
      nilai: [awal, akhir],
      penghubung: 'AND',
    });
    return this;
  }

  public join(
    tabel: string,
    kolomPertama: string,
    operator: string,
    kolomKedua: string
  ): this {
    return this.tambahJoin('INNER', tabel, kolomPertama, operator, kolomKedua);
  }

  public leftJoin(
    tabel: string,
    kolomPertama: string,
    operator: string,
    kolomKedua: string
  ): this {
    return this.tambahJoin('LEFT', tabel, kolomPertama, operator, kolomKedua);
  }

  private tambahJoin(
    jenis: 'INNER' | 'LEFT',
    tabel: string,
    kolomPertama: string,
    operator: string,
    kolomKedua: string
  ): this {
    validasiIdentifierSQL(tabel);
    validasiIdentifierSQL(kolomPertama);
    validasiIdentifierSQL(kolomKedua);

    if (operator !== '=' && operator !== '<>') {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        `Operator JOIN '${operator}' tidak didukung.`
      );
    }

    this.daftarJoin.push({
      jenis,
      tabel,
      kolomPertama,
      operator,
      kolomKedua,
    });
    return this;
  }

  public orderBy(kolom: string, arah: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC'): this {
    validasiIdentifierSQL(kolom);
    const arahBersih = arah.toUpperCase();
    if (arahBersih !== 'ASC' && arahBersih !== 'DESC') {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        `Arah pengurutan harus 'ASC' atau 'DESC', ditemukan: '${arah}'`
      );
    }
    this.daftarOrder.push({ kolom, arah: arahBersih });
    return this;
  }

  public limit(jumlah: number): this {
    if (!Number.isInteger(jumlah) || jumlah < 0) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
        `Limit harus berupa bilangan bulat non-negatif, ditemukan: ${jumlah}`
      );
    }
    this.jumlahLimit = jumlah;
    return this;
  }

  public offset(jumlah: number): this {
    if (!Number.isInteger(jumlah) || jumlah < 0) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
        `Offset harus berupa bilangan bulat non-negatif, ditemukan: ${jumlah}`
      );
    }
    this.jumlahOffset = jumlah;
    return this;
  }

  // ---------------------------------------------------------------------------
  // KOMPILASI SQL SELECT
  // ---------------------------------------------------------------------------

  public toSql(): { sql: string; parameter: TipeParameterSQL[] } {
    const parameter: TipeParameterSQL[] = [];
    const bagian: string[] = [];

    // SELECT
    const distinctStr = this.apakahDistinct ? 'DISTINCT ' : '';
    bagian.push(`SELECT ${distinctStr}${this.kolomDipilih.join(', ')}`);

    // FROM
    bagian.push(`FROM "${this.namaTabel}"`);

    // JOIN
    for (const j of this.daftarJoin) {
      const col1 = validasiIdentifierSQL(j.kolomPertama);
      const col2 = validasiIdentifierSQL(j.kolomKedua);
      bagian.push(`${j.jenis} JOIN "${j.tabel}" ON ${col1} ${j.operator} ${col2}`);
    }

    // WHERE
    const whereSql = this.bangunKlausulWhere(parameter);
    if (whereSql) {
      bagian.push(`WHERE ${whereSql}`);
    }

    // ORDER BY
    if (this.daftarOrder.length > 0) {
      const orders = this.daftarOrder.map(
        (o) => `${validasiIdentifierSQL(o.kolom)} ${o.arah}`
      );
      bagian.push(`ORDER BY ${orders.join(', ')}`);
    }

    // LIMIT & OFFSET
    if (this.jumlahLimit !== undefined) {
      bagian.push(`LIMIT ?`);
      parameter.push(this.jumlahLimit);
    }
    if (this.jumlahOffset !== undefined) {
      bagian.push(`OFFSET ?`);
      parameter.push(this.jumlahOffset);
    }

    return { sql: bagian.join(' '), parameter };
  }

  private bangunKlausulWhere(paramOut: TipeParameterSQL[]): string {
    if (this.daftarWhere.length === 0) return '';

    const hasil: string[] = [];
    for (let i = 0; i < this.daftarWhere.length; i++) {
      const w = this.daftarWhere[i];
      const prefix = i === 0 ? '' : `${w.penghubung} `;
      const col = validasiIdentifierSQL(w.kolom);

      switch (w.tipe) {
        case 'dasar':
          hasil.push(`${prefix}${col} ${w.operator} ?`);
          paramOut.push(this.normalisasiParameter(w.nilai));
          break;

        case 'null':
          hasil.push(`${prefix}${col} IS NULL`);
          break;

        case 'not_null':
          hasil.push(`${prefix}${col} IS NOT NULL`);
          break;

        case 'in':
        case 'not_in': {
          const negasi = w.tipe === 'not_in' ? 'NOT ' : '';
          const arr: any[] = Array.isArray(w.nilai) ? w.nilai : [];
          if (arr.length === 0) {
            // Larik kosong IN () adalah false, NOT IN () adalah true
            hasil.push(w.tipe === 'in' ? `${prefix}1 = 0` : `${prefix}1 = 1`);
          } else {
            const placeholders = arr.map(() => '?').join(', ');
            hasil.push(`${prefix}${col} ${negasi}IN (${placeholders})`);
            for (const val of arr) {
              paramOut.push(this.normalisasiParameter(val));
            }
          }
          break;
        }

        case 'between': {
          hasil.push(`${prefix}${col} BETWEEN ? AND ?`);
          paramOut.push(this.normalisasiParameter(w.nilai[0]));
          paramOut.push(this.normalisasiParameter(w.nilai[1]));
          break;
        }
      }
    }

    return hasil.join(' ');
  }

  private normalisasiParameter(v: any): TipeParameterSQL {
    if (v === undefined || v === null) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'bigint') return v;
    if (v instanceof Date) return v.toISOString();
    return JSON.stringify(v);
  }

  // ---------------------------------------------------------------------------
  // EKSEKUSI DATA (READ)
  // ---------------------------------------------------------------------------

  public get<T = Record<string, any>>(): T[] {
    const { sql, parameter } = this.toSql();
    return this.adaptor.ambilSemua<T>(sql, parameter);
  }

  public first<T = Record<string, any>>(): T | null {
    const klon = this.klon();
    klon.jumlahLimit = 1;
    const { sql, parameter } = klon.toSql();
    return this.adaptor.ambilSatu<T>(sql, parameter);
  }

  public count(kolom: string = '*'): number {
    const klon = this.klon();
    const idKolom = kolom === '*' ? '*' : validasiIdentifierSQL(kolom);
    klon.kolomDipilih = [`COUNT(${idKolom}) AS "total"`];
    klon.daftarOrder = [];
    klon.jumlahLimit = undefined;
    klon.jumlahOffset = undefined;

    const { sql, parameter } = klon.toSql();
    const hasil = this.adaptor.ambilSatu<{ total: number }>(sql, parameter);
    return hasil ? Number(hasil.total) : 0;
  }

  public exists(): boolean {
    return this.count() > 0;
  }

  public paginate<T = Record<string, any>>(
    halaman: number = 1,
    perHalaman: number = 10
  ): HasilPaginasi<T> {
    const hal = Math.max(1, Math.floor(halaman));
    const perHal = Math.max(1, Math.min(100, Math.floor(perHalaman)));
    const total = this.count();
    const totalHalaman = Math.max(1, Math.ceil(total / perHal));

    const offset = (hal - 1) * perHal;
    const klon = this.klon();
    klon.limit(perHal);
    klon.offset(offset);

    const data = klon.get<T>();

    return {
      data,
      total,
      halaman: hal,
      perHalaman: perHal,
      totalHalaman,
    };
  }

  // ---------------------------------------------------------------------------
  // EKSEKUSI DATA (WRITE / DML)
  // ---------------------------------------------------------------------------

  /**
   * Memasukkan baris baru (single atau batch).
   */
  public insert(
    data: Record<string, any> | Array<Record<string, any>>
  ): HasilEksekusiBasisdata {
    const dataList = Array.isArray(data) ? data : [data];
    if (dataList.length === 0) {
      return { barisTerpengaruh: 0, sukses: true };
    }

    const barisPertama = dataList[0];
    const kunci = Object.keys(barisPertama);
    if (kunci.length === 0) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
        `Data insert tidak boleh berupa objek kosong.`
      );
    }

    const kolomTervalidasi = kunci.map((k) => validasiIdentifierSQL(k));
    const placeholders = kunci.map(() => '?').join(', ');
    const sql = `INSERT INTO "${this.namaTabel}" (${kolomTervalidasi.join(', ')}) VALUES (${placeholders})`;

    let totalTerpengaruh = 0;
    let idTerakhir: number | bigint | undefined = undefined;

    for (const baris of dataList) {
      const parameter: TipeParameterSQL[] = kunci.map((k) =>
        this.normalisasiParameter(baris[k])
      );
      const hasil = this.adaptor.eksekusi(sql, parameter);
      totalTerpengaruh += hasil.barisTerpengaruh;
      idTerakhir = hasil.idTerakhir;
    }

    return {
      barisTerpengaruh: totalTerpengaruh,
      idTerakhir,
      sukses: true,
    };
  }

  /**
   * Memperbarui baris yang cocok dengan WHERE.
   * Melindungi dari update massal seluruh tabel tanpa WHERE kecuali `izinkanMassal: true`.
   */
  public update(
    data: Record<string, any>,
    opsi?: { izinkanMassal?: boolean }
  ): HasilEksekusiBasisdata {
    const kunci = Object.keys(data);
    if (kunci.length === 0) {
      return { barisTerpengaruh: 0, sukses: true };
    }

    if (this.daftarWhere.length === 0 && !opsi?.izinkanMassal) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        `Operasi update tanpa klausul WHERE diblokir untuk mencegah kerusakan data massal pada tabel '${this.namaTabel}'. Gunakan { izinkanMassal: true } jika memang sengaja.`
      );
    }

    const setClauses: string[] = [];
    const parameter: TipeParameterSQL[] = [];

    for (const k of kunci) {
      const col = validasiIdentifierSQL(k);
      setClauses.push(`${col} = ?`);
      parameter.push(this.normalisasiParameter(data[k]));
    }

    let sql = `UPDATE "${this.namaTabel}" SET ${setClauses.join(', ')}`;
    const whereSql = this.bangunKlausulWhere(parameter);
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    return this.adaptor.eksekusi(sql, parameter);
  }

  /**
   * Menghapus baris yang cocok dengan WHERE.
   * Melindungi dari delete massal seluruh tabel tanpa WHERE kecuali `izinkanMassal: true`.
   */
  public delete(opsi?: { izinkanMassal?: boolean }): HasilEksekusiBasisdata {
    if (this.daftarWhere.length === 0 && !opsi?.izinkanMassal) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.SINTAKS_SQL,
        `Operasi delete tanpa klausul WHERE diblokir untuk mencegah kehilangan seluruh data pada tabel '${this.namaTabel}'. Gunakan { izinkanMassal: true } jika memang sengaja.`
      );
    }

    const parameter: TipeParameterSQL[] = [];
    let sql = `DELETE FROM "${this.namaTabel}"`;
    const whereSql = this.bangunKlausulWhere(parameter);
    if (whereSql) {
      sql += ` WHERE ${whereSql}`;
    }

    return this.adaptor.eksekusi(sql, parameter);
  }

  private klon(): QueryBuilder {
    const k = new QueryBuilder(this.adaptor, this.namaTabel);
    k.kolomDipilih = [...this.kolomDipilih];
    k.apakahDistinct = this.apakahDistinct;
    k.daftarWhere = [...this.daftarWhere];
    k.daftarJoin = [...this.daftarJoin];
    k.daftarOrder = [...this.daftarOrder];
    k.jumlahLimit = this.jumlahLimit;
    k.jumlahOffset = this.jumlahOffset;
    return k;
  }
}
