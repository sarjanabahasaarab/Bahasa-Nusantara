/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include "mmu.h"
typedef struct test_pool {
    uint64_t tables[3][512];
    uint64_t physical[3];
    unsigned used;
} test_pool_t;
static int table_pool(void *context, nusantara_arm64_page_table_t *table)
{
    test_pool_t *pool = (test_pool_t *)context;
    unsigned i;
    if (table->physical_address != 0u) {
        for (i = 0u; i < pool->used; ++i) {
            if (pool->physical[i] == table->physical_address) {
                table->entries = pool->tables[i];
                return 1;
            }
        }
        return 0;
    }
    if (pool->used >= 3u) return 0;
    pool->physical[pool->used] = UINT64_C(0x41000000) +
                                 (uint64_t)pool->used * NUSANTARA_ARM64_PAGE_SIZE;
    table->physical_address = pool->physical[pool->used];
    table->entries = pool->tables[pool->used];
    ++pool->used;
    return 1;
}
int main(void)
{
    _Alignas(4096) uint64_t root[512];
    test_pool_t pool = {{{0}}, {0}, 0u};
    nusantara_arm64_mmu_t mmu;
    uint64_t user_code, user_data, kernel_page;
    assert(nusantara_arm64_mmu_init(&mmu, root, UINT64_C(0x40000000),
                                    table_pool, &pool));
    assert(nusantara_arm64_mmu_map_page(&mmu, UINT64_C(0x0000000040080000),
        UINT64_C(0x40080000), NUSANTARA_ARM64_PAGE_USER_RO, 1));
    assert(nusantara_arm64_mmu_map_page(&mmu, UINT64_C(0x0000000040081000),
        UINT64_C(0x40081000), NUSANTARA_ARM64_PAGE_USER_RW, 0));
    assert(nusantara_arm64_mmu_map_page(&mmu, UINT64_C(0x0000000040082000),
        UINT64_C(0x40082000), NUSANTARA_ARM64_PAGE_KERNEL_RW, 1));
    user_code = nusantara_arm64_mmu_lookup_page(&mmu, UINT64_C(0x40080000));
    user_data = nusantara_arm64_mmu_lookup_page(&mmu, UINT64_C(0x40081000));
    kernel_page = nusantara_arm64_mmu_lookup_page(&mmu, UINT64_C(0x40082000));
    assert((user_code & (UINT64_C(3) << 6)) == NUSANTARA_ARM64_DESC_AP_EL0_RO);
    assert((user_code & NUSANTARA_ARM64_DESC_PXN) != 0u);
    assert((user_code & NUSANTARA_ARM64_DESC_UXN) == 0u);
    assert((user_data & (UINT64_C(3) << 6)) == NUSANTARA_ARM64_DESC_AP_EL0_RW);
    assert((user_data & NUSANTARA_ARM64_DESC_UXN) != 0u);
    assert((kernel_page & (UINT64_C(3) << 6)) == 0u);
    assert((kernel_page & NUSANTARA_ARM64_DESC_UXN) != 0u);
    assert(nusantara_arm64_mmu_lookup_page(&mmu, UINT64_C(0x40083000)) == 0u);
    assert(!nusantara_arm64_mmu_map_page(&mmu, UINT64_C(0x40080000),
        UINT64_C(0x40083000), NUSANTARA_ARM64_PAGE_USER_RW, 0));
    assert(!nusantara_arm64_mmu_map_page(&mmu, UINT64_C(0x40080001),
        UINT64_C(0x40083000), NUSANTARA_ARM64_PAGE_USER_RW, 0));
    assert(!nusantara_arm64_mmu_map_page(&mmu, UINT64_C(0x0001000000000000),
        UINT64_C(0x40083000), NUSANTARA_ARM64_PAGE_USER_RW, 0));
    assert(mmu.allocated_tables == 4u);
    return 0;
}
