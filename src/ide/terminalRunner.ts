/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Terminal Terintegrasi (Integrated Terminal Runner) IDE NUSANTARA (Phase 26)
 */

import { NusantaraCLI } from '../paket/cli';
import { PembacaBerkasMemori } from '../modul/pembacaBerkas';
import { ManajerRuangKerja } from './workspaceManager';
import { dapatkanBannerCLI } from '../konstanta/versi';

export interface EntriTerminal {
  id: string;
  tipe: 'perintah' | 'keluaran' | 'galat' | 'sistem';
  teks: string;
}

export class TerminalTerintegrasi {
  private riwayatPerintah: string[] = [];
  private indeksRiwayat = -1;
  private entriTerminal: EntriTerminal[] = [];
  private readonly cli: NusantaraCLI;
  private readonly fsMemori: PembacaBerkasMemori;

  constructor(private readonly workspace: ManajerRuangKerja) {
    // Sinkronkan berkas workspace ke pembaca berkas memori CLI
    const berkasObj: Record<string, string> = {};
    for (const [k, v] of workspace.dapatkanSemuaBerkas().entries()) {
      berkasObj[k] = v;
    }
    this.fsMemori = new PembacaBerkasMemori(berkasObj, workspace.dapatkanDirektoriAkar());
    this.cli = new NusantaraCLI({
      pembaca: this.fsMemori,
      direktoriProyek: workspace.dapatkanDirektoriAkar(),
      log: (pesan: string) => this.tambahEntri('keluaran', pesan),
      error: (pesan: string) => this.tambahEntri('galat', pesan),
    });

    // Pesan sambutan terminal
    this.tambahEntri('sistem', dapatkanBannerCLI());
    this.tambahEntri('sistem', 'Ketik "nusantara bantuan" atau "bantuan" untuk melihat daftar perintah.\n');
  }

  public dapatkanEntri(): EntriTerminal[] {
    return [...this.entriTerminal];
  }

  public dapatkanRiwayat(): string[] {
    return [...this.riwayatPerintah];
  }

  public bersihkan(): void {
    this.entriTerminal = [];
  }

  public tambahEntri(tipe: EntriTerminal['tipe'], teks: string): void {
    this.entriTerminal.push({
      id: `term-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tipe,
      teks,
    });
  }

  /**
   * Mengeksekusi satu baris perintah pada terminal terintegrasi.
   */
  public eksekusiPerintah(barisPerintah: string): number {
    const raw = barisPerintah.trim();
    if (!raw) return 0;

    // Catat ke log terminal dan riwayat perintah
    this.tambahEntri('perintah', `nusantara@ide:${this.workspace.dapatkanDirektoriAkar()}$ ${raw}`);
    this.riwayatPerintah.push(raw);
    this.indeksRiwayat = this.riwayatPerintah.length;

    // Sinkronkan perubahan terbaru dari workspace ke CLI FS
    for (const [k, v] of this.workspace.dapatkanSemuaBerkas().entries()) {
      this.fsMemori.tulisBerkas(k, v);
    }

    // Perintah utilitas bawaan terminal shell
    if (raw === 'bersih' || raw === 'clear' || raw === 'cls') {
      this.bersihkan();
      return 0;
    }

    if (raw === 'bantuan' || raw === 'help') {
      this.tambahEntri('keluaran', `Perintah Terminal NUSANTARA IDE:
  nusantara jalankan <berkas>    Eksekusi program NUSANTARA
  nusantara debug <berkas>       Mulai penelusuran debugger
  nusantara profil <berkas>      Pengukuran profil fungsi runtime
  nusantara uji                  Jalankan pengujian unit otomatis
  nusantara format <berkas>      Format dokumen kode sumber
  nusantara info                 Tampilkan status sistem & proyek
  nusantara versi                Tampilkan banner versi resmi
  ls, dir                        Tampilkan daftar berkas ruang kerja
  cat <berkas>                   Lihat isi berkas kode
  bersih, clear                  Bersihkan tampilan terminal`);
      return 0;
    }

    if (raw === 'ls' || raw === 'dir') {
      const daftar = Array.from(this.workspace.dapatkanSemuaBerkas().keys()).sort();
      this.tambahEntri('keluaran', daftar.join('\n'));
      return 0;
    }

    if (raw.startsWith('cat ')) {
      const target = raw.substring(4).trim();
      try {
        const konten = this.workspace.bacaBerkas(target);
        this.tambahEntri('keluaran', konten);
      } catch (err: any) {
        this.tambahEntri('galat', err.message);
      }
      return 0;
    }

    // Perintah NUSANTARA CLI
    let argumen: string[] = [];
    if (raw.startsWith('nusantara ')) {
      argumen = raw.substring(10).trim().split(/\s+/);
    } else {
      argumen = raw.split(/\s+/);
    }

    try {
      const kodeKeluar = this.cli.jalankan(argumen);
      return kodeKeluar;
    } catch (e: any) {
      this.tambahEntri('galat', `Gagal mengeksekusi perintah: ${e?.message || e}`);
      return 1;
    }
  }

  public navigasiRiwayatSebelumnya(): string {
    if (this.riwayatPerintah.length === 0) return '';
    if (this.indeksRiwayat > 0) {
      this.indeksRiwayat--;
    }
    return this.riwayatPerintah[this.indeksRiwayat] || '';
  }

  public navigasiRiwayatBerikutnya(): string {
    if (this.indeksRiwayat < this.riwayatPerintah.length - 1) {
      this.indeksRiwayat++;
      return this.riwayatPerintah[this.indeksRiwayat];
    }
    this.indeksRiwayat = this.riwayatPerintah.length;
    return '';
  }
}
