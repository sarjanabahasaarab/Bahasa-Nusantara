/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_USER_SYSCALL_H
#define NUSANTARA_ARM64_USER_SYSCALL_H
#include <stddef.h>
#include <stdint.h>
#include "exception.h"

#define NUSANTARA_ARM64_SVC_IMMEDIATE 0u
#define NUSANTARA_ARM64_SYSCALL_WRITE 1u
#define NUSANTARA_ARM64_SYSCALL_EXIT  2u
#define NUSANTARA_ARM64_SYSCALL_YIELD 3u
#define NUSANTARA_ARM64_SYSCALL_ENOSYS (-38)
#define NUSANTARA_ARM64_SYSCALL_EFAULT (-14)

typedef struct nusantara_arm64_user_syscall_ops {
    void *context;
    int (*validate_user_range)(void *context, uintptr_t address, size_t length);
    int64_t (*write)(void *context, uintptr_t address, size_t length);
    int64_t (*exit)(void *context, int status);
    int64_t (*yield)(void *context);
} nusantara_arm64_user_syscall_ops_t;

/* Install as the active exception handler; this currently owns vector dispatch. */
int nusantara_arm64_user_syscall_init(const nusantara_arm64_user_syscall_ops_t *ops);
nusantara_arm64_exception_frame_t *nusantara_arm64_user_syscall_handle_exception(
    void *context, nusantara_arm64_exception_frame_t *frame);

/* Enter AArch64 EL0t. Does not return; stack_top must be 16-byte aligned. */
void nusantara_arm64_enter_user(uintptr_t entry, uintptr_t stack_top, uintptr_t argument)
    __attribute__((noreturn));

#endif
