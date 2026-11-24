/** @license SPDX-License-Identifier: Apache-2.0
 * PHASE 80 — Native reservation page normalization, sort and merge contract.
 */
import assert from 'node:assert/strict';
import { X86BootstrapEncoder, X86_BOOTSTRAP_RESERVATION_NORMALIZE_INDEX_ADDRESS, X86_BOOTSTRAP_RESERVATION_SORT_INDEX_ADDRESS, X86_BOOTSTRAP_RESERVATION_SORT_CURSOR_ADDRESS, X86_BOOTSTRAP_RESERVATION_MERGE_READ_ADDRESS, X86_BOOTSTRAP_RESERVATION_MERGE_WRITE_ADDRESS } from '../../src/compiler/targets/kernel/x86-bootstrap-encoder.js';
import { BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS } from '../../src/runtime/os/boot/multiboot2-memory-regions.js';
assert.deepEqual([X86_BOOTSTRAP_RESERVATION_NORMALIZE_INDEX_ADDRESS,X86_BOOTSTRAP_RESERVATION_SORT_INDEX_ADDRESS,X86_BOOTSTRAP_RESERVATION_SORT_CURSOR_ADDRESS,X86_BOOTSTRAP_RESERVATION_MERGE_READ_ADDRESS,X86_BOOTSTRAP_RESERVATION_MERGE_WRITE_ADDRESS],[0x272000,0x272004,0x272008,0x27200c,0x272010]);
assert.ok(BOOTSTRAP_PHYSICAL_MEMORY_RESERVATIONS.some(r=>r.base===0x272000n&&r.length===0x1000n));
const code=Array.from(X86BootstrapEncoder.generateBootstrapBinary().codeBytes);
const has=(n:number[])=>code.some((_,i)=>n.every((v,j)=>code[i+j]===v));
assert.ok(has([0x25,0x00,0xf0,0xff,0xff]),'reservation starts rounded down');
assert.ok(has([0x05,0xff,0x0f,0x00,0x00]),'reservation ends rounded up');
assert.ok(has([0x3b,0x56,0x04]),'uint64 high-word comparison exists');
assert.ok(has([0x3b,0x06]),'uint64 low-word comparison exists');
const marker=new TextEncoder().encode('NUSANTARA_MULTIBOOT2_RESERVATIONS_NORMALIZED_OK');
assert.ok(code.some((_,i)=>marker.every((v,j)=>code[i+j]===v)),'normalization completion marker is embedded');
console.log('Phase 80: native reservation page-rounding, uint64 sort and merge contract passed.');
