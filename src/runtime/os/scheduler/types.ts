/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Scheduler Types
 * Target Milestone: Phase 48 (v0.48.0)
 */

export enum SchedulingPolicy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  PRIORITY_PREEMPTIVE = 'PRIORITY_PREEMPTIVE',
  COOPERATIVE = 'COOPERATIVE',
}

export interface SchedulerDiagnostics {
  totalSwitches: number;
  totalYields: number;
  readyThreadCount: number;
  idleTimeTicks: number;
  policy: SchedulingPolicy;
}
