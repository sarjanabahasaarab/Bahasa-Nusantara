/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 IRQ/timer/scheduler integration (Phase 101).
 */
#ifndef NUSANTARA_ARM64_IRQ_RUNTIME_H
#define NUSANTARA_ARM64_IRQ_RUNTIME_H

#include <stdint.h>
#include "generic_timer.h"
#include "gicv3.h"
#include "../../scheduler/scheduler.h"

typedef enum nusantara_arm64_irq_runtime_status {
    NUSANTARA_ARM64_IRQ_RUNTIME_OK = 0,
    NUSANTARA_ARM64_IRQ_RUNTIME_INVALID_ARGUMENT,
    NUSANTARA_ARM64_IRQ_RUNTIME_NOT_INITIALIZED,
    NUSANTARA_ARM64_IRQ_RUNTIME_SPURIOUS,
    NUSANTARA_ARM64_IRQ_RUNTIME_UNHANDLED,
    NUSANTARA_ARM64_IRQ_RUNTIME_TIMER_ERROR,
    NUSANTARA_ARM64_IRQ_RUNTIME_SCHEDULER_IDLE
} nusantara_arm64_irq_runtime_status_t;

typedef void (*nusantara_arm64_irq_task_selected_fn)(
    void *context, const nusantara_os_task_t *task);
typedef void (*nusantara_arm64_irq_unhandled_fn)(
    void *context, uint32_t intid);

typedef struct nusantara_arm64_irq_runtime {
    nusantara_arm64_timer_t *unused_timer_type_guard;
    nusantara_arm64_generic_timer_t *timer;
    nusantara_gicv3_cpu_interface_t *cpu_interface;
    nusantara_os_scheduler_t *scheduler;
    void *callback_context;
    nusantara_arm64_irq_task_selected_fn task_selected;
    nusantara_arm64_irq_unhandled_fn unhandled_irq;
    uint32_t timer_intid;
    uint32_t interval_ms;
    uint8_t initialized;
} nusantara_arm64_irq_runtime_t;

/* Timer INTID must be a configured PPI (16..31), usually the platform's EL1 physical timer PPI. */
nusantara_arm64_irq_runtime_status_t nusantara_arm64_irq_runtime_init(
    nusantara_arm64_irq_runtime_t *runtime,
    nusantara_arm64_generic_timer_t *timer,
    nusantara_gicv3_cpu_interface_t *cpu_interface,
    nusantara_os_scheduler_t *scheduler,
    uint32_t timer_intid,
    uint32_t interval_ms,
    void *callback_context,
    nusantara_arm64_irq_task_selected_fn task_selected,
    nusantara_arm64_irq_unhandled_fn unhandled_irq);

/* Acknowledge and service one Group-1 interrupt; every non-spurious token is EOI'd. */
nusantara_arm64_irq_runtime_status_t nusantara_arm64_irq_runtime_handle_one(
    nusantara_arm64_irq_runtime_t *runtime);

#endif
