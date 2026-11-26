/* SPDX-License-Identifier: Apache-2.0 */
#include "exception-router.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>

typedef struct route_counts { unsigned irq; unsigned syscall; } route_counts_t;
static nusantara_arm64_exception_frame_t *irq_route(
    void *context, nusantara_arm64_exception_frame_t *frame)
{
    route_counts_t *c = (route_counts_t *)context;
    ++c->irq;
    return frame;
}
static nusantara_arm64_exception_frame_t *syscall_route(
    void *context, nusantara_arm64_exception_frame_t *frame)
{
    route_counts_t *c = (route_counts_t *)context;
    ++c->syscall;
    return frame;
}
int main(void)
{
    _Alignas(16) unsigned char kernel_stack[1024];
    nusantara_arm64_exception_frame_t *el0 = 0;
    nusantara_arm64_exception_frame_t *el1 = 0;
    nusantara_arm64_exception_router_t router;
    route_counts_t irq = {0u}, syscall = {0u};

    assert(sizeof(nusantara_arm64_exception_frame_t) == 304u);
    assert(NUSANTARA_ARM64_EXCEPTION_CONTEXT_BYTES == 320u);
    assert(nusantara_arm64_exception_user_context_prepare(
        &el0, kernel_stack, sizeof(kernel_stack),
        0x4000u, 0x8000u, 0x1234u, 0x5000u));
    assert(((uintptr_t)el0 & 15u) == 0u);
    assert(el0->elr_el1 == 0x4000u);
    assert(el0->sp_el0 == 0x8000u);
    assert(el0->spsr_el1 == NUSANTARA_ARM64_SPSR_EL0T);
    assert(el0->vector == 8u);
    assert(el0->x[0] == 0x1234u);

    assert(nusantara_arm64_exception_context_prepare(
        &el1, kernel_stack, sizeof(kernel_stack),
        0x6000u, 0u, 0x7000u));
    assert(el1->sp_el0 == 0u);
    assert(!nusantara_arm64_exception_user_context_prepare(
        &el0, kernel_stack, sizeof(kernel_stack),
        0x4000u, 0x8001u, 0u, 0x5000u));

    assert(nusantara_arm64_exception_router_init(
        &router, irq_route, &irq, syscall_route, &syscall));
    el0->vector = 9u;
    assert(nusantara_arm64_exception_dispatch(el0) == el0);
    assert(irq.irq == 1u && syscall.syscall == 0u);
    el0->vector = 5u;
    assert(nusantara_arm64_exception_dispatch(el0) == el0);
    assert(irq.irq == 2u);
    el0->vector = 8u;
    assert(nusantara_arm64_exception_dispatch(el0) == el0);
    assert(syscall.syscall == 1u);
    el0->vector = 4u;
    assert(nusantara_arm64_exception_dispatch(el0) == 0);
    assert(!nusantara_arm64_exception_router_init(
        &router, 0, &irq, syscall_route, &syscall));
    puts("Phase 107 ARM64 EL0 frame and exception router: PASS");
    return 0;
}
