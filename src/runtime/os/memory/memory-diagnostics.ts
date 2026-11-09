/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA OS - Memory Diagnostics Tracker
 * Target Milestone: Phase 48 (v0.48.0)
 */

import { PhysicalMemoryManager } from './physical-memory';
import { VirtualMemoryManager } from './virtual-memory';
import { KernelHeap } from './kernel-heap';

export interface MemoryReport {
  physicalTotalBytes: number;
  physicalFreeBytes: number;
  physicalUsedFrames: number;
  virtualMappedPages: number;
  heapTotalBytes: number;
  heapAllocatedBytes: number;
  heapFreeBytes: number;
  heapFragmentationPercent: number;
  activeAllocations: number;
}

export class MemoryDiagnostics {
  public static generateReport(
    pmm: PhysicalMemoryManager,
    vmm: VirtualMemoryManager,
    heap: KernelHeap
  ): MemoryReport {
    return {
      physicalTotalBytes: pmm.getTotalBytes(),
      physicalFreeBytes: pmm.getFreeBytes(),
      physicalUsedFrames: pmm.getTotalFrames() - pmm.getFreeFrames(),
      virtualMappedPages: vmm.getMappedPageCount(),
      heapTotalBytes: heap.getHeapSize(),
      heapAllocatedBytes: heap.getAllocatedBytes(),
      heapFreeBytes: heap.getFreeBytes(),
      heapFragmentationPercent: Number((heap.getFragmentationRatio() * 100).toFixed(2)),
      activeAllocations: heap.getActiveAllocationCount(),
    };
  }
}
