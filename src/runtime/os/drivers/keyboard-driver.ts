/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - PS/2 Keyboard Driver (Scancode Set 1)
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { IDriver, DriverDescriptor, DriverLifecycle, DeviceType } from './types';
import { X86_64HAL } from '../hal/x86_64-hal';

export class KeyboardDriver implements IDriver {
  public static readonly DATA_PORT = 0x60;
  public static readonly STATUS_PORT = 0x64;

  public readonly descriptor: DriverDescriptor = {
    id: 'driver.input.ps2_keyboard',
    name: 'PS/2 Keyboard Driver',
    version: '1.0.0',
    deviceType: DeviceType.KEYBOARD,
    author: 'NUSANTARA OS Kernel Team',
    description: 'Driver pengontrol keyboard PS/2 dengan penerjemah scancode set 1',
  };

  private lifecycle: DriverLifecycle = DriverLifecycle.UNLOADED;
  private hal?: X86_64HAL;
  private readonly scancodeBuffer: number[] = [];
  private keyEventCallback?: (scancode: number, isReleased: boolean) => void;

  public getLifecycle(): DriverLifecycle {
    return this.lifecycle;
  }

  public init(hal?: X86_64HAL): boolean {
    this.lifecycle = DriverLifecycle.INITIALIZING;
    this.hal = hal ?? new X86_64HAL();
    this.lifecycle = DriverLifecycle.ACTIVE;
    return true;
  }

  public processScancode(scancode: number): string | null {
    const isReleased = (scancode & 0x80) !== 0;
    if (isReleased) return null;
    const code = scancode & 0x7F;
    const SCANCODE_MAP: Record<number, string> = {
      0x1E: 'a', 0x30: 'b', 0x2E: 'c', 0x20: 'd', 0x12: 'e',
      0x21: 'f', 0x22: 'g', 0x23: 'h', 0x17: 'i', 0x24: 'j',
      0x25: 'k', 0x26: 'l', 0x32: 'm', 0x31: 'n', 0x18: 'o',
      0x19: 'p', 0x10: 'q', 0x13: 'r', 0x1F: 's', 0x14: 't',
      0x16: 'u', 0x2F: 'v', 0x11: 'w', 0x2D: 'x', 0x15: 'y',
      0x2C: 'z', 0x39: ' ', 0x1C: '\n',
    };
    return SCANCODE_MAP[code] ?? null;
  }

  public setKeyCallback(cb: (scancode: number, isReleased: boolean) => void): void {
    this.keyEventCallback = cb;
  }

  public handleInterrupt(): number | null {
    if (!this.hal) return null;
    const scancode = this.hal.inb(KeyboardDriver.DATA_PORT);
    this.scancodeBuffer.push(scancode);

    const isReleased = (scancode & 0x80) !== 0;
    const code = scancode & 0x7F;

    if (this.keyEventCallback) {
      this.keyEventCallback(code, isReleased);
    }

    return scancode;
  }

  public getBufferedScancodeCount(): number {
    return this.scancodeBuffer.length;
  }

  public shutdown(): void {
    this.lifecycle = DriverLifecycle.SUSPENDED;
  }

  public getStatus(): Record<string, any> {
    return {
      lifecycle: this.lifecycle,
      bufferedCount: this.scancodeBuffer.length,
    };
  }
}
