/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Jembatan Komunikasi IPC Webview Desktop (IPC Webview Bridge)
 */

import { DataPeristiwaGUI } from '../types';

export interface PesanIPCDesktop {
  tipe: 'peristiwa' | 'perintah' | 'respons' | 'sinkronisasi';
  idPesan: string;
  saluran: string;
  muatan: any;
  stempelWaktu: number;
}

export class JembatanDesktopWebview {
  private static counterPesan = 0;
  private pendengarPeristiwa: Map<string, Array<(muatan: any) => void>> = new Map();

  public buatPesan(tipe: PesanIPCDesktop['tipe'], saluran: string, muatan: any): PesanIPCDesktop {
    JembatanDesktopWebview.counterPesan++;
    return {
      tipe,
      idPesan: `pesan_ipc_${Date.now()}_${JembatanDesktopWebview.counterPesan}`,
      saluran,
      muatan,
      stempelWaktu: Date.now(),
    };
  }

  public bungkusPeristiwa(peristiwa: DataPeristiwaGUI): string {
    const pesan = this.buatPesan('peristiwa', `widget:${peristiwa.idWidget}`, peristiwa);
    return JSON.stringify(pesan);
  }

  public uraikanPesan(rawJson: string): PesanIPCDesktop {
    try {
      const data = JSON.parse(rawJson);
      if (!data.tipe || !data.saluran) {
        throw new Error('Format paket pesan IPC desktop tidak valid');
      }
      return data;
    } catch (err: any) {
      throw new Error(`Gagal mengurai pesan IPC Webview: ${err.message}`);
    }
  }

  public langganan(saluran: string, penangan: (muatan: any) => void): () => void {
    const list = this.pendengarPeristiwa.get(saluran) || [];
    list.push(penangan);
    this.pendengarPeristiwa.set(saluran, list);

    return () => {
      const curr = this.pendengarPeristiwa.get(saluran);
      if (curr) {
        const idx = curr.indexOf(penangan);
        if (idx !== -1) curr.splice(idx, 1);
      }
    };
  }

  public siarkan(saluran: string, muatan: any): void {
    const list = this.pendengarPeristiwa.get(saluran);
    if (list) {
      for (const fn of list) {
        fn(muatan);
      }
    }
  }

  public bersihkan(): void {
    this.pendengarPeristiwa.clear();
  }
}
