/**
 * src/ide/settingsManager.ts
 * Manajer Pengaturan (Settings Manager) untuk IDE NUSANTARA.
 * Menyimpan konfigurasi pengguna (editor, bahasa, debug, tampilan).
 * Mendukung penyimpanan lokal (localStorage) dengan fallback in-memory yang aman.
 */

import { PengaturanIDE, TemaIDE, BahasaAntarmuka } from './types';

export const PENGATURAN_DEFAULT: PengaturanIDE = {
  editor: {
    ukuranFont: 14,
    ukuranTab: 2,
    bungkusBaris: true,
    minimap: true,
    simpanOtomatis: true,
    formatSaatSimpan: true,
    tampilkanNomorBaris: true,
  },
  bahasa: {
    lspAktif: true,
    diagnostikLangsung: true,
    autocompleteAktif: true,
    hoverAktif: true,
  },
  debug: {
    berhentiPadaGalat: true,
    bukaPanelDebugOtomatis: true,
  },
  tampilan: {
    tema: 'dark',
    bahasa: 'id',
  },
};

const KUNCI_STORAGE = 'nusantara_ide_settings_v026';

export class ManajerPengaturanIDE {
  private pengaturan: PengaturanIDE;
  private pendengar: Array<(pengaturan: PengaturanIDE) => void> = [];

  constructor(awal?: Partial<PengaturanIDE>) {
    this.pengaturan = this.muatDariStorage(awal);
  }

  private muatDariStorage(awal?: Partial<PengaturanIDE>): PengaturanIDE {
    let tersimpan: Partial<PengaturanIDE> = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const mentah = window.localStorage.getItem(KUNCI_STORAGE);
        if (mentah) {
          tersimpan = JSON.parse(mentah);
        }
      } catch {
        // Fallback jika localStorage diblokir / invalid JSON
      }
    }

    return {
      ...PENGATURAN_DEFAULT,
      ...tersimpan,
      ...awal,
      editor: {
        ...PENGATURAN_DEFAULT.editor,
        ...(tersimpan.editor || {}),
        ...(awal?.editor || {}),
      },
      bahasa: {
        ...PENGATURAN_DEFAULT.bahasa,
        ...(tersimpan.bahasa || {}),
        ...(awal?.bahasa || {}),
      },
      debug: {
        ...PENGATURAN_DEFAULT.debug,
        ...(tersimpan.debug || {}),
        ...(awal?.debug || {}),
      },
      tampilan: {
        ...PENGATURAN_DEFAULT.tampilan,
        ...(tersimpan.tampilan || {}),
        ...(awal?.tampilan || {}),
      },
    };
  }

  public dapatkan(): PengaturanIDE {
    return JSON.parse(JSON.stringify(this.pengaturan));
  }

  public perbarui(perubahan: Partial<PengaturanIDE>): PengaturanIDE {
    this.pengaturan = {
      ...this.pengaturan,
      ...perubahan,
      editor: {
        ...this.pengaturan.editor,
        ...(perubahan.editor || {}),
      },
      bahasa: {
        ...this.pengaturan.bahasa,
        ...(perubahan.bahasa || {}),
      },
      debug: {
        ...this.pengaturan.debug,
        ...(perubahan.debug || {}),
      },
      tampilan: {
        ...this.pengaturan.tampilan,
        ...(perubahan.tampilan || {}),
      },
    };

    this.simpanKeStorage();
    this.notifikasi();
    return this.dapatkan();
  }

  public setTema(tema: TemaIDE): void {
    this.perbarui({ tampilan: { ...this.pengaturan.tampilan, tema } });
  }

  public setBahasa(bahasa: BahasaAntarmuka): void {
    this.perbarui({ tampilan: { ...this.pengaturan.tampilan, bahasa } });
  }

  public setUkuranFont(ukuranFont: number): void {
    this.perbarui({ editor: { ...this.pengaturan.editor, ukuranFont } });
  }

  public resetKeBawaan(): PengaturanIDE {
    this.pengaturan = JSON.parse(JSON.stringify(PENGATURAN_DEFAULT));
    this.simpanKeStorage();
    this.notifikasi();
    return this.dapatkan();
  }

  public berlangganan(pendengar: (pengaturan: PengaturanIDE) => void): () => void {
    this.pendengar.push(pendengar);
    return () => {
      this.pendengar = this.pendengar.filter((p) => p !== pendengar);
    };
  }

  private simpanKeStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(KUNCI_STORAGE, JSON.stringify(this.pengaturan));
      } catch {
        // Abaikan error kuota / storage
      }
    }
  }

  private notifikasi(): void {
    const data = this.dapatkan();
    for (const p of this.pendengar) {
      try {
        p(data);
      } catch {
        // Hindari listener error merusak manajer
      }
    }
  }
}
