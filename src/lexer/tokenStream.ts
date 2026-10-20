/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JenisToken, Token } from './jenisToken';
import { Lexer } from './lexer';

/**
 * Abstraksi Aliran Token (TokenStream) untuk konsumsi Parser pada Phase 7.
 * Menyediakan metode inspeksi, navigasi, dan pengintipan token tanpa mengubah struktur internal Lexer.
 */
export class TokenStream {
  private readonly daftarToken: Token[];
  private posisi: number = 0;

  constructor(token: Token[] | Lexer) {
    if (token instanceof Lexer) {
      this.daftarToken = token.tokenisasi().token;
    } else {
      this.daftarToken = token;
    }
  }

  /**
   * Mengambil token saat ini tanpa memajukan posisi kursor.
   */
  public current(): Token {
    if (this.posisi >= this.daftarToken.length) {
      return this.daftarToken[this.daftarToken.length - 1]; // Token EOF terakhir
    }
    return this.daftarToken[this.posisi];
  }

  /**
   * Mengintip token pada offset ke depan tanpa memajukan posisi kursor (default offset: 1).
   */
  public peek(offset: number = 1): Token {
    const target = this.posisi + offset;
    if (target >= this.daftarToken.length) {
      return this.daftarToken[this.daftarToken.length - 1]; // Token EOF terakhir
    }
    return this.daftarToken[target];
  }

  /**
   * Mengambil token sebelumnya yang baru saja dilewati (offset -1).
   */
  public previous(): Token {
    if (this.posisi === 0) {
      return this.daftarToken[0];
    }
    return this.daftarToken[this.posisi - 1];
  }

  /**
   * Mengambil token saat ini dan memajukan kursor ke token berikutnya.
   */
  public next(): Token {
    const tok = this.current();
    if (this.posisi < this.daftarToken.length - 1) {
      this.posisi++;
    }
    return tok;
  }

  /**
   * Memeriksa apakah token saat ini bertipe tertentu.
   */
  public is(jenis: JenisToken): boolean {
    return this.current().jenis === jenis;
  }

  /**
   * Memeriksa apakah kursor sudah mencapai akhir kode sumber (EOF).
   */
  public eof(): boolean {
    return this.current().jenis === JenisToken.EOF;
  }

  /**
   * Mengambil jumlah total token dalam aliran.
   */
  public get length(): number {
    return this.daftarToken.length;
  }

  /**
   * Mengambil array seluruh token (salinan).
   */
  public toArray(): Token[] {
    return [...this.daftarToken];
  }
}
