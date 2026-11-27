/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_PROCESS_SYSCALL_ADAPTER_H
#define NUSANTARA_ARM64_PROCESS_SYSCALL_ADAPTER_H
#include "process-scheduler.h"
#include "user-syscall.h"

/*
 * Connect the generic EL0 syscall dispatcher to the ARM64 process scheduler.
 * io_context belongs to the caller's user-memory and console callbacks.
 * idle_frame, when supplied, must be a prepared EL1h frame in the kernel
 * address space. It is selected only after the final process exits.
 */
typedef struct nusantara_arm64_process_syscall_adapter {
    nusantara_arm64_process_scheduler_t *process_scheduler;
    void *io_context;
    int (*validate_user_range)(void *, uintptr_t, size_t);
    int64_t (*write)(void *, uintptr_t, size_t);
    nusantara_arm64_exception_frame_t *idle_frame;
    uint8_t initialized;
} nusantara_arm64_process_syscall_adapter_t;

/*
 * Rebind ops in place: preserve its I/O callbacks, install scheduler-aware
 * yield/exit frame callbacks, then pass the resulting ops to syscall_init.
 */
int nusantara_arm64_process_syscall_adapter_init(
    nusantara_arm64_process_syscall_adapter_t *adapter,
    nusantara_arm64_process_scheduler_t *scheduler,
    nusantara_arm64_user_syscall_ops_t *ops,
    nusantara_arm64_exception_frame_t *idle_frame);

#endif
