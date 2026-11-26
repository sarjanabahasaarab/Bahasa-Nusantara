/* SPDX-License-Identifier: Apache-2.0 */
#include "exception.h"
static nusantara_arm64_exception_handler_fn active_handler;
static void *active_context;
int nusantara_arm64_exception_set_handler(
    nusantara_arm64_exception_handler_fn handler, void *context)
{
    active_context = context;
    active_handler = handler;
    return 1;
}
nusantara_arm64_exception_frame_t *nusantara_arm64_exception_dispatch(
    nusantara_arm64_exception_frame_t *frame)
{
    nusantara_arm64_exception_frame_t *selected = frame;
    if (frame == 0 || (((uintptr_t)frame & 0x0fu) != 0u))
        return 0;
    if (active_handler == 0)
        return 0;
    selected = active_handler(active_context, frame);
    if (selected == 0 || (((uintptr_t)selected & 0x0fu) != 0u))
        return 0;
    return selected;
}
static int prepare_frame(
    nusantara_arm64_exception_frame_t **initial_frame,
    void *stack, size_t stack_size,
    uintptr_t entry, uintptr_t argument, uintptr_t return_address,
    uintptr_t user_stack_top, uint64_t spsr, uint64_t vector)
{
    uintptr_t base, end, top;
    nusantara_arm64_exception_frame_t *frame;
    uint64_t *scratch;
    size_t i;
    if (initial_frame == 0 || stack == 0 || entry == 0u || return_address == 0u)
        return 0;
    base = (uintptr_t)stack;
    if (stack_size > UINTPTR_MAX - base)
        return 0;
    end = base + stack_size;
    top = end & ~(uintptr_t)0x0fu;
    if (top < base || top - base < NUSANTARA_ARM64_EXCEPTION_CONTEXT_BYTES)
        return 0;
    frame = (nusantara_arm64_exception_frame_t *)(top - NUSANTARA_ARM64_EXCEPTION_CONTEXT_BYTES);
    for (i = 0u; i < 31u; ++i)
        frame->x[i] = 0u;
    frame->x[0] = (uint64_t)argument;
    frame->x[30] = (uint64_t)return_address;
    frame->esr_el1 = 0u;
    frame->far_el1 = 0u;
    frame->elr_el1 = (uint64_t)entry;
    frame->spsr_el1 = spsr;
    frame->vector = vector;
    frame->sp_el0 = (uint64_t)user_stack_top;
    frame->reserved = 0u;
    scratch = (uint64_t *)((uintptr_t)frame + NUSANTARA_ARM64_EXCEPTION_FRAME_BYTES);
    scratch[0] = 0u;
    scratch[1] = 0u;
    *initial_frame = frame;
    return 1;
}
int nusantara_arm64_exception_context_prepare(
    nusantara_arm64_exception_frame_t **initial_frame,
    void *stack, size_t stack_size,
    uintptr_t entry, uintptr_t argument, uintptr_t return_address)
{
    return prepare_frame(initial_frame, stack, stack_size, entry, argument,
                         return_address, 0u,
                         NUSANTARA_ARM64_SPSR_EL1H_MASKED, 5u);
}
int nusantara_arm64_exception_user_context_prepare(
    nusantara_arm64_exception_frame_t **initial_frame,
    void *kernel_stack, size_t kernel_stack_size,
    uintptr_t user_entry, uintptr_t user_stack_top,
    uintptr_t argument, uintptr_t return_address)
{
    if (user_stack_top == 0u || (user_stack_top & 0x0fu) != 0u)
        return 0;
    return prepare_frame(initial_frame, kernel_stack, kernel_stack_size,
                         user_entry, argument, return_address, user_stack_top,
                         NUSANTARA_ARM64_SPSR_EL0T, 8u);
}
