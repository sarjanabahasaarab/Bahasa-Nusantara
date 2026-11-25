/* SPDX-License-Identifier: Apache-2.0 */
#include "irq-scheduler.h"

static int task_belongs_to_scheduler(
    const nusantara_os_scheduler_t *scheduler,
    const nusantara_os_task_t *task)
{
    size_t i;
    if (scheduler == 0 || task == 0)
        return 0;
    for (i = 0u; i < NUSANTARA_OS_SCHEDULER_MAX_TASKS; ++i) {
        if (&scheduler->tasks[i] == task)
            return 1;
    }
    return 0;
}

static void selected_task_callback(
    void *context, const nusantara_os_task_t *task)
{
    nusantara_arm64_irq_scheduler_t *integration =
        (nusantara_arm64_irq_scheduler_t *)context;
    if (integration == 0)
        return;
    integration->selected_task = (nusantara_os_task_t *)task;
    if (integration->previous_task_selected != 0) {
        integration->previous_task_selected(
            integration->previous_callback_context, task);
    }
}

static void unhandled_irq_callback(void *context, uint32_t intid)
{
    nusantara_arm64_irq_scheduler_t *integration =
        (nusantara_arm64_irq_scheduler_t *)context;
    if (integration != 0 && integration->previous_unhandled_irq != 0) {
        integration->previous_unhandled_irq(
            integration->previous_callback_context, intid);
    }
}

nusantara_arm64_irq_scheduler_status_t nusantara_arm64_irq_scheduler_init(
    nusantara_arm64_irq_scheduler_t *integration,
    nusantara_arm64_irq_runtime_t *irq_runtime,
    nusantara_os_scheduler_t *scheduler)
{
    if (integration == 0 || irq_runtime == 0 || scheduler == 0 ||
        irq_runtime->initialized == 0u || irq_runtime->scheduler != scheduler)
        return NUSANTARA_ARM64_IRQ_SCHEDULER_INVALID_ARGUMENT;
    if (scheduler->has_current == 0u ||
        scheduler->current >= NUSANTARA_OS_SCHEDULER_MAX_TASKS ||
        scheduler->tasks[scheduler->current].state != NUSANTARA_OS_TASK_RUNNING ||
        scheduler->tasks[scheduler->current].saved_stack_pointer == 0u ||
        (scheduler->tasks[scheduler->current].saved_stack_pointer & 0x0fu) != 0u)
        return NUSANTARA_ARM64_IRQ_SCHEDULER_INVALID_STATE;

    integration->irq_runtime = irq_runtime;
    integration->scheduler = scheduler;
    integration->previous_task_selected = irq_runtime->task_selected;
    integration->previous_unhandled_irq = irq_runtime->unhandled_irq;
    integration->previous_callback_context = irq_runtime->callback_context;
    integration->selected_task = 0;
    integration->initialized = 1u;

    irq_runtime->callback_context = integration;
    irq_runtime->task_selected = selected_task_callback;
    irq_runtime->unhandled_irq = unhandled_irq_callback;

    if (nusantara_arm64_exception_set_handler(
            nusantara_arm64_irq_scheduler_handle_exception, integration) == 0) {
        integration->initialized = 0u;
        return NUSANTARA_ARM64_IRQ_SCHEDULER_INVALID_STATE;
    }
    return NUSANTARA_ARM64_IRQ_SCHEDULER_OK;
}

nusantara_arm64_exception_frame_t *nusantara_arm64_irq_scheduler_handle_exception(
    void *context, nusantara_arm64_exception_frame_t *frame)
{
    nusantara_arm64_irq_scheduler_t *integration =
        (nusantara_arm64_irq_scheduler_t *)context;
    nusantara_os_scheduler_t *scheduler;
    nusantara_os_task_t *current;
    nusantara_arm64_irq_runtime_status_t irq_status;

    if (integration == 0 || integration->initialized == 0u ||
        integration->irq_runtime == 0 || integration->scheduler == 0 ||
        frame == 0 || (((uintptr_t)frame & 0x0fu) != 0u))
        return 0;

    /* VBAR slot 5 is the current-EL, SP_EL1, IRQ vector. */
    if (frame->vector != 5u)
        return 0;

    scheduler = integration->scheduler;
    if (scheduler->has_current == 0u ||
        scheduler->current >= NUSANTARA_OS_SCHEDULER_MAX_TASKS)
        return 0;
    current = &scheduler->tasks[scheduler->current];
    if (current->state != NUSANTARA_OS_TASK_RUNNING)
        return 0;

    /* The interrupted task owns this exact asynchronous exception frame. */
    current->saved_stack_pointer = (uintptr_t)frame;
    integration->selected_task = 0;
    irq_status = nusantara_arm64_irq_runtime_handle_one(integration->irq_runtime);

    if (irq_status == NUSANTARA_ARM64_IRQ_RUNTIME_SCHEDULER_IDLE) {
        /* A kernel must always have a runnable idle task before enabling ticks. */
        return 0;
    }
    if (irq_status == NUSANTARA_ARM64_IRQ_RUNTIME_TIMER_ERROR ||
        irq_status == NUSANTARA_ARM64_IRQ_RUNTIME_NOT_INITIALIZED ||
        irq_status == NUSANTARA_ARM64_IRQ_RUNTIME_INVALID_ARGUMENT)
        return 0;

    if (integration->selected_task == 0)
        return frame; /* Spurious, non-timer, or not-yet-expired timer IRQ. */

    if (!task_belongs_to_scheduler(scheduler, integration->selected_task) ||
        integration->selected_task->state != NUSANTARA_OS_TASK_RUNNING ||
        integration->selected_task->saved_stack_pointer == 0u ||
        (integration->selected_task->saved_stack_pointer & 0x0fu) != 0u)
        return 0;

    return (nusantara_arm64_exception_frame_t *)
        integration->selected_task->saved_stack_pointer;
}

nusantara_arm64_irq_scheduler_status_t nusantara_arm64_irq_scheduler_start_first_task(
    nusantara_arm64_irq_scheduler_t *integration)
{
    nusantara_os_task_t *current;
    if (integration == 0 || integration->initialized == 0u ||
        integration->scheduler == 0 || integration->irq_runtime == 0)
        return NUSANTARA_ARM64_IRQ_SCHEDULER_INVALID_ARGUMENT;
    if (integration->irq_runtime->timer == 0 ||
        integration->irq_runtime->timer->armed == 0u)
        return NUSANTARA_ARM64_IRQ_SCHEDULER_TIMER_NOT_ARMED;
    if (integration->scheduler->has_current == 0u ||
        integration->scheduler->current >= NUSANTARA_OS_SCHEDULER_MAX_TASKS)
        return NUSANTARA_ARM64_IRQ_SCHEDULER_INVALID_STATE;

    current = &integration->scheduler->tasks[integration->scheduler->current];
    if (current->state != NUSANTARA_OS_TASK_RUNNING ||
        current->saved_stack_pointer == 0u ||
        (current->saved_stack_pointer & 0x0fu) != 0u)
        return NUSANTARA_ARM64_IRQ_SCHEDULER_INVALID_STATE;

    nusantara_arm64_exception_start_first_task(current->saved_stack_pointer);
    return NUSANTARA_ARM64_IRQ_SCHEDULER_OK;
}
