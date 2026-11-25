/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — Physical Frame Allocator (Phase 97).
 */
#include "physical-frame-allocator.h"

#define PMM_U64_LIMIT UINT64_MAX

static int valid_allocator(const nusantara_os_physical_frame_allocator_t *a) {
    return a && a->initialized && a->bitmap && a->extents;
}

static uint64_t extent_frames(const nusantara_os_memory_extent_t *e) {
    return e->length / NUSANTARA_OS_PAGE_SIZE;
}

static int locate_frame(const nusantara_os_physical_frame_allocator_t *a,
                        uint64_t address, uint64_t *global_index) {
    uint64_t first = 0u;
    size_t i;
    if (!valid_allocator(a) || !global_index ||
        (address % NUSANTARA_OS_PAGE_SIZE) != 0u) return 0;
    for (i = 0; i < a->extent_count; ++i) {
        const nusantara_os_memory_extent_t *e = &a->extents[i];
        const uint64_t end = e->base + e->length;
        if (address >= e->base && address < end) {
            *global_index = first + (address - e->base) / NUSANTARA_OS_PAGE_SIZE;
            return 1;
        }
        first += extent_frames(e);
    }
    return 0;
}

static int bit_is_set(const nusantara_os_physical_frame_allocator_t *a,
                      uint64_t index) {
    return (a->bitmap[index >> 3] & (uint8_t)(1u << (index & 7u))) != 0u;
}

static void set_bit(nusantara_os_physical_frame_allocator_t *a,
                    uint64_t index) {
    a->bitmap[index >> 3] |= (uint8_t)(1u << (index & 7u));
}

static void clear_bit(nusantara_os_physical_frame_allocator_t *a,
                      uint64_t index) {
    a->bitmap[index >> 3] &= (uint8_t)~(uint8_t)(1u << (index & 7u));
}

static int address_for_index(const nusantara_os_physical_frame_allocator_t *a,
                             uint64_t index, uint64_t *address) {
    uint64_t first = 0u;
    size_t i;
    if (!valid_allocator(a) || !address || index >= a->total_frames) return 0;
    for (i = 0; i < a->extent_count; ++i) {
        const uint64_t count = extent_frames(&a->extents[i]);
        if (index >= first && index - first < count) {
            *address = a->extents[i].base +
                (index - first) * NUSANTARA_OS_PAGE_SIZE;
            return 1;
        }
        first += count;
    }
    return 0;
}

nusantara_os_pmm_status_t nusantara_os_pmm_init(
    nusantara_os_physical_frame_allocator_t *a,
    const nusantara_os_memory_extent_t *extents,
    size_t extent_count, uint8_t *bitmap, size_t bitmap_bytes) {
    uint64_t total = 0u;
    uint64_t previous_end = 0u;
    size_t required;
    size_t i;
    if (!a || !extents || extent_count == 0u || !bitmap) {
        return NUSANTARA_OS_PMM_INVALID_ARGUMENT;
    }
    a->initialized = 0u;
    for (i = 0; i < extent_count; ++i) {
        const uint64_t base = extents[i].base;
        const uint64_t length = extents[i].length;
        if (length == 0u || base % NUSANTARA_OS_PAGE_SIZE != 0u ||
            length % NUSANTARA_OS_PAGE_SIZE != 0u ||
            base > PMM_U64_LIMIT - length) {
            return NUSANTARA_OS_PMM_INVALID_EXTENT;
        }
        if (i != 0u && base < previous_end) return NUSANTARA_OS_PMM_OVERLAP;
        const uint64_t frames = length / NUSANTARA_OS_PAGE_SIZE;
        if (total > UINT64_MAX - frames) return NUSANTARA_OS_PMM_OVERFLOW;
        total += frames;
        previous_end = base + length;
    }
    if (total > (uint64_t)SIZE_MAX * 8u) return NUSANTARA_OS_PMM_OVERFLOW;
    required = (size_t)(total / 8u + ((total % 8u) != 0u ? 1u : 0u));
    if (bitmap_bytes < required) return NUSANTARA_OS_PMM_BITMAP_TOO_SMALL;

    a->extents = extents;
    a->extent_count = extent_count;
    a->bitmap = bitmap;
    a->bitmap_bytes = bitmap_bytes;
    a->total_frames = total;
    a->free_frames = total;
    for (i = 0; i < required; ++i) bitmap[i] = 0u;
    a->initialized = 1u;
    return NUSANTARA_OS_PMM_OK;
}

nusantara_os_pmm_status_t nusantara_os_pmm_reserve(
    nusantara_os_physical_frame_allocator_t *a, uint64_t base, uint64_t length) {
    uint64_t first_index, last_index, cursor;
    if (!valid_allocator(a) || length == 0u ||
        base % NUSANTARA_OS_PAGE_SIZE != 0u ||
        length % NUSANTARA_OS_PAGE_SIZE != 0u ||
        base > UINT64_MAX - length) return NUSANTARA_OS_PMM_INVALID_ARGUMENT;
    if (!locate_frame(a, base, &first_index)) return NUSANTARA_OS_PMM_NOT_MANAGED;
    if (!locate_frame(a, base + length - NUSANTARA_OS_PAGE_SIZE, &last_index) ||
        last_index < first_index || last_index - first_index + 1u != length / NUSANTARA_OS_PAGE_SIZE) {
        return NUSANTARA_OS_PMM_NOT_MANAGED;
    }
    /* Validate the entire range before mutating the bitmap (atomic failure semantics). */
    for (cursor = first_index; cursor <= last_index; ++cursor) {
        if (bit_is_set(a, cursor)) continue;
    }
    for (cursor = first_index; cursor <= last_index; ++cursor) {
        if (!bit_is_set(a, cursor)) {
            set_bit(a, cursor);
            --a->free_frames;
        }
    }
    return NUSANTARA_OS_PMM_OK;
}

nusantara_os_pmm_status_t nusantara_os_pmm_allocate(
    nusantara_os_physical_frame_allocator_t *a, uint64_t *physical_address) {
    uint64_t i;
    if (!valid_allocator(a) || !physical_address) return NUSANTARA_OS_PMM_INVALID_ARGUMENT;
    if (a->free_frames == 0u) return NUSANTARA_OS_PMM_OUT_OF_MEMORY;
    for (i = 0u; i < a->total_frames; ++i) {
        uint64_t address;
        if (!bit_is_set(a, i) && address_for_index(a, i, &address)) {
            set_bit(a, i);
            --a->free_frames;
            *physical_address = address;
            return NUSANTARA_OS_PMM_OK;
        }
    }
    return NUSANTARA_OS_PMM_OUT_OF_MEMORY;
}

nusantara_os_pmm_status_t nusantara_os_pmm_allocate_contiguous(
    nusantara_os_physical_frame_allocator_t *a, uint64_t count,
    uint64_t *physical_address) {
    uint64_t i, run = 0u, start = 0u, previous = 0u;
    if (!valid_allocator(a) || !physical_address || count == 0u) {
        return NUSANTARA_OS_PMM_INVALID_ARGUMENT;
    }
    if (count > a->free_frames) return NUSANTARA_OS_PMM_OUT_OF_MEMORY;
    for (i = 0u; i < a->total_frames; ++i) {
        uint64_t address;
        if (bit_is_set(a, i) || !address_for_index(a, i, &address) ||
            (run != 0u && address != previous + NUSANTARA_OS_PAGE_SIZE)) {
            run = 0u;
        }
        if (!bit_is_set(a, i) && address_for_index(a, i, &address)) {
            if (run == 0u) start = i;
            ++run;
            previous = address;
            if (run == count) {
                uint64_t j;
                uint64_t result;
                (void)address_for_index(a, start, &result);
                for (j = start; j <= i; ++j) set_bit(a, j);
                a->free_frames -= count;
                *physical_address = result;
                return NUSANTARA_OS_PMM_OK;
            }
        }
    }
    return NUSANTARA_OS_PMM_OUT_OF_MEMORY;
}

nusantara_os_pmm_status_t nusantara_os_pmm_free(
    nusantara_os_physical_frame_allocator_t *a, uint64_t address) {
    uint64_t index;
    if (!valid_allocator(a)) return NUSANTARA_OS_PMM_INVALID_ARGUMENT;
    if (!locate_frame(a, address, &index)) return NUSANTARA_OS_PMM_NOT_MANAGED;
    if (!bit_is_set(a, index)) return NUSANTARA_OS_PMM_ALREADY_ALLOCATED;
    clear_bit(a, index);
    ++a->free_frames;
    return NUSANTARA_OS_PMM_OK;
}

uint64_t nusantara_os_pmm_total_frames(
    const nusantara_os_physical_frame_allocator_t *a) {
    return valid_allocator(a) ? a->total_frames : 0u;
}
uint64_t nusantara_os_pmm_free_frames(
    const nusantara_os_physical_frame_allocator_t *a) {
    return valid_allocator(a) ? a->free_frames : 0u;
}
