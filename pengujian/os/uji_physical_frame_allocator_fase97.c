/* SPDX-License-Identifier: Apache-2.0 */
#include "physical-frame-allocator.h"

#include <assert.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    const nusantara_os_memory_extent_t extents[] = {
        { .base = 0x100000u, .length = 0x4000u },
        { .base = 0x200000u, .length = 0x4000u }
    };
    uint8_t bitmap[2];
    nusantara_os_physical_frame_allocator_t pmm;
    uint64_t address = 0u;

    memset(bitmap, 0xff, sizeof(bitmap));
    assert(nusantara_os_pmm_init(&pmm, extents, 2u, bitmap, sizeof(bitmap)) ==
        NUSANTARA_OS_PMM_OK);
    assert(nusantara_os_pmm_total_frames(&pmm) == 8u);
    assert(nusantara_os_pmm_free_frames(&pmm) == 8u);
    assert(bitmap[0] == 0u && bitmap[1] == 0xffu); /* bytes beyond required bitmap remain caller-owned */

    /* Reserve first frame and an existing reservation is idempotent. */
    assert(nusantara_os_pmm_reserve(&pmm, 0x100000u, 0x1000u) == NUSANTARA_OS_PMM_OK);
    assert(nusantara_os_pmm_reserve(&pmm, 0x100000u, 0x1000u) == NUSANTARA_OS_PMM_OK);
    assert(nusantara_os_pmm_free_frames(&pmm) == 7u);

    assert(nusantara_os_pmm_allocate(&pmm, &address) == NUSANTARA_OS_PMM_OK);
    assert(address == 0x101000u);
    assert(nusantara_os_pmm_free_frames(&pmm) == 6u);
    assert(nusantara_os_pmm_free(&pmm, address) == NUSANTARA_OS_PMM_OK);
    assert(nusantara_os_pmm_free(&pmm, address) == NUSANTARA_OS_PMM_ALREADY_ALLOCATED);
    assert(nusantara_os_pmm_free_frames(&pmm) == 7u);

    /* A contiguous request must never bridge the physical hole between extents. */
    assert(nusantara_os_pmm_allocate_contiguous(&pmm, 5u, &address) ==
        NUSANTARA_OS_PMM_OUT_OF_MEMORY);
    assert(nusantara_os_pmm_free_frames(&pmm) == 7u);
    assert(nusantara_os_pmm_allocate_contiguous(&pmm, 3u, &address) ==
        NUSANTARA_OS_PMM_OK);
    assert(address == 0x101000u);
    assert(nusantara_os_pmm_free_frames(&pmm) == 4u);

    /* Reservations must reject ranges crossing a hole without partial mutation. */
    assert(nusantara_os_pmm_reserve(&pmm, 0x103000u, 0x2000u) ==
        NUSANTARA_OS_PMM_NOT_MANAGED);
    assert(nusantara_os_pmm_free_frames(&pmm) == 4u);
    assert(nusantara_os_pmm_reserve(&pmm, 0x200000u, 0x1000u) == NUSANTARA_OS_PMM_OK);
    assert(nusantara_os_pmm_free_frames(&pmm) == 3u);

    assert(nusantara_os_pmm_free(&pmm, 0x200000u) == NUSANTARA_OS_PMM_RESERVED_FRAME);
    assert(nusantara_os_pmm_free(&pmm, 0x300000u) == NUSANTARA_OS_PMM_NOT_MANAGED);
    assert(nusantara_os_pmm_allocate(&pmm, NULL) == NUSANTARA_OS_PMM_INVALID_ARGUMENT);

    {
        const nusantara_os_memory_extent_t overlap[] = {
            { .base = 0x100000u, .length = 0x2000u },
            { .base = 0x101000u, .length = 0x2000u }
        };
        assert(nusantara_os_pmm_init(&pmm, overlap, 2u, bitmap, sizeof(bitmap)) ==
            NUSANTARA_OS_PMM_OVERLAP);
    }
    assert(nusantara_os_pmm_init(&pmm, extents, 2u, bitmap, 0u) ==
        NUSANTARA_OS_PMM_BITMAP_TOO_SMALL);

    puts("Phase 97: physical frame allocator contract tests passed");
    return 0;
}
