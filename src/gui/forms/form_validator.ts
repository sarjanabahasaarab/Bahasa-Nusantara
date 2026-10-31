/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Validator Formulir & Validasi Input GUI (Form Validation Engine)
 */

import { OpsiValidasiForm, HasilValidasiForm } from '../types';

export interface FieldFormTerdaftar {
  id: string;
  label: string;
  pengambilNilai: () => any;
  aturan: OpsiValidasiForm;
}

export class PengelolaFormGUI {
  private fields: Map<string, FieldFormTerdaftar> = new Map();
  private galatSaatIni: Map<string, string> = new Map();

  public daftarkanField(
    id: string,
    label: string,
    pengambilNilai: () => any,
    aturan: OpsiValidasiForm = {}
  ): this {
    this.fields.set(id, { id, label, pengambilNilai, aturan });
    return this;
  }

  public tambahAturan(id: string, aturan: OpsiValidasiForm, label: string = id): this {
    this.fields.set(id, {
      id,
      label,
      pengambilNilai: () => undefined,
      aturan,
    });
    return this;
  }

  public hapusField(id: string): boolean {
    this.galatSaatIni.delete(id);
    return this.fields.delete(id);
  }

  public validasi(dataMap?: Record<string, any>): HasilValidasiForm {
    this.galatSaatIni.clear();
    const daftarGalat: Array<{ idField: string; pesan: string }> = [];

    for (const [id, f] of this.fields.entries()) {
      const nilai = dataMap !== undefined ? dataMap[id] : f.pengambilNilai();
      const aturan = f.aturan;

      // 1. Validasi Wajib
      if (aturan.wajib) {
        if (nilai === undefined || nilai === null || (typeof nilai === 'string' && !nilai.trim())) {
          const pesan = aturan.pesanKustom || `${f.label} wajib diisi.`;
          this.galatSaatIni.set(id, pesan);
          daftarGalat.push({ idField: id, pesan });
          continue;
        }
      }

      // Jika kosong dan tidak wajib, lewati validasi selanjutnya
      if (nilai === undefined || nilai === null || (typeof nilai === 'string' && !nilai.trim())) {
        continue;
      }

      // 2. Validasi Panjang Teks
      if (typeof nilai === 'string') {
        if (aturan.panjangMin !== undefined && nilai.length < aturan.panjangMin) {
          const pesan = aturan.pesanKustom || `${f.label} minimal ${aturan.panjangMin} karakter.`;
          this.galatSaatIni.set(id, pesan);
          daftarGalat.push({ idField: id, pesan });
          continue;
        }
        if (aturan.panjangMaks !== undefined && nilai.length > aturan.panjangMaks) {
          const pesan = aturan.pesanKustom || `${f.label} maksimal ${aturan.panjangMaks} karakter.`;
          this.galatSaatIni.set(id, pesan);
          daftarGalat.push({ idField: id, pesan });
          continue;
        }
        if (aturan.polaRegex && !aturan.polaRegex.test(nilai)) {
          const pesan = aturan.pesanKustom || `Format ${f.label} tidak valid.`;
          this.galatSaatIni.set(id, pesan);
          daftarGalat.push({ idField: id, pesan });
          continue;
        }
      }

      // 3. Validasi Rentang Angka
      if (typeof nilai === 'number' || (!isNaN(Number(nilai)) && typeof nilai !== 'boolean')) {
        const num = Number(nilai);
        if (aturan.nilaiMin !== undefined && num < aturan.nilaiMin) {
          const pesan = aturan.pesanKustom || `${f.label} tidak boleh kurang dari ${aturan.nilaiMin}.`;
          this.galatSaatIni.set(id, pesan);
          daftarGalat.push({ idField: id, pesan });
          continue;
        }
        if (aturan.nilaiMaks !== undefined && num > aturan.nilaiMaks) {
          const pesan = aturan.pesanKustom || `${f.label} tidak boleh lebih dari ${aturan.nilaiMaks}.`;
          this.galatSaatIni.set(id, pesan);
          daftarGalat.push({ idField: id, pesan });
          continue;
        }
      }
    }

    return {
      sah: daftarGalat.length === 0,
      daftarGalat,
    };
  }

  public dapatkanGalat(id: string): string | undefined {
    return this.galatSaatIni.get(id);
  }

  public bersihkan(): void {
    this.fields.clear();
    this.galatSaatIni.clear();
  }
}
