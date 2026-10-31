/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Event Loop GUI (Asynchronous Dispatch & Task Processing)
 */

export class EventLoopGUI {
  private berjalan: boolean = false;
  private antreanTugas: Array<() => void | Promise<void>> = [];
  private jedaTickMs: number = 16; // ~60fps
  private timerId: any = null;

  constructor(jedaTickMs: number = 16) {
    this.jedaTickMs = jedaTickMs;
  }

  public isBerjalan(): boolean {
    return this.berjalan;
  }

  public kirimTugas(tugas: () => void | Promise<void>): void {
    this.antreanTugas.push(tugas);
  }

  public async prosesSatuTick(): Promise<number> {
    if (this.antreanTugas.length === 0) return 0;
    const tugasSaatIni = [...this.antreanTugas];
    this.antreanTugas = [];

    let hitung = 0;
    for (const t of tugasSaatIni) {
      try {
        await t();
        hitung++;
      } catch (err) {
        console.error('[EventLoopGUI] Galat saat menjalankan tugas:', err);
      }
    }
    return hitung;
  }

  public async jalankan(): Promise<void> {
    if (this.berjalan) return;
    this.berjalan = true;

    return new Promise((resolve) => {
      const loop = async () => {
        if (!this.berjalan) {
          resolve();
          return;
        }

        await this.prosesSatuTick();

        if (this.berjalan) {
          this.timerId = setTimeout(loop, this.jedaTickMs);
        } else {
          resolve();
        }
      };

      this.timerId = setTimeout(loop, 0);
    });
  }

  public hentikan(): void {
    this.berjalan = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public bersihkan(): void {
    this.hentikan();
    this.antreanTugas = [];
  }
}
