/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Antarmuka Adaptor Platform GUI (Platform Adapter Interface)
 */

import { KonfigurasiAplikasiGUI } from '../types';
import { JendelaGUI } from '../core/window';

export type TipePlatformGUI = 'windows' | 'linux' | 'macos' | 'headless';

export interface AdaptorPlatformGUI {
  dapatkanNamaPlatform(): TipePlatformGUI;
  inisialisasi(konfig: KonfigurasiAplikasiGUI): Promise<void>;
  bukaJendela(jendela: JendelaGUI): Promise<void>;
  tutupJendela(id: string): Promise<void>;
  perbaruiTampilan(jendela: JendelaGUI): Promise<void>;
  hancurkan(): Promise<void>;
}
