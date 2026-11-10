/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Konfigurasi Sistem Build Lintas Platform NUSANTARA (Phase 23)
 */

import { PlatformTarget, PLATFORM_SEMUA } from './types';

export class KonfigurasiBuild {
  public static validasiTarget(targets?: PlatformTarget | PlatformTarget[] | string): any {
    if (typeof targets === 'string') {
      return (
        PLATFORM_SEMUA.includes(targets as PlatformTarget) ||
        targets === 'darwin-x64' ||
        targets === 'darwin-arm64' ||
        targets === 'macos-x64' ||
        targets === 'macos-arm64' ||
        targets === 'linux-x64' ||
        targets === 'linux-arm64' ||
        targets === 'windows-x64'
      );
    }
    if (!targets || (Array.isArray(targets) && targets.length === 0)) {
      return [...PLATFORM_SEMUA];
    }
    const arr = Array.isArray(targets) ? targets : [targets];
    const valid = arr.filter(
      (t) =>
        PLATFORM_SEMUA.includes(t) ||
        t === 'darwin-x64' ||
        t === 'darwin-arm64'
    );
    return valid.length > 0 ? valid : [...PLATFORM_SEMUA];
  }

  public static dapatkanFormatBiner(platform: PlatformTarget): string {
    if (platform === 'windows-x64') {
      return '.exe';
    }
    return '';
  }

  public static dapatkanFormatArsip(platform: PlatformTarget): 'zip' | 'tar.gz' {
    return platform.startsWith('windows') ? 'zip' : 'tar.gz';
  }
}
