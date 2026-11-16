/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Strict 18-Sentinel Validator & Forensic Reporter for QEMU Bare-Metal Execution (Phase 23.10 / Phase 50)
 *
 * Enforces strict sequential verification of all 18 hardware boot & Ring 3 sentinels,
 * rejects duplicate/out-of-order/missing/early-exit/forged serial logs, checks ISA debug-exit
 * and timeout status, records kernel panic diagnostics, and hashes runtime artifacts.
 */

import { safeFS, safePath } from '../../../compiler/llvm/node-compat';

export type SentinelComponentStatus = 'PASS' | 'PARTIAL' | 'FAIL';

export interface SentinelMatchDetail {
  index: number;
  sentinel: string;
  matchedInOrder: boolean;
  lineNumber: number | null;
  occurrences: number;
  occurrenceLines: number[];
}

export interface SentinelValidationOptions {
  serialLog: string;
  debugLog?: string;
  exitCode?: number | null;
  expectedExitCodes?: number[];
  artifactsDir?: string;
  requiredArtifacts?: string[];
  requireDebugLog?: boolean;
}

export interface SentinelValidationReport {
  schemaVersion: '1.0';
  checkedAt: string;
  totalRequired: number;
  sequentialMatchedCount: number;
  exitCode: number | null;
  expectedExitCodes: number[];
  exitCodeValid: boolean;
  timedOut: boolean;
  hasPanic: boolean;
  panicLines: string[];
  duplicateSentinels: string[];
  outOfOrderSentinels: string[];
  missingSentinels: string[];
  earlyExitDetected: boolean;
  violations: string[];
  bootStatus: SentinelComponentStatus;
  ring3Status: SentinelComponentStatus;
  processIsolationStatus: SentinelComponentStatus;
  faultHandlingStatus: SentinelComponentStatus;
  kernelFinalStatus: SentinelComponentStatus;
  overallStatus: SentinelComponentStatus;
  artifactSha256: Record<string, string>;
  stages: SentinelMatchDetail[];
}

function computeNodeSha256(data: Uint8Array | string): string | null {
  if (typeof window !== 'undefined' || typeof process === 'undefined') return null;
  try {
    const proc = process as any;
    const cryptoMod =
      typeof proc.getBuiltinModule === 'function'
        ? proc.getBuiltinModule('crypto')
        : typeof require === 'function'
        ? require('crypto')
        : null;
    if (!cryptoMod || typeof cryptoMod.createHash !== 'function') return null;
    return cryptoMod.createHash('sha256').update(data).digest('hex');
  } catch {
    return null;
  }
}

export class QEMUSentinelValidator {
  public static readonly OFFICIAL_SENTINELS: readonly string[] = [
    'NUSANTARA_BOOT_START',
    'NUSANTARA_MULTIBOOT2_OK',
    'NUSANTARA_CPU_LONG_MODE_OK',
    'NUSANTARA_PAGING_OK',
    'NUSANTARA_GDT64_OK',
    'NUSANTARA_LONG_MODE_ENTERED',
    'NUSANTARA_IDT_OK',
    'NUSANTARA_MEMORY_MANAGER_OK',
    'NUSANTARA_KERNEL_MAIN_ENTERED',
    'NUSANTARA_KERNEL_BOOT_OK',
    'NUSANTARA_USERMODE_ENTERED',
    'HELLO FROM NUSANTARA USER MODE',
    'NUSANTARA_SYSCALL_OK',
    'NUSANTARA_PROCESS_EXIT_OK',
    'NUSANTARA_PROCESS_ISOLATION_OK',
    'NUSANTARA_USER_FAULT_ISOLATED',
    'NUSANTARA_KERNEL_SURVIVED_USER_FAULT',
    'NUSANTARA_USERMODE_TEST_PASS',
  ];

  public static validate(options: SentinelValidationOptions): SentinelValidationReport {
    const expectedExitCodes = options.expectedExitCodes ?? [1];
    const exitCode = options.exitCode === undefined ? null : options.exitCode;
    const timedOut = exitCode === 124;
    const exitCodeValid = exitCode !== null && expectedExitCodes.includes(exitCode);

    const normalizedLog = (options.serialLog || '').replace(/\r\n/g, '\n');
    const lines = normalizedLog.split('\n');
    const nonEmptyLines = lines.filter((l) => l.trim().length > 0);

    const violations: string[] = [];
    if (nonEmptyLines.length === 0) {
      violations.push('EMPTY_SERIAL_LOG: Log serial QEMU kosong atau tidak berisi output valid.');
    }

    const panicLines = lines.filter(
      (l) =>
        l.includes('NUSANTARA_KERNEL_PANIC') ||
        l.includes('NUSANTARA_EXCEPTION_DIAG')
    );
    const hasPanic = panicLines.length > 0;
    if (hasPanic) {
      violations.push(`KERNEL_PANIC_DETECTED: ${panicLines[0].trim()}`);
    }

    if (timedOut) {
      violations.push('QEMU_TIMEOUT: Eksekusi QEMU mencapai batas waktu (exit code 124).');
    } else if (!exitCodeValid) {
      violations.push(
        `INVALID_EXIT_CODE: Kode keluar QEMU aktual ${exitCode}, diharapkan [${expectedExitCodes.join(', ')}].`
      );
    }

    if (options.requireDebugLog && (!options.debugLog || options.debugLog.trim().length === 0)) {
      // Catat bila debugLog wajib disediakan tapi hilang (QEMU -D selalu membuat berkas walau kosong jika tak ada reset)
      // File empty is normal when no cpu_reset/guest_error occurs, so only fail when undefined.
      if (options.debugLog === undefined) {
        violations.push('MISSING_DEBUG_LOG: Berkas qemu-debug.log tidak ditemukan.');
      }
    }

    const stages: SentinelMatchDetail[] = [];
    const duplicateSentinels: string[] = [];
    const outOfOrderSentinels: string[] = [];
    const missingSentinels: string[] = [];

    let lastMatchedLineIdx = -1;
    let sequentialMatchedCount = 0;

    for (let i = 0; i < this.OFFICIAL_SENTINELS.length; i++) {
      const sentinel = this.OFFICIAL_SENTINELS[i];
      const occLines: number[] = [];
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        if (lines[lineIdx].includes(sentinel)) {
          occLines.push(lineIdx + 1); // 1-indexed
        }
      }

      if (occLines.length > 1) {
        duplicateSentinels.push(sentinel);
        violations.push(
          `DUPLICATE_SENTINEL: '${sentinel}' muncul ${occLines.length} kali (baris: ${occLines.join(', ')}).`
        );
      }

      const nextLineZeroIdx = occLines.find((ln) => ln - 1 > lastMatchedLineIdx);
      if (nextLineZeroIdx !== undefined) {
        lastMatchedLineIdx = nextLineZeroIdx - 1;
        sequentialMatchedCount++;
        stages.push({
          index: i + 1,
          sentinel,
          matchedInOrder: true,
          lineNumber: nextLineZeroIdx,
          occurrences: occLines.length,
          occurrenceLines: occLines,
        });
      } else {
        if (occLines.length > 0) {
          outOfOrderSentinels.push(sentinel);
          violations.push(
            `OUT_OF_ORDER_SENTINEL: '${sentinel}' muncul di luar urutan (baris ${occLines.join(', ')}, harus setelah baris ${lastMatchedLineIdx + 1}).`
          );
        } else {
          missingSentinels.push(sentinel);
          violations.push(`MISSING_SENTINEL: '${sentinel}' tidak ditemukan secara berurutan.`);
        }
        stages.push({
          index: i + 1,
          sentinel,
          matchedInOrder: false,
          lineNumber: occLines[0] ?? null,
          occurrences: occLines.length,
          occurrenceLines: occLines,
        });
      }
    }

    const earlyExitDetected =
      nonEmptyLines.length > 0 &&
      sequentialMatchedCount > 0 &&
      sequentialMatchedCount < this.OFFICIAL_SENTINELS.length &&
      missingSentinels.length > 0;

    if (earlyExitDetected) {
      violations.push(
        `EARLY_EXIT_DETECTED: Eksekusi berhenti pada tahap ${sequentialMatchedCount}/${this.OFFICIAL_SENTINELS.length}.`
      );
    }

    // Verifikasi & hash artefak apabila artifactsDir disediakan
    const artifactSha256: Record<string, string> = {};
    if (options.artifactsDir) {
      const candidateFiles = [
        'kernel.elf',
        'user-test.elf',
        'user-fault-test.elf',
        'nusantara-phase50.iso',
        'serial.log',
        'qemu.log',
        'boot.log',
        'qemu-debug.log',
        'qemu-exit-code.txt',
      ];
      for (const rel of candidateFiles) {
        const full = safePath.join(options.artifactsDir, rel);
        if (safeFS.existsSync(full)) {
          const bytes = safeFS.readFileBufferSync(full);
          const sha = computeNodeSha256(bytes);
          if (sha) {
            artifactSha256[rel] = sha;
          }
        }
      }

      if (options.requiredArtifacts) {
        for (const reqRel of options.requiredArtifacts) {
          const reqPath = safePath.join(options.artifactsDir, reqRel);
          if (!safeFS.existsSync(reqPath)) {
            violations.push(`MISSING_ARTIFACT: Artefak wajib '${reqRel}' tidak ditemukan.`);
          } else {
            const st = safeFS.statSync(reqPath);
            if (reqRel !== 'qemu-debug.log' && (!st || st.size === 0)) {
              violations.push(`EMPTY_ARTIFACT: Artefak '${reqRel}' berukuran 0 byte.`);
            }
          }
        }
      }
    }

    // Hitung status granular per komponen
    const groupStatus = (startIdx: number, endIdx: number, requireCleanExit = false): SentinelComponentStatus => {
      const slice = stages.slice(startIdx, endIdx + 1);
      const allMatched = slice.every((s) => s.matchedInOrder && s.occurrences === 1);
      const anyMatched = slice.some((s) => s.occurrences > 0);
      const hasDupOrOrder = slice.some((s) => duplicateSentinels.includes(s.sentinel) || outOfOrderSentinels.includes(s.sentinel));

      if (hasPanic || timedOut || hasDupOrOrder) return 'FAIL';
      if (allMatched && (!requireCleanExit || exitCodeValid)) return 'PASS';
      if (anyMatched && !requireCleanExit) return 'PARTIAL';
      return 'FAIL';
    };

    const bootStatus = groupStatus(0, 9);
    const ring3Status = groupStatus(10, 13);
    const processIsolationStatus = groupStatus(14, 14);
    const faultHandlingStatus = groupStatus(15, 16);
    const kernelFinalStatus = groupStatus(17, 17, true);

    const allStagesClean =
      sequentialMatchedCount === this.OFFICIAL_SENTINELS.length &&
      duplicateSentinels.length === 0 &&
      outOfOrderSentinels.length === 0 &&
      missingSentinels.length === 0;

    let overallStatus: SentinelComponentStatus;
    if (violations.length === 0 && allStagesClean && exitCodeValid && !hasPanic && !timedOut) {
      overallStatus = 'PASS';
    } else if (
      !hasPanic &&
      !timedOut &&
      exitCodeValid &&
      duplicateSentinels.length === 0 &&
      outOfOrderSentinels.length === 0 &&
      sequentialMatchedCount > 0 &&
      !violations.some((v) => v.startsWith('MISSING_ARTIFACT') || v.startsWith('EMPTY_ARTIFACT'))
    ) {
      overallStatus = 'PARTIAL';
    } else {
      overallStatus = 'FAIL';
    }

    return {
      schemaVersion: '1.0',
      checkedAt: new Date().toISOString(),
      totalRequired: this.OFFICIAL_SENTINELS.length,
      sequentialMatchedCount,
      exitCode,
      expectedExitCodes,
      exitCodeValid,
      timedOut,
      hasPanic,
      panicLines: panicLines.map((l) => l.trim()),
      duplicateSentinels,
      outOfOrderSentinels,
      missingSentinels,
      earlyExitDetected,
      violations,
      bootStatus,
      ring3Status,
      processIsolationStatus,
      faultHandlingStatus,
      kernelFinalStatus,
      overallStatus,
      artifactSha256,
      stages,
    };
  }

  public static formatHumanSummary(report: SentinelValidationReport): string {
    const lines: string[] = [
      '======================================================================',
      '        LAPORAN VALIDASI SENTINEL QEMU STRICT (PHASE 23.10 / F50)     ',
      '======================================================================',
      `Status Keseluruhan     : ${report.overallStatus}`,
      `Boot Status (1-10)     : ${report.bootStatus}`,
      `Ring 3 UserMode (11-14): ${report.ring3Status}`,
      `Process Isolation (15) : ${report.processIsolationStatus}`,
      `Fault Handling (16-17) : ${report.faultHandlingStatus}`,
      `Kernel Final (18+Exit) : ${report.kernelFinalStatus}`,
      `Sentinel Berurutan     : ${report.sequentialMatchedCount} / ${report.totalRequired}`,
      `QEMU Exit Code         : ${report.exitCode} (Valid: ${report.exitCodeValid})`,
      `Timeout / Panic        : ${report.timedOut ? 'TIMEOUT' : 'NO_TIMEOUT'} / ${report.hasPanic ? 'PANIC' : 'NO_PANIC'}`,
      '----------------------------------------------------------------------',
    ];

    for (const s of report.stages) {
      const mark = s.matchedInOrder && s.occurrences === 1 ? '[✓]' : '[✗]';
      lines.push(
        `  ${mark} #${String(s.index).padStart(2, '0')} ${s.sentinel} (baris=${s.lineNumber ?? '-'}, jml=${s.occurrences})`
      );
    }

    if (report.violations.length > 0) {
      lines.push('----------------------------------------------------------------------');
      lines.push('Pelanggaran Terdeteksi:');
      for (const v of report.violations) {
        lines.push(`  - ${v}`);
      }
    }

    lines.push('======================================================================');
    return lines.join('\n');
  }
}
