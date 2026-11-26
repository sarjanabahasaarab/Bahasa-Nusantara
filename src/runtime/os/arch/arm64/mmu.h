/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_MMU_H
#define NUSANTARA_ARM64_MMU_H
#include <stddef.h>
#include <stdint.h>
#define NUSANTARA_ARM64_PAGE_SIZE 4096u
#define NUSANTARA_ARM64_TABLE_ENTRIES 512u
#define NUSANTARA_ARM64_PA_MASK UINT64_C(0x0000fffffffff000)
#define NUSANTARA_ARM64_DESC_VALID UINT64_C(1)
#define NUSANTARA_ARM64_DESC_TABLE_PAGE UINT64_C(3)
#define NUSANTARA_ARM64_DESC_AF (UINT64_C(1) << 10)
#define NUSANTARA_ARM64_DESC_INNER_SHAREABLE (UINT64_C(3) << 8)
#define NUSANTARA_ARM64_DESC_AP_EL0_RW (UINT64_C(1) << 6)
#define NUSANTARA_ARM64_DESC_AP_EL0_RO (UINT64_C(3) << 6)
#define NUSANTARA_ARM64_DESC_PXN (UINT64_C(1) << 53)
#define NUSANTARA_ARM64_DESC_UXN (UINT64_C(1) << 54)
#define NUSANTARA_ARM64_MMU_OK 1
#define NUSANTARA_ARM64_MMU_INVALID 0
typedef enum nusantara_arm64_page_access {
    NUSANTARA_ARM64_PAGE_KERNEL_RW = 0,
    NUSANTARA_ARM64_PAGE_KERNEL_RO = 1,
    NUSANTARA_ARM64_PAGE_USER_RW = 2,
    NUSANTARA_ARM64_PAGE_USER_RO = 3
} nusantara_arm64_page_access_t;
typedef struct nusantara_arm64_page_table {
    uint64_t *entries;
    uint64_t physical_address;
} nusantara_arm64_page_table_t;
typedef int (*nusantara_arm64_page_table_allocate_fn)(
    void *context, nusantara_arm64_page_table_t *table);
typedef struct nusantara_arm64_mmu {
    nusantara_arm64_page_table_t root;
    nusantara_arm64_page_table_allocate_fn allocate_table;
    void *allocator_context;
    uint32_t allocated_tables;
} nusantara_arm64_mmu_t;
/* Root storage must be 4 KiB aligned and remain identity-accessible while building. */
int nusantara_arm64_mmu_init(nusantara_arm64_mmu_t *mmu,
    uint64_t *root_entries, uint64_t root_physical,
    nusantara_arm64_page_table_allocate_fn allocate_table, void *context);
/* Maps exactly one 4 KiB page in the lower 48-bit TTBR0 address space. */
int nusantara_arm64_mmu_map_page(nusantara_arm64_mmu_t *mmu,
    uint64_t virtual_address, uint64_t physical_address,
    nusantara_arm64_page_access_t access, int executable);
/* Returns the descriptor for a mapped L3 page; zero means unmapped/invalid. */
uint64_t nusantara_arm64_mmu_lookup_page(const nusantara_arm64_mmu_t *mmu,
    uint64_t virtual_address);
/* Install the root in TTBR0_EL1 and invalidate the local stage-1 TLB. EL1 only. */
int nusantara_arm64_mmu_install_ttbr0(uint64_t root_physical);
#endif
