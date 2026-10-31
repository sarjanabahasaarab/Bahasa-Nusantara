/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Konstruktor & Utilitas Peristiwa GUI (GUI Events)
 */

import { DataPeristiwaGUI, JenisPeristiwaGUI } from '../types';

export function buatPeristiwaGUI<T = any>(
  idWidget: string,
  jenis: JenisPeristiwaGUI,
  opsi: Partial<DataPeristiwaGUI<T>> = {}
): DataPeristiwaGUI<T> {
  return {
    idWidget,
    jenis,
    stempelWaktu: Date.now(),
    dibatalkan: false,
    ...opsi,
  };
}
