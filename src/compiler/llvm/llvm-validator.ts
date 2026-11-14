/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA LLVM BACKEND - LLVM IR Validator Menggunakan Toolchain
 * Target Milestone: Phase 44 (v0.44.0)
 */

import { safeCP, safeFS, safeOS, safePath } from './node-compat';
import { LLVMDiagnosticsManager } from './diagnostics';
import { LLVMToolchainStatus } from './toolchain-manager';

export interface LLVMValidationResult {
  valid: boolean;
  toolUsed?: string;
  output: string;
  diagnostics: string[];
}

export class LLVMValidator {
  constructor(
    private readonly toolchain: LLVMToolchainStatus,
    private readonly diag: LLVMDiagnosticsManager = new LLVMDiagnosticsManager()
  ) {}

  public validateIR(llvmIR: string): LLVMValidationResult {
    // 1. Validasi semantik statis internal terlebih dahulu
    const internalErrors = this.validateInternalSyntax(llvmIR);
    if (internalErrors.length > 0) {
      for (const err of internalErrors) {
        this.diag.error('LLVM_SYNTAX_INVALID', err);
      }
      return {
        valid: false,
        output: internalErrors.join('\n'),
        diagnostics: internalErrors,
      };
    }

    // 2. Jika tool llvm-as tersedia, jalankan assembler check
    if (this.toolchain.binaries.llvmAs.found) {
      const llvmAsCmd = this.toolchain.binaries.llvmAs.command;
      const tmpDir = safeFS.mkdtempSync(safePath.join(safeOS.tmpdir(), 'nusantara-llvm-val-'));
      const irPath = safePath.join(tmpDir, 'test.ll');
      const bcPath = safePath.join(tmpDir, 'test.bc');

      try {
        safeFS.writeFileSync(irPath, llvmIR, 'utf-8');
        const res = safeCP.spawnSync(llvmAsCmd, [irPath, '-o', bcPath], {
          encoding: 'utf-8',
          timeout: 10000,
          shell: false,
        });

        const success = res.status === 0;
        const msg = (res.stderr || res.stdout || '').trim();

        if (!success) {
          this.diag.error('LLVM_AS_ERROR', msg || 'llvm-as gagal memvalidasi LLVM IR.');
        }

        return {
          valid: success,
          toolUsed: 'llvm-as',
          output: msg,
          diagnostics: success ? [] : [msg],
        };
      } finally {
        try {
          safeFS.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // Abaikan error pembersihan temp
        }
      }
    }

    // Jika toolchain eksternal tidak terpasang, hasil validasi statis internal diterima
    return {
      valid: true,
      output: 'Validasi statis internal LLVM IR lulus (llvm-as eksternal tidak terpasang).',
      diagnostics: [],
    };
  }

  private validateInternalSyntax(ir: string): string[] {
    const errors: string[] = [];
    const lines = ir.split('\n');

    let openBraces = 0;
    const declaredGlobals = new Set<string>();
    const declaredAttributes = new Set<string>();
    const declaredStringByteLengths = new Map<string, number>();

    // Pass 1: Kumpulkan seluruh global dan attribute group yang dideklarasikan
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const line = rawLine.trim();
      const lineNum = i + 1;

      if (!line || line.startsWith(';')) continue;

      const globalMatch = line.match(/^(@[\w.$]+)\s*=\s*(.+)$/);
      if (globalMatch) {
        const symName = globalMatch[1];
        const rhs = globalMatch[2];
        declaredGlobals.add(symName);

        // Validasi konsistensi ukuran array pada deklarasi string: [N x i8] c"...\00"
        const strDeclMatch = rhs.match(/\[(\d+)\s*x\s*i8\]\s*c"((?:[^"\\]|\\.)*)"/);
        if (strDeclMatch) {
          const declaredLen = parseInt(strDeclMatch[1], 10);
          const escapedBody = strDeclMatch[2];
          const computedLen = this.countLLVMStringLiteralBytes(escapedBody);
          declaredStringByteLengths.set(symName, declaredLen);
          if (declaredLen !== computedLen) {
            errors.push(
              `Baris ${lineNum}: Panjang literal string ${symName} tidak cocok ([${declaredLen} x i8] vs aktual ${computedLen} byte).`
            );
          }
        }
      }

      const attrMatch = line.match(/^attributes\s+(#\d+)\s*=/);
      if (attrMatch) {
        declaredAttributes.add(attrMatch[1]);
      }
    }

    // Pass 2: Periksa struktur blok, terminator, dan seluruh referensi simbol @.str / #attr
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      if (!line || line.startsWith(';')) continue;

      for (const ch of line) {
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
      }

      if (line.includes('unreachable') && line.includes('ret ')) {
        errors.push(`Baris ${lineNum}: Terminator ganda pada satu baris.`);
      }

      // Guard regresi spesifik bug @.str._v<N>
      const badLegacyRef = line.match(/@\.str\._v\d+/);
      if (badLegacyRef) {
        errors.push(
          `Baris ${lineNum}: Terdeteksi simbol string tak valid '${badLegacyRef[0]}' (sisa ID NIR %v tidak selaras dengan deklarasi global).`
        );
      }

      // Validasi seluruh referensi global string @.str... di luar baris deklarasi global itu sendiri
      const isGlobalDef = /^@[\w.$]+\s*=/.test(line);
      if (!isGlobalDef) {
        const strRefs = line.match(/@\.str[\w.$]*/g);
        if (strRefs) {
          for (const ref of strRefs) {
            if (!declaredGlobals.has(ref)) {
              errors.push(`Baris ${lineNum}: Referensi simbol string global tidak terdefinisi '${ref}'.`);
            }
          }
        }
      }

      // Validasi referensi attribute group #N pada deklarasi/definisi fungsi
      if (line.startsWith('define ') || line.startsWith('declare ')) {
        const attrRefs = line.match(/#\d+/g);
        if (attrRefs) {
          for (const attrRef of attrRefs) {
            if (!declaredAttributes.has(attrRef)) {
              errors.push(`Baris ${lineNum}: Referensi attribute group tidak terdefinisi '${attrRef}'.`);
            }
          }
        }
      }
    }

    if (openBraces !== 0) {
      errors.push(`Struktur kurung kurawal fungsi tidak seimbang (open braces: ${openBraces}).`);
    }

    return errors;
  }

  private countLLVMStringLiteralBytes(escapedBody: string): number {
    let count = 0;
    for (let i = 0; i < escapedBody.length; i++) {
      if (escapedBody[i] === '\\') {
        const hexPair = escapedBody.slice(i + 1, i + 3);
        if (/^[0-9a-fA-F]{2}$/.test(hexPair)) {
          count += 1;
          i += 2;
        } else {
          count += 1;
          i += 1;
        }
      } else {
        count += 1;
      }
    }
    return count;
  }
}
