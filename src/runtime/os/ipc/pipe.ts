/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Unidirectional Inter-Process Byte Stream Pipe
 * Target Milestone: Phase 50 (v0.50.0)
 */

import { ProcessID } from '../process/types';

export class KernelPipe {
  public static readonly PIPE_BUFFER_SIZE = 64 * 1024; // 64 KB circular buffer
  private buffer: Uint8Array = new Uint8Array(KernelPipe.PIPE_BUFFER_SIZE);
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readClosed: boolean = false;
  private writeClosed: boolean = false;

  constructor(
    public readonly id: string,
    public readonly readerPid: ProcessID,
    public readonly writerPid: ProcessID
  ) {}

  public write(senderPid: ProcessID, data: Uint8Array): { bytesWritten: number; error?: string } {
    if (this.writeClosed || this.readClosed) {
      return { bytesWritten: 0, error: 'EPIPE: Pipe ditutup oleh penerima' };
    }

    if (senderPid !== this.writerPid && this.writerPid !== 0) {
      return { bytesWritten: 0, error: 'EPERM: Proses tidak memiliki hak tulis pada pipe ini' };
    }

    let written = 0;
    while (written < data.length && this.count < KernelPipe.PIPE_BUFFER_SIZE) {
      this.buffer[this.tail] = data[written++];
      this.tail = (this.tail + 1) % KernelPipe.PIPE_BUFFER_SIZE;
      this.count++;
    }

    return { bytesWritten: written };
  }

  public read(receiverPid: ProcessID, maxBytes: number): Uint8Array {
    if (this.readClosed || this.count === 0) {
      return new Uint8Array(0);
    }

    if (receiverPid !== this.readerPid && this.readerPid !== 0) {
      return new Uint8Array(0);
    }

    const toRead = Math.min(maxBytes, this.count);
    const result = new Uint8Array(toRead);

    for (let i = 0; i < toRead; i++) {
      result[i] = this.buffer[this.head];
      this.head = (this.head + 1) % KernelPipe.PIPE_BUFFER_SIZE;
      this.count--;
    }

    return result;
  }

  public closeRead(): void {
    this.readClosed = true;
  }

  public closeWrite(): void {
    this.writeClosed = true;
  }

  public isEof(): boolean {
    return this.writeClosed && this.count === 0;
  }

  public getBufferedCount(): number {
    return this.count;
  }
}
