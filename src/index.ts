/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language Entry Point & CLI Dispatcher
 */

export * from './paket/cli';
export * from './runtime/os';
export * from './compiler/targets/kernel/boot-headers';
export * from './compiler/targets/kernel/kernel-elf-builder';
export * from './compiler/targets/kernel/multiboot2-validator';
export * from './compiler/targets/kernel/elf64-validator';

import { NusantaraCLI } from './paket/cli';

if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1] &&
  (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'))
) {
  const cli = new NusantaraCLI();
  const kodeKeluar = cli.jalankan(process.argv.slice(2));
  if (kodeKeluar !== 0) {
    process.exit(kodeKeluar);
  }
}
