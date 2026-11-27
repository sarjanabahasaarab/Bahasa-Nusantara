/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_IRQ_SCHEDULER_H
#define NUSANTARA_ARM64_IRQ_SCHEDULER_H

#include <stdint.h>
#include "exception.h"
#include "irq-runtime.h"

typedef int (*nusantara_arm64_irq_process_save_fn)(
    void *context, nusantara_arm64_exception_frame_t *frame);
typedef int (*nusantara_arm64_irq_process_activate_fn)(
    void *context, nusantara_os_task_t *task,
    nusantara_arm64_exception_frame_t **selected_frame);

typedef enum nusantara_arm64_irq_scheduler_status {
    NUSANTARA_ARM64_IRQ_SCHEDULER_OK = 0,
    NUSANTARA_ARM64_IRQ_SCHEDULER_INVALID_ARGUMENT,
    NUSANTARA_ARM64_IRQ_SCHEDULER_INVALID_STATE,
    NUSANTARA_ARM64_IRQ_SCHEDULER_NO_IDLE_TASK,
    NUSANTARA_ARM64_IRQ_SCHEDULER_TIMER_NOT_ARMED
} nusantara_arm64_irq_scheduler_status_t;

typedef struct nusantara_arm64_irq_scheduler {
    nusantara_arm64_irq_runtime_t *irq_runtime;
    nusantara_os_scheduler_t *scheduler;
    nusantara_arm64_irq_task_selected_fn previous_task_selected;
    nusantara_arm64_irq_unhandled_fn previous_unhandled_irq;
    void *previous_callback_context;
    nusantara_os_task_t *selected_task;
    void *process_context;
    nusantara_arm64_irq_process_save_fn save_process_frame;
    nusantara_arm64_irq_process_activate_fn activate_process_task;
    nusantara_arm64_exception_frame_t *selected_frame;
    uint8_t initialized;
} nusantara_arm64_irq_scheduler_t;

/*
 * Install the EL1h IRQ exception handler and connect IRQ-runtime scheduler
 * callbacks. Call only after the scheduler has selected its first RUNNING task.
 */
nusantara_arm64_irq_scheduler_status_t nusantara_arm64_irq_scheduler_init(
    nusantara_arm64_irq_scheduler_t *integration,
    nusantara_arm64_irq_runtime_t *irq_runtime,
    nusantara_os_scheduler_t *scheduler);

/* Bind an address-space-aware process scheduler for timer-driven EL0 preemption. */
nusantara_arm64_irq_scheduler_status_t nusantara_arm64_irq_scheduler_bind_processes(
    nusantara_arm64_irq_scheduler_t *integration, void *process_context,
    nusantara_arm64_irq_process_save_fn save_frame,
    nusantara_arm64_irq_process_activate_fn activate_task);

/* Exception handler entry, exposed for deterministic host tests. */
nusantara_arm64_exception_frame_t *nusantara_arm64_irq_scheduler_handle_exception(
    void *context, nusantara_arm64_exception_frame_t *frame);

/*
 * Transfer boot execution into the scheduler's current initial EL1h frame.
 * Requires a mapped per-task kernel stack, enabled GIC CPU interface and
 * timer PPI, and an already armed physical timer. This function does not return
 * after the architectural ERET succeeds.
 */
nusantara_arm64_irq_scheduler_status_t nusantara_arm64_irq_scheduler_start_first_task(
    nusantara_arm64_irq_scheduler_t *integration);

#endif
