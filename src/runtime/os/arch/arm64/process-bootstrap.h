/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_PROCESS_BOOTSTRAP_H
#define NUSANTARA_ARM64_PROCESS_BOOTSTRAP_H

#include <stddef.h>
#include <stdint.h>
#include "address-space.h"
#include "elf64-load.h"
#include "exception.h"

typedef enum nusantara_arm64_process_bootstrap_status {
    NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK = 0,
    NUSANTARA_ARM64_PROCESS_BOOTSTRAP_INVALID_ARGUMENT,
    NUSANTARA_ARM64_PROCESS_BOOTSTRAP_ELF_FAILURE,
    NUSANTARA_ARM64_PROCESS_BOOTSTRAP_STACK_FAILURE,
    NUSANTARA_ARM64_PROCESS_BOOTSTRAP_CONTEXT_FAILURE,
    NUSANTARA_ARM64_PROCESS_BOOTSTRAP_ADDRESS_SPACE_FAILURE
} nusantara_arm64_process_bootstrap_status_t;

typedef struct nusantara_arm64_process_bootstrap {
    nusantara_arm64_address_space_t address_space;
    nusantara_arm64_exception_frame_t *initial_frame;
    uint64_t entry_point;
    uint64_t user_stack_top;
    uint64_t exit_trampoline;
    uint8_t initialized;
} nusantara_arm64_process_bootstrap_t;

/*
 * Build an inactive process address space from a validated static AArch64
 * ELF64 image, allocate/map a zeroed EL0 RW/NX stack, and prepare its initial
 * EL0 exception frame. The caller must zero-initialize process before use and
 * provide a kernel stack whose lifetime exceeds the process lifetime.
 *
 * user_stack_top is an exclusive, page-aligned user VA. exit_trampoline must
 * point into an executable PT_LOAD mapping in the ELF image. All allocated
 * ELF and user-stack frames are owned by the process address space and are
 * released by destroy or by any post-create failure.
 *
 * This helper does not activate TTBR0 or execute ERET. The caller must switch
 * to the returned address space before starting initial_frame.
 */
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
    size_t kernel_stack_size);

nusantara_arm64_address_space_status_t
nusantara_arm64_process_bootstrap_destroy(
    nusantara_arm64_address_space_manager_t *manager,
    nusantara_arm64_process_bootstrap_t *process);

#endif
