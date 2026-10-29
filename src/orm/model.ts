/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Mesin Model Database & Object-Relational Mapping (ORM).
 */

import {
  KonfigurasiModel,
  KelasModel,
  InstansiModel,
  EntitasModel,
} from './types';
import { AdaptorBasisdata, GalatBasisdata, JenisGalatBasisdata } from '../database/jenis';
import { QueryBuilder } from '../database/queryBuilder';
import { validasiNilaiField, konversiDariBasisdata } from './field';
import { muatRelasiUntukInstansi } from './relasi';

let _adaptorGlobal: AdaptorBasisdata | null = null;

export function tetapkanAdaptorGlobalORM(adaptor: AdaptorBasisdata): void {
  _adaptorGlobal = adaptor;
}

export function dapatkanAdaptorGlobalORM(): AdaptorBasisdata | null {
  return _adaptorGlobal;
}

/**
 * Membuat Kelas Model baru yang terikat pada tabel dan konfigurasi tertentu.
 */
export function definisiModel<T extends EntitasModel = any>(
  konfigurasi: KonfigurasiModel
): KelasModel<T> {
  const pk = konfigurasi.primaryKey || 'id';
  const namaDibuat = konfigurasi.namaDibuatPada || 'dibuat_pada';
  const namaDiperbarui = konfigurasi.namaDiperbaruiPada || 'diperbarui_pada';
  const pakaiTimestamps = konfigurasi.timestamps !== false;

  let localAdaptor = konfigurasi.adaptor || null;

  function dapatkanAdaptorAktif(): AdaptorBasisdata {
    const a = localAdaptor || _adaptorGlobal;
    if (!a) {
      throw new GalatBasisdata(
        JenisGalatBasisdata.KONEKSI_GAGAL,
        `Tidak ada koneksi basis data aktif untuk model '${konfigurasi.namaTabel}'. Tetapkan adaptor menggunakan model.tetapkanAdaptor(koneksi) atau tetapkanAdaptorGlobalORM(koneksi).`
      );
    }
    return a;
  }

  class InstansiModelImpl implements InstansiModel<T> {
    private _data: Record<string, any> = {};
    private _asli: Record<string, any> = {};
    private _apakahBaru: boolean = true;

    constructor(dataAwal: Record<string, any> = {}, apakahBaru: boolean = true) {
      this._apakahBaru = apakahBaru;

      // Inisialisasi default dari konfigurasi field
      for (const [namaKolom, f] of Object.entries(konfigurasi.fields)) {
        if (f.default !== undefined) {
          this._data[namaKolom] = typeof f.default === 'function' ? f.default() : f.default;
        }
      }

      // Terapkan data yang diberikan
      for (const [k, v] of Object.entries(dataAwal)) {
        const fieldDef = konfigurasi.fields[k];
        if (fieldDef && !apakahBaru) {
          this._data[k] = konversiDariBasisdata(fieldDef, v);
        } else {
          this._data[k] = v;
        }
      }

      this._asli = { ...this._data };

      // Return a Proxy agar properti dapat diakses langsung (misal: user.nama)
      return new Proxy(this, {
        get(target, prop, receiver) {
          if (typeof prop === 'string') {
            if (prop in target) {
              const val = (target as any)[prop];
              return typeof val === 'function' ? val.bind(target) : val;
            }
            if (prop in target._data) {
              return target._data[prop];
            }
          }
          return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value, receiver) {
          if (typeof prop === 'string') {
            if (prop in target) {
              return Reflect.set(target, prop, value, receiver);
            }
            target.tetapkan(prop, value);
            return true;
          }
          return Reflect.set(target, prop, value, receiver);
        },
      });
    }

    public get id(): any {
      return this._data[pk];
    }

    public set id(val: any) {
      this._data[pk] = val;
    }

    public apakahBaru(): boolean {
      return this._apakahBaru;
    }

    public dapatkan(kunci: string): any {
      return this._data[kunci];
    }

    public tetapkan(kunci: string, nilai: any): this {
      this._data[kunci] = nilai;
      return this;
    }

    public keObjek(): T {
      return { ...this._data } as T;
    }

    public keJSON(): string {
      return JSON.stringify(this._data);
    }

    /**
     * Memuat relasi terdefinisi pada model.
     */
    public muat(namaRelasi: string): any {
      const relasi = konfigurasi.relasi?.[namaRelasi];
      if (!relasi) {
        throw new GalatBasisdata(
          JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
          `Relasi '${namaRelasi}' tidak terdefinisi pada model '${konfigurasi.namaTabel}'.`
        );
      }
      return muatRelasiUntukInstansi(this, relasi);
    }

    /**
     * Menyimpan perubahan ke basis data (INSERT jika baru, UPDATE jika sudah ada).
     */
    public simpan(): boolean {
      const adaptor = dapatkanAdaptorAktif();
      const sekarang = new Date().toISOString();

      // 1. Validasi field
      for (const [namaKolom, def] of Object.entries(konfigurasi.fields)) {
        const val = this._data[namaKolom];
        const res = validasiNilaiField(def, val);
        if (!res.valid) {
          throw new GalatBasisdata(
            JenisGalatBasisdata.PARAMETER_TIDAK_VALID,
            `Validasi gagal pada model '${konfigurasi.namaTabel}': ${res.pesan}`
          );
        }
      }

      if (this._apakahBaru) {
        // Mode INSERT
        if (pakaiTimestamps) {
          if (!this._data[namaDibuat]) this._data[namaDibuat] = sekarang;
          if (!this._data[namaDiperbarui]) this._data[namaDiperbarui] = sekarang;
        }

        const dataInsert = { ...this._data };
        // Jangan sertakan primary key jika belum diisi (autoincrement)
        if (dataInsert[pk] === undefined || dataInsert[pk] === null) {
          delete dataInsert[pk];
        }

        const qb = new QueryBuilder(adaptor, konfigurasi.namaTabel);
        const hasil = qb.insert(dataInsert);

        if (hasil.idTerakhir !== undefined && hasil.idTerakhir !== null) {
          this._data[pk] = Number(hasil.idTerakhir);
        }

        this._apakahBaru = false;
        this._asli = { ...this._data };
        return true;
      } else {
        // Mode UPDATE
        if (pakaiTimestamps) {
          this._data[namaDiperbarui] = sekarang;
        }

        // Cari field yang berubah (dirty check)
        const diubah: Record<string, any> = {};
        for (const [k, v] of Object.entries(this._data)) {
          if (k !== pk && v !== this._asli[k]) {
            diubah[k] = v;
          }
        }

        if (Object.keys(diubah).length === 0) {
          return true; // Tidak ada yang berubah
        }

        const qb = new QueryBuilder(adaptor, konfigurasi.namaTabel);
        qb.where(pk, this._data[pk]).update(diubah);

        this._asli = { ...this._data };
        return true;
      }
    }

    /**
     * Menghapus entitas ini dari basis data.
     */
    public hapus(): boolean {
      if (this._apakahBaru || this._data[pk] === undefined || this._data[pk] === null) {
        return false;
      }

      const adaptor = dapatkanAdaptorAktif();
      const qb = new QueryBuilder(adaptor, konfigurasi.namaTabel);
      qb.where(pk, this._data[pk]).delete();
      this._apakahBaru = true;
      return true;
    }
  }

  const ModelStatik: KelasModel<T> = {
    namaTabel: konfigurasi.namaTabel,
    primaryKey: pk,
    konfigurasi,

    tetapkanAdaptor(adaptor: AdaptorBasisdata): void {
      localAdaptor = adaptor;
    },

    dapatkanAdaptor(): AdaptorBasisdata {
      return dapatkanAdaptorAktif();
    },

    kueri(): QueryBuilder {
      return new QueryBuilder(dapatkanAdaptorAktif(), konfigurasi.namaTabel);
    },

    buat(data: Partial<T>): InstansiModel<T> {
      const instansi = new InstansiModelImpl(data as Record<string, any>, true);
      instansi.simpan();
      return instansi;
    },

    hidupkan(baris: Record<string, any>): InstansiModel<T> {
      return new InstansiModelImpl(baris, false);
    },

    temukan(id: any): InstansiModel<T> | null {
      const baris = this.kueri().where(pk, id).first();
      if (!baris) return null;
      return new InstansiModelImpl(baris, false);
    },

    temukanBerdasarkan(kolom: string, nilai: any): InstansiModel<T> | null {
      const baris = this.kueri().where(kolom, nilai).first();
      if (!baris) return null;
      return new InstansiModelImpl(baris, false);
    },

    semua(): InstansiModel<T>[] {
      const daftar = this.kueri().get();
      return daftar.map((d: any) => new InstansiModelImpl(d, false));
    },

    diMana(kolom: string, opAtauNilai: any, nilai?: any): QueryBuilder {
      return this.kueri().where(kolom, opAtauNilai, nilai);
    },

    hitung(kolom: string = '*'): number {
      return this.kueri().count(kolom);
    },

    ada(kondisi?: Record<string, any>): boolean {
      const qb = this.kueri();
      if (kondisi) {
        for (const [k, v] of Object.entries(kondisi)) {
          qb.where(k, v);
        }
      }
      return qb.exists();
    },

    halaman(
      hal: number = 1,
      perHal: number = 10
    ): {
      data: InstansiModel<T>[];
      total: number;
      halaman: number;
      perHalaman: number;
      totalHalaman: number;
    } {
      const res = this.kueri().paginate(hal, perHal);
      return {
        data: res.data.map((d: any) => new InstansiModelImpl(d, false)),
        total: res.total,
        halaman: res.halaman,
        perHalaman: res.perHalaman,
        totalHalaman: res.totalHalaman,
      };
    },
  };

  return ModelStatik;
}
