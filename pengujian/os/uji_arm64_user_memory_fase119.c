/* SPDX-License-Identifier: Apache-2.0 */
#include "user-memory.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

int main(void)
{
    nusantara_arm64_address_space_t space;
    memset(&space,0,sizeof(space));
    space.initialized=1u;
    space.mapping_count=3u;
    space.mappings[0].virtual_address=0x400000u;
    space.mappings[0].access=NUSANTARA_ARM64_PAGE_USER_RO;
    space.mappings[0].executable=1u;
    space.mappings[1].virtual_address=0x401000u;
    space.mappings[1].access=NUSANTARA_ARM64_PAGE_USER_RO;
    space.mappings[1].executable=0u;
    space.mappings[2].virtual_address=0x402000u;
    space.mappings[2].access=NUSANTARA_ARM64_PAGE_USER_RW;
    space.mappings[2].executable=0u;

    assert(nusantara_arm64_user_memory_validate(&space,0x400000u,4u,
        NUSANTARA_ARM64_USER_MEMORY_READ|NUSANTARA_ARM64_USER_MEMORY_EXEC));
    assert(nusantara_arm64_user_memory_validate(&space,0x401000u,32u,
        NUSANTARA_ARM64_USER_MEMORY_READ));
    assert(!nusantara_arm64_user_memory_validate(&space,0x401000u,32u,
        NUSANTARA_ARM64_USER_MEMORY_WRITE));
    assert(nusantara_arm64_user_memory_validate(&space,0x402000u,64u,
        NUSANTARA_ARM64_USER_MEMORY_READ|NUSANTARA_ARM64_USER_MEMORY_WRITE));
    assert(!nusantara_arm64_user_memory_validate(&space,0x402000u,4u,
        NUSANTARA_ARM64_USER_MEMORY_EXEC));
    assert(nusantara_arm64_user_memory_validate(&space,0x401ff0u,32u,
        NUSANTARA_ARM64_USER_MEMORY_READ));
    assert(!nusantara_arm64_user_memory_validate(&space,0x401ff0u,32u,
        NUSANTARA_ARM64_USER_MEMORY_WRITE));
    assert(!nusantara_arm64_user_memory_validate(&space,0x403000u,1u,
        NUSANTARA_ARM64_USER_MEMORY_READ));
    assert(!nusantara_arm64_user_memory_validate(&space,
        (uintptr_t)NUSANTARA_ARM64_USER_VA_LIMIT-8u,16u,
        NUSANTARA_ARM64_USER_MEMORY_READ));
    assert(!nusantara_arm64_user_memory_validate(&space,UINTPTR_MAX-7u,16u,
        NUSANTARA_ARM64_USER_MEMORY_READ));
    assert(!nusantara_arm64_user_memory_validate(&space,0x400000u,SIZE_MAX,
        NUSANTARA_ARM64_USER_MEMORY_READ));
    assert(nusantara_arm64_user_memory_validate(&space,0x500000u,0u,
        NUSANTARA_ARM64_USER_MEMORY_READ));
    assert(!nusantara_arm64_user_memory_validate(&space,0x400000u,4u,0u));
    assert(!nusantara_arm64_user_memory_validate(&space,0x400000u,4u,8u));
    puts("PASS: user memory range permissions, page crossings, and overflow");
    puts("NUSANTARA_PHASE119_USER_MEMORY_PASS");
    return 0;
}
