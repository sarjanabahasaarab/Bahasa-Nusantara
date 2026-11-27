/* SPDX-License-Identifier: Apache-2.0 */
#include "exception.h"
#include <assert.h>
#include <stdalign.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define KERNEL_STACK_SIZE 4096u
static alignas(16) uint8_t kernel_stack[KERNEL_STACK_SIZE];

int main(void)
{
    nusantara_arm64_exception_frame_t *frame = 0;
    const uintptr_t entry = (uintptr_t)UINT64_C(0x400000);
    const uintptr_t user_stack_top = (uintptr_t)UINT64_C(0x7fff0000);
    const uintptr_t argument = (uintptr_t)UINT64_C(0x12345678);
    const uintptr_t exit_trampoline = (uintptr_t)UINT64_C(0x410000);

    memset(kernel_stack, 0xa5, sizeof(kernel_stack));
    assert(nusantara_arm64_exception_user_context_prepare(
        &frame, kernel_stack, sizeof(kernel_stack), entry, user_stack_top,
        argument, exit_trampoline));
    assert(frame != 0);
    assert(((uintptr_t)frame & 0x0fu) == 0u);
    assert(frame->elr_el1 == entry);
    assert(frame->spsr_el1 == NUSANTARA_ARM64_SPSR_EL0T);
    assert(frame->sp_el0 == user_stack_top);
    assert(frame->x[0] == argument);
    assert(frame->x[30] == exit_trampoline);
    assert(frame->vector == 8u);
    assert(frame->esr_el1 == 0u && frame->far_el1 == 0u);
    assert(frame->reserved == 0u);
    {
        size_t i;
        for (i=1u;i<30u;i++) assert(frame->x[i] == 0u);
    }
    puts("PASS: initial exception frame enters EL0t with aligned user SP");
    puts("PASS: entry, argument, and process-exit trampoline registers initialized");

    frame = 0;
    assert(!nusantara_arm64_exception_user_context_prepare(
        &frame, kernel_stack, sizeof(kernel_stack), entry,
        user_stack_top + 8u, argument, exit_trampoline));
    assert(frame == 0);
    assert(!nusantara_arm64_exception_user_context_prepare(
        &frame, kernel_stack, 128u, entry, user_stack_top,
        argument, exit_trampoline));
    assert(frame == 0);
    assert(!nusantara_arm64_exception_user_context_prepare(
        &frame, kernel_stack, sizeof(kernel_stack), 0u, user_stack_top,
        argument, exit_trampoline));
    assert(frame == 0);
    puts("PASS: rejects unaligned user SP, undersized kernel stack, and null entry");
    puts("NUSANTARA_PHASE115_EL0_CONTEXT_PASS");
    return 0;
}
