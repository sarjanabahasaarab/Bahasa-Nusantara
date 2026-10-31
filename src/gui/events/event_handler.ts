/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Pengelola Penangan Peristiwa GUI (GUI Event Handler)
 */

import { DataPeristiwaGUI, JenisPeristiwaGUI, PenanganPeristiwaGUI } from '../types';

export class PengelolaPeristiwaGUI {
  private paraPenangan: Map<JenisPeristiwaGUI, Set<PenanganPeristiwaGUI>> = new Map();

  /**
   * Mendaftarkan penangan peristiwa untuk jenis event tertentu.
   * Mengembalikan fungsi untuk melepas pendaftaran (unsubscribe).
   */
  public pasang(jenis: JenisPeristiwaGUI, penangan: PenanganPeristiwaGUI): () => void {
    if (!this.paraPenangan.has(jenis)) {
      this.paraPenangan.set(jenis, new Set());
    }
    const himpunan = this.paraPenangan.get(jenis)!;
    himpunan.add(penangan);

    return () => {
      himpunan.delete(penangan);
      if (himpunan.size === 0) {
        this.paraPenangan.delete(jenis);
      }
    };
  }

  /**
   * Mendaftarkan penangan peristiwa yang hanya dieksekusi satu kali.
   */
  public pasangSekali(jenis: JenisPeristiwaGUI, penangan: PenanganPeristiwaGUI): () => void {
    let dilepas = false;
    const pembungkus: PenanganPeristiwaGUI = async (peristiwa) => {
      if (dilepas) return;
      dilepas = true;
      copot();
      await penangan(peristiwa);
    };
    const copot = this.pasang(jenis, pembungkus);
    return () => {
      dilepas = true;
      copot();
    };
  }

  /**
   * Memicu pengiriman peristiwa ke seluruh penangan yang terdaftar.
   */
  public async picu(peristiwa: DataPeristiwaGUI): Promise<void> {
    const himpunan = this.paraPenangan.get(peristiwa.jenis);
    if (!himpunan || himpunan.size === 0) return;

    for (const fn of Array.from(himpunan)) {
      if (peristiwa.dibatalkan) break;
      try {
        await fn(peristiwa);
      } catch (err) {
        console.error(`[PengelolaPeristiwaGUI] Galat pada penanganan peristiwa '${peristiwa.jenis}':`, err);
      }
    }
  }

  /**
   * Menghapus semua penangan peristiwa untuk pembersihan memori.
   */
  public bersihkan(): void {
    this.paraPenangan.clear();
  }

  public jumlahPenangan(jenis?: JenisPeristiwaGUI): number {
    if (jenis) {
      return this.paraPenangan.get(jenis)?.size ?? 0;
    }
    let total = 0;
    for (const set of this.paraPenangan.values()) {
      total += set.size;
    }
    return total;
  }
}
