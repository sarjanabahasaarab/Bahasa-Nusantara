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

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { ToolchainDetector } from './toolchain-detector';
import { PengemasArsip } from '../../../build/pengemasArsip';

export type BootValidationStatus =
  | 'QEMU_BOOT_PASS'
  | 'QEMU_BOOT_FAIL'
  | 'QEMU_NOT_AVAILABLE'
  | 'SIMULATION_ONLY';

export interface QEMURunOptions {
  kernelPath: string;
  memoryMb?: number;
  timeoutMs?: number;
  useISADebugExit?: boolean;
  extraArgs?: string[];
}

export interface QEMUBootResult {
  status: BootValidationStatus;
  success: boolean;
  command: string;
  qemuVersion?: string;
  serialLog: string;
  sentinelFound: boolean;
  exitCode?: number;
  durationMs: number;
  kernelSha256?: string;
  error?: string;
}

export class QEMURunner {
  public static readonly REQUIRED_SENTINEL = 'NUSANTARA_KERNEL_BOOT_OK';

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

    if (!fs.existsSync(options.kernelPath)) {
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

    const kernelBytes = fs.readFileSync(options.kernelPath);
    const kernelSha256 = PengemasArsip.hitungHashSederhana(kernelBytes.toString('binary'));

    const memoryMb = options.memoryMb ?? 128;
    const timeoutMs = options.timeoutMs ?? 10000;

    const logFile = path.join(process.cwd(), 'qemu-serial.log');
    if (fs.existsSync(logFile)) {
      try {
        fs.unlinkSync(logFile);
      } catch {}
    }

    // Argumen QEMU standar headless untuk pengujian otomatis:
    // -kernel: Direct Multiboot kernel loader
    // -m: RAM size
    // -display none / -nographic: Headless
    // -serial file:<logFile>: Simpan output port COM1 ke berkas
    // -no-reboot -no-shutdown
    // -device isa-debug-exit,iobase=0xf4,iosize=0x04 (jika diminta)
    const qemuArgs = [
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
      '-no-shutdown',
    ];

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
        if (fs.existsSync(logFile)) {
          try {
            serialContent = fs.readFileSync(logFile, 'utf-8');
          } catch {}
        }

        const sentinelFound = serialContent.includes(QEMURunner.REQUIRED_SENTINEL);
        const isPass = sentinelFound;

        resolve({
          status: isPass ? 'QEMU_BOOT_PASS' : 'QEMU_BOOT_FAIL',
          success: isPass,
          command: fullCommand,
          qemuVersion: toolchain.qemuVersion,
          serialLog: serialContent,
          sentinelFound,
          exitCode,
          durationMs: Date.now() - awal,
          kernelSha256,
          error: errorMsg,
        });
      };

      try {
        proc = spawn('qemu-system-x86_64', qemuArgs, {
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
