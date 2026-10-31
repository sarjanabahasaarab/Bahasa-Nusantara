/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Registri & Pengelolaan Daur Hidup Callback GUI (Anti Memory-Leak)
 */

export class RegistriCallbackGUI {
  private daftarCopot: Array<() => void> = [];

  public daftarkan(fungsiCopot: () => void): void {
    this.daftarCopot.push(fungsiCopot);
  }

  public lepasSemua(): void {
    for (const copot of this.daftarCopot) {
      try {
        copot();
      } catch (e) {
        console.error('[RegistriCallbackGUI] Gagal melepaskan callback:', e);
      }
    }
    this.daftarCopot = [];
  }

  public get jumlah(): number {
    return this.daftarCopot.length;
  }
}
