/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Konteks Aplikasi GUI (GUI Application Context)
 */

import { JendelaGUI } from './window';
import { PengelolaTema, pengelolaTemaGlobal } from '../styling/theme';
import { PengelolaDialogGUI } from '../dialogs/dialog';
import { EventLoopGUI } from './event_loop';
import { PengelolaLifecycle } from './lifecycle';

export class KonteksAplikasiGUI {
  private static instance: KonteksAplikasiGUI | null = null;

  public readonly daftarJendela: Map<string, JendelaGUI> = new Map();
  public readonly tema: PengelolaTema = pengelolaTemaGlobal;
  public readonly dialog: PengelolaDialogGUI = new PengelolaDialogGUI();
  public readonly loop: EventLoopGUI = new EventLoopGUI();
  public readonly lifecycle: PengelolaLifecycle = new PengelolaLifecycle();
  public jendelaAktif: JendelaGUI | null = null;

  public static dapatkanKonteks(): KonteksAplikasiGUI {
    if (!KonteksAplikasiGUI.instance) {
      KonteksAplikasiGUI.instance = new KonteksAplikasiGUI();
    }
    return KonteksAplikasiGUI.instance;
  }

  public static resetKonteks(): void {
    if (KonteksAplikasiGUI.instance) {
      KonteksAplikasiGUI.instance.bersihkan();
      KonteksAplikasiGUI.instance = null;
    }
  }

  public daftarkanJendela(jendela: JendelaGUI): void {
    this.daftarJendela.set(jendela.id, jendela);
    if (!this.jendelaAktif) {
      this.jendelaAktif = jendela;
    }
  }

  public hapusJendela(id: string): boolean {
    const j = this.daftarJendela.get(id);
    if (j) {
      j.hancurkan();
      this.daftarJendela.delete(id);
      if (this.jendelaAktif?.id === id) {
        const sisa = Array.from(this.daftarJendela.values());
        this.jendelaAktif = sisa.length > 0 ? sisa[0] : null;
      }
      return true;
    }
    return false;
  }

  public dapatkanJendela(id: string): JendelaGUI | undefined {
    return this.daftarJendela.get(id);
  }

  public bersihkan(): void {
    for (const [id, j] of this.daftarJendela.entries()) {
      j.hancurkan();
    }
    this.daftarJendela.clear();
    this.jendelaAktif = null;
    this.loop.bersihkan();
  }
}
