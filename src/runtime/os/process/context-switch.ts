/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Context Switch Contract & Engine
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { Thread } from './thread';
import { RegisterContext } from '../abi/types';

export class ContextSwitch {
  public static perform(current: Thread, next: Thread): void {
    this.switchThreads(current, next);
  }

  public static switchThreads(
    current: Thread | null,
    next: Thread,
    currentRegisters?: RegisterContext
  ): { previousTid: number | null; nextTid: number; switchCount: number } {
    if (current && currentRegisters) {
      current.saveContext(currentRegisters);
    }

    const nextRegisters = next.restoreContext();

    return {
      previousTid: current ? current.tid : null,
      nextTid: next.tid,
      switchCount: 1,
    };
  }
}
