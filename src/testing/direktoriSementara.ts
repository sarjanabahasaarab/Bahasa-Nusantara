/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas, PembacaBerkasMemori, PembacaBerkasNode } from '../modul/pembacaBerkas';

/**
 * Manajer Direktori Sementara Terisolasi untuk Pengujian Sistem Berkas NUSANTARA (Phase 21).
 */
export class DirektoriSementara {
  public readonly jalurBasis: string;
  public readonly jalur: string;
  public readonly pembaca: PembacaBerkas;
  private readonly berkasDibuat: Set<string> = new Set();
  private readonly memori: Map<string, string> = new Map();
  private dibersihkan: boolean = false;

  constructor(
    arg1?: string | PembacaBerkas,
    arg2?: string | PembacaBerkas
  ) {
    let prefix = 'uji_tmp_';
    let reader: PembacaBerkas | undefined;

    if (typeof arg1 === 'string') {
      prefix = arg1;
      if (arg2 && typeof (arg2 as any).apakahAda === 'function') {
        reader = arg2 as PembacaBerkas;
      }
    } else if (arg1 && typeof (arg1 as any).apakahAda === 'function') {
      reader = arg1 as PembacaBerkas;
      if (typeof arg2 === 'string') {
        prefix = arg2;
      }
    }

    const idAcak = Math.floor(Math.random() * 1_000_000).toString(36);
    this.jalurBasis = `/tmp/${prefix}_${idAcak}`;
    this.jalur = this.jalurBasis;
    this.pembaca = reader || (typeof window !== 'undefined' ? new PembacaBerkasMemori() : new PembacaBerkasNode());

    // Tandai direktori ada di pembaca berkas jika didukung
    if (typeof (this.pembaca as any).buatDirektori === 'function') {
      (this.pembaca as any).buatDirektori(this.jalurBasis);
    }
  }

  public apakahAdaDirektori(): boolean {
    if (this.dibersihkan) return false;
    return true;
  }

  /**
   * Menulis berkas di dalam direktori sementara.
   */
  public tulisBerkas(jalurRelatif: string, konten: string): string {
    if (this.dibersihkan) {
      throw new Error(`Direktori sementara '${this.jalurBasis}' sudah dibersihkan.`);
    }
    const jalurLengkap = this.gabung(jalurRelatif);
    this.memori.set(jalurLengkap, konten);

    try {
      if ((this.pembaca as any).fs) {
        const fs = (this.pembaca as any).fs;
        const path = (this.pembaca as any).path;
        if (path && fs) {
          const dir = path.dirname(jalurLengkap);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(jalurLengkap, konten, 'utf-8');
        }
      } else if (typeof (this.pembaca as any).tulis === 'function') {
        (this.pembaca as any).tulis(jalurLengkap, konten);
      } else if (typeof (this.pembaca as any).tulisBerkas === 'function') {
        (this.pembaca as any).tulisBerkas(jalurLengkap, konten);
      }
    } catch {
      // Penyimpanan memori tetap aktif
    }

    this.berkasDibuat.add(jalurLengkap);
    return jalurLengkap;
  }

  /**
   * Membaca berkas di dalam direktori sementara.
   */
  public bacaBerkas(jalurRelatif: string): string {
    if (this.dibersihkan) {
      throw new Error(`Direktori sementara '${this.jalurBasis}' sudah dibersihkan.`);
    }
    const jalurLengkap = this.gabung(jalurRelatif);
    if (this.memori.has(jalurLengkap)) {
      return this.memori.get(jalurLengkap)!;
    }
    return this.pembaca.baca(jalurLengkap);
  }

  /**
   * Memeriksa keberadaan berkas di dalam direktori sementara.
   */
  public apakahAda(jalurRelatif: string): boolean {
    if (this.dibersihkan) return false;
    const jalurLengkap = this.gabung(jalurRelatif);
    if (this.memori.has(jalurLengkap)) return true;
    return this.pembaca.apakahAda(jalurLengkap);
  }

  /**
   * Menggabungkan jalur relatif dengan jalur basis direktori sementara.
   */
  public gabung(jalurRelatif: string): string {
    const bersih = jalurRelatif.replace(/^[/\\]+/, '');
    return `${this.jalurBasis}/${bersih}`;
  }

  /**
   * Membersihkan seluruh berkas sementara yang dibuat selama pengujian.
   */
  public bersihkan(): void {
    if (this.dibersihkan) return;

    this.memori.clear();
    for (const jalur of this.berkasDibuat) {
      try {
        if (typeof (this.pembaca as any).hapusBerkas === 'function') {
          (this.pembaca as any).hapusBerkas(jalur);
        } else if (typeof (this.pembaca as any).hapus === 'function') {
          (this.pembaca as any).hapus(jalur);
        }
      } catch {
        // Abaikan galat pembersihan individual
      }
    }

    if ((this.pembaca as any).fs) {
      try {
        const fs = (this.pembaca as any).fs;
        if (fs.existsSync(this.jalurBasis)) {
          fs.rmSync(this.jalurBasis, { recursive: true, force: true });
        }
      } catch {
        // Abaikan jika tidak dapat menghapus direktori fisik tmp
      }
    }

    this.berkasDibuat.clear();
    this.dibersihkan = true;
  }
}
