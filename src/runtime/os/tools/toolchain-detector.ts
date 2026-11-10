/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Detektor Toolchain Bare-Metal Kernel & Emulator QEMU (Phase 49)
 *
 * Mendeteksi kehadiran perangkat lunak host yang diperlukan untuk kompilasi
 * bare-metal dan eksekusi emulator x86_64 secara transparan tanpa klaim palsu.
 */

import { execSync } from 'child_process';

export interface ToolchainStatus {
  hasQEMU: boolean;
  qemuVersion?: string;
  hasClang: boolean;
  clangVersion?: string;
  hasLLD: boolean;
  lldVersion?: string;
  hasGCC: boolean;
  gccVersion?: string;
  hasLD: boolean;
  hasXorriso: boolean;
  hasGRUB: boolean;
  hasGDB: boolean;
  installationGuide: {
    debianUbuntu: string;
    archLinux: string;
    macos: string;
    windows: string;
  };
}

export class ToolchainDetector {
  private static cachedStatus?: ToolchainStatus;

  /**
   * Jalankan command dengan aman tanpa melempar exception fatal.
   */
  private static runProbe(cmd: string): string | null {
    try {
      const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 3000 });
      return out.toString().trim();
    } catch {
      return null;
    }
  }

  public static detect(): ToolchainStatus {
    if (this.cachedStatus) return this.cachedStatus;

    // 1. Cek QEMU
    const qemuOut = this.runProbe('qemu-system-x86_64 --version');
    const hasQEMU = qemuOut !== null;
    const qemuVersion = qemuOut ? qemuOut.split('\n')[0] : undefined;

    // 2. Cek Clang
    const clangOut = this.runProbe('clang --version');
    const hasClang = clangOut !== null;
    const clangVersion = clangOut ? clangOut.split('\n')[0] : undefined;

    // 3. Cek LLD
    const lldOut = this.runProbe('ld.lld --version');
    const hasLLD = lldOut !== null;
    const lldVersion = lldOut ? lldOut.split('\n')[0] : undefined;

    // 4. Cek GCC
    const gccOut = this.runProbe('gcc --version');
    const hasGCC = gccOut !== null;
    const gccVersion = gccOut ? gccOut.split('\n')[0] : undefined;

    // 5. Cek LD
    const ldOut = this.runProbe('ld --version');
    const hasLD = ldOut !== null;

    // 6. Cek Xorriso
    const xorrisoOut = this.runProbe('xorriso -version');
    const hasXorriso = xorrisoOut !== null;

    // 7. Cek GRUB mkrescue
    const grubOut = this.runProbe('grub-mkrescue --version');
    const hasGRUB = grubOut !== null;

    // 8. Cek GDB
    const gdbOut = this.runProbe('gdb --version');
    const hasGDB = gdbOut !== null;

    this.cachedStatus = {
      hasQEMU,
      qemuVersion,
      hasClang,
      clangVersion,
      hasLLD,
      lldVersion,
      hasGCC,
      gccVersion,
      hasLD,
      hasXorriso,
      hasGRUB,
      hasGDB,
      installationGuide: {
        debianUbuntu:
          'sudo apt-get update && sudo apt-get install -y qemu-system-x86 clang lld xorriso grub-pc-bin gdb',
        archLinux:
          'sudo pacman -S qemu-system-x86 clang lld xorriso grub gdb',
        macos:
          'brew install qemu llvm xorriso x86_64-elf-gdb',
        windows:
          'winget install SoftwareFreedomConservancy.QEMU && winget install LLVM.LLVM',
      },
    };

    return this.cachedStatus;
  }

  public static formatReport(): string {
    const s = this.detect();
    let out = '======================================================================\n';
    out += '       STATUS DETEKSI PERANGKAT LUNAK HOST TOOLCHAIN KERNEL OS        \n';
    out += '======================================================================\n';
    out += `1. QEMU Emulator (qemu-system-x86_64) : ${s.hasQEMU ? `TERSEDIA (${s.qemuVersion})` : 'TIDAK TERPASANG'}\n`;
    out += `2. Kompiler Clang (LLVM backend)      : ${s.hasClang ? `TERSEDIA (${s.clangVersion})` : 'TIDAK TERPASANG'}\n`;
    out += `3. Linker LLD (LLVM linker)           : ${s.hasLLD ? `TERSEDIA (${s.lldVersion})` : 'TIDAK TERPASANG'}\n`;
    out += `4. Kompiler GNU C (GCC)               : ${s.hasGCC ? `TERSEDIA (${s.gccVersion})` : 'TIDAK TERPASANG'}\n`;
    out += `5. Pembuat Image ISO (xorriso)        : ${s.hasXorriso ? 'TERSEDIA' : 'TIDAK TERPASANG'}\n`;
    out += `6. Bootloader Rescue (grub-mkrescue)  : ${s.hasGRUB ? 'TERSEDIA' : 'TIDAK TERPASANG'}\n`;
    out += `7. Debugger Simbolik (GDB)            : ${s.hasGDB ? 'TERSEDIA' : 'TIDAK TERPASANG'}\n`;

    if (!s.hasQEMU) {
      out += `\n[PENTING] Emulator QEMU tidak ditemukan pada lingkungan host saat ini.\n`;
      out += `Untuk menjalankan boot native pada emulator sungguhan, pasang dengan perintah:\n`;
      out += `  - Debian/Ubuntu: ${s.installationGuide.debianUbuntu}\n`;
      out += `  - Arch Linux   : ${s.installationGuide.archLinux}\n`;
      out += `  - macOS (Homebrew): ${s.installationGuide.macos}\n`;
      out += `  - Windows      : ${s.installationGuide.windows}\n`;
    }

    out += '======================================================================\n';
    return out;
  }
}
