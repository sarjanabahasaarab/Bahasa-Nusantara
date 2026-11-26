/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_EXCEPTION_ROUTER_H
#define NUSANTARA_ARM64_EXCEPTION_ROUTER_H
#include "exception.h"

typedef struct nusantara_arm64_exception_router {
    nusantara_arm64_exception_handler_fn irq_handler;
    void *irq_context;
    nusantara_arm64_exception_handler_fn syscall_handler;
    void *syscall_context;
    uint8_t initialized;
} nusantara_arm64_exception_router_t;

/*
 * Install the single architectural exception entry point.
 * Routes VBAR slots 5/9 (EL1/EL0 IRQ) and 8 (EL0 SVC).
 * Call after the IRQ scheduler and syscall services are initialized.
 */
int nusantara_arm64_exception_router_init(
    nusantara_arm64_exception_router_t *router,
    nusantara_arm64_exception_handler_fn irq_handler, void *irq_context,
    nusantara_arm64_exception_handler_fn syscall_handler, void *syscall_context);

nusantara_arm64_exception_frame_t *nusantara_arm64_exception_router_dispatch(
    void *context, nusantara_arm64_exception_frame_t *frame);
#endif
