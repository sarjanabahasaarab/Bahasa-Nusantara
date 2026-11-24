/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * PHASE 52 — Pengujian keamanan rentang memori pengguna.
 */
import assert from 'node:assert/strict';
import { UserPointerSecurity, UserSecurityError } from '../../src/runtime/os/security/user-pointer.js';
import { AddressSpace } from '../../src/runtime/os/memory/address-space.js';
import { PagePermissions } from '../../src/runtime/os/memory/types.js';

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed++; console.log('[LULUS] ' + name); }
  catch (error) { failed++; console.error('[GAGAL] ' + name + ': ' + (error instanceof Error ? error.message : String(error))); }
}

console.log('=== NUSANTARA PHASE 52: KEAMANAN MEMORI PENGGUNA ===');

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

console.log('Phase 52: LULUS=' + passed + ', GAGAL=' + failed + ', TOTAL=' + (passed + failed));
if (failed > 0) process.exitCode = 1;
