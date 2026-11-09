/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - VGA Text Mode & Linear Framebuffer Driver
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { IDriver, DriverDescriptor, DriverLifecycle, DeviceType } from './types';
import { X86_64HAL } from '../hal/x86_64-hal';

export class FramebufferDriver implements IDriver {
  public static readonly VGA_TEXT_BUFFER_PHYS = 0xB8000n;
  public static readonly COLS = 80;
  public static readonly ROWS = 25;

  public readonly descriptor: DriverDescriptor = {
    id: 'driver.display.vga_framebuffer',
    name: 'VGA Text & Framebuffer Driver',
    version: '1.0.0',
    deviceType: DeviceType.DISPLAY,
    author: 'NUSANTARA OS Kernel Team',
    description: 'Driver output display konsol VGA 80x25 / linear framebuffer',
  };

  private lifecycle: DriverLifecycle = DriverLifecycle.UNLOADED;
  private hal?: X86_64HAL;
  private cursorX: number = 0;
  private cursorY: number = 0;
  private currentAttribute: number = 0x0F; // Teks putih di atas latar hitam

  public getLifecycle(): DriverLifecycle {
    return this.lifecycle;
  }

  public init(hal?: X86_64HAL): boolean {
    this.lifecycle = DriverLifecycle.INITIALIZING;
    this.hal = hal ?? new X86_64HAL();
    this.clear();
    this.lifecycle = DriverLifecycle.ACTIVE;
    return true;
  }

  public writeAt(x: number, y: number, char: string, attr: number = 0x0F): void {
    if (!this.hal) return;
    const offset = BigInt((y * FramebufferDriver.COLS + x) * 2);
    this.hal.write8(FramebufferDriver.VGA_TEXT_BUFFER_PHYS + offset, char.charCodeAt(0));
    this.hal.write8(FramebufferDriver.VGA_TEXT_BUFFER_PHYS + offset + 1n, attr);
  }

  public readAt(x: number, y: number): { char: string; attribute: number } {
    if (!this.hal) return { char: ' ', attribute: 0x0F };
    const offset = BigInt((y * FramebufferDriver.COLS + x) * 2);
    const code = this.hal.read8(FramebufferDriver.VGA_TEXT_BUFFER_PHYS + offset);
    const attr = this.hal.read8(FramebufferDriver.VGA_TEXT_BUFFER_PHYS + offset + 1n);
    return { char: String.fromCharCode(code), attribute: attr };
  }

  public clear(): void {
    if (!this.hal) return;
    for (let y = 0; y < FramebufferDriver.ROWS; y++) {
      for (let x = 0; x < FramebufferDriver.COLS; x++) {
        const offset = BigInt((y * FramebufferDriver.COLS + x) * 2);
        this.hal.write8(FramebufferDriver.VGA_TEXT_BUFFER_PHYS + offset, 0x20); // Spasi
        this.hal.write8(FramebufferDriver.VGA_TEXT_BUFFER_PHYS + offset + 1n, this.currentAttribute);
      }
    }
    this.cursorX = 0;
    this.cursorY = 0;
  }

  public putChar(ch: string): void {
    if (!this.hal) return;
    if (ch === '\n') {
      this.cursorX = 0;
      this.cursorY++;
      if (this.cursorY >= FramebufferDriver.ROWS) {
        this.cursorY = FramebufferDriver.ROWS - 1; // Scroll sederhana
      }
      return;
    }

    const offset = BigInt((this.cursorY * FramebufferDriver.COLS + this.cursorX) * 2);
    this.hal.write8(FramebufferDriver.VGA_TEXT_BUFFER_PHYS + offset, ch.charCodeAt(0));
    this.hal.write8(FramebufferDriver.VGA_TEXT_BUFFER_PHYS + offset + 1n, this.currentAttribute);

    this.cursorX++;
    if (this.cursorX >= FramebufferDriver.COLS) {
      this.cursorX = 0;
      this.cursorY++;
      if (this.cursorY >= FramebufferDriver.ROWS) {
        this.cursorY = FramebufferDriver.ROWS - 1;
      }
    }
  }

  public writeString(str: string): void {
    for (const c of str) {
      this.putChar(c);
    }
  }

  public getCursorPosition(): { x: number; y: number } {
    return { x: this.cursorX, y: this.cursorY };
  }

  public shutdown(): void {
    this.lifecycle = DriverLifecycle.SUSPENDED;
  }

  public getStatus(): Record<string, any> {
    return {
      lifecycle: this.lifecycle,
      mode: 'VGA 80x25 Text Mode',
      cursor: { x: this.cursorX, y: this.cursorY },
    };
  }
}
