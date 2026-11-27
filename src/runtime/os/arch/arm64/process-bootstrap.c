/* SPDX-License-Identifier: Apache-2.0 */
#include "process-bootstrap.h"
#include <string.h>

#define PROCESS_PAGE_MASK ((uint64_t)NUSANTARA_ARM64_PAGE_SIZE - 1u)

static int valid_user_stack(uint64_t top, size_t pages)
{
    uint64_t bytes;
    if (pages == 0u || pages > NUSANTARA_ARM64_ADDRESS_SPACE_MAX_MAPPINGS ||
        (top & PROCESS_PAGE_MASK) != 0u ||
        top >= NUSANTARA_ARM64_USER_VA_LIMIT)
        return 0;
    if ((uint64_t)pages > UINT64_MAX / NUSANTARA_ARM64_PAGE_SIZE)
        return 0;
    bytes = (uint64_t)pages * NUSANTARA_ARM64_PAGE_SIZE;
    return top >= bytes &&
           top - bytes >= NUSANTARA_ARM64_ELF64_USER_MIN;
}

static int executable_user_address(
    const nusantara_arm64_address_space_t *space, uint64_t address)
{
    const nusantara_arm64_user_mapping_t *mapping;
    uint64_t page = address & ~PROCESS_PAGE_MASK;
    if (address >= NUSANTARA_ARM64_USER_VA_LIMIT) return 0;
    mapping = nusantara_arm64_address_space_find_mapping(space, page);
    return mapping != 0 && mapping->executable != 0u;
}

static void rollback_process(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_process_bootstrap_t *process)
{
    if (process->address_space.initialized &&
        manager->active != &process->address_space)
        (void)nusantara_arm64_address_space_destroy(
            manager, &process->address_space);
    process->initial_frame = 0;
    process->entry_point = 0u;
    process->user_stack_top = 0u;
    process->exit_trampoline = 0u;
    process->initialized = 0u;
}

nusantara_arm64_process_bootstrap_status_t
nusantara_arm64_process_bootstrap_create(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_process_bootstrap_t *process,
    uint64_t process_id,
    const uint8_t *elf_bytes,
    size_t elf_length,
    uint64_t user_stack_top,
    size_t user_stack_pages,
    uintptr_t argument,
    uint64_t exit_trampoline,
    void *kernel_stack,
    size_t kernel_stack_size)
{
    uint64_t entry = 0u;
    size_t i;

    if (manager == 0 || process == 0 || process_id == 0u ||
        elf_bytes == 0 || kernel_stack == 0 ||
        process->initialized || process->address_space.initialized ||
        !valid_user_stack(user_stack_top, user_stack_pages))
        return NUSANTARA_ARM64_PROCESS_BOOTSTRAP_INVALID_ARGUMENT;

    if (nusantara_arm64_elf64_load(
            manager, &process->address_space, process_id,
            elf_bytes, elf_length, &entry) != NUSANTARA_ARM64_ELF64_LOAD_OK) {
        rollback_process(manager, process);
        return NUSANTARA_ARM64_PROCESS_BOOTSTRAP_ELF_FAILURE;
    }

    if (!executable_user_address(&process->address_space, entry) ||
        !executable_user_address(&process->address_space, exit_trampoline)) {
        rollback_process(manager, process);
        return NUSANTARA_ARM64_PROCESS_BOOTSTRAP_INVALID_ARGUMENT;
    }

    for (i = 0u; i < user_stack_pages; ++i) {
        uint64_t physical = 0u;
        uint64_t *alias = 0;
        uint64_t virtual_address =
            user_stack_top - ((uint64_t)i + 1u) * NUSANTARA_ARM64_PAGE_SIZE;
        if (!manager->ops.allocate_page(
                manager->ops_context, &physical, &alias)) {
            rollback_process(manager, process);
            return NUSANTARA_ARM64_PROCESS_BOOTSTRAP_STACK_FAILURE;
        }
        if (alias == 0 ||
            (((uintptr_t)alias & PROCESS_PAGE_MASK) != 0u) ||
            ((physical & PROCESS_PAGE_MASK) != 0u) ||
            ((physical & ~NUSANTARA_ARM64_PA_MASK) != 0u)) {
            if ((physical & PROCESS_PAGE_MASK) == 0u &&
                (physical & ~NUSANTARA_ARM64_PA_MASK) == 0u)
                manager->ops.release_page(manager->ops_context, physical);
            rollback_process(manager, process);
            return NUSANTARA_ARM64_PROCESS_BOOTSTRAP_STACK_FAILURE;
        }
        memset(alias, 0, NUSANTARA_ARM64_PAGE_SIZE);
        if (nusantara_arm64_address_space_map_user(
                manager, &process->address_space, virtual_address, physical,
                NUSANTARA_ARM64_PAGE_USER_RW, 0, 1) != NUSANTARA_ARM64_AS_OK) {
            manager->ops.release_page(manager->ops_context, physical);
            rollback_process(manager, process);
            return NUSANTARA_ARM64_PROCESS_BOOTSTRAP_STACK_FAILURE;
        }
    }

    if (!nusantara_arm64_exception_user_context_prepare(
            &process->initial_frame, kernel_stack, kernel_stack_size,
            (uintptr_t)entry, (uintptr_t)user_stack_top,
            argument, (uintptr_t)exit_trampoline)) {
        rollback_process(manager, process);
        return NUSANTARA_ARM64_PROCESS_BOOTSTRAP_CONTEXT_FAILURE;
    }

    process->entry_point = entry;
    process->user_stack_top = user_stack_top;
    process->exit_trampoline = exit_trampoline;
    process->initialized = 1u;
    return NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK;
}

nusantara_arm64_address_space_status_t
nusantara_arm64_process_bootstrap_destroy(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_process_bootstrap_t *process)
{
    nusantara_arm64_address_space_status_t status;
    if (manager == 0 || process == 0 || !process->initialized)
        return NUSANTARA_ARM64_AS_INVALID_ARGUMENT;
    status = nusantara_arm64_address_space_destroy(
        manager, &process->address_space);
    if (status != NUSANTARA_ARM64_AS_OK) return status;
    process->initial_frame = 0;
    process->entry_point = 0u;
    process->user_stack_top = 0u;
    process->exit_trampoline = 0u;
    process->initialized = 0u;
    return NUSANTARA_ARM64_AS_OK;
}
