/**
 * src/ide/commandRegistry.ts
 * Registri Perintah (Command Palette Registry) untuk IDE NUSANTARA.
 * Menyediakan daftar aksi, pemetaan pintasan keyboard, dan pencarian perintah.
 */

import { PerintahIDE } from './types';

export class RegistriPerintahIDE {
  private daftarPerintah: Map<string, PerintahIDE> = new Map();

  constructor() {
    this.inisialisasiPerintahBawaan();
  }

  private inisialisasiPerintahBawaan(): void {
    const perintahAwal: PerintahIDE[] = [
      {
        id: 'file.buka',
        judul: 'cmd.openFile',
        kategori: 'Berkas',
        pintasan: 'Ctrl+O',
      },
      {
        id: 'file.simpan',
        judul: 'cmd.save',
        kategori: 'Berkas',
        pintasan: 'Ctrl+S',
      },
      {
        id: 'file.simpanSemua',
        judul: 'cmd.saveAll',
        kategori: 'Berkas',
        pintasan: 'Ctrl+Shift+S',
      },
      {
        id: 'proyek.jalankan',
        judul: 'cmd.run',
        kategori: 'Proyek',
        pintasan: 'F5',
      },
      {
        id: 'proyek.debug',
        judul: 'cmd.debug',
        kategori: 'Debugger',
        pintasan: 'Shift+F5',
      },
      {
        id: 'proyek.profiler',
        judul: 'cmd.profiler',
        kategori: 'Profiler',
      },
      {
        id: 'proyek.berhenti',
        judul: 'cmd.stop',
        kategori: 'Proyek',
      },
      {
        id: 'editor.format',
        judul: 'cmd.format',
        kategori: 'Editor',
        pintasan: 'Shift+Alt+F',
      },
      {
        id: 'editor.cari',
        judul: 'cmd.find',
        kategori: 'Editor',
        pintasan: 'Ctrl+F',
      },
      {
        id: 'editor.ganti',
        judul: 'cmd.replace',
        kategori: 'Editor',
        pintasan: 'Ctrl+H',
      },
      {
        id: 'editor.toggleBreakpoint',
        judul: 'cmd.toggleBreakpoint',
        kategori: 'Debugger',
        pintasan: 'F9',
      },
      {
        id: 'editor.stepOver',
        judul: 'cmd.stepOver',
        kategori: 'Debugger',
        pintasan: 'F10',
      },
      {
        id: 'editor.stepInto',
        judul: 'cmd.stepInto',
        kategori: 'Debugger',
        pintasan: 'F11',
      },
      {
        id: 'tampilan.palette',
        judul: 'cmd.palette',
        kategori: 'Tampilan',
        pintasan: 'Ctrl+Shift+P',
      },
      {
        id: 'tampilan.cariSemua',
        judul: 'cmd.searchFiles',
        kategori: 'Pencarian',
        pintasan: 'Ctrl+Shift+F',
      },
      {
        id: 'tampilan.terminal',
        judul: 'cmd.openTerminal',
        kategori: 'Terminal',
        pintasan: 'Ctrl+`',
      },
      {
        id: 'pengaturan.buka',
        judul: 'cmd.settings',
        kategori: 'Pengaturan',
        pintasan: 'Ctrl+,',
      },
    ];

    for (const p of perintahAwal) {
      this.daftarPerintah.set(p.id, p);
    }
  }

  public daftarkan(perintah: PerintahIDE): void {
    this.daftarPerintah.set(perintah.id, perintah);
  }

  public hapus(id: string): boolean {
    return this.daftarPerintah.delete(id);
  }

  public dapatkan(id: string): PerintahIDE | undefined {
    return this.daftarPerintah.get(id);
  }

  public semua(): PerintahIDE[] {
    return Array.from(this.daftarPerintah.values());
  }

  public cari(kueri: string): PerintahIDE[] {
    const bersih = kueri.trim().toLowerCase();
    if (!bersih) return this.semua();

    return this.semua().filter((p) => {
      return (
        p.id.toLowerCase().includes(bersih) ||
        p.judul.toLowerCase().includes(bersih) ||
        (p.kategori && p.kategori.toLowerCase().includes(bersih)) ||
        (p.pintasan && p.pintasan.toLowerCase().includes(bersih))
      );
    });
  }

  public jalankan(id: string): boolean {
    const p = this.daftarPerintah.get(id);
    if (p && p.tindakan) {
      p.tindakan();
      return true;
    }
    return false;
  }
}
