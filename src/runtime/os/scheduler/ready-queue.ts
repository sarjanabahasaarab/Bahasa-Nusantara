/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Multi-Level Priority Ready Queue
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { Thread } from '../process/thread';
import { ThreadState } from '../process/types';

export class ReadyQueue {
  private readonly queues: Map<number, Thread[]> = new Map();
  private count: number = 0;

  constructor() {
    for (let p = 1; p <= 5; p++) {
      this.queues.set(p, []);
    }
  }

  public enqueue(thread: Thread): void {
    thread.state = ThreadState.READY;
    const q = this.queues.get(thread.priority) ?? this.queues.get(3)!;
    q.push(thread);
    this.count++;
  }

  public dequeue(): Thread | null {
    if (this.count === 0) return null;

    // Prioritas 5 tertinggi turun ke 1 terendah
    for (let p = 5; p >= 1; p--) {
      const q = this.queues.get(p)!;
      if (q.length > 0) {
        this.count--;
        const thread = q.shift()!;
        thread.state = ThreadState.RUNNING;
        return thread;
      }
    }
    return null;
  }

  public size(): number {
    return this.count;
  }

  public isEmpty(): boolean {
    return this.count === 0;
  }

  public clear(): void {
    for (const q of this.queues.values()) {
      q.length = 0;
    }
    this.count = 0;
  }
}
