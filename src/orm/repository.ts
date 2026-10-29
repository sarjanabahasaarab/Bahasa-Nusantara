/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Pola Repositori (Repository Pattern) untuk Entitas Model Database.
 */

import { KelasModel, InstansiModel, EntitasModel } from './types';
import { AdaptorBasisdata, GalatBasisdata, JenisGalatBasisdata } from '../database/jenis';

export type HookEntitas<T> = (data: Partial<T>) => void | Partial<T>;

export class RepositoriModel<T extends EntitasModel = any> {
  protected model: KelasModel<T>;
  protected daftarSebelumSimpan: HookEntitas<T>[] = [];
  protected daftarSetelahSimpan: ((instansi: InstansiModel<T>) => void)[] = [];
  protected daftarSebelumHapus: ((id: any) => void)[] = [];
  protected daftarSetelahHapus: ((id: any) => void)[] = [];

  constructor(model: KelasModel<T>) {
    this.model = model;
  }

  public dapatkanModel(): KelasModel<T> {
    return this.model;
  }

  public sebelumSimpan(fn: HookEntitas<T>): this {
    this.daftarSebelumSimpan.push(fn);
    return this;
  }

  public setelahSimpan(fn: (instansi: InstansiModel<T>) => void): this {
    this.daftarSetelahSimpan.push(fn);
    return this;
  }

  public sebelumHapus(fn: (id: any) => void): this {
    this.daftarSebelumHapus.push(fn);
    return this;
  }

  public setelahHapus(fn: (id: any) => void): this {
    this.daftarSetelahHapus.push(fn);
    return this;
  }

  public temukanSemua(filter?: Record<string, any>): InstansiModel<T>[] {
    const qb = this.model.kueri();
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        qb.where(k, v);
      }
    }
    const baris = qb.get();
    return baris.map((b: any) => this.model.hidupkan(b));
  }

  public temukanById(id: any): InstansiModel<T> | null {
    return this.model.temukan(id);
  }

  public simpan(data: Partial<T>): InstansiModel<T> {
    let payload = { ...data };
    for (const hook of this.daftarSebelumSimpan) {
      const res = hook(payload);
      if (res && typeof res === 'object') {
        payload = { ...payload, ...res };
      }
    }

    const instansi = this.model.buat(payload);

    for (const hook of this.daftarSetelahSimpan) {
      hook(instansi);
    }

    return instansi;
  }

  public perbarui(id: any, data: Partial<T>): InstansiModel<T> | null {
    const instansi = this.model.temukan(id);
    if (!instansi) return null;

    let payload = { ...data };
    for (const hook of this.daftarSebelumSimpan) {
      const res = hook(payload);
      if (res && typeof res === 'object') {
        payload = { ...payload, ...res };
      }
    }

    for (const [k, v] of Object.entries(payload)) {
      instansi.tetapkan(k, v);
    }
    instansi.simpan();

    for (const hook of this.daftarSetelahSimpan) {
      hook(instansi);
    }

    return instansi;
  }

  public hapus(id: any): boolean {
    const instansi = this.model.temukan(id);
    if (!instansi) return false;

    for (const hook of this.daftarSebelumHapus) {
      hook(id);
    }

    const hasil = instansi.hapus();

    if (hasil) {
      for (const hook of this.daftarSetelahHapus) {
        hook(id);
      }
    }

    return hasil;
  }

  public jalankanTransaksi<R>(aksi: (repo: this) => R): R {
    const adaptor = this.model.dapatkanAdaptor();
    adaptor.mulaiTransaksi();
    try {
      const hasil = aksi(this);
      adaptor.commit();
      return hasil;
    } catch (err) {
      adaptor.rollback();
      throw err;
    }
  }
}
