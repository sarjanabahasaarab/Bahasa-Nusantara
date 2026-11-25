/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "irq-scheduler.h"

typedef struct fake_hw {
    uint32_t iar;
    uint32_t eoi;
    uint32_t control;
    uint32_t tval;
    uint64_t frequency;
    uint64_t counter;
    unsigned eoi_count;
    unsigned selected_count;
    unsigned unhandled_count;
} fake_hw_t;

static uint64_t rd_freq(void *p) { return ((fake_hw_t *)p)->frequency; }
static uint64_t rd_count(void *p) { return ((fake_hw_t *)p)->counter; }
static uint32_t rd_ctl(void *p) { return ((fake_hw_t *)p)->control; }
static void wr_tval(void *p, int32_t v) { ((fake_hw_t *)p)->tval = (uint32_t)v; }
static void wr_ctl(void *p, uint32_t v) { ((fake_hw_t *)p)->control = v; }
static void isb(void *p) { (void)p; }
static uint32_t rd_iar(void *p) { return ((fake_hw_t *)p)->iar; }
static void wr_eoir(void *p, uint32_t v) {
    fake_hw_t *h = (fake_hw_t *)p; h->eoi = v; ++h->eoi_count;
}
static void previous_selected(void *p, const nusantara_os_task_t *task) {
    fake_hw_t *h = (fake_hw_t *)p; (void)task; ++h->selected_count;
}
static void previous_unhandled(void *p, uint32_t id) {
    fake_hw_t *h = (fake_hw_t *)p; (void)id; ++h->unhandled_count;
}

/* The host test validates the C contract, not the privileged ERET entry. */
void nusantara_arm64_exception_start_first_task(uintptr_t frame_pointer)
{
    (void)frame_pointer;
}

int main(void)
{
    fake_hw_t hw = {0};
    _Alignas(16) unsigned char stack_a[512];
    _Alignas(16) unsigned char stack_b[512];
    nusantara_arm64_exception_frame_t *frame_a =
        (nusantara_arm64_exception_frame_t *)stack_a;
    nusantara_arm64_exception_frame_t *frame_b =
        (nusantara_arm64_exception_frame_t *)stack_b;
    nusantara_arm64_timer_io_t timer_io =
        {&hw, rd_freq, rd_count, rd_ctl, wr_tval, wr_ctl, isb};
    nusantara_gicv3_cpu_interface_t cpu =
        {&hw, 0, 0, 0, 0, rd_iar, wr_eoir, isb};
    nusantara_arm64_generic_timer_t timer;
    nusantara_os_scheduler_t scheduler;
    nusantara_arm64_irq_runtime_t runtime;
    nusantara_arm64_irq_scheduler_t integration;
    nusantara_os_task_t *first = 0;
    uint64_t id_a = 0u, id_b = 0u;

    frame_a->vector = 5u;
    frame_b->vector = 5u;
    hw.frequency = 1000000u;
    assert(nusantara_arm64_timer_init(&timer, &timer_io) == NUSANTARA_ARM64_TIMER_OK);
    assert(nusantara_arm64_timer_arm_ms(&timer, 10u) == NUSANTARA_ARM64_TIMER_OK);

    nusantara_os_scheduler_init(&scheduler);
    assert(nusantara_os_scheduler_add(&scheduler, (uintptr_t)frame_a, 0, 1u, &id_a) ==
           NUSANTARA_OS_SCHEDULER_OK);
    assert(nusantara_os_scheduler_add(&scheduler, (uintptr_t)frame_b, 0, 1u, &id_b) ==
           NUSANTARA_OS_SCHEDULER_OK);
    assert(id_a != id_b);
    assert(nusantara_os_scheduler_schedule(&scheduler, &first) == NUSANTARA_OS_SCHEDULER_OK);
    assert(first == &scheduler.tasks[0]);

    assert(nusantara_arm64_irq_runtime_init(&runtime, &timer, &cpu, &scheduler,
        30u, 10u, &hw, previous_selected, previous_unhandled) ==
        NUSANTARA_ARM64_IRQ_RUNTIME_OK);
    assert(nusantara_arm64_irq_scheduler_init(&integration, &runtime, &scheduler) ==
        NUSANTARA_ARM64_IRQ_SCHEDULER_OK);
    timer.armed = 0u;
    assert(nusantara_arm64_irq_scheduler_start_first_task(&integration) ==
        NUSANTARA_ARM64_IRQ_SCHEDULER_TIMER_NOT_ARMED);
    timer.armed = 1u;

    /* Expired physical timer: save task A's exception frame, select task B. */
    hw.iar = 30u;
    hw.control = NUSANTARA_ARM64_TIMER_CTL_ENABLE | NUSANTARA_ARM64_TIMER_CTL_ISTATUS;
    assert(nusantara_arm64_exception_dispatch(frame_a) == frame_b);
    assert(scheduler.tasks[0].saved_stack_pointer == (uintptr_t)frame_a);
    assert(scheduler.tasks[1].state == NUSANTARA_OS_TASK_RUNNING);
    assert(hw.eoi == 30u && hw.eoi_count == 1u);
    assert(hw.tval > 0u && hw.selected_count == 1u);

    /* A spurious token leaves the current task and frame unchanged, no EOI. */
    hw.iar = 1023u;
    assert(nusantara_arm64_exception_dispatch(frame_b) == frame_b);
    assert(hw.eoi_count == 1u);

    /* A non-timer IRQ is acknowledged, reported, and returns to same frame. */
    hw.iar = 40u;
    assert(nusantara_arm64_exception_dispatch(frame_b) == frame_b);
    assert(hw.eoi == 40u && hw.eoi_count == 2u && hw.unhandled_count == 1u);

    /* A blocked current task is saved, then the READY peer is resumed. */
    assert(nusantara_os_scheduler_block(&scheduler, id_b) == NUSANTARA_OS_SCHEDULER_OK);
    hw.iar = 30u;
    hw.control = NUSANTARA_ARM64_TIMER_CTL_ENABLE | NUSANTARA_ARM64_TIMER_CTL_ISTATUS;
    assert(nusantara_arm64_exception_dispatch(frame_b) == frame_a);
    assert(scheduler.tasks[1].saved_stack_pointer == (uintptr_t)frame_b);
    assert(scheduler.tasks[0].state == NUSANTARA_OS_TASK_RUNNING);
    assert(hw.eoi == 30u && hw.eoi_count == 3u);

    /* Non-IRQ exception vector is rejected by this IRQ-only dispatcher. */
    frame_a->vector = 4u;
    assert(nusantara_arm64_exception_dispatch(frame_a) == 0);

    puts("Phase 104 ARM64 IRQ-to-exception-frame scheduler: PASS");
    return 0;
}
