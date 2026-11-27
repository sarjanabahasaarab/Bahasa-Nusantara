/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_ELF64_LOAD_H
#define NUSANTARA_ARM64_ELF64_LOAD_H
#include <stddef.h>
#include <stdint.h>
#include "address-space.h"
#include "elf64-loader.h"

typedef enum nusantara_arm64_elf64_load_status {
    NUSANTARA_ARM64_ELF64_LOAD_OK = 0,
    NUSANTARA_ARM64_ELF64_LOAD_INVALID_ARGUMENT,
    NUSANTARA_ARM64_ELF64_LOAD_INVALID_IMAGE,
    NUSANTARA_ARM64_ELF64_LOAD_UNSUPPORTED_PAGE_LAYOUT,
    NUSANTARA_ARM64_ELF64_LOAD_ADDRESS_SPACE_FAILURE,
    NUSANTARA_ARM64_ELF64_LOAD_FRAME_FAILURE,
    NUSANTARA_ARM64_ELF64_LOAD_MAPPING_FAILURE
} nusantara_arm64_elf64_load_status_t;

/*
 * Create a fresh inactive address space and load a validated static ELF image.
 * allocate_page must return a zeroed, 4 KiB-aligned frame and writable alias.
 * Every mapped user frame is owned by the new address space. On any failure
 * after creation, the entire address space is destroyed (transaction rollback).
 * The caller must not pass an active or previously initialized space object.
 */
nusantara_arm64_elf64_load_status_t nusantara_arm64_elf64_load(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_address_space_t *space, uint64_t address_space_id,
    const uint8_t *bytes, size_t length, uint64_t *entry_point);
#endif
