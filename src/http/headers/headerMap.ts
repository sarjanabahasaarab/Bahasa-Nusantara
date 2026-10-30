/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Peta Header HTTP (Case-Insensitive & Validasi Header Injection)
 */

import { PetaHeaderInput, NilaiHeader } from '../types';
import { GalatHTTP } from '../errors/httpError';

export class PetaHeader {
  private readonly map: Map<string, string> = new Map();
  // Menyimpan casing asli untuk tampilan/inspeksi
  private readonly casingAsli: Map<string, string> = new Map();

  constructor(input?: PetaHeaderInput) {
    if (input) {
      this.tambahBanyak(input);
    }
  }

  /**
   * Menetapkan nilai header. Memvalidasi nama dan nilai terhadap CRLF injection.
   */
  public tetapkan(nama: string, nilai: NilaiHeader | NilaiHeader[]): this {
    const namaBersih = this.validasiNamaHeader(nama);
    const nilaiBersih = this.validasiNilaiHeader(nilai);

    const kunci = namaBersih.toLowerCase();
    this.map.set(kunci, nilaiBersih);
    this.casingAsli.set(kunci, namaBersih);
    return this;
  }

  /**
   * Menambahkan nilai ke header (menggabungkan dengan koma jika sudah ada).
   */
  public tambah(nama: string, nilai: NilaiHeader | NilaiHeader[]): this {
    const namaBersih = this.validasiNamaHeader(nama);
    const nilaiBersih = this.validasiNilaiHeader(nilai);

    const kunci = namaBersih.toLowerCase();
    const ada = this.map.get(kunci);
    if (ada !== undefined) {
      this.map.set(kunci, `${ada}, ${nilaiBersih}`);
    } else {
      this.map.set(kunci, nilaiBersih);
      this.casingAsli.set(kunci, namaBersih);
    }
    return this;
  }

  public ambil(nama: string): string | undefined {
    if (!nama) return undefined;
    return this.map.get(nama.trim().toLowerCase());
  }

  public dapatkan(nama: string): string | undefined {
    return this.ambil(nama);
  }

  public punya(nama: string): boolean {
    if (!nama) return false;
    return this.map.has(nama.trim().toLowerCase());
  }

  public memiliki(nama: string): boolean {
    return this.punya(nama);
  }

  public dapatkanSemua(nama: string): string[] {
    const val = this.ambil(nama);
    if (!val) return [];
    return val.split(',').map((s) => s.trim());
  }

  public entri(): Record<string, string> {
    return this.keObjek();
  }

  public hapus(nama: string): boolean {
    if (!nama) return false;
    const kunci = nama.trim().toLowerCase();
    this.casingAsli.delete(kunci);
    return this.map.delete(kunci);
  }

  public jumlah(): number {
    return this.map.size;
  }

  public bersihkan(): void {
    this.map.clear();
    this.casingAsli.clear();
  }

  public tambahBanyak(input: PetaHeaderInput): this {
    if (Array.isArray(input)) {
      for (const [k, v] of input) {
        this.tetapkan(k, v);
      }
    } else if (typeof input === 'object' && input !== null) {
      for (const [k, v] of Object.entries(input)) {
        this.tetapkan(k, v);
      }
    }
    return this;
  }

  public keObjek(): Record<string, string> {
    const hasil: Record<string, string> = {};
    for (const [kunci, nilai] of this.map.entries()) {
      const casing = this.casingAsli.get(kunci) || kunci;
      hasil[casing] = nilai;
    }
    return hasil;
  }

  public keMap(): Map<string, string> {
    return new Map(this.map);
  }

  public entries(): IterableIterator<[string, string]> {
    return this.map.entries();
  }

  private validasiNamaHeader(nama: string): string {
    if (!nama || typeof nama !== 'string' || !nama.trim()) {
      throw new GalatHTTP("Nama header HTTP wajib berupa string non-kosong.", 'HEADER_TIDAK_VALID');
    }
    const bersih = nama.trim();
    // Karakter dilarang: control chars, spasi, CRLF
    if (/[\r\n\t\0 ]/.test(bersih) || !/^[A-Za-z0-9\-_]+$/.test(bersih)) {
      throw new GalatHTTP(
        `Nama header '${bersih}' tidak valid (mengandung karakter terlarang atau CRLF).`,
        'HEADER_TIDAK_VALID'
      );
    }
    return bersih;
  }

  private validasiNilaiHeader(nilai: NilaiHeader | NilaiHeader[]): string {
    if (nilai === undefined || nilai === null) {
      return '';
    }

    const str = Array.isArray(nilai)
      ? nilai.map((v) => String(v)).join(', ')
      : String(nilai);

    // Mencegah HTTP Response Splitting / Header Injection
    if (/[\r\n]/.test(str)) {
      throw new GalatHTTP(
        "Nilai header mengandung karakter CRLF (\\r atau \\n) yang berpotensi menyebabkan injeksi header.",
        'HEADER_INJECTION_DETECTED'
      );
    }

    return str;
  }
}

export { PetaHeader as PetaHeaderHTTP };
