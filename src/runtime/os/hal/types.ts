/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Hardware Abstraction Layer (HAL) Interfaces
 * Target Milestone: Phase 48 (v0.48.0)
 */

export interface ICPU {
  halt(): void;
  enableInterrupts(): void;
  disableInterrupts(): void;
  areInterruptsEnabled(): boolean;
  getCR3(): bigint;
  setCR3(val: bigint): void;
  inb(port: number): number;
  outb(port: number, val: number): void;
  inw(port: number): number;
  outw(port: number, val: number): void;
  inl(port: number): number;
  outl(port: number, val: number): void;
}

export interface IMemoryHAL {
  read8(physAddr: bigint): number;
  read16(physAddr: bigint): number;
  read32(physAddr: bigint): number;
  read64(physAddr: bigint): bigint;
  write8(physAddr: bigint, val: number): void;
  write16(physAddr: bigint, val: number): void;
  write32(physAddr: bigint, val: number): void;
  write64(physAddr: bigint, val: bigint): void;
}

export interface ITimerHAL {
  getTicks(): number;
  getFrequencyHz(): number;
  setFrequencyHz(hz: number): void;
}

export interface IConsoleHAL {
  writeChar(ch: string): void;
  writeString(str: string): void;
  clear(): void;
}

export interface IStorageHAL {
  getSectorSize(): number;
  getSectorCount(): number;
  readSector(sectorIndex: number): Uint8Array | null;
  writeSector(sectorIndex: number, data: Uint8Array): boolean;
}

export interface IInputHAL {
  hasKey(): boolean;
  readScancode(): number | null;
}
