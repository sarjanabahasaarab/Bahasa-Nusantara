/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PosisiSumber, formatPosisi } from '../lexer/posisi';

export enum JenisGalatRuntime {
  VARIABEL_TIDAK_DITEMUKAN = 'VARIABEL_TIDAK_DITEMUKAN',
  FUNGSI_TIDAK_DITEMUKAN = 'FUNGSI_TIDAK_DITEMUKAN',
  PEMBAGIAN_NOL = 'PEMBAGIAN_NOL',
  PEMBAGIAN_DENGAN_NOL = 'PEMBAGIAN_DENGAN_NOL',
  OPERASI_TIPE_TIDAK_VALID = 'OPERASI_TIPE_TIDAK_VALID',
  KONSTANTA_DIUBAH = 'KONSTANTA_DIUBAH',
  ARGUMEN_FUNGSI_TIDAK_SESUAI = 'ARGUMEN_FUNGSI_TIDAK_SESUAI',
  ARGUMEN_TIDAK_VALID = 'ARGUMEN_TIDAK_VALID',
  KETIDAKCOCOKAN_TIPE = 'KETIDAKCOCOKAN_TIPE',
  SINTAKS_TIDAK_VALID = 'SINTAKS_TIDAK_VALID',
  INTERNAL = 'INTERNAL',
  KENDALI_DI_LUAR_KONTEKS = 'KENDALI_DI_LUAR_KONTEKS',
  BATAS_ITERASI_TERLAMPAUI = 'BATAS_ITERASI_TERLAMPAUI',
  BATAS_INDEKS_TERLAMPAUI = 'BATAS_INDEKS_TERLAMPAUI',
  KUNCI_TIDAK_DITEMUKAN = 'KUNCI_TIDAK_DITEMUKAN',
  TIPE_BUKAN_KOLEKSI = 'TIPE_BUKAN_KOLEKSI',
  MODUL_TIDAK_DITEMUKAN = 'MODUL_TIDAK_DITEMUKAN',
  KETERGANTUNGAN_MELINGKAR = 'KETERGANTUNGAN_MELINGKAR',
  ANGGOTA_MODUL_TIDAK_DITEMUKAN = 'ANGGOTA_MODUL_TIDAK_DITEMUKAN',
  JALUR_MODUL_TIDAK_AMAN = 'JALUR_MODUL_TIDAK_AMAN',
}

export interface BingkaiTumpukan {
  namaKonteks: string;
  posisi?: PosisiSumber;
  namaModul?: string;
  berkas?: string;
  namaPaket?: string;
  versiPaket?: string;
}

export class GalatRuntime extends Error {
  public readonly jenis: JenisGalatRuntime;
  public readonly posisi?: PosisiSumber;
  public readonly jejakTumpukan: BingkaiTumpukan[];
  public readonly namaModul?: string;

  constructor(
    jenis: JenisGalatRuntime,
    pesan: string,
    posisi?: PosisiSumber,
    jejakTumpukan: BingkaiTumpukan[] = [],
    namaModul?: string
  ) {
    let pesanBersih = pesan;
    if (pesanBersih.startsWith('Kesalahan runtime: ')) {
      pesanBersih = pesanBersih.slice(19);
    }
    let pesanLengkap: string;
    if (namaModul && posisi) {
      pesanLengkap = `Kesalahan runtime:\n\nModul: ${namaModul}\nBaris: ${posisi.baris}\nKolom: ${posisi.kolom}\n\n${pesanBersih}`;
    } else {
      const lokasiStr = posisi ? ` pada ${formatPosisi(posisi)}` : '';
      pesanLengkap = `Kesalahan runtime${lokasiStr}: ${pesanBersih}`;
    }
    super(pesanLengkap);
    this.name = 'GalatRuntime';
    this.jenis = jenis;
    this.posisi = posisi;
    this.jejakTumpukan = jejakTumpukan;
    this.namaModul = namaModul;
  }

  public cetakJejakLengkap(): string {
    let teks = this.message + '\n';
    if (this.jejakTumpukan.length > 0) {
      teks += 'Jejak Tumpukan (Stack Trace):\n';
      for (const bingkai of this.jejakTumpukan) {
        const modulStr = bingkai.namaModul ? ` [Modul: ${bingkai.namaModul}]` : '';
        const pos = bingkai.posisi ? ` — baris ${bingkai.posisi.baris}, kolom ${bingkai.posisi.kolom}` : '';
        teks += `  dalam ${bingkai.namaKonteks}${modulStr}${pos}\n`;
      }
    }
    return teks;
  }
}
