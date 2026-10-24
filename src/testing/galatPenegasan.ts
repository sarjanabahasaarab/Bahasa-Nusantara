/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber } from '../lexer/posisi';
import { KodeGalat } from '../diagnostik/kode';
import { Diagnostik, KategoriDiagnostik, TingkatDiagnostik } from '../diagnostik/jenis';

export interface OpsiGalatPenegasan {
  pesan?: string;
  lokasi?: { berkas?: string; namaBerkas?: string; baris: number; kolom: number };
  diharapkan?: any;
  ditemukan?: any;
  kodeGalat?: KodeGalat | string;
  kode?: KodeGalat | string;
  namaUji?: string;
  pesanKhusus?: string;
}

/**
 * Galat Penegasan Resmi (Assertion Error) Bahasa NUSANTARA (Phase 21).
 * Dilemparkan ketika kondisi penegasan dalam pengujian tidak terpenuhi.
 */
export class GalatPenegasan extends Error {
  public readonly namaUji?: string;
  public readonly diharapkan: any;
  public readonly ditemukan: any;
  public readonly pesanKhusus?: string;
  public readonly lokasi?: { berkas?: string; namaBerkas?: string; baris: number; kolom: number };
  public readonly kode: KodeGalat;
  public readonly kodeGalat: KodeGalat;

  constructor(
    pesanAtauOpsi: string | OpsiGalatPenegasan,
    diharapkan?: any,
    ditemukan?: any,
    opsi?: OpsiGalatPenegasan
  ) {
    let pesanStr = '';
    let exp: any = diharapkan;
    let act: any = ditemukan;
    let opt: OpsiGalatPenegasan | undefined = opsi;

    if (typeof pesanAtauOpsi === 'object' && pesanAtauOpsi !== null) {
      pesanStr = pesanAtauOpsi.pesan || 'Penegasan gagal';
      exp = pesanAtauOpsi.diharapkan;
      act = pesanAtauOpsi.ditemukan;
      opt = pesanAtauOpsi;
    } else {
      pesanStr = String(pesanAtauOpsi || 'Penegasan gagal');
    }

    super(pesanStr);
    this.name = 'GalatPenegasan';
    this.diharapkan = exp;
    this.ditemukan = act;
    this.namaUji = opt?.namaUji;
    this.lokasi = opt?.lokasi;
    this.pesanKhusus = opt?.pesanKhusus || opt?.pesan;
    const kodeAkhir = (opt?.kodeGalat || opt?.kode || KodeGalat.TST_PENEGASAN_GAGAL) as KodeGalat;
    this.kode = kodeAkhir;
    this.kodeGalat = kodeAkhir;

    Object.setPrototypeOf(this, GalatPenegasan.prototype);
  }

  /**
   * Menghasilkan teks laporan kegagalan uji berformat resmi Bahasa Indonesia.
   */
  public formatLaporanTeks(): string {
    const bagian: string[] = ['UJI GAGAL', ''];

    if (this.namaUji) {
      bagian.push('Nama:');
      bagian.push(`  ${this.namaUji}`);
      bagian.push('');
    }

    if (this.lokasi) {
      const namaBerkas = this.lokasi.berkas || this.lokasi.namaBerkas || 'uji.nusantara';
      bagian.push(`Lokasi: ${namaBerkas}:${this.lokasi.baris}:${this.lokasi.kolom}`);
      bagian.push('Lokasi:');
      bagian.push(`  ${namaBerkas}:${this.lokasi.baris}:${this.lokasi.kolom}`);
      bagian.push('');
    }

    if (this.diharapkan !== undefined) {
      bagian.push(`Diharapkan: ${this.formatNilai(this.diharapkan)}`);
      bagian.push('Diharapkan:');
      bagian.push(`  ${this.formatNilai(this.diharapkan)}`);
      bagian.push('');
    }

    if (this.ditemukan !== undefined) {
      bagian.push(`Ditemukan : ${this.formatNilai(this.ditemukan)}`);
      bagian.push('Ditemukan:');
      bagian.push(`  ${this.formatNilai(this.ditemukan)}`);
      bagian.push('');
    }

    bagian.push('Pesan:');
    bagian.push(`  ${this.pesanKhusus || this.message}`);

    return bagian.join('\n');
  }

  /**
   * Mengonversi galat penegasan menjadi Diagnostik Phase 18.
   */
  public keDiagnostik(): Diagnostik & { rentang: { awal: PosisiSumber; akhir: PosisiSumber } } {
    const baris = this.lokasi?.baris ?? 1;
    const kolom = this.lokasi?.kolom ?? 1;
    const namaBerkas = this.lokasi?.berkas || this.lokasi?.namaBerkas || 'uji.nusantara';

    return {
      kode: this.kode,
      kategori: KategoriDiagnostik.RUNTIME,
      tingkat: TingkatDiagnostik.KESALAHAN,
      pesan: this.pesanKhusus || this.message,
      lokasi: {
        berkas: namaBerkas,
        baris,
        kolom,
        panjang: 1,
      },
      rentang: {
        awal: { baris, kolom, indeks: 0 },
        akhir: { baris, kolom: kolom + 1, indeks: 1 },
      },
      saran: `Nilai yang diharapkan: ${this.formatNilai(this.diharapkan)}, tetapi ditemukan: ${this.formatNilai(this.ditemukan)}`,
      penyebabRinci: 'Pastikan nilai komputasi fungsi atau variabel sesuai dengan spesifikasi uji.',
    };
  }

  private formatNilai(v: any): string {
    if (v === null || v === undefined) return 'kosong';
    if (typeof v === 'boolean') return v ? 'benar' : 'salah';
    if (typeof v === 'string') return `"${v}"`;
    if (typeof v === 'object' && v.jenis) {
      return JSON.stringify(v);
    }
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
}
