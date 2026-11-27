/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_ELF64_LOADER_H
#define NUSANTARA_ARM64_ELF64_LOADER_H

#include <stddef.h>
#include <stdint.h>

#define NUSANTARA_ARM64_ELF64_MAX_SEGMENTS 32u
#define NUSANTARA_ARM64_ELF64_USER_MIN UINT64_C(0x0000000000010000)
#define NUSANTARA_ARM64_ELF64_USER_MAX UINT64_C(0x0000800000000000)

typedef enum nusantara_arm64_elf64_status {
    NUSANTARA_ARM64_ELF64_OK = 0,
    NUSANTARA_ARM64_ELF64_INVALID_ARGUMENT,
    NUSANTARA_ARM64_ELF64_BAD_HEADER,
    NUSANTARA_ARM64_ELF64_UNSUPPORTED_FORMAT,
    NUSANTARA_ARM64_ELF64_TRUNCATED,
    NUSANTARA_ARM64_ELF64_TOO_MANY_SEGMENTS,
    NUSANTARA_ARM64_ELF64_INVALID_SEGMENT,
    NUSANTARA_ARM64_ELF64_OVERLAP,
    NUSANTARA_ARM64_ELF64_ENTRY_NOT_EXECUTABLE,
    NUSANTARA_ARM64_ELF64_UNSUPPORTED_DYNAMIC
} nusantara_arm64_elf64_status_t;

typedef struct nusantara_arm64_elf64_segment {
    uint64_t file_offset;
    uint64_t virtual_address;
    uint64_t file_size;
    uint64_t memory_size;
    uint64_t alignment;
    uint32_t flags;
} nusantara_arm64_elf64_segment_t;

typedef struct nusantara_arm64_elf64_image {
    uint64_t entry_point;
    uint64_t total_memory_size;
    size_t segment_count;
    nusantara_arm64_elf64_segment_t segments[NUSANTARA_ARM64_ELF64_MAX_SEGMENTS];
} nusantara_arm64_elf64_image_t;

/*
 * Validate a static little-endian ELF64 ET_EXEC image for AArch64.
 * This routine performs no allocation and changes no address-space state.
 * Dynamic linking, interpreters, relocations, and segment mapping are not
 * supported by this first loader contract.
 */
nusantara_arm64_elf64_status_t nusantara_arm64_elf64_validate(
    const uint8_t *bytes, size_t length, nusantara_arm64_elf64_image_t *image);

#endif
