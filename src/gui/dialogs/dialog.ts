/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Sistem Dialog Standar Desktop (Message, Confirmation & File Dialogs)
 */

import {
  OpsiPesanDialog,
  OpsiKonfirmasiDialog,
  OpsiDialogBerkas,
  HasilDialogBerkas,
} from '../types';

export interface PenyediaDialogKustom {
  pesan?: (opsi: OpsiPesanDialog) => void | Promise<void>;
  konfirmasi?: (opsi: OpsiKonfirmasiDialog) => boolean | Promise<boolean>;
  bukaBerkas?: (opsi?: OpsiDialogBerkas) => HasilDialogBerkas | Promise<HasilDialogBerkas>;
  simpanBerkas?: (opsi?: OpsiDialogBerkas) => HasilDialogBerkas | Promise<HasilDialogBerkas>;
  pilihFolder?: (opsi?: OpsiDialogBerkas) => HasilDialogBerkas | Promise<HasilDialogBerkas>;
}

export class PengelolaDialogGUI {
  private penyediaKustom?: PenyediaDialogKustom;
  private riwayatPesan: OpsiPesanDialog[] = [];
  private riwayatKonfirmasi: OpsiKonfirmasiDialog[] = [];

  constructor(penyedia?: PenyediaDialogKustom) {
    this.penyediaKustom = penyedia;
  }

  public tetapkanPenyedia(penyedia: PenyediaDialogKustom): void {
    this.penyediaKustom = penyedia;
  }

  public tampilkanPesan(opsi: OpsiPesanDialog): void {
    this.riwayatPesan.push(opsi);
    if (this.penyediaKustom?.pesan) {
      this.penyediaKustom.pesan(opsi);
    }
  }

  public tampilkanKonfirmasi(opsi: OpsiKonfirmasiDialog): boolean {
    this.riwayatKonfirmasi.push(opsi);
    if (this.penyediaKustom?.konfirmasi) {
      const res = this.penyediaKustom.konfirmasi(opsi);
      return typeof res === 'boolean' ? res : true;
    }
    return true;
  }

  public bukaBerkas(opsi?: OpsiDialogBerkas): HasilDialogBerkas {
    if (this.penyediaKustom?.bukaBerkas) {
      const res = this.penyediaKustom.bukaBerkas(opsi);
      if (!(res instanceof Promise)) return res;
    }
    return {
      dibatalkan: false,
      jalurBerkas: opsi?.namaBerkasBawaan || 'dokumen.txt',
    };
  }

  public bukaDialogBerkas(opsi?: OpsiDialogBerkas): HasilDialogBerkas {
    return this.bukaBerkas(opsi);
  }

  public simpanBerkas(opsi?: OpsiDialogBerkas): HasilDialogBerkas {
    if (this.penyediaKustom?.simpanBerkas) {
      const res = this.penyediaKustom.simpanBerkas(opsi);
      if (!(res instanceof Promise)) return res;
    }
    return {
      dibatalkan: false,
      jalurBerkas: opsi?.namaBerkasBawaan || 'dokumen_baru.txt',
    };
  }

  public simpanDialogBerkas(opsi?: OpsiDialogBerkas): HasilDialogBerkas {
    return this.simpanBerkas(opsi);
  }

  public pilihFolder(opsi?: OpsiDialogBerkas): HasilDialogBerkas {
    if (this.penyediaKustom?.pilihFolder) {
      const res = this.penyediaKustom.pilihFolder(opsi);
      if (!(res instanceof Promise)) return res;
    }
    return {
      dibatalkan: false,
      jalurBerkas: opsi?.direktoriAwal || './folder_terpilih',
    };
  }

  public dapatkanRiwayatPesan(): OpsiPesanDialog[] {
    return [...this.riwayatPesan];
  }

  public dapatkanRiwayatKonfirmasi(): OpsiKonfirmasiDialog[] {
    return [...this.riwayatKonfirmasi];
  }

  public bersihkan(): void {
    this.riwayatPesan = [];
    this.riwayatKonfirmasi = [];
  }
}
