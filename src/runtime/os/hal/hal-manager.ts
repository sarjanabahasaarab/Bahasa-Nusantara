/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - HAL Manager Singleton
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { X86_64HAL } from './x86_64-hal';

export class HALManager {
  private static activeHAL?: X86_64HAL;

  public static getInstance(): { getHAL: () => X86_64HAL } {
    return {
      getHAL: () => HALManager.getHAL(),
    };
  }

  public static getHAL(): X86_64HAL {
    if (!this.activeHAL) {
      this.activeHAL = new X86_64HAL();
    }
    return this.activeHAL;
  }

  public static setHAL(hal: X86_64HAL): void {
    this.activeHAL = hal;
  }

  public static reset(): void {
    this.activeHAL = undefined;
  }
}
