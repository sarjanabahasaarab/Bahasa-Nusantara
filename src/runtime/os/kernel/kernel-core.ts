/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Core Engine
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { KernelConfig, KernelContext, KernelState, LogLevel } from './types';
import { KernelLogger } from './kernel-logger';
import { KernelPanic } from './kernel-panic';
import { KernelDiagnostics } from './kernel-diagnostics';
import { KernelScheduler } from '../scheduler/kernel-scheduler';
import { KernelHeap } from '../memory/kernel-heap';

export class KernelCore {
  private static instance?: KernelCore;
  private state: KernelState = KernelState.UNINITIALIZED;
  private readonly config: KernelConfig;
  private readonly logger: KernelLogger;
  private readonly diagnostics: KernelDiagnostics;
  private readonly scheduler: KernelScheduler;
  private readonly heap: KernelHeap;
  private bootTimeMs: number = 0;
  private uptimeTicks: number = 0;

  constructor(config?: Partial<KernelConfig>) {
    this.config = {
      kernelName: config?.kernelName ?? 'NUSANTARA-OS-x86_64',
      version: config?.version ?? '0.48.0',
      architecture: 'x86_64',
      logLevel: config?.logLevel ?? LogLevel.INFO,
      maxMemoryBytes: config?.maxMemoryBytes ?? 128 * 1024 * 1024, // 128 MB default
      enableSerialLogging: config?.enableSerialLogging ?? true,
      enableVirtualMemory: config?.enableVirtualMemory ?? true,
      enablePreemption: config?.enablePreemption ?? true,
      timeSliceMs: config?.timeSliceMs ?? 10,
    };

    this.logger = KernelLogger.getInstance();
    this.logger.setMinLevel(this.config.logLevel);
    this.diagnostics = new KernelDiagnostics();
    this.scheduler = new KernelScheduler();
    this.heap = new KernelHeap();
  }

  public static getInstance(config?: Partial<KernelConfig>): KernelCore {
    if (!this.instance) {
      this.instance = new KernelCore(config);
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = undefined;
    KernelLogger.resetInstance();
  }

  public boot(): boolean {
    if (this.state !== KernelState.UNINITIALIZED && this.state !== KernelState.HALTED) {
      throw new Error(`Transisi status boot tidak sah dari status ${this.state}`);
    }

    this.state = KernelState.BOOTING;
    this.bootTimeMs = Date.now();
    this.uptimeTicks = 0;

    this.logger.info('KERNEL', `Memulai ${this.config.kernelName} v${this.config.version} (${this.config.architecture})...`);
    this.logger.info('KERNEL', `Batas Memori: ${(this.config.maxMemoryBytes / (1024 * 1024)).toFixed(0)} MB`);

    // Inisialisasi status kernel selesai
    this.state = KernelState.RUNNING;
    this.logger.info('KERNEL', `Kernel berada pada status RUNNING.`);
    return true;
  }

  public getScheduler(): KernelScheduler {
    return this.scheduler;
  }

  public getHeap(): KernelHeap {
    return this.heap;
  }

  public tick(delta: number = 1): void {
    if (this.state !== KernelState.RUNNING) return;
    this.uptimeTicks += delta;
    this.diagnostics.tick(delta);
  }

  public halt(reason: string = 'Normal shutdown'): void {
    this.state = KernelState.HALTED;
    this.logger.info('KERNEL', `Sistem dimatikan: ${reason}`);
  }

  public panic(reason: string, subsystem: string = 'KERNEL', details?: Record<string, any>): never {
    this.state = KernelState.PANICKED;
    this.diagnostics.recordFault('KERNEL_PANIC', reason);
    KernelPanic.trigger({
      reason,
      subsystem,
      additionalInfo: details,
    });
  }

  public getState(): KernelState {
    return this.state;
  }

  public getConfig(): Readonly<KernelConfig> {
    return this.config;
  }

  public getLogger(): KernelLogger {
    return this.logger;
  }

  public getDiagnostics(): KernelDiagnostics {
    return this.diagnostics;
  }

  public getContext(): KernelContext {
    const metrics = this.diagnostics.getMetrics();
    return {
      bootTime: this.bootTimeMs,
      uptimeTicks: this.uptimeTicks,
      ticks: this.uptimeTicks,
      state: this.state,
      activeProcessId: 0,
      activeThreadId: 0,
      totalMemoryBytes: this.config.maxMemoryBytes,
      freeMemoryBytes: metrics.freeMemoryBytes,
      interruptCount: metrics.totalInterrupts,
      syscallCount: metrics.totalSyscalls,
    };
  }
}
