/* SPDX-License-Identifier: Apache-2.0 */
#include "elf64-load.h"
#include <string.h>

#define ELF_PF_X 1u
#define ELF_PF_W 2u
#define ELF_PAGE_MASK ((uint64_t)NUSANTARA_ARM64_PAGE_SIZE - 1u)

static int valid_frame(uint64_t physical, const uint8_t *alias)
{
    return alias != 0 &&
        (((uintptr_t)alias & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) == 0u) &&
        ((physical & ELF_PAGE_MASK) == 0u) &&
        ((physical & ~NUSANTARA_ARM64_PA_MASK) == 0u);
}

nusantara_arm64_elf64_load_status_t nusantara_arm64_elf64_load(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space, uint64_t address_space_id,
    const uint8_t *bytes, size_t length, uint64_t *entry_point)
{
    nusantara_arm64_elf64_image_t image;
    nusantara_arm64_elf64_status_t validation;
    size_t i;
    if (manager == 0 || space == 0 || bytes == 0 || entry_point == 0 ||
        address_space_id == 0u || space->initialized)
        return NUSANTARA_ARM64_ELF64_LOAD_INVALID_ARGUMENT;
    *entry_point = 0u;
    validation = nusantara_arm64_elf64_validate(bytes, length, &image);
    if (validation != NUSANTARA_ARM64_ELF64_OK)
        return NUSANTARA_ARM64_ELF64_LOAD_INVALID_IMAGE;
    for (i = 0u; i < image.segment_count; ++i) {
        const nusantara_arm64_elf64_segment_t *segment = &image.segments[i];
        if ((segment->virtual_address & ELF_PAGE_MASK) !=
            (segment->file_offset & ELF_PAGE_MASK))
            return NUSANTARA_ARM64_ELF64_LOAD_UNSUPPORTED_PAGE_LAYOUT;
    }
    if (nusantara_arm64_address_space_create(manager, space, address_space_id) !=
        NUSANTARA_ARM64_AS_OK)
        return NUSANTARA_ARM64_ELF64_LOAD_ADDRESS_SPACE_FAILURE;

    for (i = 0u; i < image.segment_count; ++i) {
        const nusantara_arm64_elf64_segment_t *segment = &image.segments[i];
        uint64_t first_page = segment->virtual_address & ~ELF_PAGE_MASK;
        uint64_t segment_end = segment->virtual_address + segment->memory_size;
        uint64_t page_end = (segment_end + ELF_PAGE_MASK) & ~ELF_PAGE_MASK;
        uint64_t page;
        for (page = first_page; page < page_end; page += NUSANTARA_ARM64_PAGE_SIZE) {
            uint64_t physical = 0u;
            uint64_t *alias_words = 0;
            uint8_t *alias;
            uint64_t copy_start, copy_end;
            nusantara_arm64_page_access_t access =
                (segment->flags & ELF_PF_W) != 0u ?
                NUSANTARA_ARM64_PAGE_USER_RW : NUSANTARA_ARM64_PAGE_USER_RO;
            int executable = (segment->flags & ELF_PF_X) != 0u;
            if (nusantara_arm64_address_space_find_mapping(space, page) != 0)
                goto rollback_layout;
            if (!manager->ops.allocate_page(manager->ops_context, &physical,
                                            &alias_words))
                goto rollback_frame;
            alias = (uint8_t *)alias_words;
            if (!valid_frame(physical, alias)) {
                if ((physical & ELF_PAGE_MASK) == 0u &&
                    (physical & ~NUSANTARA_ARM64_PA_MASK) == 0u)
                    manager->ops.release_page(manager->ops_context, physical);
                goto rollback_frame;
            }
            /* Clear the complete frame so the memory tail (BSS) is always zero. */
            memset(alias, 0, NUSANTARA_ARM64_PAGE_SIZE);
            copy_start = page > segment->virtual_address ?
                         page : segment->virtual_address;
            copy_end = page + NUSANTARA_ARM64_PAGE_SIZE;
            if (copy_end > segment->virtual_address + segment->file_size)
                copy_end = segment->virtual_address + segment->file_size;
            if (copy_start < copy_end) {
                uint64_t source_offset = segment->file_offset +
                    (copy_start - segment->virtual_address);
                memcpy(alias + (size_t)(copy_start - page),
                       bytes + (size_t)source_offset,
                       (size_t)(copy_end - copy_start));
            }
            if (nusantara_arm64_address_space_map_user(
                    manager, space, page, physical, access, executable, 1) !=
                NUSANTARA_ARM64_AS_OK) {
                manager->ops.release_page(manager->ops_context, physical);
                goto rollback_mapping;
            }
        }
    }
    *entry_point = image.entry_point;
    return NUSANTARA_ARM64_ELF64_LOAD_OK;

rollback_layout:
    (void)nusantara_arm64_address_space_destroy(manager, space);
    return NUSANTARA_ARM64_ELF64_LOAD_UNSUPPORTED_PAGE_LAYOUT;
rollback_frame:
    (void)nusantara_arm64_address_space_destroy(manager, space);
    return NUSANTARA_ARM64_ELF64_LOAD_FRAME_FAILURE;
rollback_mapping:
    (void)nusantara_arm64_address_space_destroy(manager, space);
    return NUSANTARA_ARM64_ELF64_LOAD_MAPPING_FAILURE;
}
