/* SPDX-License-Identifier: Apache-2.0 */
#include "address-space.h"
#include <assert.h>
#include <stdint.h>
#include <string.h>

#define FAKE_PAGE_COUNT 48u
static _Alignas(4096) uint8_t fake_pages[FAKE_PAGE_COUNT][4096];
static uint8_t fake_used[FAKE_PAGE_COUNT];
static uint64_t installed_root;
static unsigned install_count;

static int fake_allocate(void *context, uint64_t *physical, uint64_t **alias)
{
    size_t i;
    (void)context;
    if (physical == 0 || alias == 0) return 0;
    for (i = 0u; i < FAKE_PAGE_COUNT; ++i) {
        if (fake_used[i] == 0u) {
            fake_used[i] = 1u;
            memset(fake_pages[i], 0, sizeof(fake_pages[i]));
            *physical = UINT64_C(0x100000) + (uint64_t)i * 4096u;
            *alias = (uint64_t *)(void *)fake_pages[i];
            return 1;
        }
    }
    return 0;
}
static int fake_resolve(void *context, uint64_t physical, uint64_t **alias)
{
    size_t i;
    (void)context;
    if (alias == 0 || physical < UINT64_C(0x100000) ||
        ((physical - UINT64_C(0x100000)) & 4095u) != 0u)
        return 0;
    i = (size_t)((physical - UINT64_C(0x100000)) / 4096u);
    if (i >= FAKE_PAGE_COUNT || fake_used[i] == 0u) return 0;
    *alias = (uint64_t *)(void *)fake_pages[i];
    return 1;
}
static void fake_release(void *context, uint64_t physical)
{
    size_t i;
    (void)context;
    assert(physical >= UINT64_C(0x100000));
    assert(((physical - UINT64_C(0x100000)) & 4095u) == 0u);
    i = (size_t)((physical - UINT64_C(0x100000)) / 4096u);
    assert(i < FAKE_PAGE_COUNT && fake_used[i] != 0u);
    fake_used[i] = 0u;
}
static int fake_install(void *context, uint64_t root)
{
    (void)context;
    if ((root & 4095u) != 0u || root == 0u) return 0;
    installed_root = root;
    ++install_count;
    return 1;
}
static uint64_t allocate_user_frame(void)
{
    uint64_t physical = 0u;
    uint64_t *alias = 0;
    assert(fake_allocate(0, &physical, &alias));
    assert(alias != 0);
    return physical;
}
int main(void)
{
    const nusantara_arm64_address_space_ops_t ops = {
        fake_allocate, fake_resolve, fake_release, fake_install
    };
    nusantara_arm64_address_space_manager_t manager;
    nusantara_arm64_address_space_t first = {0};
    nusantara_arm64_address_space_t second = {0};
    uint64_t first_data, second_data, descriptor;
    const uint64_t shared_va = UINT64_C(0x000040000000);
    const nusantara_arm64_user_mapping_t *mapping;

    memset(fake_used, 0, sizeof(fake_used));
    installed_root = 0u;
    install_count = 0u;
    assert(nusantara_arm64_address_space_manager_init(&manager, &ops, 0));

    assert(nusantara_arm64_address_space_create(&manager, &first, 1u) ==
           NUSANTARA_ARM64_AS_OK);
    assert(nusantara_arm64_address_space_create(&manager, &second, 2u) ==
           NUSANTARA_ARM64_AS_OK);
    assert(first.root_physical != second.root_physical);
    assert(manager.count == 2u);

    first_data = allocate_user_frame();
    second_data = allocate_user_frame();
    assert(first_data != second_data);
    assert(nusantara_arm64_address_space_map_user(
        &manager, &first, shared_va, first_data,
        NUSANTARA_ARM64_PAGE_USER_RW, 0, 1) == NUSANTARA_ARM64_AS_OK);
    assert(nusantara_arm64_address_space_map_user(
        &manager, &second, shared_va, second_data,
        NUSANTARA_ARM64_PAGE_USER_RW, 0, 1) == NUSANTARA_ARM64_AS_OK);

    descriptor = nusantara_arm64_mmu_lookup_page(&first.mmu, shared_va);
    assert((descriptor & NUSANTARA_ARM64_PA_MASK) == first_data);
    assert((descriptor & NUSANTARA_ARM64_DESC_AP_EL0_RW) != 0u);
    assert((descriptor & NUSANTARA_ARM64_DESC_UXN) != 0u);
    descriptor = nusantara_arm64_mmu_lookup_page(&second.mmu, shared_va);
    assert((descriptor & NUSANTARA_ARM64_PA_MASK) == second_data);
    assert((descriptor & NUSANTARA_ARM64_PA_MASK) != first_data);

    mapping = nusantara_arm64_address_space_find_mapping(&first, shared_va);
    assert(mapping != 0 && mapping->physical_address == first_data);
    assert(mapping->owns_frame == 1u);
    assert(nusantara_arm64_address_space_find_mapping(&first, shared_va + 1u) == 0);

    assert(nusantara_arm64_address_space_map_user(
        &manager, &first, shared_va, first_data,
        NUSANTARA_ARM64_PAGE_USER_RW, 0, 1) ==
        NUSANTARA_ARM64_AS_ALREADY_MAPPED);
    assert(nusantara_arm64_address_space_map_user(
        &manager, &first, shared_va + 4096u, first_data,
        NUSANTARA_ARM64_PAGE_USER_RW, 0, 1) ==
        NUSANTARA_ARM64_AS_INVALID_MAPPING);
    assert(nusantara_arm64_address_space_map_user(
        &manager, &first, UINT64_C(0x000050000000), first_data,
        NUSANTARA_ARM64_PAGE_USER_RW, 1, 1) ==
        NUSANTARA_ARM64_AS_INVALID_MAPPING);
    assert(nusantara_arm64_address_space_map_user(
        &manager, &first, UINT64_C(0x0001000000000000), first_data,
        NUSANTARA_ARM64_PAGE_USER_RW, 0, 1) ==
        NUSANTARA_ARM64_AS_INVALID_MAPPING);

    assert(nusantara_arm64_address_space_switch(&manager, &first) ==
           NUSANTARA_ARM64_AS_OK);
    assert(manager.active == &first && installed_root == first.root_physical);
    assert(install_count == 1u);
    assert(nusantara_arm64_address_space_map_user(
        &manager, &first, shared_va + 4096u, second_data,
        NUSANTARA_ARM64_PAGE_USER_RW, 0, 0) == NUSANTARA_ARM64_AS_ACTIVE);
    assert(nusantara_arm64_address_space_destroy(&manager, &first) ==
           NUSANTARA_ARM64_AS_ACTIVE);

    assert(nusantara_arm64_address_space_switch(&manager, &second) ==
           NUSANTARA_ARM64_AS_OK);
    assert(manager.active == &second && installed_root == second.root_physical);
    assert(install_count == 2u);
    assert(nusantara_arm64_address_space_deactivate(&manager,
        UINT64_C(0x800000)) == NUSANTARA_ARM64_AS_OK);
    assert(manager.active == 0);

    assert(nusantara_arm64_address_space_destroy(&manager, &first) ==
           NUSANTARA_ARM64_AS_OK);
    assert(nusantara_arm64_address_space_destroy(&manager, &second) ==
           NUSANTARA_ARM64_AS_OK);
    assert(manager.count == 0u);
    assert(fake_used[0] == 0u);
    {
        size_t i;
        for (i = 0u; i < FAKE_PAGE_COUNT; ++i) assert(fake_used[i] == 0u);
    }
    return 0;
}
