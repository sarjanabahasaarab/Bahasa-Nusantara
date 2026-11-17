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

function escapeXml(teks: string): string {
  return teks
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapePosixDoubleQuoted(teks: string): string {
  return teks.replace(/([\\"$`])/g, '\\$1');
}

function escapeBatchArg(teks: string): string {
  return teks.replace(/["&|<>^%]/g, '');
}

export class PengemasAplikasiDesktop {
  private readonly perender = new PerenderDesktop();

  private hitungSha256(isi: Uint8Array | string): string {
    const crypto = muatModulNode<any>('crypto');
    if (!crypto || typeof crypto.createHash !== 'function') {
      throw new Error('Modul Node.js crypto tidak tersedia untuk menghitung SHA-256 paket desktop.');
    }
    return crypto.createHash('sha256').update(isi).digest('hex');
  }

  public verifikasiBundel(direktoriBundel: string): { valid: boolean; totalBerkas: number; galat: string[] } {
    const fs = muatModulNode<any>('fs');
    const path = muatModulNode<any>('path');
    if (!fs || !path) {
      throw new Error('Verifikasi bundel desktop membutuhkan runtime Node.js (fs & path).');
    }

    const galat: string[] = [];
    const manifestPath = path.join(direktoriBundel, 'manifest.json');
    const shaPath = path.join(direktoriBundel, 'SHA256SUMS');

    if (!fs.existsSync(manifestPath)) galat.push('manifest.json tidak ditemukan');
    if (!fs.existsSync(shaPath)) galat.push('SHA256SUMS tidak ditemukan');
    if (galat.length > 0) return { valid: false, totalBerkas: 0, galat };

    const baris = fs.readFileSync(shaPath, 'utf-8').split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    for (const line of baris) {
      const m = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
      if (!m) {
        galat.push(`Format SHA256SUMS tidak valid: ${line}`);
        continue;
      }
      const [, expectedHash, relPath] = m;
      const fullPath = path.resolve(direktoriBundel, relPath);
      const baseResolved = path.resolve(direktoriBundel);
      if (!fullPath.startsWith(baseResolved + path.sep)) {
        galat.push(`Path traversal terdeteksi pada SHA256SUMS: ${relPath}`);
        continue;
      }
      if (!fs.existsSync(fullPath)) {
        galat.push(`Berkas hilang dari bundel: ${relPath}`);
        continue;
      }
      const actualHash = this.hitungSha256(fs.readFileSync(fullPath));
      if (actualHash !== expectedHash) {
        galat.push(`Checksum tidak cocok untuk ${relPath}: diharapkan ${expectedHash}, aktual ${actualHash}`);
      }
    }

    return { valid: galat.length === 0, totalBerkas: baris.length, galat };
  }

  public kemas(opsi: OpsiKemasDesktop): HasilKemasDesktop {
    const fs = muatModulNode<any>('fs');
    const path = muatModulNode<any>('path');
    const cp = muatModulNode<any>('child_process');
    if (!fs || !path) {
      throw new Error('Pengemasan berkas desktop membutuhkan runtime Node.js (fs & path).');
    }

    const namaAman = opsi.konfig.namaAplikasi.replace(/[^a-zA-Z0-9_-]/g, '-') || 'NusantaraApp';
    const idApp = (opsi.konfig.idAplikasi || 'id.nusantara.desktop').replace(/[^a-zA-Z0-9._-]/g, '') || 'id.nusantara.desktop';
    const versi = (opsi.konfig.versi || '1.0.0').replace(/[^a-zA-Z0-9.+_-]/g, '') || '1.0.0';
    const skripPosix = escapePosixDoubleQuoted(opsi.jalurSkripNusantara || 'src/utama.nusantara');
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

      const namaDesktop = opsi.konfig.namaAplikasi.replace(/[\r\n]/g, ' ');
      const desktopEntry = `[Desktop Entry]
Type=Application
Name=${namaDesktop}
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
exec nusantara desktop run "${skripPosix}"
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
  <string>${escapeXml(idApp)}</string>
  <key>CFBundleIdentifier</key>
  <string>${escapeXml(idApp)}</string>
  <key>CFBundleName</key>
  <string>${escapeXml(opsi.konfig.namaAplikasi)}</string>
  <key>CFBundleShortVersionString</key>
  <string>${escapeXml(versi)}</string>
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
      const winVersion = /^\d+\.\d+\.\d+$/.test(versi) ? `${versi}.0` : '1.0.0.0';
      const winManifest = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity version="${escapeXml(winVersion)}" processorArchitecture="amd64" name="${escapeXml(idApp)}" type="win32"/>
  <description>${escapeXml(opsi.konfig.namaAplikasi)}</description>
</assembly>
`;
      const runBat = `@echo off
setlocal
nusantara desktop run "%~dp0resources\\${escapeBatchArg(path.basename(opsi.jalurSkripNusantara || 'utama.nusantara'))}"
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
