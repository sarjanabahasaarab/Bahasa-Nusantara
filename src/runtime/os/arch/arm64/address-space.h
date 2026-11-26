/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_ADDRESS_SPACE_H
#define NUSANTARA_ARM64_ADDRESS_SPACE_H
#include <stddef.h>
#include <stdint.h>
#include "mmu.h"

#define NUSANTARA_ARM64_ADDRESS_SPACE_MAX 16u
#define NUSANTARA_ARM64_ADDRESS_SPACE_MAX_MAPPINGS 128u
#define NUSANTARA_ARM64_ADDRESS_SPACE_MAX_TABLES 64u
#define NUSANTARA_ARM64_USER_VA_LIMIT (UINT64_C(1) << 48)

typedef enum nusantara_arm64_address_space_status {
    NUSANTARA_ARM64_AS_OK = 0,
    NUSANTARA_ARM64_AS_INVALID_ARGUMENT,
    NUSANTARA_ARM64_AS_FULL,
    NUSANTARA_ARM64_AS_NOT_FOUND,
    NUSANTARA_ARM64_AS_ALREADY_MAPPED,
    NUSANTARA_ARM64_AS_INVALID_MAPPING,
    NUSANTARA_ARM64_AS_OUT_OF_MEMORY,
    NUSANTARA_ARM64_AS_ACTIVE,
    NUSANTARA_ARM64_AS_MMU_FAILURE
} nusantara_arm64_address_space_status_t;

/*
 * Backing callbacks:
 * - allocate_page returns one zeroable, 4 KiB-aligned physical frame and a
 *   writable kernel alias for that exact frame.
 * - resolve_page converts a previously allocated physical page-table frame
 *   into its writable kernel alias; it must not allocate a new frame.
 * - release_page releases a frame allocated by allocate_page.
 * - install_root installs TTBR0_EL1 and completes required local TLB ordering.
 *
 * This abstraction is single-CPU. SMP shootdown and ASID allocation are not
 * implied by install_root.
 */
typedef struct nusantara_arm64_address_space_ops {
    int (*allocate_page)(void *context, uint64_t *physical, uint64_t **kernel_alias);
    int (*resolve_page)(void *context, uint64_t physical, uint64_t **kernel_alias);
    void (*release_page)(void *context, uint64_t physical);
    int (*install_root)(void *context, uint64_t root_physical);
} nusantara_arm64_address_space_ops_t;

typedef struct nusantara_arm64_user_mapping {
    uint64_t virtual_address;
    uint64_t physical_address;
    nusantara_arm64_page_access_t access;
    uint8_t executable;
    uint8_t owns_frame;
} nusantara_arm64_user_mapping_t;

struct nusantara_arm64_address_space;
typedef struct nusantara_arm64_address_space {
    uint64_t id;
    uint64_t root_physical;
    nusantara_arm64_mmu_t mmu;
    uint64_t table_pages[NUSANTARA_ARM64_ADDRESS_SPACE_MAX_TABLES];
    size_t table_page_count;
    nusantara_arm64_user_mapping_t mappings[NUSANTARA_ARM64_ADDRESS_SPACE_MAX_MAPPINGS];
    size_t mapping_count;
    uint8_t initialized;
} nusantara_arm64_address_space_t;

typedef struct nusantara_arm64_address_space_manager {
    nusantara_arm64_address_space_ops_t ops;
    void *ops_context;
    nusantara_arm64_address_space_t *spaces[NUSANTARA_ARM64_ADDRESS_SPACE_MAX];
    size_t count;
    nusantara_arm64_address_space_t *active;
} nusantara_arm64_address_space_manager_t;

int nusantara_arm64_address_space_manager_init(
    nusantara_arm64_address_space_manager_t *manager,
    const nusantara_arm64_address_space_ops_t *ops, void *context);
nusantara_arm64_address_space_status_t nusantara_arm64_address_space_create(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space, uint64_t id);
nusantara_arm64_address_space_status_t nusantara_arm64_address_space_map_user(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space, uint64_t virtual_address,
    uint64_t physical_address, nusantara_arm64_page_access_t access,
    int executable, int take_ownership);
nusantara_arm64_address_space_status_t nusantara_arm64_address_space_switch(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space);
nusantara_arm64_address_space_status_t nusantara_arm64_address_space_destroy(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space);
const nusantara_arm64_user_mapping_t *nusantara_arm64_address_space_find_mapping(
    const nusantara_arm64_address_space_t *space, uint64_t virtual_address);
#endif
