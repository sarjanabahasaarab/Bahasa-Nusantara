/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Pengelola Tema & Gaya GUI (Theme Manager)
 */

import { NamaTemaGUI, SkemaWarnaGUI } from '../types';
import {
  SKEMA_TEMA_TERANG,
  SKEMA_TEMA_GELAP,
  SKEMA_TEMA_KONTRAS_TINGGI,
} from './colors';

export class PengelolaTema {
  private temaAktif: NamaTemaGUI = 'terang';
  private skemaAktif: SkemaWarnaGUI = SKEMA_TEMA_TERANG;
  private paraPendengar: Set<(tema: NamaTemaGUI, skema: SkemaWarnaGUI) => void> = new Set();

  constructor(temaAwal: NamaTemaGUI = 'terang') {
    this.tetapkanTema(temaAwal);
  }

  public dapatkanTemaAktif(): NamaTemaGUI {
    return this.temaAktif;
  }

  public getTemaSaatIni(): { nama: NamaTemaGUI; skema: SkemaWarnaGUI } {
    return {
      nama: this.temaAktif,
      skema: this.skemaAktif,
    };
  }

  public dapatkanSkema(): SkemaWarnaGUI {
    return this.skemaAktif;
  }

  public setTema(nama: NamaTemaGUI): void {
    this.tetapkanTema(nama);
  }

  public tetapkanTema(nama: NamaTemaGUI): void {
    this.temaAktif = nama;
    if (nama === 'gelap') {
      this.skemaAktif = SKEMA_TEMA_GELAP;
    } else if (nama === 'kontras_tinggi') {
      this.skemaAktif = SKEMA_TEMA_KONTRAS_TINGGI;
    } else {
      this.skemaAktif = SKEMA_TEMA_TERANG;
    }

    for (const fn of this.paraPendengar) {
      try {
        fn(this.temaAktif, this.skemaAktif);
      } catch (e) {
        console.error('[PengelolaTema] Galat pada pendengar tema:', e);
      }
    }
  }

  public onTemaBerubah(fn: (skema: SkemaWarnaGUI) => void): () => void {
    return this.pasangPendengarPerubahan((_, s) => fn(s));
  }

  public pasangPendengarPerubahan(fn: (tema: NamaTemaGUI, skema: SkemaWarnaGUI) => void): () => void {
    this.paraPendengar.add(fn);
    return () => this.paraPendengar.delete(fn);
  }

  public bersihkan(): void {
    this.paraPendengar.clear();
  }
}

export const pengelolaTemaGlobal = new PengelolaTema('terang');
