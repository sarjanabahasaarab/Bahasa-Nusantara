/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Siklus Hidup Aplikasi GUI (Application Lifecycle Management)
 */

export enum StatusAplikasi {
  DIBUAT = 'DIBUAT',
  MEMULAI = 'MEMULAI',
  BERJALAN = 'BERJALAN',
  BERHENTI = 'BERHENTI',
  DIHANCURKAN = 'DIHANCURKAN',
}

export type HookLifecycle = () => void | Promise<void>;
export type HookGalatLifecycle = (galat: Error) => void | Promise<void>;

export class PengelolaLifecycle {
  private status: StatusAplikasi = StatusAplikasi.DIBUAT;
  private kaitInisialisasi: HookLifecycle[] = [];
  private kaitMulai: HookLifecycle[] = [];
  private kaitBerhenti: HookLifecycle[] = [];
  private kaitHancur: HookLifecycle[] = [];
  private kaitGalat: HookGalatLifecycle[] = [];

  public getStatus(): StatusAplikasi {
    return this.status;
  }

  public onInisialisasi(fn: HookLifecycle): () => void {
    this.kaitInisialisasi.push(fn);
    return () => {
      const idx = this.kaitInisialisasi.indexOf(fn);
      if (idx !== -1) this.kaitInisialisasi.splice(idx, 1);
    };
  }

  public onMulai(fn: HookLifecycle): () => void {
    this.kaitMulai.push(fn);
    return () => {
      const idx = this.kaitMulai.indexOf(fn);
      if (idx !== -1) this.kaitMulai.splice(idx, 1);
    };
  }

  public onBerhenti(fn: HookLifecycle): () => void {
    this.kaitBerhenti.push(fn);
    return () => {
      const idx = this.kaitBerhenti.indexOf(fn);
      if (idx !== -1) this.kaitBerhenti.splice(idx, 1);
    };
  }

  public onHancur(fn: HookLifecycle): () => void {
    this.kaitHancur.push(fn);
    return () => {
      const idx = this.kaitHancur.indexOf(fn);
      if (idx !== -1) this.kaitHancur.splice(idx, 1);
    };
  }

  public onGalat(fn: HookGalatLifecycle): () => void {
    this.kaitGalat.push(fn);
    return () => {
      const idx = this.kaitGalat.indexOf(fn);
      if (idx !== -1) this.kaitGalat.splice(idx, 1);
    };
  }

  public async transisiKe(statusBaru: StatusAplikasi): Promise<void> {
    const statusLama = this.status;
    this.status = statusBaru;

    try {
      if (statusBaru === StatusAplikasi.MEMULAI) {
        for (const hook of this.kaitInisialisasi) {
          await hook();
        }
      } else if (statusBaru === StatusAplikasi.BERJALAN) {
        for (const hook of this.kaitMulai) {
          await hook();
        }
      } else if (statusBaru === StatusAplikasi.BERHENTI) {
        for (const hook of this.kaitBerhenti) {
          await hook();
        }
      } else if (statusBaru === StatusAplikasi.DIHANCURKAN) {
        for (const hook of this.kaitHancur) {
          await hook();
        }
        this.kaitInisialisasi = [];
        this.kaitMulai = [];
        this.kaitBerhenti = [];
        this.kaitHancur = [];
        this.kaitGalat = [];
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      for (const hook of this.kaitGalat) {
        try {
          await hook(errorObj);
        } catch {
          // Cegah cascade error
        }
      }
      throw errorObj;
    }
  }
}
