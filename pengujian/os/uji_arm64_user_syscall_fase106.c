/* SPDX-License-Identifier: Apache-2.0 */
#include "user-syscall.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>

typedef struct test_state {
    uintptr_t allowed_start;
    size_t allowed_size;
    unsigned writes;
    unsigned exits;
    unsigned yields;
} test_state_t;

static int validate(void *context, uintptr_t address, size_t length)
{
    test_state_t *s = (test_state_t *)context;
    if (address < s->allowed_start || length > s->allowed_size) return 0;
    return address - s->allowed_start <= s->allowed_size - length;
}
static int64_t write_user(void *context, uintptr_t address, size_t length)
{
    test_state_t *s = (test_state_t *)context;
    (void)address;
    ++s->writes;
    return (int64_t)length;
}
static int64_t exit_user(void *context, int status)
{
    test_state_t *s = (test_state_t *)context;
    ++s->exits;
    return status;
}
static int64_t yield_user(void *context)
{
    test_state_t *s = (test_state_t *)context;
    ++s->yields;
    return 7;
}
static void make_svc(nusantara_arm64_exception_frame_t *f, uint64_t nr)
{
    f->vector = 8u;
    f->esr_el1 = ((uint64_t)0x15u << 26);
    f->x[8] = nr;
}
int main(void)
{
    _Alignas(16) unsigned char stack[1024];
    nusantara_arm64_exception_frame_t *frame = 0;
    test_state_t state = { 0x1000u, 0x100u, 0u, 0u, 0u };
    const nusantara_arm64_user_syscall_ops_t ops = {
        &state, validate, write_user, exit_user, yield_user
    };
    assert(nusantara_arm64_exception_context_prepare(
        &frame, stack, sizeof(stack), 0x2000u, 0u, 0x3000u));
    assert(nusantara_arm64_user_syscall_init(&ops));

    make_svc(frame, NUSANTARA_ARM64_SYSCALL_WRITE);
    frame->x[0] = 0x1010u; frame->x[1] = 12u;
    assert(nusantara_arm64_user_syscall_handle_exception(&state, frame) == 0);
    assert(nusantara_arm64_exception_dispatch(frame) == frame);
    assert(frame->x[0] == 12u && state.writes == 1u);

    make_svc(frame, NUSANTARA_ARM64_SYSCALL_WRITE);
    frame->x[0] = 0x9000u; frame->x[1] = 4u;
    assert(nusantara_arm64_exception_dispatch(frame) == frame);
    assert((int64_t)frame->x[0] == NUSANTARA_ARM64_SYSCALL_EFAULT);
    assert(state.writes == 1u);

    make_svc(frame, NUSANTARA_ARM64_SYSCALL_EXIT);
    frame->x[0] = 23u;
    assert(nusantara_arm64_exception_dispatch(frame) == frame);
    assert(frame->x[0] == 23u && state.exits == 1u);

    make_svc(frame, NUSANTARA_ARM64_SYSCALL_YIELD);
    assert(nusantara_arm64_exception_dispatch(frame) == frame);
    assert(frame->x[0] == 7u && state.yields == 1u);

    make_svc(frame, 0xffffu);
    assert(nusantara_arm64_exception_dispatch(frame) == frame);
    assert((int64_t)frame->x[0] == NUSANTARA_ARM64_SYSCALL_ENOSYS);

    frame->vector = 5u;
    assert(nusantara_arm64_user_syscall_handle_exception(&state, frame) == 0);
    puts("Phase 106 ARM64 EL0 syscall dispatch contract: PASS");
    return 0;
}
