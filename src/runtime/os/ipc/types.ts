/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Inter-Process Communication (IPC) Types
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { ProcessID } from '../process/types';

export type IPCChannelID = string;

export interface IPCMessage {
  id: string;
  senderPid: ProcessID;
  targetPid: ProcessID;
  timestamp: number;
  type: string;
  payload: Uint8Array | string;
}

export enum IPCPermissions {
  NONE = 0,
  READ = 1 << 0,
  WRITE = 1 << 1,
  READ_WRITE = READ | WRITE,
}
