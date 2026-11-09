/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Kernel Logger
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { LogLevel } from './types';

export interface LogEntry {
  timestampTicks: number;
  level: LogLevel;
  subsystem: string;
  message: string;
}

export class KernelLogger {
  private static instance?: KernelLogger;
  private entries: LogEntry[] = [];
  private maxEntries: number = 2048;
  private minLevel: LogLevel = LogLevel.INFO;
  private serialSink?: (msg: string) => void;

  constructor(minLevel: LogLevel = LogLevel.INFO, serialSink?: (msg: string) => void) {
    this.minLevel = minLevel;
    this.serialSink = serialSink;
  }

  public static getInstance(): KernelLogger {
    if (!this.instance) {
      this.instance = new KernelLogger();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    this.instance = undefined;
  }

  public setSerialSink(sink: (msg: string) => void): void {
    this.serialSink = sink;
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public log(level: LogLevel, subsystem: string, message: string, ticks: number = 0): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestampTicks: ticks,
      level,
      subsystem,
      message,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    const formatted = `[${LogLevel[level].padEnd(5)}] [${subsystem}] ${message}`;
    if (this.serialSink) {
      this.serialSink(formatted + '\n');
    }
  }

  public debug(subsystemOrMessage: string, message?: string, ticks: number = 0): void {
    if (message === undefined) {
      this.log(LogLevel.DEBUG, 'KERNEL', subsystemOrMessage, ticks);
    } else {
      this.log(LogLevel.DEBUG, subsystemOrMessage, message, ticks);
    }
  }

  public info(subsystemOrMessage: string, message?: string, ticks: number = 0): void {
    if (message === undefined) {
      this.log(LogLevel.INFO, 'KERNEL', subsystemOrMessage, ticks);
    } else {
      this.log(LogLevel.INFO, subsystemOrMessage, message, ticks);
    }
  }

  public warn(subsystemOrMessage: string, message?: string, ticks: number = 0): void {
    if (message === undefined) {
      this.log(LogLevel.WARN, 'KERNEL', subsystemOrMessage, ticks);
    } else {
      this.log(LogLevel.WARN, subsystemOrMessage, message, ticks);
    }
  }

  public error(subsystemOrMessage: string, message?: string, ticks: number = 0): void {
    if (message === undefined) {
      this.log(LogLevel.ERROR, 'KERNEL', subsystemOrMessage, ticks);
    } else {
      this.log(LogLevel.ERROR, subsystemOrMessage, message, ticks);
    }
  }

  public panic(subsystemOrMessage: string, message?: string, ticks: number = 0): void {
    if (message === undefined) {
      this.log(LogLevel.PANIC, 'KERNEL', subsystemOrMessage, ticks);
    } else {
      this.log(LogLevel.PANIC, subsystemOrMessage, message, ticks);
    }
  }

  public getEntries(): ReadonlyArray<LogEntry> {
    return this.entries;
  }

  public clear(): void {
    this.entries = [];
  }
}
