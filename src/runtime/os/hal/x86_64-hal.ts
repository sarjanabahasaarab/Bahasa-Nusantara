/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - x86_64 Hardware Abstraction Layer Implementation
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { ICPU, IMemoryHAL, ITimerHAL, IConsoleHAL, IInputHAL } from './types';

export class X86_64HAL implements ICPU, IMemoryHAL, ITimerHAL, IConsoleHAL, IInputHAL {
  public readonly cpu: ICPU = this;
  public readonly memory: IMemoryHAL = this;
  public readonly timer: ITimerHAL = this;
  public readonly console: IConsoleHAL = this;
  public readonly input: IInputHAL = this;

  private interruptsEnabled: boolean = true;
  private cr3Register: bigint = 0x200000n;
  private isHalted: boolean = false;
  private readonly ioPorts: Map<number, number> = new Map();
  private readonly memoryBank: Map<bigint, number> = new Map();
  private timerTicks: number = 0;
  private timerFrequencyHz: number = 100;
  private readonly consoleBuffer: string[] = [];
  private readonly inputQueue: number[] = [];

  // ---------------------------------------------------------------------------
  // CPU Interface
  // ---------------------------------------------------------------------------
  public halt(): void {
    this.isHalted = true;
  }

  public isCPUHalted(): boolean {
    return this.isHalted;
  }

  public enableInterrupts(): void {
    this.interruptsEnabled = true;
  }

  public disableInterrupts(): void {
    this.interruptsEnabled = false;
  }

  public areInterruptsEnabled(): boolean {
    return this.interruptsEnabled;
  }

  public getCR3(): bigint {
    return this.cr3Register;
  }

  public setCR3(val: bigint): void {
    this.cr3Register = val;
  }

  // ---------------------------------------------------------------------------
  // x86 Port I/O (IN / OUT)
  // ---------------------------------------------------------------------------
  public inb(port: number): number {
    return this.ioPorts.get(port) ?? 0;
  }

  public outb(port: number, val: number): void {
    this.ioPorts.set(port, val & 0xFF);
    // Jika menulis ke port serial COM1 Data (0x3F8)
    if (port === 0x3F8) {
      this.writeChar(String.fromCharCode(val & 0xFF));
    }
  }

  public inw(port: number): number {
    const low = this.inb(port);
    const high = this.inb(port + 1);
    return (high << 8) | low;
  }

  public outw(port: number, val: number): void {
    this.outb(port, val & 0xFF);
    this.outb(port + 1, (val >> 8) & 0xFF);
  }

  public inl(port: number): number {
    const low = this.inw(port);
    const high = this.inw(port + 2);
    return (high << 16) | low;
  }

  public outl(port: number, val: number): void {
    this.outw(port, val & 0xFFFF);
    this.outw(port + 2, (val >> 16) & 0xFFFF);
  }

  // ---------------------------------------------------------------------------
  // Memory Interface
  // ---------------------------------------------------------------------------
  public read8(physAddr: bigint): number {
    return this.memoryBank.get(physAddr) ?? 0;
  }

  public read16(physAddr: bigint): number {
    const b0 = this.read8(physAddr);
    const b1 = this.read8(physAddr + 1n);
    return (b1 << 8) | b0;
  }

  public read32(physAddr: bigint): number {
    const w0 = this.read16(physAddr);
    const w1 = this.read16(physAddr + 2n);
    return (w1 << 16) | w0;
  }

  public read64(physAddr: bigint): bigint {
    const d0 = BigInt(this.read32(physAddr));
    const d1 = BigInt(this.read32(physAddr + 4n));
    return (d1 << 32n) | d0;
  }

  public write8(physAddr: bigint, val: number): void {
    this.memoryBank.set(physAddr, val & 0xFF);
  }

  public write16(physAddr: bigint, val: number): void {
    this.write8(physAddr, val & 0xFF);
    this.write8(physAddr + 1n, (val >> 8) & 0xFF);
  }

  public write32(physAddr: bigint, val: number): void {
    this.write16(physAddr, val & 0xFFFF);
    this.write16(physAddr + 2n, (val >> 16) & 0xFFFF);
  }

  public write64(physAddr: bigint, val: bigint): void {
    this.write32(physAddr, Number(val & 0xFFFFFFFFn));
    this.write32(physAddr + 4n, Number((val >> 32n) & 0xFFFFFFFFn));
  }

  // ---------------------------------------------------------------------------
  // Timer Interface
  // ---------------------------------------------------------------------------
  public getTicks(): number {
    return this.timerTicks;
  }

  public stepTick(delta: number = 1): void {
    this.timerTicks += delta;
  }

  public getFrequencyHz(): number {
    return this.timerFrequencyHz;
  }

  public setFrequencyHz(hz: number): void {
    this.timerFrequencyHz = hz;
  }

  // ---------------------------------------------------------------------------
  // Console Interface (Serial & Screen)
  // ---------------------------------------------------------------------------
  public writeChar(ch: string): void {
    this.consoleBuffer.push(ch);
  }

  public writeString(str: string): void {
    for (const c of str) {
      this.writeChar(c);
    }
  }

  public clear(): void {
    this.consoleBuffer.length = 0;
  }

  public getConsoleOutput(): string {
    return this.consoleBuffer.join('');
  }

  // ---------------------------------------------------------------------------
  // Input Interface
  // ---------------------------------------------------------------------------
  public injectScancode(scancode: number): void {
    this.inputQueue.push(scancode);
  }

  public hasKey(): boolean {
    return this.inputQueue.length > 0;
  }

  public readScancode(): number | null {
    return this.inputQueue.shift() ?? null;
  }
}
