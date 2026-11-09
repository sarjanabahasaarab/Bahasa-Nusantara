/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - 16550 UART Serial Port Driver (COM1)
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { IDriver, DriverDescriptor, DriverLifecycle, DeviceType } from './types';
import { X86_64HAL } from '../hal/x86_64-hal';

export class SerialDriver implements IDriver {
  public static readonly COM1_PORT = 0x3F8;

  public readonly descriptor: DriverDescriptor = {
    id: 'driver.serial.uart16550',
    name: '16550 UART Serial Driver (COM1)',
    version: '1.0.0',
    deviceType: DeviceType.CONSOLE,
    author: 'NUSANTARA OS Kernel Team',
    description: 'Driver port serial COM1 untuk konsol debugging dan emulasi QEMU',
  };

  private lifecycle: DriverLifecycle = DriverLifecycle.UNLOADED;
  private hal?: X86_64HAL;
  private bytesSent: number = 0;
  private bytesReceived: number = 0;

  constructor(public readonly port: number = SerialDriver.COM1_PORT) {}

  public getLifecycle(): DriverLifecycle {
    return this.lifecycle;
  }

  public init(hal?: X86_64HAL): boolean {
    this.lifecycle = DriverLifecycle.INITIALIZING;
    this.hal = hal ?? (globalThis as any).HALManager?.getHAL?.() ?? new X86_64HAL();

    const base = SerialDriver.COM1_PORT;
    // Inisialisasi 16550 UART standar x86
    this.hal!.outb(base + 1, 0x00); // Matikan semua interupsi serial
    this.hal!.outb(base + 3, 0x80); // Aktifkan DLAB (Divisor Latch Access Bit)
    this.hal!.outb(base + 0, 0x01); // Pasang divisor byte rendah = 1 (115200 baud)
    this.hal!.outb(base + 1, 0x00); // Pasang divisor byte tinggi = 0
    this.hal!.outb(base + 3, 0x03); // 8 bit, tanpa parity, 1 stop bit (8N1)
    this.hal!.outb(base + 2, 0xC7); // Aktifkan FIFO, bersihkan dengan ambang batas 14-byte
    this.hal!.outb(base + 4, 0x0B); // IRQ aktifkan, RTS/DSR set

    this.lifecycle = DriverLifecycle.ACTIVE;
    return true;
  }

  public writeByte(b: number): void {
    if (this.lifecycle !== DriverLifecycle.ACTIVE || !this.hal) return;
    this.hal.outb(SerialDriver.COM1_PORT, b);
    this.bytesSent++;
  }

  public writeString(str: string): number {
    for (let i = 0; i < str.length; i++) {
      this.writeByte(str.charCodeAt(i));
    }
    return str.length;
  }

  public readByte(): number | null {
    if (this.lifecycle !== DriverLifecycle.ACTIVE || !this.hal) return null;
    const lsr = this.hal.inb(SerialDriver.COM1_PORT + 5);
    if ((lsr & 1) !== 0) { // Data Ready bit
      this.bytesReceived++;
      return this.hal.inb(SerialDriver.COM1_PORT);
    }
    return null;
  }

  public shutdown(): void {
    this.lifecycle = DriverLifecycle.SUSPENDED;
  }

  public getStatus(): Record<string, any> {
    return {
      lifecycle: this.lifecycle,
      port: `0x${SerialDriver.COM1_PORT.toString(16)}`,
      baudRate: 115200,
      mode: '8N1',
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
    };
  }
}
