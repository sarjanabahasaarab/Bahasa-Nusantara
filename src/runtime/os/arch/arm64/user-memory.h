/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_USER_MEMORY_H
#define NUSANTARA_ARM64_USER_MEMORY_H
#include <stddef.h>
#include <stdint.h>
#include "address-space.h"

#define NUSANTARA_ARM64_USER_MEMORY_READ  UINT32_C(1)
#define NUSANTARA_ARM64_USER_MEMORY_WRITE UINT32_C(2)
#define NUSANTARA_ARM64_USER_MEMORY_EXEC  UINT32_C(4)

/*
 * Validate every 4 KiB user mapping touched by [address, address+length).
 * Zero-length ranges are accepted only below the user VA ceiling.
 * This checks mapping metadata; it does not pin pages or copy memory.
 */
int nusantara_arm64_user_memory_validate(
    const nusantara_arm64_address_space_t *space,
    uintptr_t address, size_t length, uint32_t required_access);

#endif
