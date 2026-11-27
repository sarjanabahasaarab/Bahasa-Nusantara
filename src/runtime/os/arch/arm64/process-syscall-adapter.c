/* SPDX-License-Identifier: Apache-2.0 */
#include "process-syscall-adapter.h"

static int adapter_validate(void *context, uintptr_t address, size_t length)
{
    nusantara_arm64_process_syscall_adapter_t *adapter =
        (nusantara_arm64_process_syscall_adapter_t *)context;
    if (adapter == 0 || !adapter->initialized ||
        adapter->validate_user_range == 0)
        return 0;
    return adapter->validate_user_range(
        adapter->io_context, address, length);
}

static int64_t adapter_write(void *context, uintptr_t address, size_t length)
{
    nusantara_arm64_process_syscall_adapter_t *adapter =
        (nusantara_arm64_process_syscall_adapter_t *)context;
    if (adapter == 0 || !adapter->initialized || adapter->write == 0)
        return NUSANTARA_ARM64_SYSCALL_EFAULT;
    return adapter->write(adapter->io_context, address, length);
}

static nusantara_arm64_exception_frame_t *adapter_yield_frame(
    void *context, nusantara_arm64_exception_frame_t *current)
{
    nusantara_arm64_process_syscall_adapter_t *adapter =
        (nusantara_arm64_process_syscall_adapter_t *)context;
    nusantara_arm64_exception_frame_t *selected = 0;
    if (adapter == 0 || !adapter->initialized ||
        nusantara_arm64_process_scheduler_yield(
            adapter->process_scheduler, current, &selected) !=
            NUSANTARA_ARM64_PROCESS_SCHEDULER_OK)
        return 0;
    return selected;
}

static nusantara_arm64_exception_frame_t *adapter_exit_frame(
    void *context, nusantara_arm64_exception_frame_t *current, int status)
{
    nusantara_arm64_process_syscall_adapter_t *adapter =
        (nusantara_arm64_process_syscall_adapter_t *)context;
    nusantara_arm64_exception_frame_t *selected = 0;
    nusantara_arm64_process_scheduler_status_t result;
    if (adapter == 0 || !adapter->initialized)
        return 0;
    result = nusantara_arm64_process_scheduler_exit(
        adapter->process_scheduler, current, (int64_t)status, &selected);
    if (result == NUSANTARA_ARM64_PROCESS_SCHEDULER_OK)
        return selected;
    if (result == NUSANTARA_ARM64_PROCESS_SCHEDULER_NO_RUNNABLE &&
        adapter->idle_frame != 0)
        return adapter->idle_frame;
    return 0;
}

int nusantara_arm64_process_syscall_adapter_init(
    nusantara_arm64_process_syscall_adapter_t *adapter,
    nusantara_arm64_process_scheduler_t *scheduler,
    nusantara_arm64_user_syscall_ops_t *ops,
    nusantara_arm64_exception_frame_t *idle_frame)
{
    if (adapter == 0 || scheduler == 0 || !scheduler->initialized ||
        ops == 0 || ops->validate_user_range == 0 || ops->write == 0)
        return 0;
    if (idle_frame != 0 &&
        ((((uintptr_t)idle_frame & 15u) != 0u) ||
         idle_frame->elr_el1 == 0u ||
         (idle_frame->spsr_el1 & 0x0fu) != 0x05u))
        return 0;

    adapter->process_scheduler = scheduler;
    adapter->io_context = ops->context;
    adapter->validate_user_range = ops->validate_user_range;
    adapter->write = ops->write;
    adapter->idle_frame = idle_frame;
    adapter->initialized = 1u;

    ops->context = adapter;
    ops->validate_user_range = adapter_validate;
    ops->write = adapter_write;
    ops->exit = 0;
    ops->yield = 0;
    ops->exit_frame = adapter_exit_frame;
    ops->yield_frame = adapter_yield_frame;
    return 1;
}
