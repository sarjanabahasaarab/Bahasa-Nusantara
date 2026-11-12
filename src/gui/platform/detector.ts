/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Detektor Kapabilitas Display Server & Toolchain Desktop OS (X11, Wayland, GTK3, Win32, Cocoa)
 */

import { muatModulNode, apakahNodeRuntime } from './node_bridge';

export interface StatusPlatformDesktop {
  os: 'linux' | 'windows' | 'macos' | 'browser' | 'lainnya';
  nodeRuntime: boolean;
  displayServer: 'x11' | 'wayland' | 'win32' | 'cocoa' | 'none';
  displayAktif: boolean;
  detailDisplay: string;
  perkakas: {
    gcc: boolean;
    clang: boolean;
    pkgConfig: boolean;
    gtk3: boolean;
    python3: boolean;
    tkinter: boolean;
    pygobject: boolean;
    zenity: boolean;
    xdgOpen: boolean;
    webview2: boolean;
    swiftc: boolean;
  };
  siapNativeWindow: boolean;
  modeDisarankan: 'native' | 'webview-server' | 'headless';
  panduanInstalasi: string;
}

export class DetektorPlatformDesktop {
  private static ujiPerintah(bin: string, args: string[] = ['--version']): boolean {
    const cp = muatModulNode<any>('child_process');
    if (!cp || typeof cp.spawnSync !== 'function') return false;
    try {
      const res = cp.spawnSync(bin, args, { timeout: 2500, stdio: 'pipe' });
      return !res.error && res.status === 0;
    } catch {
      return false;
    }
  }

  public static deteksi(): StatusPlatformDesktop {
    if (!apakahNodeRuntime()) {
      return {
        os: 'browser',
        nodeRuntime: false,
        displayServer: 'none',
        displayAktif: false,
        detailDisplay: 'Lingkungan peramban web (tanpa akses OS windowing langsung).',
        perkakas: {
          gcc: false,
          clang: false,
          pkgConfig: false,
          gtk3: false,
          python3: false,
          tkinter: false,
          pygobject: false,
          zenity: false,
          xdgOpen: false,
          webview2: false,
          swiftc: false,
        },
        siapNativeWindow: false,
        modeDisarankan: 'headless',
        panduanInstalasi: 'Jalankan melalui CLI Node.js pada host desktop untuk windowing native.',
      };
    }

    const plat = process.platform;
    const os: StatusPlatformDesktop['os'] =
      plat === 'linux' ? 'linux' : plat === 'win32' ? 'windows' : plat === 'darwin' ? 'macos' : 'lainnya';

    let displayServer: StatusPlatformDesktop['displayServer'] = 'none';
    let displayAktif = false;
    let detailDisplay = 'Tidak ada server tampilan grafis (DISPLAY / WAYLAND_DISPLAY kosong).';

    if (os === 'linux') {
      const wayland = process.env.WAYLAND_DISPLAY || '';
      const x11 = process.env.DISPLAY || '';
      if (wayland) {
        displayServer = 'wayland';
        displayAktif = true;
        detailDisplay = `Wayland aktif (WAYLAND_DISPLAY=${wayland})`;
      } else if (x11) {
        displayServer = 'x11';
        displayAktif = true;
        detailDisplay = `X11 aktif (DISPLAY=${x11})`;
      }
    } else if (os === 'windows') {
      displayServer = 'win32';
      displayAktif = true;
      detailDisplay = 'Windows Win32 Desktop Window Manager aktif';
    } else if (os === 'macos') {
      displayServer = 'cocoa';
      displayAktif = true;
      detailDisplay = 'macOS Cocoa/AppKit WindowServer aktif';
    }

    const gcc = this.ujiPerintah('gcc');
    const clang = this.ujiPerintah('clang');
    const pkgConfig = this.ujiPerintah('pkg-config');
    const gtk3 = pkgConfig && this.ujiPerintah('pkg-config', ['--exists', 'gtk+-3.0']);
    const python3 = this.ujiPerintah('python3');
    const tkinter =
      python3 && this.ujiPerintah('python3', ['-c', 'import tkinter; assert tkinter']);
    const pygobject =
      python3 && this.ujiPerintah('python3', ['-c', 'import gi; gi.require_version("Gtk", "3.0")']);
    const zenity = this.ujiPerintah('zenity');
    const xdgOpen = this.ujiPerintah('xdg-open', ['--version']);
    const swiftc = os === 'macos' && this.ujiPerintah('swiftc');
    const webview2 = os === 'windows' && this.ujiPerintah('powershell', ['-Command', 'Get-Command pwsh -ErrorAction SilentlyContinue']);

    const siapNativeWindow =
      displayAktif &&
      ((os === 'linux' && ((gcc && gtk3) || pygobject || tkinter)) ||
        (os === 'windows') ||
        (os === 'macos' && swiftc));

    const modeDisarankan: StatusPlatformDesktop['modeDisarankan'] = siapNativeWindow
      ? 'native'
      : 'webview-server';

    let panduanInstalasi = 'Host siap untuk eksekusi GUI native.';
    if (os === 'linux' && !siapNativeWindow) {
      panduanInstalasi =
        'Pasang dependensi GUI Linux (Debian/Ubuntu): sudo apt-get update && sudo apt-get install -y gcc pkg-config libgtk-3-dev python3-tk x11-apps xvfb';
    } else if (os === 'macos' && !siapNativeWindow) {
      panduanInstalasi = 'Pasang Xcode Command Line Tools: xcode-select --install';
    } else if (os === 'windows' && !siapNativeWindow) {
      panduanInstalasi = 'Pasang Microsoft Edge WebView2 Runtime dan LLVM/MinGW GCC.';
    }

    return {
      os,
      nodeRuntime: true,
      displayServer,
      displayAktif,
      detailDisplay,
      perkakas: {
        gcc,
        clang,
        pkgConfig,
        gtk3,
        python3,
        tkinter,
        pygobject,
        zenity,
        xdgOpen,
        webview2,
        swiftc,
      },
      siapNativeWindow,
      modeDisarankan,
      panduanInstalasi,
    };
  }
}
