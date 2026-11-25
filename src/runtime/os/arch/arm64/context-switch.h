/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 cooperative context switch ABI (Phase 102).
 */
#ifndef NUSANTARA_ARM64_CONTEXT_SWITCH_H
#define NUSANTARA_ARM64_CONTEXT_SWITCH_H
#include <stddef.h>
#include <stdint.h>
#include "../../scheduler/scheduler.h"

#define NUSANTARA_ARM64_CONTEXT_FRAME_BYTES 96u

typedef enum nusantara_arm64_context_status {
    NUSANTARA_ARM64_CONTEXT_OK = 0,
    NUSANTARA_ARM64_CONTEXT_INVALID_ARGUMENT,
    NUSANTARA_ARM64_CONTEXT_STACK_TOO_SMALL,
    NUSANTARA_ARM64_CONTEXT_ADDRESS_OVERFLOW
} nusantara_arm64_context_status_t;

typedef void (*nusantara_arm64_task_entry_fn)(void *argument);
typedef void (*nusantara_arm64_task_exit_fn)(void);

/* Stack grows down. The top is aligned to the AArch64 16-byte ABI boundary. */
nusantara_arm64_context_status_t nusantara_arm64_context_prepare(
    uintptr_t *initial_stack_pointer, void *stack, size_t stack_size,
    nusantara_arm64_task_entry_fn entry, void *argument,
    nusantara_arm64_task_exit_fn on_exit);

/*
 * Save x19-x30 and SP into previous->saved_stack_pointer, restore the same
 * register set from next->saved_stack_pointer, then return on next's stack.
 * previous may be NULL when leaving the boot/idle context for the first time.
 * This is a cooperative AAPCS64 switch, not a full asynchronous IRQ frame swap.
 */
nusantara_arm64_context_status_t nusantara_arm64_context_switch(
    nusantara_os_task_t *previous, const nusantara_os_task_t *next);

/* Assembly entry points; normally called only by the C wrapper. */
void nusantara_arm64_context_switch_asm(uintptr_t *previous_sp, uintptr_t next_sp);
void nusantara_arm64_task_trampoline(void);

#endif
