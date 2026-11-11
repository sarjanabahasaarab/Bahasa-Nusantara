/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Process & Thread Lifecycle Manager
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { Process } from './process';
import { Thread } from './thread';
import { ProcessID, ProcessState, ThreadID, ThreadState } from './types';
import { AddressSpace } from '../memory/address-space';

export class ProcessManager {
  private static instance?: ProcessManager;
  private readonly processes: Map<ProcessID, Process> = new Map();
  private readonly waitingParents: Map<ProcessID, ((code: number) => void)[]> = new Map();

  constructor() {
    this.initKernelProcess();
  }

  public static getInstance(): ProcessManager {
    if (!this.instance) {
      this.instance = new ProcessManager();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = undefined;
    Process.resetPidCounter();
  }

  private initKernelProcess(): void {
    // PID 0: Kernel Idle / System Process
    const kernelProc = new Process(0, 'kernel_system', undefined, true, 0);
    kernelProc.state = ProcessState.RUNNING;
    kernelProc.createThread(0n, 5, false);
    this.processes.set(0, kernelProc);
  }

  /**
   * Membuat proses baru (process_create)
   */
  public process_create(
    name: string,
    parentPid: ProcessID = 0,
    isKernelProcess: boolean = false,
    addressSpace?: AddressSpace
  ): Process {
    const proc = new Process(
      undefined,
      name,
      addressSpace ?? new AddressSpace(),
      isKernelProcess,
      parentPid
    );
    this.processes.set(proc.pid, proc);
    return proc;
  }

  /**
   * Menandai proses siap dijalankan (process_start)
   */
  public process_start(pid: ProcessID): boolean {
    const proc = this.processes.get(pid);
    if (!proc || proc.state === ProcessState.TERMINATED) {
      return false;
    }
    proc.state = ProcessState.READY;
    for (const thread of proc.getAllThreads()) {
      if (thread.state === ThreadState.CREATED) {
        thread.state = ThreadState.READY;
      }
    }
    return true;
  }

  /**
   * Terminasi proses normal oleh dirinya sendiri (process_exit)
   */
  public process_exit(pid: ProcessID, exitCode: number = 0): void {
    const proc = this.processes.get(pid);
    if (!proc) return;

    proc.terminate(exitCode);
    proc.state = ProcessState.ZOMBIE;

    // Notifikasi parent yang sedang menunggu
    const waiters = this.waitingParents.get(pid);
    if (waiters) {
      for (const cb of waiters) {
        cb(exitCode);
      }
      this.waitingParents.delete(pid);
      proc.state = ProcessState.TERMINATED;
    }
  }

  /**
   * Menunggu anak proses selesai (process_wait)
   */
  public async process_wait(pid: ProcessID): Promise<number> {
    const proc = this.processes.get(pid);
    if (!proc) {
      return -1;
    }

    if (proc.state === ProcessState.ZOMBIE || proc.state === ProcessState.TERMINATED) {
      proc.state = ProcessState.TERMINATED;
      return proc.exitCode;
    }

    return new Promise<number>((resolve) => {
      let list = this.waitingParents.get(pid);
      if (!list) {
        list = [];
        this.waitingParents.set(pid, list);
      }
      list.push((code) => resolve(code));
    });
  }

  /**
   * Terminasi paksa proses oleh kernel (process_terminate)
   */
  public process_terminate(pid: ProcessID, reason: string = 'SIGKILL'): boolean {
    if (pid === 0) {
      // Dilarang menghentikan kernel system process
      return false;
    }
    const proc = this.processes.get(pid);
    if (!proc) return false;

    proc.terminate(-9);
    proc.state = ProcessState.TERMINATED;
    return true;
  }

  /**
   * Pencarian proses berdasarkan PID (process_lookup)
   */
  public process_lookup(pid: ProcessID): Process | undefined {
    return this.processes.get(pid);
  }

  /**
   * Membuat thread baru dalam proses (thread_create)
   */
  public thread_create(
    pid: ProcessID,
    entryPoint: bigint = 0n,
    priority: number = 3,
    isUserMode: boolean = true
  ): Thread | undefined {
    const proc = this.processes.get(pid);
    if (!proc || proc.state === ProcessState.TERMINATED) {
      return undefined;
    }
    return proc.createThread(entryPoint, priority, isUserMode);
  }

  /**
   * Menghentikan thread (thread_exit)
   */
  public thread_exit(tid: ThreadID): boolean {
    for (const proc of this.processes.values()) {
      const thread = proc.getThread(tid);
      if (thread) {
        thread.state = ThreadState.TERMINATED;
        return true;
      }
    }
    return false;
  }

  public getAllProcesses(): Process[] {
    return Array.from(this.processes.values());
  }

  public getActiveProcessCount(): number {
    return Array.from(this.processes.values()).filter(
      (p) => p.state !== ProcessState.TERMINATED
    ).length;
  }
}
