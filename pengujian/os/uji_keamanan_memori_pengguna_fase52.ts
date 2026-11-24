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
import { AddressSpaceMemoryAccessor, installAddressSpaceMemoryAccessor } from '../../src/runtime/os/memory/address-space-memory-accessor.js';

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


await asyncTest('52.26 accessor menyalin buffer lintas dua halaman melalui translasi fisik', async () => {
  const space = new AddressSpace();
  space.mapPage(0x00A0_0000n, 0x0160_0000n, PagePermissions.USER_READ_WRITE, true);
  space.mapPage(0x00A0_1000n, 0x0160_1000n, PagePermissions.USER_READ_WRITE, true);
  const accessor = new AddressSpaceMemoryAccessor(
    (address, length) => {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = address + BigInt(i) < 0x0160_1000n ? 0x41 : 0x42;
      return bytes;
    },
    () => true,
  );
  const read = accessor.copyFromUser(space, 0x00A0_0FFEn, 4);
  assert.ok(read);
  assert.equal(new TextDecoder().decode(read), 'AABB');
  const writes: bigint[] = [];
  const writer = new AddressSpaceMemoryAccessor(
    () => null,
    (address) => { writes.push(address); return true; },
  );
  assert.equal(writer.copyToUser(space, 0x00A0_0FFEn, new TextEncoder().encode('WXYZ')), true);
  assert.deepEqual(writes, [0x0160_0FFEn, 0x0160_1000n]);
});

await asyncTest('52.27 accessor menolak READ jika izin halaman tidak memuat READ', async () => {
  const space = new AddressSpace();
  space.mapPage(0x00B0_0000n, 0x0170_0000n, PagePermissions.WRITE, true);
  const accessor = new AddressSpaceMemoryAccessor(() => new Uint8Array(8), () => true);
  assert.equal(accessor.copyFromUser(space, 0x00B0_0000n, 8), null);
});

await asyncTest('52.28 accessor menolak WRITE ke halaman READ-only', async () => {
  const space = new AddressSpace();
  space.mapPage(0x00C0_0000n, 0x0180_0000n, PagePermissions.READ, true);
  const accessor = new AddressSpaceMemoryAccessor(() => new Uint8Array(8), () => true);
  assert.equal(accessor.copyToUser(space, 0x00C0_0000n, new Uint8Array(8)), false);
});

await asyncTest('52.29 accessor menolak rentang jika halaman kedua tidak terpetakan', async () => {
  const space = new AddressSpace();
  space.mapPage(0x00D0_0000n, 0x0190_0000n, PagePermissions.USER_READ_WRITE, true);
  const accessor = new AddressSpaceMemoryAccessor(() => new Uint8Array(8), () => true);
  assert.equal(accessor.copyFromUser(space, 0x00D0_0FF0n, 32), null);
});


await asyncTest('52.30 adapter memori terpasang pada dispatcher dan handler menerima byte hasil translasi', async () => {
  const space = new AddressSpace();
  space.mapPage(0x00E0_0000n, 0x01A0_0000n, PagePermissions.USER_READ_WRITE, true);
  const table = new SyscallTable();
  let observed = '';
  table.register({
    number: 9005, name: 'test_address_space_accessor_in_dispatcher', minArgs: 2,
    handler: (args, ctx) => {
      const data = ctx.userMemory?.copyFromUser(args[0], Number(args[1]));
      observed = data ? new TextDecoder().decode(data) : '';
      return BigInt(data?.length ?? -1);
    },
  });
  const physicalBytes = new Map<bigint, number>();
  new TextEncoder().encode('NUSA').forEach((value, index) => physicalBytes.set(0x01A0_0000n + BigInt(index), value));
  const accessor = new AddressSpaceMemoryAccessor(
    (physical, length) => {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = physicalBytes.get(physical + BigInt(i)) ?? 0;
      return bytes;
    },
    () => true,
  );
  const dispatcher = new SyscallDispatcher(table);
  installAddressSpaceMemoryAccessor(dispatcher, accessor);
  const result = await dispatcher.dispatch(9005, [0x00E0_0000n, 4n], {
    callingProcessId: 10, callingThreadId: 1, isKernelCaller: false, addressSpace: space,
  });
  assert.equal(result, 4n);
  assert.equal(observed, 'NUSA');
});


await asyncTest('52.31 accessor menolak pointer null-page dan rentang melewati batas user space', async () => {
  const space = new AddressSpace();
  space.mapPage(0x0000_0000n, 0x01B0_0000n, PagePermissions.USER_READ_WRITE, true);
  space.mapPage(0x0000_0001_0000n, 0x01B0_1000n, PagePermissions.USER_READ_WRITE, true);
  const accessor = new AddressSpaceMemoryAccessor(() => new Uint8Array(4), () => true);
  assert.equal(accessor.copyFromUser(space, 0n, 4), null);
  assert.equal(accessor.copyFromUser(space, 0x0000_7FFF_FFFF_FFFEn, 4), null);
});

await asyncTest('52.32 accessor menolak transfer lebih besar dari batas 16 MiB', async () => {
  const space = new AddressSpace();
  const accessor = new AddressSpaceMemoryAccessor(() => new Uint8Array(0), () => true);
  assert.equal(accessor.copyFromUser(space, 0x0001_0000n, 16 * 1024 * 1024 + 1), null);
  assert.equal(accessor.copyToUser(space, 0x0001_0000n, new Uint8Array(1), 16 * 1024 * 1024 + 1), false);
});

}

void runAsyncDispatcherTests().then(() => {
console.log('Phase 52: LULUS=' + passed + ', GAGAL=' + failed + ', TOTAL=' + (passed + failed));
if (failed > 0) process.exitCode = 1;
});
