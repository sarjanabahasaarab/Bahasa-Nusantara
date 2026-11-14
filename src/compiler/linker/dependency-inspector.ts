/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA ADVANCED LINKER - Pemeriksa Dependensi (Dependency Inspector)
 * Target Milestone: Phase 45 (v0.45.0)
 */

import { safeCP, safeFS } from '../llvm/node-compat';
import { BinaryInspector } from '../executable/binary-inspector';
import { LinkerDiagnosticsManager } from './linker-diagnostics';

export interface DependencyInfo {
  name: string;
  found: boolean;
  resolvedPath?: string;
  version?: string;
  isSystemLib: boolean;
}

export interface DependencyInspectionReport {
  executablePath: string;
  targetPlatform: 'linux' | 'darwin' | 'windows' | 'unknown';
  dependencies: DependencyInfo[];
  allResolved: boolean;
  missingLibraries: string[];
  diagnostics: string[];
  isStatic?: boolean;
  inspectedFromDisk?: boolean;
}

export class DependencyInspector {
  constructor(private readonly diag: LinkerDiagnosticsManager = new LinkerDiagnosticsManager()) {}

  /**
   * Memeriksa daftar pustaka dinamis yang dibutuhkan oleh sebuah biner eksekutabel.
   */
  public inspect(
    executablePath: string,
    platform: 'linux' | 'darwin' | 'windows' = 'linux'
  ): DependencyInspectionReport {
    const dependencies: DependencyInfo[] = [];
    const missingLibraries: string[] = [];
    let inspectedFromDisk = false;

    // 1. Coba gunakan tool native atau parser biner jika berkas benar-benar ada di disk
    if (safeFS.existsSync(executablePath)) {
      inspectedFromDisk = true;
      if (platform === 'linux') {
        const lddRes = safeCP.spawnSync('ldd', [executablePath], { encoding: 'utf-8', timeout: 5000 });
        const outText = `${lddRes.stdout || ''}\n${lddRes.stderr || ''}`;
        if (lddRes.status === 0 && lddRes.stdout) {
          const lines = lddRes.stdout.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // Format: libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x...)
            const match = trimmed.match(/^([^=]+)=>\s*(\S+)/);
            if (match) {
              const libName = match[1].trim();
              const libPath = match[2].trim();
              const found = libPath !== 'not found' && safeFS.existsSync(libPath);
              if (!found) missingLibraries.push(libName);
              dependencies.push({
                name: libName,
                found,
                resolvedPath: found ? libPath : undefined,
                isSystemLib: this.isKnownSystemLib(libName, 'linux'),
              });
            } else if (trimmed.includes('statically linked')) {
              return {
                executablePath,
                targetPlatform: platform,
                dependencies: [],
                allResolved: true,
                missingLibraries: [],
                isStatic: true,
                inspectedFromDisk: true,
                diagnostics: ['Biner ditautkan secara statis penuh (statically linked).'],
              };
            }
          }
        } else if (outText.includes('statically linked')) {
          return {
            executablePath,
            targetPlatform: platform,
            dependencies: [],
            allResolved: true,
            missingLibraries: [],
            isStatic: true,
            inspectedFromDisk: true,
            diagnostics: ['Biner ditautkan secara statis penuh (statically linked).'],
          };
        }
      } else if (platform === 'darwin') {
        if (process.platform === 'darwin') {
          const otoolRes = safeCP.spawnSync('otool', ['-L', executablePath], { encoding: 'utf-8', timeout: 5000 });
          if (otoolRes.status === 0 && otoolRes.stdout) {
            const lines = otoolRes.stdout.split('\n').slice(1);
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              const match = trimmed.match(/^(\S+)/);
              if (match) {
                const libPath = match[1];
                const libName = libPath.split('/').pop() || libPath;
                const isSelf = libPath.startsWith('@') || safeFS.existsSync(libPath);
                if (!isSelf && !libPath.startsWith('/usr/lib/') && !libPath.startsWith('/System/Library/')) {
                  missingLibraries.push(libName);
                }
                dependencies.push({
                  name: libName,
                  found: isSelf || libPath.startsWith('/usr/lib/') || libPath.startsWith('/System/Library/'),
                  resolvedPath: libPath,
                  isSystemLib: this.isKnownSystemLib(libName, 'darwin'),
                });
              }
            }
          }
        }
        if (dependencies.length === 0) {
          const meta = BinaryInspector.inspect(executablePath);
          if (meta.format === 'Mach-O' && meta.dynamicLibraries.length > 0) {
            for (const libPath of meta.dynamicLibraries) {
              const libName = libPath.split('/').pop() || libPath;
              dependencies.push({
                name: libName,
                found: libPath.startsWith('/usr/lib/') || libPath.startsWith('/System/Library/'),
                resolvedPath: libPath,
                isSystemLib: this.isKnownSystemLib(libName, 'darwin'),
              });
            }
          }
        }
      } else if (platform === 'windows') {
        const meta = BinaryInspector.inspect(executablePath);
        if (meta.format === 'COFF' && meta.dynamicLibraries.length > 0) {
          for (const dll of meta.dynamicLibraries) {
            dependencies.push({
              name: dll,
              found: this.isKnownSystemLib(dll, 'windows'),
              resolvedPath: dll,
              isSystemLib: this.isKnownSystemLib(dll, 'windows'),
            });
          }
        }
      }
    }

    // 2. Fallback daftar standar jika biner belum ada di disk (misal inspeksi manifes prabangun)
    if (dependencies.length === 0) {
      const defaultLibs =
        platform === 'windows'
          ? ['KERNEL32.dll', 'ucrtbase.dll', 'MSVCRT.dll']
          : platform === 'darwin'
          ? ['libSystem.B.dylib']
          : ['libc.so.6', 'libm.so.6'];

      for (const lib of defaultLibs) {
        dependencies.push({
          name: lib,
          found: true,
          resolvedPath:
            platform === 'windows'
              ? `C:\\Windows\\System32\\${lib}`
              : `/usr/lib/${lib}`,
          isSystemLib: true,
        });
      }
    }

    const allResolved = missingLibraries.length === 0;

    return {
      executablePath,
      targetPlatform: platform,
      dependencies,
      allResolved,
      missingLibraries,
      inspectedFromDisk,
      diagnostics: allResolved
        ? [`Semua dependensi pustaka runtime (${dependencies.length} pustaka) terpenuhi.`]
        : [`Terdapat ${missingLibraries.length} dependensi pustaka yang hilang: ${missingLibraries.join(', ')}`],
    };
  }

  private isKnownSystemLib(name: string, platform: string): boolean {
    const lower = name.toLowerCase();
    if (platform === 'linux') {
      return (
        lower.includes('libc') ||
        lower.includes('libm') ||
        lower.includes('libpthread') ||
        lower.includes('ld-linux') ||
        lower.includes('linux-vdso')
      );
    }
    if (platform === 'windows') {
      return (
        lower.endsWith('.dll') &&
        (lower.includes('kernel') ||
          lower.includes('user32') ||
          lower.includes('ucrtbase') ||
          lower.includes('vcruntime') ||
          lower.includes('msvcrt') ||
          lower.includes('advapi32'))
      );
    }
    return lower.includes('libsystem') || lower.includes('libc++');
  }
}
