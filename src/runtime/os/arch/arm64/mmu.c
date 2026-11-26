/* SPDX-License-Identifier: Apache-2.0 */
#include "mmu.h"
static const unsigned shifts[4] = {39u, 30u, 21u, 12u};
static int valid_page(uint64_t address)
{
    return (address & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) == 0u &&
           (address & ~NUSANTARA_ARM64_PA_MASK) == 0u;
}
int nusantara_arm64_mmu_init(nusantara_arm64_mmu_t *mmu,
    uint64_t *root_entries, uint64_t root_physical,
    nusantara_arm64_page_table_allocate_fn allocate_table, void *context)
{
    unsigned i;
    if (mmu == 0 || root_entries == 0 || allocate_table == 0 ||
        !valid_page(root_physical)) return NUSANTARA_ARM64_MMU_INVALID;
    mmu->root.entries = root_entries;
    mmu->root.physical_address = root_physical;
    mmu->allocate_table = allocate_table;
    mmu->allocator_context = context;
    mmu->allocated_tables = 1u;
    for (i = 0u; i < NUSANTARA_ARM64_TABLE_ENTRIES; ++i)
        root_entries[i] = 0u;
    return NUSANTARA_ARM64_MMU_OK;
}
static uint64_t *walk_to_l3(nusantara_arm64_mmu_t *mmu, uint64_t va, int create)
{
    uint64_t *entries = mmu->root.entries;
    unsigned level;
    for (level = 0u; level < 3u; ++level) {
        unsigned index = (unsigned)((va >> shifts[level]) & 0x1ffu);
        uint64_t descriptor = entries[index];
        if ((descriptor & NUSANTARA_ARM64_DESC_VALID) == 0u) {
            nusantara_arm64_page_table_t child;
            unsigned i;
            if (!create) return 0;
            child.entries = 0;
            child.physical_address = 0u;
            if (!mmu->allocate_table(mmu->allocator_context, &child) ||
                child.entries == 0 || !valid_page(child.physical_address))
                return 0;
            for (i = 0u; i < NUSANTARA_ARM64_TABLE_ENTRIES; ++i)
                child.entries[i] = 0u;
            entries[index] = (child.physical_address & NUSANTARA_ARM64_PA_MASK) |
                             NUSANTARA_ARM64_DESC_TABLE_PAGE;
            ++mmu->allocated_tables;
            descriptor = entries[index];
            /* The allocator's identity mapping is the writable table alias. */
            entries = child.entries;
        } else {
            if ((descriptor & 3u) != NUSANTARA_ARM64_DESC_TABLE_PAGE)
                return 0; /* A block descriptor cannot be silently replaced. */
            /* Recover the table alias through the allocator's physical mapping contract. */
            {
                nusantara_arm64_page_table_t child;
                child.entries = 0;
                child.physical_address = descriptor & NUSANTARA_ARM64_PA_MASK;
                if (!mmu->allocate_table(mmu->allocator_context, &child) ||
                    child.entries == 0 ||
                    child.physical_address != (descriptor & NUSANTARA_ARM64_PA_MASK))
                    return 0;
                entries = child.entries;
            }
        }
    }
    return entries;
}
int nusantara_arm64_mmu_map_page(nusantara_arm64_mmu_t *mmu,
    uint64_t virtual_address, uint64_t physical_address,
    nusantara_arm64_page_access_t access, int executable)
{
    uint64_t *entries;
    uint64_t descriptor;
    unsigned index;
    if (mmu == 0 || mmu->root.entries == 0 ||
        !valid_page(virtual_address) || virtual_address >= (UINT64_C(1) << 48) ||
        !valid_page(physical_address) ||
        access < NUSANTARA_ARM64_PAGE_KERNEL_RW ||
        access > NUSANTARA_ARM64_PAGE_USER_RO)
        return NUSANTARA_ARM64_MMU_INVALID;
    entries = walk_to_l3(mmu, virtual_address, 1);
    if (entries == 0) return NUSANTARA_ARM64_MMU_INVALID;
    index = (unsigned)((virtual_address >> 12) & 0x1ffu);
    if ((entries[index] & NUSANTARA_ARM64_DESC_VALID) != 0u)
        return NUSANTARA_ARM64_MMU_INVALID;
    descriptor = (physical_address & NUSANTARA_ARM64_PA_MASK) |
                 NUSANTARA_ARM64_DESC_VALID | NUSANTARA_ARM64_DESC_TABLE_PAGE |
                 NUSANTARA_ARM64_DESC_AF | NUSANTARA_ARM64_DESC_INNER_SHAREABLE;
    if (access == NUSANTARA_ARM64_PAGE_USER_RW)
        descriptor |= NUSANTARA_ARM64_DESC_AP_EL0_RW;
    else if (access == NUSANTARA_ARM64_PAGE_USER_RO)
        descriptor |= NUSANTARA_ARM64_DESC_AP_EL0_RO;
    else if (access == NUSANTARA_ARM64_PAGE_KERNEL_RO)
        descriptor |= UINT64_C(2) << 6;
    if (access == NUSANTARA_ARM64_PAGE_KERNEL_RW ||
        access == NUSANTARA_ARM64_PAGE_KERNEL_RO)
        descriptor |= NUSANTARA_ARM64_DESC_UXN;
    else
        descriptor |= NUSANTARA_ARM64_DESC_PXN;
    if (!executable) descriptor |= NUSANTARA_ARM64_DESC_UXN;
    entries[index] = descriptor;
    return NUSANTARA_ARM64_MMU_OK;
}
uint64_t nusantara_arm64_mmu_lookup_page(const nusantara_arm64_mmu_t *mmu,
    uint64_t virtual_address)
{
    /* Lookup intentionally uses the same allocator callback to resolve table aliases. */
    nusantara_arm64_mmu_t *mutable_mmu = (nusantara_arm64_mmu_t *)mmu;
    uint64_t *entries;
    if (mmu == 0 || mmu->root.entries == 0 ||
        (virtual_address & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) != 0u ||
        virtual_address >= (UINT64_C(1) << 48)) return 0u;
    entries = walk_to_l3(mutable_mmu, virtual_address, 0);
    if (entries == 0) return 0u;
    return entries[(virtual_address >> 12) & 0x1ffu];
}
int nusantara_arm64_mmu_install_ttbr0(uint64_t root_physical)
{
    if (!valid_page(root_physical)) return NUSANTARA_ARM64_MMU_INVALID;
#if defined(__aarch64__)
    {
        uint64_t current_el;
        __asm__ volatile("mrs %0, CurrentEL" : "=r"(current_el));
        if (((current_el >> 2) & 3u) != 1u) return NUSANTARA_ARM64_MMU_INVALID;
        __asm__ volatile("dsb ishst\nmsr ttbr0_el1, %0\n dsb ish\n tlbi vmalle1\n dsb ish\n isb"
                         :: "r"(root_physical) : "memory");
    }
    return NUSANTARA_ARM64_MMU_OK;
#else
    (void)root_physical;
    return NUSANTARA_ARM64_MMU_INVALID;
#endif
}
