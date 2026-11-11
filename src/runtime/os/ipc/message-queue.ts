/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Message Queue Engine
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { ProcessID } from '../process/types';
import { IPCMessage, IPCPermissions } from './types';

export class KernelMessageQueue {
  private readonly messages: IPCMessage[] = [];
  public static readonly MAX_MESSAGES = 1024;
  public static readonly MAX_MESSAGE_SIZE_BYTES = 64 * 1024; // 64 KB

  constructor(
    public readonly id: string,
    public readonly ownerPid: ProcessID,
    public readonly permissions: IPCPermissions = IPCPermissions.READ_WRITE
  ) {}

  public send(
    senderPid: ProcessID,
    targetPid: ProcessID,
    type: string,
    payload: Uint8Array | string
  ): { success: boolean; error?: string } {
    if (this.messages.length >= KernelMessageQueue.MAX_MESSAGES) {
      return { success: false, error: 'Antrean pesan IPC penuh' };
    }

    const payloadLen = typeof payload === 'string'
      ? new TextEncoder().encode(payload).length
      : payload.length;

    if (payloadLen > KernelMessageQueue.MAX_MESSAGE_SIZE_BYTES) {
      return { success: false, error: 'Ukuran payload pesan IPC melebihi batas aman' };
    }

    const msg: IPCMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderPid,
      targetPid,
      timestamp: Date.now(),
      type,
      payload,
    };

    this.messages.push(msg);
    return { success: true };
  }

  public receive(receiverPid: ProcessID): IPCMessage | null {
    // Cari pesan pertama yang ditujukan untuk receiverPid atau broadcast (targetPid = 0)
    const idx = this.messages.findIndex(
      (m) => m.targetPid === receiverPid || m.targetPid === 0
    );
    if (idx === -1) return null;

    const [msg] = this.messages.splice(idx, 1);
    return msg;
  }

  public getMessageCount(): number {
    return this.messages.length;
  }

  public clear(): void {
    this.messages.length = 0;
  }
}
