/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Diagnostics
 * Target Milestone: Phase 48 (v0.48.0)
 */

export interface SystemMetrics {
  uptimeTicks: number;
  totalMemoryBytes: number;
  allocatedMemoryBytes: number;
  freeMemoryBytes: number;
  activeProcessCount: number;
  activeThreadCount: number;
  totalSyscalls: number;
  totalInterrupts: number;
  heapFragmentationRatio: number;
}

export class KernelDiagnostics {
  private metrics: SystemMetrics = {
    uptimeTicks: 0,
    totalMemoryBytes: 0,
    allocatedMemoryBytes: 0,
    freeMemoryBytes: 0,
    activeProcessCount: 0,
    activeThreadCount: 0,
    totalSyscalls: 0,
    totalInterrupts: 0,
    heapFragmentationRatio: 0,
  };

  private faultHistory: Array<{ timestampTicks: number; type: string; details: string }> = [];

  public updateMemory(total: number, allocated: number, free: number, fragRatio: number = 0): void {
    this.metrics.totalMemoryBytes = total;
    this.metrics.allocatedMemoryBytes = allocated;
    this.metrics.freeMemoryBytes = free;
    this.metrics.heapFragmentationRatio = fragRatio;
  }

  public incrementSyscall(): void {
    this.metrics.totalSyscalls++;
  }

  public incrementInterrupt(): void {
    this.metrics.totalInterrupts++;
  }

  public setProcessThreadCount(processes: number, threads: number): void {
    this.metrics.activeProcessCount = processes;
    this.metrics.activeThreadCount = threads;
  }

  public tick(delta: number = 1): void {
    this.metrics.uptimeTicks += delta;
  }

  public recordFault(type: string, details: string): void {
    this.faultHistory.push({
      timestampTicks: this.metrics.uptimeTicks,
      type,
      details,
    });
    if (this.faultHistory.length > 100) {
      this.faultHistory.shift();
    }
  }

  public getMetrics(): Readonly<SystemMetrics> {
    return { ...this.metrics };
  }

  public getFaultHistory(): ReadonlyArray<{ timestampTicks: number; type: string; details: string }> {
    return this.faultHistory;
  }

  public getSummary(): string {
    const memMb = (this.metrics.totalMemoryBytes / (1024 * 1024)).toFixed(2);
    const allocMb = (this.metrics.allocatedMemoryBytes / (1024 * 1024)).toFixed(2);
    return `NUSANTARA OS - Status Kernel:
  Uptime       : ${this.metrics.uptimeTicks} ticks
  Memori       : ${allocMb} MB / ${memMb} MB (Frag: ${(this.metrics.heapFragmentationRatio * 100).toFixed(1)}%)
  Proses/Thread: ${this.metrics.activeProcessCount} proses, ${this.metrics.activeThreadCount} thread
  Syscall      : ${this.metrics.totalSyscalls} panggilan
  Interupsi    : ${this.metrics.totalInterrupts} interupsi
  Total Fault  : ${this.faultHistory.length} kesalahan tercatat`;
  }
}
