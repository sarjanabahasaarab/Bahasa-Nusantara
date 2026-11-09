/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Process Control Block (PCB)
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { ProcessID, ProcessState, ThreadID } from './types';
import { Thread } from './thread';
import { VirtualMemoryManager } from '../memory/virtual-memory';

export class Process {
  private static nextPid: number = 1;
  public state: ProcessState = ProcessState.CREATED;
  public exitCode: number = 0;
  private readonly threads: Map<ThreadID, Thread> = new Map();
  private nextTid: number = 1;
  public readonly fileDescriptors: Map<number, any> = new Map();

  constructor(
    public readonly pid: ProcessID = Process.nextPid++,
    public readonly name: string = `Process_${pid}`,
    public readonly vmm?: VirtualMemoryManager | bigint,
    public readonly isKernelProcess: boolean = false
  ) {}

  public static resetPidCounter(): void {
    this.nextPid = 1;
  }

  public getThreadCount(): number {
    return this.threads.size;
  }

  public createThread(entryPointOrPriority: bigint | number = 0n, priority: number = 3): Thread {
    const tid = this.nextTid++;
    let entry = 0n;
    let prio = priority;

    if (typeof entryPointOrPriority === 'number') {
      prio = entryPointOrPriority;
      entry = 0n;
    } else {
      entry = entryPointOrPriority;
    }

    const thread = new Thread(tid, this.pid, entry, undefined, undefined, prio);
    this.threads.set(tid, thread);
    return thread;
  }

  public getThread(tid: ThreadID): Thread | undefined {
    return this.threads.get(tid);
  }

  public getAllThreads(): Thread[] {
    return Array.from(this.threads.values());
  }

  public terminate(code: number = 0): void {
    this.state = ProcessState.TERMINATED;
    this.exitCode = code;
    for (const t of this.threads.values()) {
      t.state = Thread.prototype.state; // Mark terminated
    }
  }
}
