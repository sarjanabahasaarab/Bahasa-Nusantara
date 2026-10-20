/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Antarmuka abstraksi pencetak keluaran (Output Writer).
 */
export interface OutputWriter {
  tulisBaris(teks: string): void;
  dapatkanSeluruhTeks(): string[];
  bersihkan(): void;
}

export class PenulisOutputBuffer implements OutputWriter {
  private buffer: string[] = [];

  public tulisBaris(teks: string): void {
    this.buffer.push(teks);
  }

  public dapatkanSeluruhTeks(): string[] {
    return [...this.buffer];
  }

  public bersihkan(): void {
    this.buffer = [];
  }
}

export class PenulisOutputKonsol implements OutputWriter {
  private riwayat: string[] = [];

  public tulisBaris(teks: string): void {
    this.riwayat.push(teks);
    console.log(teks);
  }

  public dapatkanSeluruhTeks(): string[] {
    return [...this.riwayat];
  }

  public bersihkan(): void {
    this.riwayat = [];
  }
}
