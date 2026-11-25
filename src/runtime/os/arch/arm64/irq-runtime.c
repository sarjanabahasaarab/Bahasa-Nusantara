/* SPDX-License-Identifier: Apache-2.0 */
#include "irq-runtime.h"

nusantara_arm64_irq_runtime_status_t nusantara_arm64_irq_runtime_init(
    nusantara_arm64_irq_runtime_t *runtime,
    nusantara_arm64_generic_timer_t *timer,
    nusantara_gicv3_cpu_interface_t *cpu,
    nusantara_os_scheduler_t *scheduler,
    uint32_t timer_intid,
    uint32_t interval_ms,
    void *callback_context,
    nusantara_arm64_irq_task_selected_fn task_selected,
    nusantara_arm64_irq_unhandled_fn unhandled_irq)
{
    if (runtime == 0 || timer == 0 || cpu == 0 || scheduler == 0 ||
        interval_ms == 0u || timer_intid < NUSANTARA_GICV3_IRQ_PPI_FIRST ||
        timer_intid >= NUSANTARA_GICV3_IRQ_SPI_FIRST ||
        cpu->read_iar1_el1 == 0 || cpu->write_eoir1_el1 == 0)
        return NUSANTARA_ARM64_IRQ_RUNTIME_INVALID_ARGUMENT;

    runtime->timer = timer;
    runtime->cpu_interface = cpu;
    runtime->scheduler = scheduler;
    runtime->callback_context = callback_context;
    runtime->task_selected = task_selected;
    runtime->unhandled_irq = unhandled_irq;
    runtime->timer_intid = timer_intid;
    runtime->interval_ms = interval_ms;
    runtime->initialized = 1u;
    return NUSANTARA_ARM64_IRQ_RUNTIME_OK;
}

nusantara_arm64_irq_runtime_status_t nusantara_arm64_irq_runtime_handle_one(
    nusantara_arm64_irq_runtime_t *runtime)
{
    uint32_t token;
    uint32_t intid;
    uint8_t expired = 0u;
    nusantara_arm64_irq_runtime_status_t result = NUSANTARA_ARM64_IRQ_RUNTIME_OK;

    if (runtime == 0)
        return NUSANTARA_ARM64_IRQ_RUNTIME_INVALID_ARGUMENT;
    if (runtime->initialized == 0u || runtime->timer == 0 ||
        runtime->cpu_interface == 0 || runtime->scheduler == 0)
        return NUSANTARA_ARM64_IRQ_RUNTIME_NOT_INITIALIZED;

    token = nusantara_gicv3_acknowledge(runtime->cpu_interface);
    intid = token & 0x00ffffffu;
    if (intid >= NUSANTARA_GICV3_IRQ_SPURIOUS_MIN)
        return NUSANTARA_ARM64_IRQ_RUNTIME_SPURIOUS;

    if (intid == runtime->timer_intid) {
        nusantara_arm64_timer_status_t timer_status;
        nusantara_os_task_t *next = 0;

        timer_status = nusantara_arm64_timer_is_expired(runtime->timer, &expired);
        if (timer_status != NUSANTARA_ARM64_TIMER_OK) {
            result = NUSANTARA_ARM64_IRQ_RUNTIME_TIMER_ERROR;
        } else if (expired != 0u) {
            nusantara_os_scheduler_status_t sched_status;
            sched_status = nusantara_os_scheduler_tick(runtime->scheduler, &next);
            if (sched_status == NUSANTARA_OS_SCHEDULER_OK) {
                if (runtime->task_selected != 0)
                    runtime->task_selected(runtime->callback_context, next);
            } else if (sched_status == NUSANTARA_OS_SCHEDULER_NO_RUNNABLE_TASK) {
                result = NUSANTARA_ARM64_IRQ_RUNTIME_SCHEDULER_IDLE;
            } else {
                result = NUSANTARA_ARM64_IRQ_RUNTIME_NOT_INITIALIZED;
            }

            /* Keep the one-shot timer alive even when the run queue is empty. */
            if (nusantara_arm64_timer_arm_ms(runtime->timer, runtime->interval_ms) !=
                NUSANTARA_ARM64_TIMER_OK)
                result = NUSANTARA_ARM64_IRQ_RUNTIME_TIMER_ERROR;
        }
    } else {
        if (runtime->unhandled_irq != 0)
            runtime->unhandled_irq(runtime->callback_context, intid);
        result = NUSANTARA_ARM64_IRQ_RUNTIME_UNHANDLED;
    }

    /* GIC requires EOI for every acknowledged, non-spurious interrupt token. */
    nusantara_gicv3_end_interrupt(runtime->cpu_interface, token);
    return result;
}
