/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Pengemas Aplikasi Desktop Native (.desktop / AppDir Linux, .app macOS, Win32 Bundle)
 */

import { JendelaGUI } from '../core/window';
import { KonfigurasiAplikasiGUI } from '../types';
import {
  AdaptorDesktopLinux,
  AdaptorDesktopWindows,
  AdaptorDesktopMacOS,
} from '../platform/native_desktop';
import { PerenderDesktop } from '../render/renderer';
import { muatModulNode } from '../platform/node_bridge';

export type TargetPaketDesktop = 'linux' | 'windows' | 'macos';

export interface OpsiKemasDesktop {
  konfig: KonfigurasiAplikasiGUI;
  jendelaUtama: JendelaGUI;
  target: TargetPaketDesktop;
  direktoriKeluaran: string;
  jalurSkripNusantara?: string;
}

export interface HasilKemasDesktop {
  sukses: boolean;
  target: TargetPaketDesktop;
  direktoriBundel: string;
  daftarBerkas: string[];
  statusKompilasiBiner: 'COMPILED_NATIVE_BINARY' | 'SKIPPED_NO_NATIVE_TOOLCHAIN';
  sha256sums: string;
  manifestPath: string;
}

export class PengemasAplikasiDesktop {
  private readonly perender = new PerenderDesktop();

  private hitungSha256(isi: Uint8Array | string): string {
    const crypto = muatModulNode<any>('crypto');
    if (crypto && typeof crypto.createHash === 'function') {
      return crypto.createHash('sha256').update(isi).digest('hex');
    }
    // Fallback deterministik apabila modul crypto Node tidak ada
    const str = typeof isi === 'string' ? isi : Array.from(isi).join(',');
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(64, '0');
  }

  public kemas(opsi: OpsiKemasDesktop): HasilKemasDesktop {
    const fs = muatModulNode<any>('fs');
    const path = muatModulNode<any>('path');
    const cp = muatModulNode<any>('child_process');
    if (!fs || !path) {
      throw new Error('Pengemasan berkas desktop membutuhkan runtime Node.js (fs & path).');
    }

    const namaAman = opsi.konfig.namaAplikasi.replace(/[^a-zA-Z0-9_-]/g, '-');
    const idApp = opsi.konfig.idAplikasi || 'id.nusantara.desktop';
    const versi = opsi.konfig.versi || '1.0.0';
    const svgIkon = this.perender.renderKeSVG(opsi.jendelaUtama);
    const bmpSnapshot = this.perender.renderKeFramebuffer(opsi.jendelaUtama).eksporBMP();
    const htmlShell = this.perender.renderKeHTML(opsi.jendelaUtama);

    let dirBundel = '';
    const berkasTercatat: Array<{ relatif: string; isi: string | Uint8Array; exec?: boolean }> = [];
    let statusKompilasiBiner: HasilKemasDesktop['statusKompilasiBiner'] = 'SKIPPED_NO_NATIVE_TOOLCHAIN';

    if (opsi.target === 'linux') {
      dirBundel = path.join(opsi.direktoriKeluaran, `${namaAman}.AppDir`);
      const adaptor = new AdaptorDesktopLinux();
      adaptor.inisialisasi(opsi.konfig);
      const sumberC = adaptor.hasilkanSumberHostNative(opsi.jendelaUtama);

      const desktopEntry = `[Desktop Entry]
Type=Application
Name=${opsi.konfig.namaAplikasi}
Exec=${idApp}
Icon=${idApp}
Categories=Utility;Development;
Terminal=false
Version=1.0
X-AppImage-Version=${versi}
`;
      const appRun = `#!/usr/bin/env sh
HERE="$(dirname "$(readlink -f "$0")")"
if [ -x "$HERE/usr/bin/${idApp}" ]; then
  exec "$HERE/usr/bin/${idApp}" "$@"
fi
exec nusantara desktop run "${opsi.jalurSkripNusantara || 'src/utama.nusantara'}"
`;
      berkasTercatat.push(
        { relatif: 'AppRun', isi: appRun, exec: true },
        { relatif: `${idApp}.desktop`, isi: desktopEntry },
        { relatif: `usr/share/applications/${idApp}.desktop`, isi: desktopEntry },
        { relatif: `usr/share/icons/hicolor/scalable/apps/${idApp}.svg`, isi: svgIkon },
        { relatif: `usr/share/nusantara/ui/index.html`, isi: htmlShell },
        { relatif: `usr/share/nusantara/preview.bmp`, isi: bmpSnapshot },
        { relatif: `src/${sumberC.namaBerkas}`, isi: sumberC.isi }
      );
    } else if (opsi.target === 'macos') {
      dirBundel = path.join(opsi.direktoriKeluaran, `${namaAman}.app`);
      const adaptor = new AdaptorDesktopMacOS();
      adaptor.inisialisasi(opsi.konfig);
      const sumberSwift = adaptor.hasilkanSumberHostNative(opsi.jendelaUtama);

      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>${idApp}</string>
  <key>CFBundleIdentifier</key>
  <string>${idApp}</string>
  <key>CFBundleName</key>
  <string>${opsi.konfig.namaAplikasi}</string>
  <key>CFBundleShortVersionString</key>
  <string>${versi}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`;
      const launcherSh = `#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec nusantara desktop run "$DIR/Resources/utama.nusantara"
`;
      berkasTercatat.push(
        { relatif: 'Contents/Info.plist', isi: infoPlist },
        { relatif: `Contents/MacOS/${idApp}`, isi: launcherSh, exec: true },
        { relatif: `Contents/Resources/${idApp}.svg`, isi: svgIkon },
        { relatif: 'Contents/Resources/index.html', isi: htmlShell },
        { relatif: 'Contents/Resources/preview.bmp', isi: bmpSnapshot },
        { relatif: `Contents/Sources/${sumberSwift.namaBerkas}`, isi: sumberSwift.isi }
      );
    } else {
      dirBundel = path.join(opsi.direktoriKeluaran, `${namaAman}-win64`);
      const adaptor = new AdaptorDesktopWindows();
      adaptor.inisialisasi(opsi.konfig);
      const sumberC = adaptor.hasilkanSumberHostNative(opsi.jendelaUtama);
      const winManifest = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity version="${versi}.0" processorArchitecture="amd64" name="${idApp}" type="win32"/>
  <description>${opsi.konfig.namaAplikasi}</description>
</assembly>
`;
      const runBat = `@echo off
setlocal
nusantara desktop run "%~dp0resources\\utama.nusantara"
`;
      berkasTercatat.push(
        { relatif: `${idApp}.bat`, isi: runBat },
        { relatif: `${idApp}.exe.manifest`, isi: winManifest },
        { relatif: 'resources/icon.svg', isi: svgIkon },
        { relatif: 'resources/index.html', isi: htmlShell },
        { relatif: 'resources/preview.bmp', isi: bmpSnapshot },
        { relatif: `src/${sumberC.namaBerkas}`, isi: sumberC.isi }
      );
    }

    fs.mkdirSync(dirBundel, { recursive: true });
    const daftarBerkas: string[] = [];
    const barisChecksum: string[] = [];

    for (const entri of berkasTercatat) {
      const fullPath = path.join(dirBundel, entri.relatif);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, entri.isi);
      if (entri.exec) {
        try {
          fs.chmodSync(fullPath, 0o755);
        } catch {
          // ignore on non-posix
        }
      }
      daftarBerkas.push(entri.relatif);
      barisChecksum.push(`${this.hitungSha256(entri.isi)}  ${entri.relatif}`);
    }

    // Kompilasi biner C GTK3 nyata bila toolchain tersedia pada host Linux
    if (opsi.target === 'linux' && cp) {
      try {
        const hasGtk = cp.spawnSync('pkg-config', ['--exists', 'gtk+-3.0'], { timeout: 2000 }).status === 0;
        const hasGcc = cp.spawnSync('gcc', ['--version'], { timeout: 2000 }).status === 0;
        if (hasGtk && hasGcc) {
          const flags = cp.execSync('pkg-config --cflags --libs gtk+-3.0', { encoding: 'utf-8' }).trim().split(/\s+/);
          const pathC = path.join(dirBundel, 'src/nusantara_linux_host.c');
          const pathBin = path.join(dirBundel, `usr/bin/${idApp}`);
          fs.mkdirSync(path.dirname(pathBin), { recursive: true });
          const res = cp.spawnSync('gcc', [pathC, '-o', pathBin, ...flags], { encoding: 'utf-8' });
          if (res.status === 0) {
            statusKompilasiBiner = 'COMPILED_NATIVE_BINARY';
            const binBuf = fs.readFileSync(pathBin);
            const relBin = `usr/bin/${idApp}`;
            daftarBerkas.push(relBin);
            barisChecksum.push(`${this.hitungSha256(binBuf)}  ${relBin}`);
          }
        }
      } catch {
        statusKompilasiBiner = 'SKIPPED_NO_NATIVE_TOOLCHAIN';
      }
    }

    const manifestObj = {
      idAplikasi: idApp,
      namaAplikasi: opsi.konfig.namaAplikasi,
      versi,
      target: opsi.target,
      statusKompilasiBiner,
      jendelaUtama: {
        judul: opsi.jendelaUtama.judul,
        lebar: opsi.jendelaUtama.lebar,
        tinggi: opsi.jendelaUtama.tinggi,
      },
      daftarBerkas,
    };
    const manifestJson = JSON.stringify(manifestObj, null, 2);
    const manifestPath = path.join(dirBundel, 'manifest.json');
    fs.writeFileSync(manifestPath, manifestJson, 'utf-8');
    daftarBerkas.push('manifest.json');
    barisChecksum.push(`${this.hitungSha256(manifestJson)}  manifest.json`);

    const sha256Text = barisChecksum.join('\n') + '\n';
    fs.writeFileSync(path.join(dirBundel, 'SHA256SUMS'), sha256Text, 'utf-8');

    return {
      sukses: true,
      target: opsi.target,
      direktoriBundel: dirBundel,
      daftarBerkas,
      statusKompilasiBiner,
      sha256sums: sha256Text,
      manifestPath,
    };
  }
}
