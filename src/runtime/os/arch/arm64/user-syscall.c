/* SPDX-License-Identifier: Apache-2.0 */
#include "user-syscall.h"

static nusantara_arm64_user_syscall_ops_t active_ops;
static uint8_t active;

int nusantara_arm64_user_syscall_init(const nusantara_arm64_user_syscall_ops_t *ops)
{
    if (ops == 0 || ops->validate_user_range == 0 ||
        ops->write == 0 || ops->exit == 0 || ops->yield == 0)
        return 0;
    active_ops = *ops;
    active = 1u;
    return nusantara_arm64_exception_set_handler(
        nusantara_arm64_user_syscall_handle_exception, &active_ops);
}

nusantara_arm64_exception_frame_t *nusantara_arm64_user_syscall_handle_exception(
    void *context, nusantara_arm64_exception_frame_t *frame)
{
    nusantara_arm64_user_syscall_ops_t *ops =
        (nusantara_arm64_user_syscall_ops_t *)context;
    uint32_t exception_class;
    uint32_t immediate;
    uint64_t number;
    int64_t result;

    if (active == 0u || ops == 0 || frame == 0 ||
        (((uintptr_t)frame & 0x0fu) != 0u) || frame->vector != 8u)
        return 0;

    exception_class = (uint32_t)((frame->esr_el1 >> 26) & 0x3fu);
    immediate = (uint32_t)(frame->esr_el1 & 0xffffu);
    if (exception_class != 0x15u || immediate != NUSANTARA_ARM64_SVC_IMMEDIATE)
        return 0;

    /* AArch64 syscall ABI: x8 = number; x0-x2 = arguments; result in x0. */
    number = frame->x[8];
    switch (number) {
    case NUSANTARA_ARM64_SYSCALL_WRITE:
        if (frame->x[1] > (uint64_t)SIZE_MAX ||
            ops->validate_user_range(ops->context, (uintptr_t)frame->x[0],
                                     (size_t)frame->x[1]) == 0) {
            result = NUSANTARA_ARM64_SYSCALL_EFAULT;
        } else {
            result = ops->write(ops->context, (uintptr_t)frame->x[0],
                                (size_t)frame->x[1]);
        }
        break;
    case NUSANTARA_ARM64_SYSCALL_EXIT:
        result = ops->exit(ops->context, (int)frame->x[0]);
        break;
    case NUSANTARA_ARM64_SYSCALL_YIELD:
        result = ops->yield(ops->context);
        break;
    default:
        result = NUSANTARA_ARM64_SYSCALL_ENOSYS;
        break;
    }
    frame->x[0] = (uint64_t)result;
    return frame;
}
