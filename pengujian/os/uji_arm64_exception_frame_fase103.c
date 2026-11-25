/* SPDX-License-Identifier: Apache-2.0 */
#include "exception.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
static nusantara_arm64_exception_frame_t *redirect(
    void *context, nusantara_arm64_exception_frame_t *frame)
{
    (void)frame;
    return (nusantara_arm64_exception_frame_t *)context;
}
int main(void)
{
    _Alignas(16) unsigned char stack_a[1024];
    _Alignas(16) unsigned char stack_b[1024];
    nusantara_arm64_exception_frame_t *a = 0, *b = 0;
    assert(nusantara_arm64_exception_context_prepare(&a, stack_a, sizeof(stack_a),
        0x1000u, 0xabcdu, 0x2000u) == 1);
    assert(((uintptr_t)a & 15u) == 0u);
    assert((uintptr_t)a >= (uintptr_t)stack_a);
    assert((uintptr_t)a + NUSANTARA_ARM64_EXCEPTION_CONTEXT_BYTES <=
        (uintptr_t)stack_a + sizeof(stack_a));
    assert(a->x[0] == 0xabcdu && a->x[30] == 0x2000u);
    assert(a->elr_el1 == 0x1000u);
    assert(a->spsr_el1 == NUSANTARA_ARM64_SPSR_EL1H_MASKED);
    assert(a->vector == 5u);
    assert(nusantara_arm64_exception_context_prepare(&b, stack_b, sizeof(stack_b),
        0x3000u, 0x1234u, 0x4000u) == 1);
    assert(nusantara_arm64_exception_dispatch(a) == 0);
    assert(nusantara_arm64_exception_set_handler(redirect, b) == 1);
    assert(nusantara_arm64_exception_dispatch(a) == b);
    assert(nusantara_arm64_exception_set_handler(0, 0) == 1);
    assert(nusantara_arm64_exception_dispatch(a) == 0);
    assert(nusantara_arm64_exception_context_prepare(&a, stack_a, 64u,
        0x1000u, 0u, 0x2000u) == 0);
    assert(nusantara_arm64_exception_context_prepare(&a, stack_a, sizeof(stack_a),
        0u, 0u, 0x2000u) == 0);
    puts("Phase 103 ARM64 exception-frame contract: PASS");
    return 0;
}
