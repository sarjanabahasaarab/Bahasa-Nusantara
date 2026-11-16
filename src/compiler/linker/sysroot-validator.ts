/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA SYSROOT & LIBRARY VALIDATOR
 * Validasi ketat sysroot Linux, header standar C (stdio.h), CRT/libc,
 * serta kecocokan arsitektur libraryPaths sebelum linking atau kompilasi IR.
 */

import { safeFS, safePath } from '../llvm/node-compat';
import { TargetPlatformInfo } from '../llvm/target-triple';

export interface SysrootValidationResult {
  valid: boolean;
  code?:
    | 'SYSROOT_TIDAK_VALID'
    | 'SYSROOT_TIDAK_DITEMUKAN'
    | 'SYSROOT_CRT_TIDAK_DITEMUKAN'
    | 'LIBRARY_TARGET_SALAH';
  pipelineStatus?: 'GALAT_LINKER' | 'CROSS_SDK_TIDAK_TERSEDIA';
  message?: string;
  normalizedSysroot?: string;
}

export class SysrootValidator {
  public static validateLinuxSysroot(
    sysroot: string,
    targetInfo: TargetPlatformInfo
  ): SysrootValidationResult {
    const trimmed = (sysroot || '').trim();
    if (!trimmed) {
      return {
        valid: false,
        code: 'SYSROOT_TIDAK_VALID',
        pipelineStatus: 'GALAT_LINKER',
        message: `Sysroot Linux untuk target '${targetInfo.triple}' tidak boleh kosong.`,
      };
    }

    const normalized = trimmed.replace(/\\/g, '/').replace(/\/+$/, '') || '/';

    // 1. Tolak eksplisit jalur subdirektori library (/usr/lib/*, /lib/*, .../usr/lib/*, dll.)
    const isForbiddenLibSubdir =
      normalized !== '/' &&
      (/^\/usr\/lib(\/|$)/.test(normalized) ||
        /^\/lib(\/|$)/.test(normalized) ||
        /^\/lib64(\/|$)/.test(normalized) ||
        /\/usr\/lib(\/|$)/.test(normalized) ||
        /(^|\/)(usr\/)?lib(64)?\/(x86_64|aarch64|arm64)-linux-gnu(\/|$)/.test(normalized));

    if (isForbiddenLibSubdir) {
      return {
        valid: false,
        code: 'SYSROOT_TIDAK_VALID',
        pipelineStatus: 'GALAT_LINKER',
        normalizedSysroot: trimmed,
        message: `Sysroot '${trimmed}' tidak valid untuk target '${targetInfo.triple}': sysroot tidak boleh menunjuk subdirektori library (/usr/lib/* atau /lib/*). Gunakan root sysroot (misalnya '/' atau '/usr/aarch64-linux-gnu').`,
      };
    }

    // 2. Tolak mismatch arsitektur eksplisit pada path sysroot
    if (targetInfo.arch === 'aarch64' && normalized.includes('x86_64-linux-gnu')) {
      return {
        valid: false,
        code: 'SYSROOT_TIDAK_VALID',
        pipelineStatus: 'GALAT_LINKER',
        normalizedSysroot: trimmed,
        message: `Sysroot '${trimmed}' milik arsitektur x86_64 dan tidak cocok untuk target '${targetInfo.triple}'.`,
      };
    }
    if (
      targetInfo.arch === 'x86_64' &&
      (normalized.includes('aarch64-linux-gnu') || normalized.includes('arm64-linux-gnu'))
    ) {
      return {
        valid: false,
        code: 'SYSROOT_TIDAK_VALID',
        pipelineStatus: 'GALAT_LINKER',
        normalizedSysroot: trimmed,
        message: `Sysroot '${trimmed}' milik arsitektur ARM64/aarch64 dan tidak cocok untuk target '${targetInfo.triple}'.`,
      };
    }

    // 3. Pastikan direktori sysroot benar-benar ada di disk
    if (!safeFS.existsSync(trimmed)) {
      return {
        valid: false,
        code: 'SYSROOT_TIDAK_DITEMUKAN',
        pipelineStatus: 'CROSS_SDK_TIDAK_TERSEDIA',
        normalizedSysroot: trimmed,
        message: `Direktori sysroot target '${targetInfo.triple}' tidak ditemukan: ${trimmed}`,
      };
    }

    // 4. Validasi keberadaan header standar C (stdio.h)
    const gnuTriple =
      targetInfo.arch === 'aarch64' ? 'aarch64-linux-gnu' : 'x86_64-linux-gnu';
    const headerCandidates =
      normalized === '/'
        ? [
            '/usr/include/stdio.h',
            `/usr/include/${gnuTriple}/stdio.h`,
            '/usr/local/include/stdio.h',
          ]
        : [
            safePath.join(trimmed, 'usr/include/stdio.h'),
            safePath.join(trimmed, `usr/include/${gnuTriple}/stdio.h`),
            safePath.join(trimmed, 'include/stdio.h'),
          ];

    const hasStdio = headerCandidates.some((p) => safeFS.existsSync(p));
    if (!hasStdio) {
      return {
        valid: false,
        code: 'SYSROOT_TIDAK_VALID',
        pipelineStatus: 'GALAT_LINKER',
        normalizedSysroot: trimmed,
        message: `Sysroot '${trimmed}' tidak memiliki header standar C (usr/include/stdio.h atau include/stdio.h) untuk target '${targetInfo.triple}'. Pastikan menunjuk root sysroot (misalnya '/' atau '/usr/aarch64-linux-gnu'), bukan '/usr/lib/...'.`,
      };
    }

    // 5. Validasi keberadaan C runtime startup (crt1.o/Scrt1.o/crt0.o) & libc
    const crtDirs =
      normalized === '/'
        ? [
            `/usr/lib/${gnuTriple}`,
            `/lib/${gnuTriple}`,
            '/usr/lib64',
            '/lib64',
            '/usr/lib',
            '/lib',
          ]
        : [
            safePath.join(trimmed, 'lib'),
            safePath.join(trimmed, 'usr/lib'),
            safePath.join(trimmed, 'lib64'),
            safePath.join(trimmed, 'usr/lib64'),
            safePath.join(trimmed, `lib/${gnuTriple}`),
            safePath.join(trimmed, `usr/lib/${gnuTriple}`),
          ];

    const crtFiles = ['crt1.o', 'Scrt1.o', 'crt0.o', 'libc.so', 'libc.a', 'libc.so.6'];
    const hasCrt = crtDirs.some((dir) =>
      crtFiles.some((file) => safeFS.existsSync(safePath.join(dir, file)))
    );

    if (!hasCrt) {
      return {
        valid: false,
        code: 'SYSROOT_CRT_TIDAK_DITEMUKAN',
        pipelineStatus: 'CROSS_SDK_TIDAK_TERSEDIA',
        normalizedSysroot: trimmed,
        message: `Sysroot '${trimmed}' memiliki stdio.h namun tidak memuat C runtime startup/libc (crt1.o/Scrt1.o/libc.so/libc.a) untuk target '${targetInfo.triple}'.`,
      };
    }

    return {
      valid: true,
      normalizedSysroot: normalized === '/' ? '/' : trimmed,
    };
  }

  public static validateLibraryPaths(
    libraryPaths: string[] | undefined,
    targetInfo: TargetPlatformInfo
  ): SysrootValidationResult {
    if (!libraryPaths || libraryPaths.length === 0) {
      return { valid: true };
    }

    if (targetInfo.os === 'linux') {
      const forbiddenMarkers =
        targetInfo.arch === 'aarch64'
          ? ['x86_64-linux-gnu']
          : targetInfo.arch === 'x86_64'
          ? ['aarch64-linux-gnu', 'arm64-linux-gnu']
          : [];

      for (const marker of forbiddenMarkers) {
        const wrongLibPath = libraryPaths.find((lp) =>
          (lp || '').replace(/\\/g, '/').includes(marker)
        );
        if (wrongLibPath) {
          return {
            valid: false,
            code: 'LIBRARY_TARGET_SALAH',
            pipelineStatus: 'GALAT_LINKER',
            message: `Jalur library '${wrongLibPath}' milik arsitektur yang salah untuk target '${targetInfo.triple}'.`,
          };
        }
      }
    }

    return { valid: true };
  }
}
