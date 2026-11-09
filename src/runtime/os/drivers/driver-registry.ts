/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Driver Registry & Lifecycle Manager
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { IDriver, DeviceType, DriverLifecycle } from './types';
import { X86_64HAL } from '../hal/x86_64-hal';

export class DriverRegistry {
  private readonly drivers: Map<string, IDriver> = new Map();

  public register(driver: IDriver): void {
    this.drivers.set(driver.descriptor.id, driver);
  }

  public get(id: string): IDriver | undefined {
    return this.drivers.get(id);
  }

  public getByType(type: DeviceType): IDriver[] {
    return Array.from(this.drivers.values()).filter(d => d.descriptor.deviceType === type);
  }

  public getAll(): IDriver[] {
    return Array.from(this.drivers.values());
  }

  public getDriverCount(): number {
    return this.drivers.size;
  }

  public initAll(hal?: X86_64HAL): boolean {
    const targetHal = hal ?? new X86_64HAL();
    let failure = 0;

    for (const driver of this.drivers.values()) {
      try {
        if (!driver.init(targetHal)) {
          failure++;
        }
      } catch {
        failure++;
      }
    }

    return failure === 0;
  }

  public shutdownAll(): boolean {
    for (const driver of this.drivers.values()) {
      try {
        driver.shutdown();
      } catch {}
    }
    return true;
  }
}
