/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — Physical Frame Allocator (Phase 97).
 */
#ifndef NUSANTARA_OS_PHYSICAL_FRAME_ALLOCATOR_H
#define NUSANTARA_OS_PHYSICAL_FRAME_ALLOCATOR_H

#include <stddef.h>
#include <stdint.h>

#define NUSANTARA_OS_PAGE_SIZE 4096u

typedef struct nusantara_os_memory_extent {
    uint64_t base;
    uint64_t length;
} nusantara_os_memory_extent_t;

typedef enum nusantara_os_pmm_status {
    NUSANTARA_OS_PMM_OK = 0,
    NUSANTARA_OS_PMM_INVALID_ARGUMENT,
    NUSANTARA_OS_PMM_INVALID_EXTENT,
    NUSANTARA_OS_PMM_OVERLAP,
    NUSANTARA_OS_PMM_BITMAP_TOO_SMALL,
    NUSANTARA_OS_PMM_OUT_OF_MEMORY,
    NUSANTARA_OS_PMM_NOT_MANAGED,
    NUSANTARA_OS_PMM_ALREADY_ALLOCATED,
    NUSANTARA_OS_PMM_OVERFLOW
} nusantara_os_pmm_status_t;

/*
 * Caller-owned storage only: no heap use, locks, MMIO, or architecture-specific
 * instructions. Extents must be sorted, page-aligned, non-overlapping RAM ranges.
 */
typedef struct nusantara_os_physical_frame_allocator {
    const nusantara_os_memory_extent_t *extents;
    size_t extent_count;
    uint8_t *bitmap;
    size_t bitmap_bytes;
    uint64_t total_frames;
    uint64_t free_frames;
    uint8_t initialized;
} nusantara_os_physical_frame_allocator_t;

nusantara_os_pmm_status_t nusantara_os_pmm_init(
    nusantara_os_physical_frame_allocator_t *allocator,
    const nusantara_os_memory_extent_t *extents,
    size_t extent_count,
    uint8_t *bitmap,
    size_t bitmap_bytes);

/* Reserve firmware/kernel/bootloader/page-table frames before normal allocation. */
nusantara_os_pmm_status_t nusantara_os_pmm_reserve(
    nusantara_os_physical_frame_allocator_t *allocator,
    uint64_t base,
    uint64_t length);

/* Allocate one 4 KiB frame, returning its physical base address. */
nusantara_os_pmm_status_t nusantara_os_pmm_allocate(
    nusantara_os_physical_frame_allocator_t *allocator,
    uint64_t *physical_address);

/* Allocate physically contiguous frames; never bridges a firmware memory hole. */
nusantara_os_pmm_status_t nusantara_os_pmm_allocate_contiguous(
    nusantara_os_physical_frame_allocator_t *allocator,
    uint64_t frame_count,
    uint64_t *physical_address);

/* Free exactly one currently allocated frame. Reserved/free/foreign frames reject. */
nusantara_os_pmm_status_t nusantara_os_pmm_free(
    nusantara_os_physical_frame_allocator_t *allocator,
    uint64_t physical_address);

uint64_t nusantara_os_pmm_total_frames(
    const nusantara_os_physical_frame_allocator_t *allocator);
uint64_t nusantara_os_pmm_free_frames(
    const nusantara_os_physical_frame_allocator_t *allocator);

#endif
