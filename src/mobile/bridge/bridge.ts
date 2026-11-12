/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Jembatan Komunikasi Platform Mobile Native (Mobile Native Bridge)
 */

import { PesanJembatanPermintaan, PesanJembatanRespon, PesanJembatanPeristiwa } from './messages';
import {
  GeneratorJembatanMobileNative,
  BundelKodeNativeMobile,
  DaftarKontrakBridge,
} from './native_codegen';
import { KonfigurasiAplikasiMobile } from '../types';

export type PenanganPanggilanNative = (argumen: any) => Promise<any> | any;
export type PenanganPeristiwaNative = (peristiwa: PesanJembatanPeristiwa) => void;

export interface TransportJembatanNative {
  readonly namaTransport: string;
  kirimKeNative(permintaan: PesanJembatanPermintaan): Promise<PesanJembatanRespon>;
}

let counterIdPesan = 0;

export class JembatanMobileNative {
  private static instance: JembatanMobileNative;
  private modulTerdaftar: Map<string, Map<string, PenanganPanggilanNative>> = new Map();
  private pendengarPeristiwa: Map<string, Set<PenanganPeristiwaNative>> = new Map();
  private riwayatPesan: Array<PesanJembatanPermintaan | PesanJembatanRespon> = [];
  private transportEksternal: TransportJembatanNative | null = null;

  private constructor() {
    this.inisialisasiModulBawaan();
  }

  public static dapatkanInstance(): JembatanMobileNative {
    if (!JembatanMobileNative.instance) {
      JembatanMobileNative.instance = new JembatanMobileNative();
    }
    return JembatanMobileNative.instance;
  }

  public pasangTransport(transport: TransportJembatanNative | null): void {
    this.transportEksternal = transport;
  }

  public dapatkanNamaTransport(): string {
    return this.transportEksternal?.namaTransport || 'in-memory-bridge';
  }

  public daftarSemuaMetode(): DaftarKontrakBridge[] {
    const out: DaftarKontrakBridge[] = [];
    for (const [modul, metodeMap] of this.modulTerdaftar.entries()) {
      out.push({ modul, metode: Array.from(metodeMap.keys()) });
    }
    return out;
  }

  public hasilkanBindingNative(konfig: KonfigurasiAplikasiMobile): BundelKodeNativeMobile {
    return GeneratorJembatanMobileNative.buatBundelLengkap(konfig, this.daftarSemuaMetode());
  }

  public daftarkanMetode(modul: string, metode: string, penangan: PenanganPanggilanNative): void {
    if (!this.modulTerdaftar.has(modul)) {
      this.modulTerdaftar.set(modul, new Map());
    }
    this.modulTerdaftar.get(modul)!.set(metode, penangan);
  }

  public async panggilNative<TRes = any, TArg = any>(
    modul: string,
    metode: string,
    argumen?: TArg
  ): Promise<TRes> {
    counterIdPesan++;
    const id = `jembatan_${Date.now()}_${counterIdPesan}`;

    const permintaan: PesanJembatanPermintaan = {
      id,
      modul,
      metode,
      argumen,
      stempelWaktu: Date.now(),
    };
    this.riwayatPesan.push(permintaan);

    if (this.transportEksternal) {
      const res = await this.transportEksternal.kirimKeNative(permintaan);
      this.riwayatPesan.push(res);
      if (!res.sukses) {
        throw new Error(res.pesanKesalahan || `Kesalahan transport native '${this.transportEksternal.namaTransport}'`);
      }
      return res.data as TRes;
    }

    // Periksa apakah handler lokal terdaftar
    const modulHandlers = this.modulTerdaftar.get(modul);
    const handler = modulHandlers?.get(metode);

    if (!handler) {
      const errRes: PesanJembatanRespon = {
        id,
        sukses: false,
        pesanKesalahan: `Metode '${metode}' pada modul native '${modul}' belum diimplementasikan.`,
        kodeKesalahan: 'METODE_TIDAK_DITEMUKAN',
        stempelWaktu: Date.now(),
      };
      this.riwayatPesan.push(errRes);
      throw new Error(errRes.pesanKesalahan);
    }

    try {
      const hasil = await handler(argumen);
      const res: PesanJembatanRespon = {
        id,
        sukses: true,
        data: hasil,
        stempelWaktu: Date.now(),
      };
      this.riwayatPesan.push(res);
      return hasil as TRes;
    } catch (err: any) {
      const errRes: PesanJembatanRespon = {
        id,
        sukses: false,
        pesanKesalahan: err?.message || 'Kesalahan native tidak diketahui',
        kodeKesalahan: 'KESALAHAN_EKSEKUSI_NATIVE',
        stempelWaktu: Date.now(),
      };
      this.riwayatPesan.push(errRes);
      throw err;
    }
  }

  public langgananPeristiwa(saluran: string, penangan: PenanganPeristiwaNative): () => void {
    if (!this.pendengarPeristiwa.has(saluran)) {
      this.pendengarPeristiwa.set(saluran, new Set());
    }
    this.pendengarPeristiwa.get(saluran)!.add(penangan);

    return () => {
      const set = this.pendengarPeristiwa.get(saluran);
      if (set) {
        set.delete(penangan);
      }
    };
  }

  public kirimPeristiwaDariNative(peristiwa: PesanJembatanPeristiwa): void {
    const pendengar = this.pendengarPeristiwa.get(peristiwa.saluran);
    if (pendengar) {
      for (const p of pendengar) {
        try {
          p(peristiwa);
        } catch (e) {
          console.error('[JembatanNative] Gagal mengeksekusi pendengar peristiwa:', e);
        }
      }
    }
  }

  public dapatkanRiwayatPesan(): Array<PesanJembatanPermintaan | PesanJembatanRespon> {
    return [...this.riwayatPesan];
  }

  public bersihkanRiwayat(): void {
    this.riwayatPesan = [];
  }

  private inisialisasiModulBawaan(): void {
    // Modul 'perangkat'
    this.daftarkanMetode('perangkat', 'ping', () => 'pong');
    this.daftarkanMetode('perangkat', 'dapatkanWaktuSistem', () => Date.now());
  }
}
