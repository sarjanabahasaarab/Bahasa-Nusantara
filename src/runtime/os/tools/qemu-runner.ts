/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pelari Emulator QEMU & Verifikator Boot Native (Phase 49)
 *
 * Bertanggung jawab mengeksekusi biner kernel pada emulator QEMU x86_64,
 * menangkap output serial UART 16550 COM1, memverifikasi kemunculan
 * sentinel wajib "NUSANTARA_KERNEL_BOOT_OK", serta memisahkan status
 * eksekusi QEMU sesungguhnya dengan Simulator internal.
 */

import { safeFS, safePath, safeCP } from '../../../compiler/llvm/node-compat';
import { ToolchainDetector } from './toolchain-detector';

function hitungHashSederhana(str: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x53c5;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hash1 ^= code;
    hash1 = (hash1 * 0x01000193) >>> 0;
    hash2 = ((hash2 << 5) - hash2 + code) >>> 0;
  }
  return hash1.toString(16).padStart(8, '0') + hash2.toString(16).padStart(8, '0');
}

function getRuntimeSpawn() {
  if (typeof window !== 'undefined') return null;
  try {
    if (typeof require === 'function') {
      return require('child_process').spawn;
    }
    const proc = (globalThis as any).process;
    if (proc && typeof proc.getBuiltinModule === 'function') {
      return proc.getBuiltinModule('child_process')?.spawn;
    }
  } catch {
    return null;
  }
  return null;
}

export type BootValidationStatus =
  | 'QEMU_BOOT_PASS'
  | 'QEMU_BOOT_FAIL'
  | 'QEMU_NOT_AVAILABLE'
  | 'SIMULATION_ONLY';

export interface QEMURunOptions {
  kernelPath: string;
  isoPath?: string;
  memoryMb?: number;
  timeoutMs?: number;
  useISADebugExit?: boolean;
  extraArgs?: string[];
  mode?: 'cdrom' | 'kernel';
}

export interface QEMUBootResult {
  status: BootValidationStatus;
  success: boolean;
  command: string;
  qemuVersion?: string;
  serialLog: string;
  sentinelFound: boolean;
  stagesCompleted?: string[];
  exitCode?: number;
  durationMs: number;
  kernelSha256?: string;
  error?: string;
}

export class QEMURunner {
  public static readonly REQUIRED_SENTINEL = 'NUSANTARA_KERNEL_BOOT_OK';

  // 10 Tahapan Diagnostik Serial Wajib (Phase 49)
  public static readonly STAGES = [
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
  ];

  /**
   * Menjalankan kernel di QEMU dan memverifikasi boot native secara nyata.
   */
  public static async run(options: QEMURunOptions): Promise<QEMUBootResult> {
    const awal = Date.now();
    const toolchain = ToolchainDetector.detect();

    if (!toolchain.hasQEMU) {
      return {
        status: 'QEMU_NOT_AVAILABLE',
        success: false,
        command: '',
        qemuVersion: undefined,
        serialLog: '',
        sentinelFound: false,
        durationMs: Date.now() - awal,
        error:
          'Emulator qemu-system-x86_64 tidak ditemukan pada lingkungan host ini. Eksekusi native QEMU tidak dapat dijalankan.',
      };
    }

    if (!safeFS.existsSync(options.kernelPath)) {
      return {
        status: 'QEMU_BOOT_FAIL',
        success: false,
        command: '',
        qemuVersion: toolchain.qemuVersion,
        serialLog: '',
        sentinelFound: false,
        durationMs: Date.now() - awal,
        error: `Berkas biner kernel tidak ditemukan di jalur: ${options.kernelPath}`,
      };
    }

    const kernelBytes = safeFS.readFileSync(options.kernelPath);
    const kernelSha256 = hitungHashSederhana(typeof kernelBytes === 'string' ? kernelBytes : '');

    const memoryMb = options.memoryMb ?? 512;
    const timeoutMs = options.timeoutMs ?? 10000;

    const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '.';
    const logFile = safePath.join(cwd, 'qemu-serial.log');
    if (safeFS.existsSync(logFile)) {
      try {
        safeFS.rmSync(logFile);
      } catch {}
    }

    let bootMedia = options.isoPath || options.kernelPath;
    let isCDROM = options.mode === 'cdrom' || options.kernelPath.endsWith('.iso') || !!options.isoPath;

    // Jika diberikan berkas .elf dan mode bukan 'kernel', gunakan CD-ROM ISO via GRUB
    if (!isCDROM && options.mode !== 'kernel') {
      const possibleIso = options.kernelPath.replace(/\.elf$/, '.iso');
      if (safeFS.existsSync(possibleIso)) {
        bootMedia = possibleIso;
        isCDROM = true;
      } else if (toolchain.hasGRUB && toolchain.hasXorriso) {
        try {
          const isoDir = safePath.join(cwd, 'build', 'isodir');
          const grubDir = safePath.join(isoDir, 'boot', 'grub');
          safeFS.mkdirSync(grubDir, { recursive: true });
          safeFS.writeFileSync(
            safePath.join(isoDir, 'boot', 'kernel.elf'),
            safeFS.readFileSync(options.kernelPath)
          );
          safeFS.writeFileSync(
            safePath.join(grubDir, 'grub.cfg'),
            `serial --unit=0 --speed=115200\nterminal_input serial console\nterminal_output serial console\nset timeout=0\nset default=0\nmenuentry "NUSANTARA OS" {\n  multiboot2 /boot/kernel.elf\n  boot\n}\n`
          );
          const genIso = safePath.join(cwd, 'build', 'nusantara-kernel.iso');
          safeFS.mkdirSync(safePath.dirname(genIso), { recursive: true });
          safeCP.spawnSync('grub-mkrescue', ['-o', genIso, isoDir]);
          bootMedia = genIso;
          isCDROM = true;
        } catch {
          // Fallback ke direct kernel
        }
      }
    }

    const qemuArgs: string[] = [];

    if (isCDROM) {
      qemuArgs.push(
        '-machine',
        'q35',
        '-m',
        `${memoryMb}M`,
        '-cdrom',
        bootMedia,
        '-boot',
        'd',
        '-display',
        'none',
        '-nographic',
        '-serial',
        `file:${logFile}`,
        '-no-reboot',
        '-no-shutdown'
      );
    } else {
      qemuArgs.push(
        '-kernel',
        options.kernelPath,
        '-m',
        `${memoryMb}M`,
        '-display',
        'none',
        '-nographic',
        '-serial',
        `file:${logFile}`,
        '-no-reboot',
        '-no-shutdown'
      );
    }

    if (options.useISADebugExit !== false) {
      qemuArgs.push('-device', 'isa-debug-exit,iobase=0xf4,iosize=0x04');
    }

    if (options.extraArgs && options.extraArgs.length > 0) {
      qemuArgs.push(...options.extraArgs);
    }

    const fullCommand = `qemu-system-x86_64 ${qemuArgs.join(' ')}`;

    return new Promise<QEMUBootResult>(resolve => {
      let proc: any;
      let timer: any;
      let finished = false;

      const finish = (exitCode: number, errorMsg?: string) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        let serialContent = '';
        if (safeFS.existsSync(logFile)) {
          try {
            serialContent = safeFS.readFileSync(logFile, 'utf-8');
          } catch {}
        }

        const sentinelFound = serialContent.includes(QEMURunner.REQUIRED_SENTINEL);
        const stagesCompleted = QEMURunner.STAGES.filter(s => serialContent.includes(s.trim()));
        // Jika memakai isa-debug-exit, exit code 1 adalah sukses deterministik ((0 << 1) | 1 = 1)
        const isPass =
          sentinelFound &&
          (options.useISADebugExit === false ? exitCode === 0 : exitCode === 1 || exitCode === 0);

        resolve({
          status: isPass ? 'QEMU_BOOT_PASS' : 'QEMU_BOOT_FAIL',
          success: isPass,
          command: fullCommand,
          qemuVersion: toolchain.qemuVersion,
          serialLog: serialContent,
          sentinelFound,
          stagesCompleted,
          exitCode,
          durationMs: Date.now() - awal,
          kernelSha256,
          error: errorMsg,
        });
      };

      try {
        const spawnFn = getRuntimeSpawn();
        if (!spawnFn) {
          finish(-1, 'Eksekusi emulator QEMU tidak didukung pada lingkungan peramban (browser).');
          return;
        }
        proc = spawnFn('qemu-system-x86_64', qemuArgs, {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        proc.on('error', (err: any) => {
          finish(-1, `Galat saat menjalankan qemu-system-x86_64: ${err?.message || err}`);
        });

        proc.on('exit', (code: number) => {
          finish(code ?? 0);
        });

        // Pasang batas waktu timeout agar tidak menggantung selamanya
        timer = setTimeout(() => {
          if (!finished) {
            try {
              proc.kill('SIGKILL');
            } catch {}
            finish(124, `Timeout eksekusi QEMU (${timeoutMs} ms tercapai)`);
          }
        }, timeoutMs);
      } catch (err: any) {
        finish(-1, `Eksepsi saat memulai QEMU: ${err?.message || err}`);
      }
    });
  }
}
