#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0
 * Phase 92: reproducible freestanding AArch64 Image builder.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const output = resolve(process.argv[2] ?? '/tmp/nusantara-arm64/Image');
const object = resolve('/tmp/nusantara-arm64-image.o');
const elf = resolve('/tmp/nusantara-arm64-image.elf');
const source = resolve(root, 'src/runtime/os/arch/arm64/image.S');
const linkerScript = resolve(root, 'src/runtime/os/arch/arm64/image.ld');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Perintah gagal (${result.status}): ${command} ${args.join(' ')}`);
  }
}

mkdirSync(dirname(output), { recursive: true });
run('clang', [
  '--target=aarch64-none-elf', '-mcpu=cortex-a57', '-ffreestanding',
  '-fno-stack-protector', '-c', source, '-o', object,
]);
run('ld.lld', [
  '-m', 'aarch64elf', '-nostdlib', '-T', linkerScript, '-o', elf, object,
]);
run('llvm-objcopy', ['-O', 'binary', elf, output]);
run('llvm-readelf', ['-h', elf]);
console.log(`ARM64 Image dibuat: ${output}`);
