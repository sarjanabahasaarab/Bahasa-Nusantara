/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Schema Builder & Cetak Biru Tabel (Table Blueprint).
 */

import {
  DefinisiKolomSkema,
  IndeksSkema,
  KekanganKunciAsing,
} from './types';
import { validasiIdentifierSQL } from '../database/queryBuilder';
import { AdaptorBasisdata, GalatBasisdata, JenisGalatBasisdata } from '../database/jenis';

export class CetakBiruTabel {
  private namaTabel: string;
  private kolom: DefinisiKolomSkema[] = [];
  private kunciAsing: KekanganKunciAsing[] = [];
  private daftarIndeks: IndeksSkema[] = [];

  constructor(namaTabel: string) {
    validasiIdentifierSQL(namaTabel);
    this.namaTabel = namaTabel;
  }

  public id(nama: string = 'id'): this {
    validasiIdentifierSQL(nama);
    this.kolom.push({
      nama,
      tipeSQL: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      primaryKey: true,
      autoincrement: true,
      nullable: false,
    });
    return this;
  }

  public teks(nama: string, panjang?: number, opsi: { nullable?: boolean; default?: string; unique?: boolean } = {}): this {
    validasiIdentifierSQL(nama);
    this.kolom.push({
      nama,
      tipeSQL: panjang ? `VARCHAR(${panjang})` : 'TEXT',
      nullable: opsi.nullable ?? false,
      default: opsi.default,
      unique: opsi.unique,
    });
    return this;
  }

  public teksPanjang(nama: string, opsi: { nullable?: boolean; default?: string } = {}): this {
    return this.teks(nama, undefined, { ...opsi, nullable: opsi.nullable ?? true });
  }

  public bilangan(
    nama: string,
    opsi: { nullable?: boolean; default?: number; unique?: boolean } = {}
  ): this {
    validasiIdentifierSQL(nama);
    this.kolom.push({
      nama,
      tipeSQL: 'INTEGER',
      nullable: opsi.nullable ?? false,
      default: opsi.default,
      unique: opsi.unique,
    });
    return this;
  }

  public desimal(
    nama: string,
    opsi: { nullable?: boolean; default?: number } = {}
  ): this {
    validasiIdentifierSQL(nama);
    this.kolom.push({
      nama,
      tipeSQL: 'REAL',
      nullable: opsi.nullable ?? false,
      default: opsi.default,
    });
    return this;
  }

  public logika(
    nama: string,
    opsi: { nullable?: boolean; default?: boolean } = {}
  ): this {
    validasiIdentifierSQL(nama);
    this.kolom.push({
      nama,
      tipeSQL: 'INTEGER',
      nullable: opsi.nullable ?? false,
      default: opsi.default !== undefined ? (opsi.default ? 1 : 0) : 0,
    });
    return this;
  }

  public waktu(
    nama: string,
    opsi: { nullable?: boolean; default?: string } = {}
  ): this {
    validasiIdentifierSQL(nama);
    this.kolom.push({
      nama,
      tipeSQL: 'DATETIME',
      nullable: opsi.nullable ?? true,
      default: opsi.default,
    });
    return this;
  }

  public json(
    nama: string,
    opsi: { nullable?: boolean; default?: string } = {}
  ): this {
    validasiIdentifierSQL(nama);
    this.kolom.push({
      nama,
      tipeSQL: 'TEXT',
      nullable: opsi.nullable ?? true,
      default: opsi.default,
    });
    return this;
  }

  public stempelWaktu(
    namaDibuat: string = 'dibuat_pada',
    namaDiperbarui: string = 'diperbarui_pada'
  ): this {
    this.waktu(namaDibuat, { nullable: false, default: "CURRENT_TIMESTAMP" });
    this.waktu(namaDiperbarui, { nullable: false, default: "CURRENT_TIMESTAMP" });
    return this;
  }

  public relasiKunciAsing(
    kolom: string,
    tabelReferensi: string,
    kolomReferensi: string = 'id',
    opsi: {
      padaHapus?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
      padaPerbarui?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    } = {}
  ): this {
    validasiIdentifierSQL(kolom);
    validasiIdentifierSQL(tabelReferensi);
    validasiIdentifierSQL(kolomReferensi);

    this.kunciAsing.push({
      kolom,
      tabelReferensi,
      kolomReferensi,
      padaHapus: opsi.padaHapus || 'CASCADE',
      padaPerbarui: opsi.padaPerbarui || 'CASCADE',
    });
    return this;
  }

  public indeks(kolom: string | string[], namaIndeks?: string): this {
    const list = Array.isArray(kolom) ? kolom : [kolom];
    list.forEach((k) => validasiIdentifierSQL(k));
    const nama = namaIndeks || `idx_${this.namaTabel}_${list.join('_')}`;
    validasiIdentifierSQL(nama);
    this.daftarIndeks.push({ nama, kolom: list, unique: false });
    return this;
  }

  public unik(kolom: string | string[], namaIndeks?: string): this {
    const list = Array.isArray(kolom) ? kolom : [kolom];
    list.forEach((k) => validasiIdentifierSQL(k));
    const nama = namaIndeks || `uniq_${this.namaTabel}_${list.join('_')}`;
    validasiIdentifierSQL(nama);
    this.daftarIndeks.push({ nama, kolom: list, unique: true });
    return this;
  }

  /**
   * Menghasilkan pernyataan SQL DDL lengkap (CREATE TABLE dan CREATE INDEX).
   */
  public kompilasiDDL(): string[] {
    const hasil: string[] = [];
    const definisiKolomDanKekangan: string[] = [];

    for (const c of this.kolom) {
      const bagian: string[] = [`"${c.nama}" ${c.tipeSQL}`];

      if (c.primaryKey && c.autoincrement) {
        // Tipe SQL sudah memuat PRIMARY KEY AUTOINCREMENT
      } else {
        if (!c.nullable) {
          bagian.push('NOT NULL');
        }
        if (c.unique) {
          bagian.push('UNIQUE');
        }
        if (c.default !== undefined) {
          if (typeof c.default === 'string' && c.default === 'CURRENT_TIMESTAMP') {
            bagian.push('DEFAULT CURRENT_TIMESTAMP');
          } else if (typeof c.default === 'string') {
            bagian.push(`DEFAULT '${c.default.replace(/'/g, "''")}'`);
          } else if (typeof c.default === 'number') {
            bagian.push(`DEFAULT ${c.default}`);
          } else {
            bagian.push(`DEFAULT '${String(c.default)}'`);
          }
        }
      }

      definisiKolomDanKekangan.push(bagian.join(' '));
    }

    // Kunci asing
    for (const fk of this.kunciAsing) {
      definisiKolomDanKekangan.push(
        `FOREIGN KEY ("${fk.kolom}") REFERENCES "${fk.tabelReferensi}" ("${fk.kolomReferensi}") ON DELETE ${fk.padaHapus} ON UPDATE ${fk.padaPerbarui}`
      );
    }

    const sqlTabel = `CREATE TABLE IF NOT EXISTS "${this.namaTabel}" (\n  ${definisiKolomDanKekangan.join(',\n  ')}\n);`;
    hasil.push(sqlTabel);

    // Indeks tambahan
    for (const idx of this.daftarIndeks) {
      const uniqueStr = idx.unique ? 'UNIQUE ' : '';
      const cols = idx.kolom.map((c) => `"${c}"`).join(', ');
      hasil.push(
        `CREATE ${uniqueStr}INDEX IF NOT EXISTS "${idx.nama}" ON "${this.namaTabel}" (${cols});`
      );
    }

    return hasil;
  }
}

/**
 * Pembangun Skema (SchemaBuilder) untuk operasi DDL pada basis data.
 */
export class SchemaBuilder {
  private adaptor: AdaptorBasisdata;

  constructor(adaptor: AdaptorBasisdata) {
    this.adaptor = adaptor;
  }

  /**
   * Membuat tabel baru jika belum ada.
   */
  public buatTabel(
    namaTabel: string,
    definisi: (cetakBiru: CetakBiruTabel) => void
  ): void {
    const cetakBiru = new CetakBiruTabel(namaTabel);
    definisi(cetakBiru);
    const pernyataanSql = cetakBiru.kompilasiDDL();

    for (const sql of pernyataanSql) {
      this.adaptor.eksekusi(sql);
    }
  }

  /**
   * Menghapus tabel jika ada.
   */
  public hapusTabel(namaTabel: string, jikaAda: boolean = true): void {
    validasiIdentifierSQL(namaTabel);
    const jikaAdaStr = jikaAda ? 'IF EXISTS ' : '';
    this.adaptor.eksekusi(`DROP TABLE ${jikaAdaStr}"${namaTabel}";`);
  }

  /**
   * Menghapus indeks jika ada.
   */
  public hapusIndeks(namaIndeks: string, jikaAda: boolean = true): void {
    validasiIdentifierSQL(namaIndeks);
    const jikaAdaStr = jikaAda ? 'IF EXISTS ' : '';
    this.adaptor.eksekusi(`DROP INDEX ${jikaAdaStr}"${namaIndeks}";`);
  }

  /**
   * Memeriksa apakah sebuah tabel ada di database.
   */
  public apakahTabelAda(namaTabel: string): boolean {
    validasiIdentifierSQL(namaTabel);
    const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    const hasil = this.adaptor.ambilSatu(sql, [namaTabel]);
    return hasil !== null;
  }

  /**
   * Menambahkan kolom baru ke tabel yang sudah ada (ALTER TABLE ADD COLUMN).
   */
  public tambahKolom(
    namaTabel: string,
    namaKolom: string,
    tipeSQL: string,
    opsi: { nullable?: boolean; default?: any } = {}
  ): void {
    validasiIdentifierSQL(namaTabel);
    validasiIdentifierSQL(namaKolom);

    const parts: string[] = [`ALTER TABLE "${namaTabel}" ADD COLUMN "${namaKolom}" ${tipeSQL}`];
    if (!opsi.nullable && opsi.default !== undefined) {
      parts.push('NOT NULL');
      if (typeof opsi.default === 'string') {
        parts.push(`DEFAULT '${opsi.default.replace(/'/g, "''")}'`);
      } else {
        parts.push(`DEFAULT ${opsi.default}`);
      }
    }
    this.adaptor.eksekusi(parts.join(' ') + ';');
  }
}
