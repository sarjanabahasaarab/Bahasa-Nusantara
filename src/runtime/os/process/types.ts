/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Process & Thread Interface Types
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { RegisterContext } from '../abi/types';

export type ProcessID = number;
export type ThreadID = number;

export enum ProcessState {
  CREATED = 'CREATED',
  READY = 'READY',
  RUNNING = 'RUNNING',
  BLOCKED = 'BLOCKED',
  TERMINATED = 'TERMINATED',
}

export enum ThreadState {
  CREATED = 'CREATED',
  READY = 'READY',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  TERMINATED = 'TERMINATED',
}

export interface ThreadContext {
  tid: ThreadID;
  pid: ProcessID;
  registers: RegisterContext;
  stackBase: bigint;
  stackSize: number;
}
