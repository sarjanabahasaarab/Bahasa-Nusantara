/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - 8254 PIT Timer Driver
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { IDriver, DriverDescriptor, DriverLifecycle, DeviceType } from './types';
import { X86_64HAL } from '../hal/x86_64-hal';

export class TimerDriver implements IDriver {
  public static readonly PIT_BASE_FREQUENCY = 1193182; // 1.193182 MHz
  public static readonly PIT_CHANNEL0_DATA = 0x40;
  public static readonly PIT_COMMAND_PORT = 0x43;

  public readonly descriptor: DriverDescriptor = {
    id: 'driver.timer.pit8254',
    name: '8254 Programmable Interval Timer (PIT)',
    version: '1.0.0',
    deviceType: DeviceType.TIMER,
    author: 'NUSANTARA OS Kernel Team',
    description: 'Driver timer periodik untuk penjadwalan preemptive dan timekeeping',
  };

  private lifecycle: DriverLifecycle = DriverLifecycle.UNLOADED;
  private hal?: X86_64HAL;
  private frequencyHz: number = 100;
  private totalTicks: number = 0;

  public getLifecycle(): DriverLifecycle {
    return this.lifecycle;
  }

  public init(hal?: X86_64HAL): boolean {
    this.lifecycle = DriverLifecycle.INITIALIZING;
    this.hal = hal ?? new X86_64HAL();

    this.setFrequency(this.frequencyHz);
    this.lifecycle = DriverLifecycle.ACTIVE;
    return true;
  }

  public getFrequency(): number {
    return this.frequencyHz;
  }

  public setFrequency(hz: number): void {
    if (hz <= 0 || !this.hal) return;
    this.frequencyHz = hz;

    let divisor = Math.floor(TimerDriver.PIT_BASE_FREQUENCY / hz);
    if (divisor < 1) divisor = 1;
    if (divisor > 65535) divisor = 65535;

    // Kanal 0, akses byte rendah lalu tinggi, mode 3 (gelombang kotak), biner 16-bit
    this.hal.outb(TimerDriver.PIT_COMMAND_PORT, 0x36);
    this.hal.outb(TimerDriver.PIT_CHANNEL0_DATA, divisor & 0xFF);
    this.hal.outb(TimerDriver.PIT_CHANNEL0_DATA, (divisor >> 8) & 0xFF);
    this.hal.setFrequencyHz(hz);
  }

  public tick(): void {
    this.totalTicks++;
    if (this.hal) {
      this.hal.stepTick(1);
    }
  }

  public getTicks(): number {
    return this.totalTicks;
  }

  public getFrequencyHz(): number {
    return this.frequencyHz;
  }

  public shutdown(): void {
    this.lifecycle = DriverLifecycle.SUSPENDED;
  }

  public getStatus(): Record<string, any> {
    return {
      lifecycle: this.lifecycle,
      frequencyHz: this.frequencyHz,
      totalTicks: this.totalTicks,
      divisor: Math.floor(TimerDriver.PIT_BASE_FREQUENCY / this.frequencyHz),
    };
  }
}
