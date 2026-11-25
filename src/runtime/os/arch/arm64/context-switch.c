/* SPDX-License-Identifier: Apache-2.0 */
#include "context-switch.h"
#include <stdint.h>

typedef struct nusantara_arm64_initial_frame {
    uint64_t x19;
    uint64_t x20;
    uint64_t x21;
    uint64_t x22;
    uint64_t x23;
    uint64_t x24;
    uint64_t x25;
    uint64_t x26;
    uint64_t x27;
    uint64_t x28;
    uint64_t x29;
    uint64_t x30;
} nusantara_arm64_initial_frame_t;

_Static_assert(sizeof(nusantara_arm64_initial_frame_t) ==
               NUSANTARA_ARM64_CONTEXT_FRAME_BYTES,
               "AArch64 context frame must contain x19-x30");

nusantara_arm64_context_status_t nusantara_arm64_context_prepare(
    uintptr_t *initial_sp, void *stack, size_t stack_size,
    nusantara_arm64_task_entry_fn entry, void *argument,
    nusantara_arm64_task_exit_fn on_exit)
{
    uintptr_t base;
    uintptr_t end;
    uintptr_t top;
    nusantara_arm64_initial_frame_t *frame;

    if (initial_sp == 0 || stack == 0 || entry == 0 || on_exit == 0)
        return NUSANTARA_ARM64_CONTEXT_INVALID_ARGUMENT;
    base = (uintptr_t)stack;
    if (stack_size > UINTPTR_MAX - base)
        return NUSANTARA_ARM64_CONTEXT_ADDRESS_OVERFLOW;
    end = base + stack_size;
    top = end & ~(uintptr_t)0x0fu;
    if (top < base || top - base < sizeof(*frame))
        return NUSANTARA_ARM64_CONTEXT_STACK_TOO_SMALL;

    frame = (nusantara_arm64_initial_frame_t *)(top - sizeof(*frame));
    frame->x19 = (uintptr_t)argument;
    frame->x20 = (uintptr_t)entry;
    frame->x21 = (uintptr_t)on_exit;
    frame->x22 = 0u;
    frame->x23 = 0u;
    frame->x24 = 0u;
    frame->x25 = 0u;
    frame->x26 = 0u;
    frame->x27 = 0u;
    frame->x28 = 0u;
    frame->x29 = 0u;
    frame->x30 = (uintptr_t)nusantara_arm64_task_trampoline;
    *initial_sp = (uintptr_t)frame;
    return NUSANTARA_ARM64_CONTEXT_OK;
}

nusantara_arm64_context_status_t nusantara_arm64_context_switch(
    nusantara_os_task_t *previous, const nusantara_os_task_t *next)
{
    if (next == 0 || next->saved_stack_pointer == 0u)
        return NUSANTARA_ARM64_CONTEXT_INVALID_ARGUMENT;
    if (previous == next)
        return NUSANTARA_ARM64_CONTEXT_OK;
    nusantara_arm64_context_switch_asm(
        previous != 0 ? &previous->saved_stack_pointer : 0,
        next->saved_stack_pointer);
    return NUSANTARA_ARM64_CONTEXT_OK;
}
