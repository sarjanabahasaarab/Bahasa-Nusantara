/* SPDX-License-Identifier: Apache-2.0 */
#include "user-memory.h"

#define USER_PAGE_MASK ((uint64_t)NUSANTARA_ARM64_PAGE_SIZE - 1u)
#define USER_ACCESS_MASK (NUSANTARA_ARM64_USER_MEMORY_READ | \
                          NUSANTARA_ARM64_USER_MEMORY_WRITE | \
                          NUSANTARA_ARM64_USER_MEMORY_EXEC)

int nusantara_arm64_user_memory_validate(
    const nusantara_arm64_address_space_t *space,
    uintptr_t address, size_t length, uint32_t required_access)
{
    uint64_t start=(uint64_t)address;
    uint64_t end;
    uint64_t page;

    if(space==0 || !space->initialized || required_access==0u ||
       (required_access & ~USER_ACCESS_MASK)!=0u ||
       start>=NUSANTARA_ARM64_USER_VA_LIMIT)
        return 0;
    if(length==0u) return 1;
    if((uint64_t)length>UINT64_MAX-start) return 0;
    end=start+(uint64_t)length;
    if(end>NUSANTARA_ARM64_USER_VA_LIMIT || end<=start) return 0;

    page=start&~USER_PAGE_MASK;
    while(page<end) {
        const nusantara_arm64_user_mapping_t *mapping=
            nusantara_arm64_address_space_find_mapping(space,page);
        if(mapping==0) return 0;
        if(mapping->access!=NUSANTARA_ARM64_PAGE_USER_RO &&
           mapping->access!=NUSANTARA_ARM64_PAGE_USER_RW)
            return 0;
        if((required_access & NUSANTARA_ARM64_USER_MEMORY_READ)!=0u &&
           mapping->access!=NUSANTARA_ARM64_PAGE_USER_RO &&
           mapping->access!=NUSANTARA_ARM64_PAGE_USER_RW)
            return 0;
        if((required_access & NUSANTARA_ARM64_USER_MEMORY_WRITE)!=0u &&
           mapping->access!=NUSANTARA_ARM64_PAGE_USER_RW)
            return 0;
        if((required_access & NUSANTARA_ARM64_USER_MEMORY_EXEC)!=0u &&
           mapping->executable==0u)
            return 0;
        page+=NUSANTARA_ARM64_PAGE_SIZE;
    }
    return 1;
}
