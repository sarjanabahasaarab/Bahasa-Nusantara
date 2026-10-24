/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArsipPaketData } from '../arsip';

/**
 * Metadata detail per versi rilis paket di dalam registri.
 */
export interface MetadataVersiPaket {
  versi: string;
  checksum: string;
  dependensi: Record<string, string>;
  diterbitkanPada: string;
  ukuranByte: number;
  namaBerkasArsip: string;
  penulis?: string | string[];
  lisensi?: string;
  deskripsi?: string;
}

/**
 * Metadata publik lengkap sebuah paket yang terdaftar di Registri NUSANTARA.
 */
export interface MetadataPaketRegistri {
  nama: string;
  deskripsi: string;
  lisensi: string;
  versiTerbaru: string;
  daftarVersi: Record<string, MetadataVersiPaket>;
  penulis?: string | string[];
  pemilik?: string[];
  repository?: string;
  homepage?: string;
  kata_kunci?: string[];
  waktuDibuat: string;
  waktuDiperbarui: string;
}

/**
 * Hasil kueri pencarian paket di registri.
 */
export interface HasilPencarianPaket {
  nama: string;
  versi: string;
  deskripsi: string;
  lisensi: string;
  penulis?: string | string[];
  kata_kunci?: string[];
  skorRelevansi: number;
}

/**
 * Laporan hasil publikasi paket ke registri.
 */
export interface HasilPenerbitanPaket {
  sukses: boolean;
  nama: string;
  versi: string;
  checksum: string;
  pesan: string;
  jalurArsip?: string;
}

/**
 * Kesalahan yang dilempar saat mencoba menerbitkan versi yang sudah pernah ada (Prinsip Kekekalan/Immutability).
 */
export class GalatImmutabilitasPaket extends Error {
  public readonly namaPaket: string;
  public readonly versi: string;

  constructor(namaPaket: string, versi: string) {
    super(
      `Pelanggaran Immutabilitas Registri: Paket '${namaPaket}' versi '${versi}' sudah pernah diterbitkan.\nSetiap rilis versi bersifat kekal (immutable) dan tidak dapat ditimpa atau diubah isinya.\nSilakan naikkan versi (misal: patch/minor) di 'nusantara.toml' untuk menerbitkan pembaruan.`
    );
    this.name = 'GalatImmutabilitasPaket';
    this.namaPaket = namaPaket;
    this.versi = versi;
  }
}

/**
 * Kesalahan umum registri paket.
 */
export class GalatRegistri extends Error {
  constructor(pesan: string) {
    super(`Kesalahan Registri Paket NUSANTARA:\n${pesan}`);
    this.name = 'GalatRegistri';
  }
}

/**
 * Kontrak Antarmuka Registri Paket Resmi NUSANTARA (Phase 22).
 * Diimplementasikan oleh LocalRegistry dan RemoteRegistry.
 */
export interface AntarmukaRegistri {
  readonly nama: string;

  dapatkanMetadata(nama: string): Promise<MetadataPaketRegistri | null> | (MetadataPaketRegistri | null);

  dapatkanVersi(
    nama: string,
    versi: string
  ): Promise<MetadataVersiPaket | null> | (MetadataVersiPaket | null);

  cari(kueri: string): Promise<HasilPencarianPaket[]> | HasilPencarianPaket[];

  terbitkan(
    arsip: ArsipPaketData,
    opsi?: { token?: string }
  ): Promise<HasilPenerbitanPaket> | HasilPenerbitanPaket;

  unduh(nama: string, versi: string): Promise<ArsipPaketData> | ArsipPaketData;

  verifikasiIntegritas(arsip: ArsipPaketData, checksumDiharapkan: string): boolean;

  daftarSemuaPaket?(): Promise<string[]> | string[];
}
