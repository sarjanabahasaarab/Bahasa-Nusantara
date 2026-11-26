/* SPDX-License-Identifier: Apache-2.0 */
#include "exception-router.h"

int nusantara_arm64_exception_router_init(
    nusantara_arm64_exception_router_t *router,
    nusantara_arm64_exception_handler_fn irq_handler, void *irq_context,
    nusantara_arm64_exception_handler_fn syscall_handler, void *syscall_context)
{
    if (router == 0 || irq_handler == 0 || syscall_handler == 0)
        return 0;
    router->irq_handler = irq_handler;
    router->irq_context = irq_context;
    router->syscall_handler = syscall_handler;
    router->syscall_context = syscall_context;
    router->initialized = 1u;
    return nusantara_arm64_exception_set_handler(
        nusantara_arm64_exception_router_dispatch, router);
}

nusantara_arm64_exception_frame_t *nusantara_arm64_exception_router_dispatch(
    void *context, nusantara_arm64_exception_frame_t *frame)
{
    nusantara_arm64_exception_router_t *router =
        (nusantara_arm64_exception_router_t *)context;
    if (router == 0 || router->initialized == 0u || frame == 0)
        return 0;
    if (frame->vector == 5u || frame->vector == 9u)
        return router->irq_handler(router->irq_context, frame);
    if (frame->vector == 8u)
        return router->syscall_handler(router->syscall_context, frame);
    return 0;
}
