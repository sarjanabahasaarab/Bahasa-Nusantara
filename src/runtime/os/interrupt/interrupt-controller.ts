/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Interrupt Controller (8259 PIC / APIC Model)
 * Target Milestone: Phase 48 (v0.48.0)
 */

export class InterruptController {
  public static readonly PIC1_COMMAND = 0x20;
  public static readonly PIC1_DATA = 0x21;
  public static readonly PIC2_COMMAND = 0xA0;
  public static readonly PIC2_DATA = 0xA1;

  public static readonly PIC_EOI = 0x20; // End of Interrupt command

  private masterMask: number = 0xFB; // IRQ2 unmasked for slave cascade
  private slaveMask: number = 0xFF;  // All slave lines masked by default
  private offsetMaster: number = 32; // IRQ 0..7 dipetakan ke vektor 32..39
  private offsetSlave: number = 40;  // IRQ 8..15 dipetakan ke vektor 40..47

  public remap(offset1: number = 32, offset2: number = 40): void {
    this.offsetMaster = offset1;
    this.offsetSlave = offset2;
  }

  public getMasterOffset(): number {
    return this.offsetMaster;
  }

  public getSlaveOffset(): number {
    return this.offsetSlave;
  }

  public irqToVector(irq: number): number {
    if (irq < 8) return this.offsetMaster + irq;
    return this.offsetSlave + (irq - 8);
  }

  public vectorToIrq(vector: number): number | null {
    if (vector >= this.offsetMaster && vector < this.offsetMaster + 8) {
      return vector - this.offsetMaster;
    }
    if (vector >= this.offsetSlave && vector < this.offsetSlave + 8) {
      return 8 + (vector - this.offsetSlave);
    }
    return null;
  }

  public maskIrq(irq: number): void {
    if (irq < 8) {
      this.masterMask |= (1 << irq);
    } else {
      this.slaveMask |= (1 << (irq - 8));
    }
  }

  public unmaskIrq(irq: number): void {
    if (irq < 8) {
      this.masterMask &= ~(1 << irq);
    } else {
      this.slaveMask &= ~(1 << (irq - 8));
    }
  }

  public isRemapped(): boolean {
    return this.offsetMaster === 0x20 || this.offsetMaster === 32;
  }

  public maskIRQ(irq: number): void {
    this.maskIrq(irq);
  }

  public unmaskIRQ(irq: number): void {
    this.unmaskIrq(irq);
  }

  public isIRQMasked(irq: number): boolean {
    return this.isIrqMasked(irq);
  }

  public isIrqMasked(irq: number): boolean {
    if (irq < 8) {
      return (this.masterMask & (1 << irq)) !== 0;
    }
    return (this.slaveMask & (1 << (irq - 8))) !== 0;
  }

  public sendEOI(irq: number): void {
    // Jika interupsi berasal dari slave PIC (IRQ 8..15), kirim EOI ke slave dan master
    if (irq >= 8) {
      // EOI ke slave PIC
    }
    // EOI ke master PIC
  }
}
