/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "irq-runtime.h"

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
    uint64_t selected_id;
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
static void selected(void *p, const nusantara_os_task_t *task) {
    fake_hw_t *h = (fake_hw_t *)p; ++h->selected_count; h->selected_id = task->id;
}
static void unhandled(void *p, uint32_t id) {
    fake_hw_t *h = (fake_hw_t *)p; (void)id; ++h->unhandled_count;
}

int main(void) {
    fake_hw_t hw = {0};
    nusantara_arm64_timer_io_t tio = {&hw, rd_freq, rd_count, rd_ctl, wr_tval, wr_ctl, isb};
    nusantara_gicv3_cpu_interface_t cpu = {&hw, 0, 0, 0, 0, rd_iar, wr_eoir, isb};
    nusantara_arm64_generic_timer_t timer;
    nusantara_os_scheduler_t scheduler;
    nusantara_arm64_irq_runtime_t runtime;
    uint64_t task_id = 0u;

    hw.frequency = 1000000u;
    assert(nusantara_arm64_timer_init(&timer, &tio) == NUSANTARA_ARM64_TIMER_OK);
    nusantara_os_scheduler_init(&scheduler);
    assert(nusantara_os_scheduler_add(&scheduler, 0x8000u, 0, 2u, &task_id) == NUSANTARA_OS_SCHEDULER_OK);
    assert(nusantara_os_scheduler_schedule(&scheduler, &(nusantara_os_task_t *){0}) ==
           NUSANTARA_OS_SCHEDULER_OK);
    assert(nusantara_arm64_irq_runtime_init(&runtime, &timer, &cpu, &scheduler, 30u,
           10u, &hw, selected, unhandled) == NUSANTARA_ARM64_IRQ_RUNTIME_OK);

    /* Timer interrupt: tick selects/retains a task, rearms timer, and EOIs exact token. */
    hw.iar = 30u;
    hw.control = NUSANTARA_ARM64_TIMER_CTL_ENABLE | NUSANTARA_ARM64_TIMER_CTL_ISTATUS;
    assert(nusantara_arm64_irq_runtime_handle_one(&runtime) == NUSANTARA_ARM64_IRQ_RUNTIME_OK);
    assert(hw.eoi == 30u && hw.eoi_count == 1u);
    assert(hw.tval > 0u && hw.selected_count == 1u && hw.selected_id == task_id);

    /* Non-timer IRQ is reported but still EOI'd. */
    hw.iar = 40u;
    assert(nusantara_arm64_irq_runtime_handle_one(&runtime) == NUSANTARA_ARM64_IRQ_RUNTIME_UNHANDLED);
    assert(hw.eoi == 40u && hw.eoi_count == 2u && hw.unhandled_count == 1u);

    /* Spurious token is not EOI'd. */
    hw.iar = 1023u;
    assert(nusantara_arm64_irq_runtime_handle_one(&runtime) == NUSANTARA_ARM64_IRQ_RUNTIME_SPURIOUS);
    assert(hw.eoi_count == 2u);

    /* A timer interrupt with no runnable task still rearms and EOIs. */
    assert(nusantara_os_scheduler_block(&scheduler, task_id) == NUSANTARA_OS_SCHEDULER_OK);
    hw.iar = 30u;
    hw.control = NUSANTARA_ARM64_TIMER_CTL_ENABLE | NUSANTARA_ARM64_TIMER_CTL_ISTATUS;
    assert(nusantara_arm64_irq_runtime_handle_one(&runtime) == NUSANTARA_ARM64_IRQ_RUNTIME_SCHEDULER_IDLE);
    assert(hw.eoi == 30u && hw.eoi_count == 3u && hw.tval > 0u);

    puts("Phase 101: ARM64 IRQ runtime contract tests passed");
    return 0;
}
