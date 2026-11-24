/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 52 — Pengujian keamanan rentang memori pengguna.
 */
import assert from 'node:assert/strict';
import { UserPointerSecurity, UserSecurityError } from '../../src/runtime/os/security/user-pointer.js';
import { AddressSpace } from '../../src/runtime/os/memory/address-space.js';
import { PagePermissions } from '../../src/runtime/os/memory/types.js';
import { SyscallDispatcher } from '../../src/runtime/os/syscall/syscall-dispatcher.js';
import { SyscallTable } from '../../src/runtime/os/syscall/syscall-table.js';
import { SyscallNumber } from '../../src/runtime/os/syscall/syscall-numbers.js';

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed++; console.log('[LULUS] ' + name); }
  catch (error) { failed++; console.error('[GAGAL] ' + name + ': ' + (error instanceof Error ? error.message : String(error))); }
}

console.log('=== NUSANTARA PHASE 52: KEAMANAN MEMORI PENGGUNA ===');

async function asyncTest(name: string, run: () => Promise<void>): Promise<void> {
  try { await run(); passed++; console.log('[LULUS] ' + name); }
  catch (error) { failed++; console.error('[GAGAL] ' + name + ': ' + (error instanceof Error ? error.message : String(error))); }
}

async function runAsyncDispatcherTests(): Promise<void> {


test('52.1 menolak panjang NaN', () => {
  const r = UserPointerSecurity.validateUserBuffer(0x10000n, Number.NaN);
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.BUFFER_OVERFLOW);
});
test('52.2 menolak panjang Infinity', () => {
  const r = UserPointerSecurity.validateUserBuffer(0x10000n, Number.POSITIVE_INFINITY);
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.BUFFER_OVERFLOW);
});
test('52.3 menolak panjang pecahan', () => {
  const r = UserPointerSecurity.validateUserBuffer(0x10000n, 1.5);
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.BUFFER_OVERFLOW);
});
test('52.4 menolak integer di luar rentang aman', () => {
  const r = UserPointerSecurity.validateUserBuffer(0x10000n, Number.MAX_SAFE_INTEGER + 1);
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.BUFFER_OVERFLOW);
});
test('52.5 menolak panjang negatif', () => {
  const r = UserPointerSecurity.validateUserBuffer(0x10000n, -1);
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.BUFFER_OVERFLOW);
});
test('52.6 tetap menerima rentang kecil yang valid', () => {
  const r = UserPointerSecurity.validateUserBuffer(0x10000n, 16);
  assert.equal(r.valid, true);
});
test('52.7 menolak ukuran string NaN tanpa memanggil pembaca memori', () => {
  let reads = 0;
  const r = UserPointerSecurity.validateUserString(0x10000n, Number.NaN, undefined, () => { reads++; return new Uint8Array(); });
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.BUFFER_OVERFLOW);
  assert.equal(reads, 0);
});
test('52.8 menolak ukuran string di atas batas 4 KiB', () => {
  const r = UserPointerSecurity.validateUserString(0x10000n, 4097);
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.BUFFER_TOO_LARGE);
});
test('52.9 copy_from_user menolak buffer kernel tujuan terlalu kecil', () => {
  const ok = UserPointerSecurity.copyFromUser(new Uint8Array(2), 0x10000n, 4, undefined, () => new Uint8Array([1,2,3,4]));
  assert.equal(ok, false);
});
test('52.10 copy_to_user menolak sumber kernel lebih kecil dari panjang yang diminta', () => {
  const ok = UserPointerSecurity.copyToUser(0x10000n, new Uint8Array([1,2]), 4, undefined, () => true);
  assert.equal(ok, false);
});

test('52.11 copy_from_user gagal tertutup jika reader belum dipasang', () => {
  const ok = UserPointerSecurity.copyFromUser(new Uint8Array(4), 0x10000n, 4);
  assert.equal(ok, false);
});
test('52.12 copy_to_user gagal tertutup jika writer belum dipasang', () => {
  const ok = UserPointerSecurity.copyToUser(0x10000n, new Uint8Array([1,2,3,4]), 4);
  assert.equal(ok, false);
});

test('52.13 string gagal tertutup jika reader belum dipasang', () => {
  const r = UserPointerSecurity.validateUserString(0x10000n, 16);
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.UNMAPPED_MEMORY);
});

test('52.14 string menolak hasil pembacaan yang lebih pendek dari batas', () => {
  const r = UserPointerSecurity.validateUserString(0x10000n, 4, undefined, () => new Uint8Array([65, 0]));
  assert.equal(r.valid, false);
  assert.equal(r.error, UserSecurityError.UNMAPPED_MEMORY);
});

test('52.15 string menerima data yang benar-benar dibaca dan null-terminated', () => {
  const r = UserPointerSecurity.validateUserString(0x10000n, 4, undefined, () => new Uint8Array([65, 66, 0, 0]));
  assert.equal(r.valid, true);
  assert.equal(r.length, 2);
  assert.equal(r.str, 'AB');
  assert.equal(r.error, UserSecurityError.OK);
});

test('52.16 address space menolak READ pada halaman tanpa izin baca', () => {
  const space = new AddressSpace();
  space.mapPage(0x0040_0000n, 0x0100_0000n, PagePermissions.NONE, true);
  const result = space.checkAccess(0x0040_0000n, 'READ', true);
  assert.equal(result.allowed, false);
  assert.equal(result.faultReason, 'READ_PROTECTION_VIOLATION');
});

test('52.17 address space tetap mengizinkan READ pada halaman READ-only', () => {
  const space = new AddressSpace();
  space.mapPage(0x0040_0000n, 0x0100_0000n, PagePermissions.READ, true);
  const result = space.checkAccess(0x0040_0000n, 'READ', true);
  assert.equal(result.allowed, true);
});


await asyncTest('52.18 dispatcher memberikan copy_from_user ke handler dengan data kernel hasil salin lintas halaman', async () => {
  const space = new AddressSpace();
  space.mapPage(0x0050_0000n, 0x0110_0000n, PagePermissions.USER_READ_WRITE, true);
  space.mapPage(0x0050_1000n, 0x0110_1000n, PagePermissions.USER_READ_WRITE, true);
  const table = new SyscallTable();
  let received = '';
  table.register({
    number: 9001, name: 'test_copy_from_user', minArgs: 2,
    handler: (args, ctx) => {
      const bytes = ctx.userMemory?.copyFromUser(args[0], Number(args[1]));
      received = bytes ? new TextDecoder().decode(bytes) : '';
      return BigInt(bytes?.length ?? -1);
    },
  });
  const dispatcher = new SyscallDispatcher(table);
  dispatcher.setMemoryAccessors(
    (_space, _address, length) => new TextEncoder().encode('ABCD').subarray(0, length),
    () => true,
  );
  const result = await dispatcher.dispatch(9001, [0x0050_0FFEn, 4n], {
    callingProcessId: 7, callingThreadId: 1, isKernelCaller: false, addressSpace: space,
  });
  assert.equal(result, 4n);
  assert.equal(received, 'ABCD');
});

await asyncTest('52.19 copy_from_user handler gagal tertutup jika reader tidak dipasang', async () => {
  const table = new SyscallTable();
  table.register({
    number: 9002, name: 'test_copy_from_user_without_reader', minArgs: 2,
    handler: (args, ctx) => BigInt(ctx.userMemory?.copyFromUser(args[0], Number(args[1]))?.length ?? -1),
  });
  const dispatcher = new SyscallDispatcher(table);
  const space = new AddressSpace();
  space.mapPage(0x0060_0000n, 0x0120_0000n, PagePermissions.USER_READ_WRITE, true);
  const result = await dispatcher.dispatch(9002, [0x0060_0000n, 4n], {
    callingProcessId: 7, callingThreadId: 1, isKernelCaller: false, addressSpace: space,
  });
  assert.equal(result, -1n);
});

await asyncTest('52.20 copy_to_user handler menulis hanya melalui writer yang dipasang', async () => {
  const table = new SyscallTable();
  let written = '';
  table.register({
    number: 9003, name: 'test_copy_to_user', minArgs: 1,
    handler: (_args, ctx) => BigInt(ctx.userMemory?.copyToUser(0x0070_0000n, new TextEncoder().encode('OK')) ? 1 : 0),
  });
  const dispatcher = new SyscallDispatcher(table);
  dispatcher.setMemoryAccessors(
    () => null,
    (_space, _address, data) => { written = new TextDecoder().decode(data); return true; },
  );
  const space = new AddressSpace();
  space.mapPage(0x0070_0000n, 0x0130_0000n, PagePermissions.USER_READ_WRITE, true);
  const result = await dispatcher.dispatch(9003, [0n], {
    callingProcessId: 7, callingThreadId: 1, isKernelCaller: false, addressSpace: space,
  });
  assert.equal(result, 1n);
  assert.equal(written, 'OK');
});


await asyncTest('52.21 syscall pointer ditolak jika konteks proses tidak membawa address space', async () => {
  const dispatcher = new SyscallDispatcher(new SyscallTable());
  dispatcher.setMemoryAccessors(
    (_space, _address, length) => new Uint8Array(length),
    () => true,
  );
  const result = await dispatcher.dispatch(SyscallNumber.CONSOLE_WRITE, [0x0080_0000n, 4n], {
    callingProcessId: 7, callingThreadId: 1, isKernelCaller: false,
  });
  assert.equal(result, -14n);
});


await asyncTest('52.25 accessor memori menerima AddressSpace proses yang tepat untuk copyin dan copyout', async () => {
  const space = new AddressSpace();
  space.mapPage(0x0090_0000n, 0x0150_0000n, PagePermissions.USER_READ_WRITE, true);
  let readerSpace: AddressSpace | undefined;
  let writerSpace: AddressSpace | undefined;
  const table = new SyscallTable();
  table.register({
    number: 9004, name: 'test_process_scoped_accessors', minArgs: 0,
    handler: (_args, ctx) => {
      const input = ctx.userMemory?.copyFromUser(0x0090_0000n, 2);
      const output = ctx.userMemory?.copyToUser(0x0090_0000n, new TextEncoder().encode('OK'));
      return BigInt(input?.length === 2 && output ? 1 : 0);
    },
  });
  const dispatcher = new SyscallDispatcher(table);
  dispatcher.setMemoryAccessors(
    (addressSpace, _address, length) => { readerSpace = addressSpace; return new Uint8Array(length); },
    (addressSpace) => { writerSpace = addressSpace; return true; },
  );
  const result = await dispatcher.dispatch(9004, [], {
    callingProcessId: 9, callingThreadId: 1, isKernelCaller: false, addressSpace: space,
  });
  assert.equal(result, 1n);
  assert.equal(readerSpace, space);
  assert.equal(writerSpace, space);
});

}

void runAsyncDispatcherTests().then(() => {
console.log('Phase 52: LULUS=' + passed + ', GAGAL=' + failed + ', TOTAL=' + (passed + failed));
if (failed > 0) process.exitCode = 1;
});
