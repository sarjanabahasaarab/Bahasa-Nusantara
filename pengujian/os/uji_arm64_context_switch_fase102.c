/* SPDX-License-Identifier: Apache-2.0 */
#include "../../src/runtime/os/arch/arm64/context-switch.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>

static void task_entry(void *argument) { (void)argument; }
static void task_exit(void) {}

int main(void)
{
    _Alignas(16) unsigned char stack[512];
    uintptr_t sp = 0u;
    nusantara_arm64_context_status_t status;

    status = nusantara_arm64_context_prepare(&sp, stack, sizeof(stack),
                                              task_entry, stack, task_exit);
    assert(status == NUSANTARA_ARM64_CONTEXT_OK);
    assert((sp & 0x0fu) == 0u);
    assert(sp >= (uintptr_t)stack);
    assert(sp + NUSANTARA_ARM64_CONTEXT_FRAME_BYTES <=
           (uintptr_t)stack + sizeof(stack));

    /* Verify the first-run AAPCS64 register frame contract. */
    {
        const uintptr_t *frame = (const uintptr_t *)sp;
        assert(frame[0] == (uintptr_t)stack);       /* x19: argument */
        assert(frame[1] == (uintptr_t)task_entry);  /* x20: entry */
        assert(frame[2] == (uintptr_t)task_exit);   /* x21: exit */
        assert(frame[11] == (uintptr_t)nusantara_arm64_task_trampoline);
    }

    assert(nusantara_arm64_context_prepare(0, stack, sizeof(stack),
           task_entry, stack, task_exit) == NUSANTARA_ARM64_CONTEXT_INVALID_ARGUMENT);
    assert(nusantara_arm64_context_prepare(&sp, stack, 32u,
           task_entry, stack, task_exit) == NUSANTARA_ARM64_CONTEXT_STACK_TOO_SMALL);
    assert(nusantara_arm64_context_prepare(&sp, stack, sizeof(stack),
           0, stack, task_exit) == NUSANTARA_ARM64_CONTEXT_INVALID_ARGUMENT);
    assert(nusantara_arm64_context_prepare(&sp, stack, sizeof(stack),
           task_entry, stack, 0) == NUSANTARA_ARM64_CONTEXT_INVALID_ARGUMENT);

    puts("Phase 102 ARM64 context frame: PASS");
    return 0;
}
