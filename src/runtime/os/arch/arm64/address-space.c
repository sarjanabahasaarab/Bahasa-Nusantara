/* SPDX-License-Identifier: Apache-2.0 */
#include "address-space.h"

static int valid_page_address(uint64_t address)
{
    return (address & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) == 0u &&
           (address & ~NUSANTARA_ARM64_PA_MASK) == 0u;
}

static int registered_space(const nusantara_arm64_address_space_manager_t *manager,
                            const nusantara_arm64_address_space_t *space)
{
    size_t i;
    if (manager == 0 || space == 0 || !space->initialized) return 0;
    for (i = 0u; i < NUSANTARA_ARM64_ADDRESS_SPACE_MAX; ++i)
        if (manager->spaces[i] == space) return 1;
    return 0;
}

static int resolve_or_allocate_table(void *context,
                                     nusantara_arm64_page_table_t *table)
{
    nusantara_arm64_address_space_t *space =
        (nusantara_arm64_address_space_t *)context;
    nusantara_arm64_address_space_manager_t *manager;
    uint64_t physical;
    uint64_t *alias = 0;
    if (space == 0 || table == 0 || space->manager == 0) return 0;
    manager = space->manager;
    if (table->physical_address == 0u) {
        if (space->table_page_count >= NUSANTARA_ARM64_ADDRESS_SPACE_MAX_TABLES ||
            !manager->ops.allocate_page(manager->ops_context, &physical, &alias) ||
            alias == 0 || (((uintptr_t)alias & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) != 0u) ||
            !valid_page_address(physical))
            return 0;
        space->table_pages[space->table_page_count++] = physical;
        table->physical_address = physical;
        table->entries = alias;
        return 1;
    }
    physical = table->physical_address;
    if (!valid_page_address(physical) ||
        !manager->ops.resolve_page(manager->ops_context, physical, &alias) ||
        alias == 0 || (((uintptr_t)alias & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) != 0u))
        return 0;
    table->entries = alias;
    return 1;
}

int nusantara_arm64_address_space_manager_init(
    nusantara_arm64_address_space_manager_t *manager,
    const nusantara_arm64_address_space_ops_t *ops, void *context)
{
    size_t i;
    if (manager == 0 || ops == 0 || ops->allocate_page == 0 ||
        ops->resolve_page == 0 || ops->release_page == 0 ||
        ops->install_root == 0)
        return 0;
    manager->ops = *ops;
    manager->ops_context = context;
    manager->count = 0u;
    manager->active = 0;
    for (i = 0u; i < NUSANTARA_ARM64_ADDRESS_SPACE_MAX; ++i)
        manager->spaces[i] = 0;
    return 1;
}

nusantara_arm64_address_space_status_t nusantara_arm64_address_space_create(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space, uint64_t id)
{
    size_t i, slot = NUSANTARA_ARM64_ADDRESS_SPACE_MAX;
    uint64_t root_physical = 0u;
    uint64_t *root_alias = 0;
    if (manager == 0 || space == 0 || id == 0u)
        return NUSANTARA_ARM64_AS_INVALID_ARGUMENT;
    for (i = 0u; i < NUSANTARA_ARM64_ADDRESS_SPACE_MAX; ++i) {
        if (manager->spaces[i] == 0 && slot == NUSANTARA_ARM64_ADDRESS_SPACE_MAX)
            slot = i;
        if (manager->spaces[i] == space ||
            (manager->spaces[i] != 0 && manager->spaces[i]->id == id))
            return NUSANTARA_ARM64_AS_INVALID_ARGUMENT;
    }
    if (slot == NUSANTARA_ARM64_ADDRESS_SPACE_MAX)
        return NUSANTARA_ARM64_AS_FULL;
    if (!manager->ops.allocate_page(manager->ops_context, &root_physical, &root_alias))
        return NUSANTARA_ARM64_AS_OUT_OF_MEMORY;
    if (root_alias == 0 ||
        (((uintptr_t)root_alias & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) != 0u) ||
        !valid_page_address(root_physical)) {
        if (valid_page_address(root_physical))
            manager->ops.release_page(manager->ops_context, root_physical);
        return NUSANTARA_ARM64_AS_OUT_OF_MEMORY;
    }

    space->manager = manager;
    space->id = id;
    space->root_physical = root_physical;
    space->table_page_count = 1u;
    space->table_pages[0] = root_physical;
    space->mapping_count = 0u;
    space->initialized = 0u;
    if (!nusantara_arm64_mmu_init(&space->mmu, root_alias, root_physical,
                                  resolve_or_allocate_table, space)) {
        manager->ops.release_page(manager->ops_context, root_physical);
        space->table_page_count = 0u;
        return NUSANTARA_ARM64_AS_MMU_FAILURE;
    }
    space->initialized = 1u;
    manager->spaces[slot] = space;
    ++manager->count;
    return NUSANTARA_ARM64_AS_OK;
}

nusantara_arm64_address_space_status_t nusantara_arm64_address_space_map_user(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space, uint64_t virtual_address,
    uint64_t physical_address, nusantara_arm64_page_access_t access,
    int executable, int take_ownership)
{
    size_t i;
    uint64_t descriptor;
    if (!registered_space(manager, space) || !valid_page_address(virtual_address) ||
        virtual_address >= NUSANTARA_ARM64_USER_VA_LIMIT ||
        !valid_page_address(physical_address) ||
        (access != NUSANTARA_ARM64_PAGE_USER_RW &&
         access != NUSANTARA_ARM64_PAGE_USER_RO) ||
        (executable != 0 && executable != 1) ||
        (take_ownership != 0 && take_ownership != 1) ||
        (access == NUSANTARA_ARM64_PAGE_USER_RW && executable))
        return NUSANTARA_ARM64_AS_INVALID_MAPPING;
    if (manager->active == space) return NUSANTARA_ARM64_AS_ACTIVE;
    if (space->mapping_count >= NUSANTARA_ARM64_ADDRESS_SPACE_MAX_MAPPINGS)
        return NUSANTARA_ARM64_AS_FULL;
    for (i = 0u; i < space->mapping_count; ++i)
        if (space->mappings[i].virtual_address == virtual_address)
            return NUSANTARA_ARM64_AS_ALREADY_MAPPED;
    {
        size_t s, m;
        for (s = 0u; s < NUSANTARA_ARM64_ADDRESS_SPACE_MAX; ++s) {
            const nusantara_arm64_address_space_t *other = manager->spaces[s];
            if (other == 0) continue;
            for (m = 0u; m < other->table_page_count; ++m)
                if (other->table_pages[m] == physical_address)
                    return NUSANTARA_ARM64_AS_INVALID_MAPPING;
            for (m = 0u; m < other->mapping_count; ++m) {
                if (other->mappings[m].physical_address == physical_address &&
                    (take_ownership || other->mappings[m].owns_frame))
                    return NUSANTARA_ARM64_AS_INVALID_MAPPING;
            }
        }
    }
    if (!nusantara_arm64_mmu_map_page(&space->mmu, virtual_address,
                                      physical_address, access, executable))
        return NUSANTARA_ARM64_AS_MMU_FAILURE;
    descriptor = nusantara_arm64_mmu_lookup_page(&space->mmu, virtual_address);
    if ((descriptor & NUSANTARA_ARM64_DESC_VALID) == 0u)
        return NUSANTARA_ARM64_AS_MMU_FAILURE;
    space->mappings[space->mapping_count].virtual_address = virtual_address;
    space->mappings[space->mapping_count].physical_address = physical_address;
    space->mappings[space->mapping_count].access = access;
    space->mappings[space->mapping_count].executable = (uint8_t)executable;
    space->mappings[space->mapping_count].owns_frame = (uint8_t)take_ownership;
    ++space->mapping_count;
    return NUSANTARA_ARM64_AS_OK;
}

nusantara_arm64_address_space_status_t nusantara_arm64_address_space_switch(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space)
{
    if (!registered_space(manager, space))
        return NUSANTARA_ARM64_AS_NOT_FOUND;
    if (!manager->ops.install_root(manager->ops_context, space->root_physical))
        return NUSANTARA_ARM64_AS_MMU_FAILURE;
    manager->active = space;
    return NUSANTARA_ARM64_AS_OK;
}

nusantara_arm64_address_space_status_t nusantara_arm64_address_space_deactivate(
    nusantara_arm64_address_space_manager_t *manager, uint64_t kernel_root_physical)
{
    if (manager == 0 || !valid_page_address(kernel_root_physical))
        return NUSANTARA_ARM64_AS_INVALID_ARGUMENT;
    if (!manager->ops.install_root(manager->ops_context, kernel_root_physical))
        return NUSANTARA_ARM64_AS_MMU_FAILURE;
    manager->active = 0;
    return NUSANTARA_ARM64_AS_OK;
}

nusantara_arm64_address_space_status_t nusantara_arm64_address_space_destroy(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space)
{
    size_t i, slot = NUSANTARA_ARM64_ADDRESS_SPACE_MAX;
    if (!registered_space(manager, space))
        return NUSANTARA_ARM64_AS_NOT_FOUND;
    if (manager->active == space) return NUSANTARA_ARM64_AS_ACTIVE;
    for (i = 0u; i < space->mapping_count; ++i)
        if (space->mappings[i].owns_frame)
            manager->ops.release_page(manager->ops_context,
                                      space->mappings[i].physical_address);
    for (i = space->table_page_count; i > 0u; --i)
        manager->ops.release_page(manager->ops_context, space->table_pages[i - 1u]);
    for (i = 0u; i < NUSANTARA_ARM64_ADDRESS_SPACE_MAX; ++i)
        if (manager->spaces[i] == space) { slot = i; break; }
    if (slot < NUSANTARA_ARM64_ADDRESS_SPACE_MAX) {
        manager->spaces[slot] = 0;
        if (manager->count > 0u) --manager->count;
    }
    space->initialized = 0u;
    space->id = 0u;
    space->root_physical = 0u;
    space->table_page_count = 0u;
    space->mapping_count = 0u;
    space->manager = 0;
    return NUSANTARA_ARM64_AS_OK;
}

const nusantara_arm64_user_mapping_t *nusantara_arm64_address_space_find_mapping(
    const nusantara_arm64_address_space_t *space, uint64_t virtual_address)
{
    size_t i;
    if (space == 0 || !space->initialized ||
        (virtual_address & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) != 0u)
        return 0;
    for (i = 0u; i < space->mapping_count; ++i)
        if (space->mappings[i].virtual_address == virtual_address)
            return &space->mappings[i];
    return 0;
}
