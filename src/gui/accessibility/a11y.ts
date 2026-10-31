/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Utilitas Aksesibilitas GUI (Accessibility & Keyboard Navigation)
 */

import { InfoAksesibilitas, Widget } from '../widgets/base';

export function sesuaikanShortcutOS(shortcut: string, platform: 'darwin' | 'win32' | 'linux' = process.platform as any): string {
  if (platform === 'darwin') {
    return shortcut.replace(/Ctrl\+/gi, 'Cmd+');
  } else {
    return shortcut.replace(/Cmd\+/gi, 'Ctrl+');
  }
}

export function buatAtributAria(info: InfoAksesibilitas): Record<string, string> {
  const atribut: Record<string, string> = {};
  if (info.peran) atribut['role'] = info.peran;
  if (info.label) atribut['aria-label'] = info.label;
  if (info.deskripsi) atribut['aria-description'] = info.deskripsi;
  if (info.wajib) atribut['aria-required'] = 'true';
  if (info.nilaiSaatIni !== undefined) atribut['aria-valuenow'] = String(info.nilaiSaatIni);
  return atribut;
}

export function temukanWidgetDapatDifokuskan(akar: Widget): Widget[] {
  const hasil: Widget[] = [];
  const jelajah = (w: Widget) => {
    if (!w.terlihat || !w.aktif) return;
    if (['tombol', 'input_teks', 'area_teks', 'kotak_centang', 'tombol_radio', 'pilihan', 'slider'].includes(w.jenis)) {
      hasil.push(w);
    }
    for (const anak of w.anak) {
      jelajah(anak);
    }
  };
  jelajah(akar);
  return hasil;
}
