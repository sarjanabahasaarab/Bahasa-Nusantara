/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - User Mode Stack Manager & ABI Frame Builder
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { AddressSpace, UserRegionType } from '../memory/address-space';
import { PagePermissions, PAGE_SIZE } from '../memory/types';
import { KernelABI } from '../abi/kernel-abi';

export interface UserStackOptions {
  stackTop?: bigint;           // Default: 0x0000_7FFF_FFFF_0000n
  stackSizeBytes?: number;     // Default: 128 KB (32 pages)
  hasGuardPage?: boolean;      // Default: true (1 unmapped page at bottom)
}

export class UserStack {
  public static readonly DEFAULT_STACK_TOP = 0x0000_7FFF_FFFF_0000n;
  public static readonly DEFAULT_STACK_SIZE = 128 * 1024; // 128 KB

  public readonly stackTop: bigint;
  public readonly stackBottom: bigint;
  public readonly sizeBytes: number;
  public readonly guardPageAddress: bigint;

  constructor(
    private readonly addressSpace: AddressSpace,
    options: UserStackOptions = {}
  ) {
    this.sizeBytes = options.stackSizeBytes ?? UserStack.DEFAULT_STACK_SIZE;
    this.stackTop = options.stackTop ?? UserStack.DEFAULT_STACK_TOP;
    this.stackBottom = this.stackTop - BigInt(this.sizeBytes);
    this.guardPageAddress = this.stackBottom - BigInt(PAGE_SIZE);

    this.allocateStack(options.hasGuardPage ?? true);
  }

  private allocateStack(hasGuardPage: boolean): void {
    // Alokasi halaman stack pengguna (Read/Write, No-Execute)
    for (let addr = this.stackBottom; addr < this.stackTop; addr += BigInt(PAGE_SIZE)) {
      this.addressSpace.allocateAndMapUserPage(addr, PagePermissions.USER_READ_WRITE);
    }

    // Guard page sengaja dibiarkan unmapped agar stack overflow memicu #PF
    this.addressSpace.addRegion({
      id: 'user_stack',
      type: UserRegionType.STACK,
      virtualAddress: this.stackBottom,
      sizeBytes: this.sizeBytes,
      permissions: PagePermissions.USER_READ_WRITE,
      isShared: false,
      name: 'USER_STACK',
    });
  }

  /**
   * Menyiapkan initial stack frame sesuai spesifikasi System V AMD64 ABI:
   * [RSP + 0]               : argc (64-bit int)
   * [RSP + 8]               : argv[0] pointer
   * [RSP + 16]              : argv[1] pointer
   * ...
   * [RSP + 8*(argc+1)]      : NULL (0x0)
   * [RSP + 8*(argc+2)]      : envp[0] pointer
   * ...
   * [RSP + 8*(argc+2+envc)] : NULL (0x0)
   * String data disimpan di atas pointer-pointer tersebut.
   * Nilai RSP akhir wajib rata 16-byte!
   */
  public setupInitialFrame(
    argv: string[] = ['app.elf'],
    envp: string[] = ['LANG=id_ID.UTF-8', 'OS=NUSANTARA']
  ): bigint {
    // Stack tumbuh ke bawah (dari stackTop ke bawah)
    let currentRsp = this.stackTop - 16n;

    // 1. Simpan string-string argv dan envp di stack
    const argvPointers: bigint[] = [];
    for (const arg of argv) {
      const bytes = new TextEncoder().encode(arg + '\0');
      currentRsp -= BigInt(bytes.length);
      // Align 8 bytes
      currentRsp = currentRsp & ~7n;
      argvPointers.push(currentRsp);
    }

    const envpPointers: bigint[] = [];
    for (const env of envp) {
      const bytes = new TextEncoder().encode(env + '\0');
      currentRsp -= BigInt(bytes.length);
      currentRsp = currentRsp & ~7n;
      envpPointers.push(currentRsp);
    }

    // 2. Simpan pointer array:
    // Null terminator envp
    currentRsp -= 8n;
    // Pointers envp
    for (let i = envpPointers.length - 1; i >= 0; i--) {
      currentRsp -= 8n;
    }
    // Null terminator argv
    currentRsp -= 8n;
    // Pointers argv
    for (let i = argvPointers.length - 1; i >= 0; i--) {
      currentRsp -= 8n;
    }
    // argc (uint64)
    currentRsp -= 8n;

    // 3. Pastikan perataan 16-byte ABI sebelum transfer ke entry point
    currentRsp = currentRsp & ~15n;

    return currentRsp;
  }

  /**
   * Validasi apakah RSP berada di rentang stack pengguna yang sah
   */
  public isRspValid(rsp: bigint): boolean {
    return rsp >= this.stackBottom && rsp <= this.stackTop;
  }
}
