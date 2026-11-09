/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Preemptive Scheduler
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { SchedulingPolicy, SchedulerDiagnostics } from './types';
import { ReadyQueue } from './ready-queue';
import { Thread } from '../process/thread';
import { ThreadState } from '../process/types';
import { ContextSwitch } from '../process/context-switch';

export class KernelScheduler {
  private readonly readyQueue: ReadyQueue = new ReadyQueue();
  private currentThread: Thread | null = null;
  private policy: SchedulingPolicy = SchedulingPolicy.PRIORITY_PREEMPTIVE;
  private totalSwitches: number = 0;
  private totalYields: number = 0;
  private idleTicks: number = 0;

  constructor(policy: SchedulingPolicy = SchedulingPolicy.PRIORITY_PREEMPTIVE) {
    this.policy = policy;
  }

  public setPolicy(policy: SchedulingPolicy): void {
    this.policy = policy;
  }

  public getPolicy(): SchedulingPolicy {
    return this.policy;
  }

  public addThread(thread: Thread): void {
    this.readyQueue.enqueue(thread);
  }

  public getCurrentThread(): Thread | null {
    return this.currentThread;
  }

  public getProcessCount(): number {
    return this.readyQueue.size() > 0 ? 1 : (this.currentThread ? 1 : 0);
  }

  public getThreadCount(): number {
    return (this.currentThread ? 1 : 0) + this.readyQueue.size();
  }

  public schedule(): Thread | null {
    const oldThread = this.currentThread;
    if (oldThread && oldThread.state === ThreadState.RUNNING) {
      oldThread.state = ThreadState.READY;
      this.readyQueue.enqueue(oldThread);
    }
    const nextThread = this.readyQueue.dequeue();
    if (nextThread) {
      nextThread.state = ThreadState.RUNNING;
      this.currentThread = nextThread;
      this.totalSwitches++;
    }
    return this.currentThread;
  }

  public yield(): boolean {
    this.totalYields++;
    if (!this.currentThread && this.readyQueue.isEmpty()) return false;

    const oldThread = this.currentThread;
    if (oldThread && oldThread.state === ThreadState.RUNNING) {
      oldThread.state = ThreadState.READY;
      this.readyQueue.enqueue(oldThread);
    }

    const nextThread = this.readyQueue.dequeue();
    if (nextThread) {
      ContextSwitch.switchThreads(oldThread, nextThread);
      this.currentThread = nextThread;
      this.totalSwitches++;
      return true;
    } else {
      this.currentThread = null;
      return false;
    }
  }

  public tick(): void {
    if (!this.currentThread) {
      this.idleTicks++;
      // Coba jadwalkan thread berikutnya
      const next = this.readyQueue.dequeue();
      if (next) {
        this.currentThread = next;
        this.totalSwitches++;
      }
      return;
    }

    this.currentThread.totalCpuTicks++;

    if (this.policy === SchedulingPolicy.COOPERATIVE) {
      return; // Tidak ada preemption otomatis pada mode kooperatif
    }

    // Preemption berdasarkan kuota time slice
    this.currentThread.quantumRemaining--;
    if (this.currentThread.quantumRemaining <= 0) {
      this.currentThread.quantumRemaining = this.currentThread.priority * 10;
      this.yield();
    }
  }

  public getDiagnostics(): SchedulerDiagnostics {
    return {
      totalSwitches: this.totalSwitches,
      totalYields: this.totalYields,
      readyThreadCount: this.readyQueue.size(),
      idleTimeTicks: this.idleTicks,
      policy: this.policy,
    };
  }
}
