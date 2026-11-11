/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Global Descriptor Table (GDT) & 64-bit Task State Segment (TSS)
 * Target Milestone: Phase 50 (v0.50.0)
 */

export enum SegmentSelector {
  KERNEL_NULL = 0x00,
  KERNEL_CODE = 0x08, // Ring 0 Code (DPL 0)
  KERNEL_DATA = 0x10, // Ring 0 Data (DPL 0)
  USER_DATA = 0x18 | 3, // Ring 3 Data (DPL 3, RPL 3 = 0x1B)
  USER_CODE = 0x20 | 3, // Ring 3 Code (DPL 3, RPL 3 = 0x23)
  TSS_DESCRIPTOR = 0x28, // 64-bit TSS (16 bytes, DPL 0)
}

/**
 * Struktur Task State Segment (TSS) 64-bit x86_64 Standar
 * Ukuran minimum: 104 bytes (0x68 bytes).
 *
 * Peran Krusial:
 * Saat terjadi interupsi/exception/syscall dari Ring 3 ke Ring 0,
 * perangkat keras CPU secara otomatis membaca RSP0 dari TSS
 * untuk mengganti RSP ke Kernel Stack thread yang sedang aktif.
 */
export interface TSS64 {
  reserved0: number; // 4 bytes
  rsp0: bigint;      // 8 bytes (Ring 0 Kernel Stack Pointer)
  rsp1: bigint;      // 8 bytes
  rsp2: bigint;      // 8 bytes
  reserved1: bigint; // 8 bytes
  ist1: bigint;      // 8 bytes (Interrupt Stack Table 1 - e.g. Double Fault)
  ist2: bigint;      // 8 bytes (IST 2 - e.g. Page Fault)
  ist3: bigint;      // 8 bytes
  ist4: bigint;      // 8 bytes
  ist5: bigint;      // 8 bytes
  ist6: bigint;      // 8 bytes
  ist7: bigint;      // 8 bytes
  reserved2: bigint; // 8 bytes
  reserved3: number; // 2 bytes
  ioMapBase: number; // 2 bytes (Batas I/O permission bitmap)
}

export class GDT64Manager {
  private static instance?: GDT64Manager;

  public readonly tss: TSS64;
  private readonly gdtBytes: Uint8Array;

  constructor() {
    this.tss = {
      reserved0: 0,
      rsp0: 0xFFFF_8000_1000_4000n, // Default 16KB kernel stack
      rsp1: 0n,
      rsp2: 0n,
      reserved1: 0n,
      ist1: 0xFFFF_8000_1000_8000n, // IST1: Double fault safe stack
      ist2: 0xFFFF_8000_1000_C000n, // IST2: Page fault safe stack
      ist3: 0n,
      ist4: 0n,
      ist5: 0n,
      ist6: 0n,
      ist7: 0n,
      reserved2: 0n,
      reserved3: 0,
      ioMapBase: 104, // 104 = tidak ada I/O bitmap di Ring 3 (I/O port terlindungi)
    };

    // Alokasi buffer GDT:
    // Entry 0: Null (8 B)
    // Entry 1: Kernel Code (8 B)
    // Entry 2: Kernel Data (8 B)
    // Entry 3: User Data (8 B)
    // Entry 4: User Code (8 B)
    // Entry 5: TSS Descriptor (16 B pada x86_64)
    // Total: 56 bytes
    this.gdtBytes = new Uint8Array(56);
    this.rebuildGDT();
  }

  public static getInstance(): GDT64Manager {
    if (!this.instance) {
      this.instance = new GDT64Manager();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = undefined;
  }

  /**
   * Mengatur stack pointer Ring 0 (RSP0) di dalam TSS sebelum berpindah ke thread pengguna
   */
  public setKernelStack(rsp0: bigint): void {
    this.tss.rsp0 = rsp0;
  }

  public getKernelStack(): bigint {
    return this.tss.rsp0;
  }

  /**
   * Mengatur Interrupt Stack Table (IST 1..7)
   */
  public setIST(index: number, istRsp: bigint): void {
    if (index < 1 || index > 7) {
      throw new Error(`Indeks IST tidak sah (1..7): ${index}`);
    }
    switch (index) {
      case 1: this.tss.ist1 = istRsp; break;
      case 2: this.tss.ist2 = istRsp; break;
      case 3: this.tss.ist3 = istRsp; break;
      case 4: this.tss.ist4 = istRsp; break;
      case 5: this.tss.ist5 = istRsp; break;
      case 6: this.tss.ist6 = istRsp; break;
      case 7: this.tss.ist7 = istRsp; break;
    }
  }

  /**
   * Membangun representasi biner GDT 64-bit lengkap
   */
  public rebuildGDT(tssBaseAddress: bigint = 0x0010_5800n): Uint8Array {
    const view = new DataView(this.gdtBytes.buffer);

    // Entry 0: 0x00 (Null Descriptor)
    view.setBigUint64(0, 0n, true);

    // Entry 1: 0x08 (Kernel Code 64-bit: DPL=0, L=1, D=0)
    // Limit=0xFFFF, Base=0, Access=0x9A (Present, Ring 0, Exec/Read), Flags=0xAF (Granularity, Long Mode)
    // 0x00AF9A000000FFFFn
    this.gdtBytes.set([0xFF, 0xFF, 0x00, 0x00, 0x00, 0x9A, 0xAF, 0x00], 8);

    // Entry 2: 0x10 (Kernel Data 64-bit: DPL=0, L=0, D=1)
    // Limit=0xFFFF, Base=0, Access=0x92 (Present, Ring 0, Read/Write), Flags=0xCF
    this.gdtBytes.set([0xFF, 0xFF, 0x00, 0x00, 0x00, 0x92, 0xCF, 0x00], 16);

    // Entry 3: 0x18 (User Data 64-bit: DPL=3, Selector = 0x1B)
    // Limit=0xFFFF, Base=0, Access=0xF2 (Present, Ring 3, Read/Write), Flags=0xCF
    this.gdtBytes.set([0xFF, 0xFF, 0x00, 0x00, 0x00, 0xF2, 0xCF, 0x00], 24);

    // Entry 4: 0x20 (User Code 64-bit: DPL=3, L=1, D=0, Selector = 0x23)
    // Limit=0xFFFF, Base=0, Access=0xFA (Present, Ring 3, Exec/Read), Flags=0xAF
    this.gdtBytes.set([0xFF, 0xFF, 0x00, 0x00, 0x00, 0xFA, 0xAF, 0x00], 32);

    // Entry 5 & 6: 0x28 (TSS 64-bit Descriptor - 16 Bytes)
    // Base: tssBaseAddress, Limit: 103 (0x67)
    const tssLimit = 103;
    const baseLow = Number(tssBaseAddress & 0xFFFFn);
    const baseMid = Number((tssBaseAddress >> 16n) & 0xFFn);
    const baseHigh = Number((tssBaseAddress >> 24n) & 0xFFn);
    const baseUpper = Number((tssBaseAddress >> 32n) & 0xFFFFFFFFn);

    // Byte 0..1: Limit 0..15
    this.gdtBytes[40] = tssLimit & 0xFF;
    this.gdtBytes[41] = (tssLimit >> 8) & 0xFF;
    // Byte 2..3: Base 0..15
    this.gdtBytes[42] = baseLow & 0xFF;
    this.gdtBytes[43] = (baseLow >> 8) & 0xFF;
    // Byte 4: Base 16..23
    this.gdtBytes[44] = baseMid;
    // Byte 5: Type & Attributes (0x89 = Present, DPL 0, 64-bit Available TSS)
    this.gdtBytes[45] = 0x89;
    // Byte 6: Limit 16..19 & Flags (0x00)
    this.gdtBytes[46] = (tssLimit >> 16) & 0x0F;
    // Byte 7: Base 24..31
    this.gdtBytes[47] = baseHigh;
    // Byte 8..11: Base 32..63
    view.setUint32(48, baseUpper, true);
    // Byte 12..15: Reserved (0)
    view.setUint32(52, 0, true);

    return this.gdtBytes;
  }

  /**
   * Validasi integritas selector segmen untuk privilege ring
   */
  public static validateSelector(selector: number, expectedRing: 0 | 3): boolean {
    const rpl = selector & 3;
    if (rpl !== expectedRing) {
      return false;
    }
    if (expectedRing === 0) {
      return selector === SegmentSelector.KERNEL_CODE || selector === SegmentSelector.KERNEL_DATA;
    } else {
      return selector === SegmentSelector.USER_CODE || selector === SegmentSelector.USER_DATA;
    }
  }

  public getGDTBytes(): Uint8Array {
    return this.gdtBytes;
  }
}
