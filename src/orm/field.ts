/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - ORM & Database Migration (Phase 32)
 * Definisi Field, Validator, dan Konversi Tipe Data.
 */

import { DefinisiField } from './types';
import { GalatBasisdata, JenisGalatBasisdata } from '../database/jenis';

export function kolomId(nama: string = 'id'): DefinisiField {
  return {
    nama,
    tipe: 'integer',
    primaryKey: true,
    autoincrement: true,
    nullable: false,
  };
}

export function kolomTeks(
  nama: string,
  opsi: {
    panjangMaksimal?: number;
    nullable?: boolean;
    default?: string;
    unique?: boolean;
    index?: boolean;
    validasi?: (nilai: any) => boolean | string;
  } = {}
): DefinisiField {
  return {
    nama,
    tipe: 'string',
    panjangMaksimal: opsi.panjangMaksimal,
    nullable: opsi.nullable ?? false,
    default: opsi.default,
    unique: opsi.unique,
    index: opsi.index,
    validasi: opsi.validasi,
  };
}

export function kolomTeksPanjang(
  nama: string,
  opsi: {
    nullable?: boolean;
    default?: string;
  } = {}
): DefinisiField {
  return {
    nama,
    tipe: 'text',
    nullable: opsi.nullable ?? true,
    default: opsi.default,
  };
}

export function kolomBilangan(
  nama: string,
  opsi: {
    nullable?: boolean;
    default?: number;
    unique?: boolean;
    index?: boolean;
    validasi?: (nilai: any) => boolean | string;
  } = {}
): DefinisiField {
  return {
    nama,
    tipe: 'integer',
    nullable: opsi.nullable ?? false,
    default: opsi.default,
    unique: opsi.unique,
    index: opsi.index,
    validasi: opsi.validasi,
  };
}

export function kolomDesimal(
  nama: string,
  opsi: {
    nullable?: boolean;
    default?: number;
    validasi?: (nilai: any) => boolean | string;
  } = {}
): DefinisiField {
  return {
    nama,
    tipe: 'float',
    nullable: opsi.nullable ?? false,
    default: opsi.default,
    validasi: opsi.validasi,
  };
}

export function kolomLogika(
  nama: string,
  opsi: {
    nullable?: boolean;
    default?: boolean;
  } = {}
): DefinisiField {
  return {
    nama,
    tipe: 'boolean',
    nullable: opsi.nullable ?? false,
    default: opsi.default ?? false,
  };
}

export function kolomWaktu(
  nama: string,
  opsi: {
    nullable?: boolean;
    default?: string;
    index?: boolean;
  } = {}
): DefinisiField {
  return {
    nama,
    tipe: 'datetime',
    nullable: opsi.nullable ?? true,
    default: opsi.default,
    index: opsi.index,
  };
}

export function kolomJSON(
  nama: string,
  opsi: {
    nullable?: boolean;
    default?: any;
  } = {}
): DefinisiField {
  return {
    nama,
    tipe: 'json',
    nullable: opsi.nullable ?? true,
    default: opsi.default,
  };
}

/**
 * Memvalidasi nilai berdasarkan definisi field sebelum disimpan ke basis data.
 */
export function validasiNilaiField(
  field: DefinisiField,
  nilai: any
): { valid: boolean; pesan?: string } {
  // 1. Cek nullability
  if (nilai === null || nilai === undefined) {
    if (!field.nullable && !field.primaryKey) {
      return {
        valid: false,
        pesan: `Kolom '${field.nama}' tidak boleh kosong (NOT NULL).`,
      };
    }
    return { valid: true };
  }

  // 2. Cek tipe data
  switch (field.tipe) {
    case 'string':
    case 'text':
      if (typeof nilai !== 'string') {
        return {
          valid: false,
          pesan: `Kolom '${field.nama}' harus bertipe teks, ditemukan: ${typeof nilai}`,
        };
      }
      if (field.panjangMaksimal && nilai.length > field.panjangMaksimal) {
        return {
          valid: false,
          pesan: `Panjang teks kolom '${field.nama}' melebihi batas maksimal (${nilai.length} > ${field.panjangMaksimal}).`,
        };
      }
      break;

    case 'integer':
      if (typeof nilai !== 'number' || !Number.isInteger(nilai)) {
        return {
          valid: false,
          pesan: `Kolom '${field.nama}' harus bertipe bilangan bulat, ditemukan: ${nilai}`,
        };
      }
      break;

    case 'float':
      if (typeof nilai !== 'number' || isNaN(nilai)) {
        return {
          valid: false,
          pesan: `Kolom '${field.nama}' harus bertipe angka/desimal, ditemukan: ${nilai}`,
        };
      }
      break;

    case 'boolean':
      if (typeof nilai !== 'boolean') {
        return {
          valid: false,
          pesan: `Kolom '${field.nama}' harus bertipe logika (boolean), ditemukan: ${typeof nilai}`,
        };
      }
      break;

    case 'datetime':
      if (typeof nilai === 'string') {
        if (isNaN(Date.parse(nilai))) {
          return {
            valid: false,
            pesan: `Kolom '${field.nama}' harus berformat tanggal/waktu yang valid: '${nilai}'`,
          };
        }
      } else if (!(nilai instanceof Date)) {
        return {
          valid: false,
          pesan: `Kolom '${field.nama}' harus bertipe waktu atau tanggal, ditemukan: ${typeof nilai}`,
        };
      }
      break;
  }

  // 3. Validator kustom jika ada
  if (field.validasi) {
    const hasil = field.validasi(nilai);
    if (typeof hasil === 'string') {
      return { valid: false, pesan: hasil };
    }
    if (!hasil) {
      return {
        valid: false,
        pesan: `Nilai '${nilai}' untuk kolom '${field.nama}' gagal lolos validasi kustom.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Melakukan type casting dari nilai basis data ke JavaScript native.
 */
export function konversiDariBasisdata(field: DefinisiField, nilai: any): any {
  if (nilai === null || nilai === undefined) {
    return null;
  }

  switch (field.tipe) {
    case 'boolean':
      return Boolean(nilai === 1 || nilai === '1' || nilai === true || nilai === 'true');
    case 'integer':
      return parseInt(String(nilai), 10);
    case 'float':
      return parseFloat(String(nilai));
    case 'json':
      if (typeof nilai === 'string') {
        try {
          return JSON.parse(nilai);
        } catch {
          return nilai;
        }
      }
      return nilai;
    case 'datetime':
      return typeof nilai === 'string' ? nilai : new Date(nilai).toISOString();
    default:
      return String(nilai);
  }
}
