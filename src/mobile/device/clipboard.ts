/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * API Papan Klip Mobile (Clipboard API)
 */

export class PapanKlipMobile {
  private static isiMemori: string = '';

  public static async salin(teks: string): Promise<boolean> {
    this.isiMemori = teks;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(teks);
        return true;
      } catch {
        // Fallback ke penyimpanan memori internal
        return true;
      }
    }
    return true;
  }

  public static async tempel(): Promise<string> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
      try {
        const t = await navigator.clipboard.readText();
        return t || this.isiMemori;
      } catch {
        return this.isiMemori;
      }
    }
    return this.isiMemori;
  }

  public static ambilTeksSinkron(): string {
    return this.isiMemori;
  }

  public static memilikiTeks(): boolean {
    return Boolean(this.isiMemori && this.isiMemori.length > 0);
  }

  public static bersihkan(): void {
    this.isiMemori = '';
  }
}
