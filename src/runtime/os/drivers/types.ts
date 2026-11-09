/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Driver Interface Types
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { X86_64HAL } from '../hal/x86_64-hal';

export enum DriverLifecycle {
  UNLOADED = 'UNLOADED',
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ERROR = 'ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

export enum DeviceType {
  CONSOLE = 'CONSOLE',
  TIMER = 'TIMER',
  KEYBOARD = 'KEYBOARD',
  STORAGE = 'STORAGE',
  DISPLAY = 'DISPLAY',
  NETWORK = 'NETWORK',
}

export interface DriverDescriptor {
  id: string;
  name: string;
  version: string;
  deviceType: DeviceType;
  author: string;
  description: string;
}

export interface IDriver {
  readonly descriptor: DriverDescriptor;
  getLifecycle(): DriverLifecycle;
  init(hal: X86_64HAL): boolean;
  shutdown(): void;
  getStatus(): Record<string, any>;
}
