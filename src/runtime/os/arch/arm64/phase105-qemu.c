/* SPDX-License-Identifier: Apache-2.0
 * Phase 105: real QEMU virt GICv3 + EL1 physical timer preemption proof.
 */
#include <stdint.h>
#include "exception.h"
#include "gicv3.h"
#include "generic_timer.h"
#include "irq-runtime.h"
#include "irq-scheduler.h"
#include "../../scheduler/scheduler.h"

#define PHASE105_GICD_BASE ((uintptr_t)0x08000000u)
#define PHASE105_GICR_BASE ((uintptr_t)0x080a0000u)
#define PHASE105_UART_BASE ((uintptr_t)0x09000000u)
#define PHASE105_TIMER_PPI 30u
#define PHASE105_TIMER_INTERVAL_MS 10u
#define PHASE105_PROGRESS_TARGET 250000u

static nusantara_gicv3_t gic;
static nusantara_arm64_generic_timer_t timer;
static nusantara_gicv3_cpu_interface_t cpu_interface;
static nusantara_os_scheduler_t scheduler;
static nusantara_arm64_irq_runtime_t irq_runtime;
static nusantara_arm64_irq_scheduler_t irq_scheduler;
static _Alignas(16) uint8_t task_a_stack[8192];
static _Alignas(16) uint8_t task_b_stack[8192];
static volatile uint64_t task_a_progress;
static volatile uint64_t task_b_progress;
static volatile uint64_t preemption_count;
static volatile uint64_t timer_irq_count;

extern void phase105_uart_puts(const char *message);
static void uart_puts(const char *message)
{
    phase105_uart_puts(message);
}
static void phase105_halt(void)
{
    __asm__ volatile("msr daifset, #0xf\n\tdsb sy" ::: "memory");
    for (;;) __asm__ volatile("wfe");
}
static void phase105_fail(const char *reason)
{
    uart_puts("NUSANTARA_PHASE105_FAIL: ");
    uart_puts(reason);
    uart_puts("\r\n");
    phase105_halt();
}
static uint32_t mmio_read32(void *context, uintptr_t address)
{
    (void)context;
    return *(volatile uint32_t *)address;
}
static void mmio_write32(void *context, uintptr_t address, uint32_t value)
{
    (void)context;
    *(volatile uint32_t *)address = value;
}
static uint64_t mmio_read64(void *context, uintptr_t address)
{
    (void)context;
    return *(volatile uint64_t *)address;
}
static void mmio_write64(void *context, uintptr_t address, uint64_t value)
{
    (void)context;
    *(volatile uint64_t *)address = value;
}
static void platform_barrier(void *context)
{
    (void)context;
    __asm__ volatile("dsb sy\n\tisb" ::: "memory");
}
static uint64_t timer_read_frequency(void *context)
{
    uint64_t value;
    (void)context;
    __asm__ volatile("mrs %0, cntfrq_el0" : "=r"(value));
    return value;
}
static uint64_t timer_read_counter(void *context)
{
    uint64_t value;
    (void)context;
    __asm__ volatile("mrs %0, cntpct_el0" : "=r"(value));
    return value;
}
static uint32_t timer_read_control(void *context)
{
    uint64_t value;
    (void)context;
    __asm__ volatile("mrs %0, cntp_ctl_el0" : "=r"(value));
    return (uint32_t)value;
}
static void timer_write_tval(void *context, int32_t ticks)
{
    (void)context;
    __asm__ volatile("msr cntp_tval_el0, %0" :: "r"((uint64_t)(int64_t)ticks) : "memory");
}
static void timer_write_control(void *context, uint32_t value)
{
    (void)context;
    __asm__ volatile("msr cntp_ctl_el0, %0" :: "r"((uint64_t)value) : "memory");
}
static void platform_isb(void *context)
{
    (void)context;
    __asm__ volatile("isb" ::: "memory");
}
static void cpu_write_sre(void *context, uint64_t value)
{
    (void)context;
    __asm__ volatile("msr ICC_SRE_EL1, %0\n\tisb" :: "r"(value) : "memory");
}
static void cpu_write_pmr(void *context, uint64_t value)
{
    (void)context;
    __asm__ volatile("msr ICC_PMR_EL1, %0\n\tisb" :: "r"(value) : "memory");
}
static void cpu_write_bpr1(void *context, uint64_t value)
{
    (void)context;
    __asm__ volatile("msr ICC_BPR1_EL1, %0\n\tisb" :: "r"(value) : "memory");
}
static void cpu_write_igrpen1(void *context, uint64_t value)
{
    (void)context;
    __asm__ volatile("msr ICC_IGRPEN1_EL1, %0\n\tisb" :: "r"(value) : "memory");
}
static uint32_t cpu_read_iar1(void *context)
{
    uint64_t value;
    (void)context;
    __asm__ volatile("mrs %0, ICC_IAR1_EL1" : "=r"(value));
    if ((value & 0x00ffffffu) == PHASE105_TIMER_PPI) {
        ++timer_irq_count;
        if (timer_irq_count == 1u) uart_puts("NUSANTARA_PHASE105_TIMER_IRQ_SEEN\\r\\n");
    }
    return (uint32_t)value;
}
static void cpu_write_eoir1(void *context, uint32_t token)
{
    (void)context;
    __asm__ volatile("msr ICC_EOIR1_EL1, %0\n\tisb" :: "r"((uint64_t)token) : "memory");
}
static void task_selected(void *context, const nusantara_os_task_t *task)
{
    (void)context;
    (void)task;
    ++preemption_count;
}
static void task_returned(void)
{
    phase105_fail("task unexpectedly returned");
}
static void phase105_report_success(void)
{
    uart_puts("NUSANTARA_PHASE105_PREEMPTION_OK\r\n");
    phase105_halt();
}
static void task_a(void *argument)
{
    (void)argument;
    uart_puts("NUSANTARA_PHASE105_TASK_A_START\\r\\n");
    for (;;) {
        ++task_a_progress;
        if (task_a_progress >= PHASE105_PROGRESS_TARGET &&
            task_b_progress >= PHASE105_PROGRESS_TARGET &&
            preemption_count >= 6u) phase105_report_success();
    }
}
static void task_b(void *argument)
{
    (void)argument;
    uart_puts("NUSANTARA_PHASE105_TASK_B_START\\r\\n");
    for (;;) {
        ++task_b_progress;
        if (task_a_progress >= PHASE105_PROGRESS_TARGET &&
            task_b_progress >= PHASE105_PROGRESS_TARGET &&
            preemption_count >= 6u) phase105_report_success();
    }
}

void nusantara_phase105_main(void)
{
    const nusantara_gicv3_mmio_t mmio = {
        0, mmio_read32, mmio_write32, mmio_read64, mmio_write64, platform_barrier
    };
    const nusantara_arm64_timer_io_t timer_io = {
        0, timer_read_frequency, timer_read_counter, timer_read_control,
        timer_write_tval, timer_write_control, platform_isb
    };
    nusantara_arm64_exception_frame_t *frame_a = 0;
    nusantara_arm64_exception_frame_t *frame_b = 0;
    nusantara_os_task_t *first_task = 0;
    uint64_t task_a_id = 0u;
    uint64_t task_b_id = 0u;

    uart_puts("NUSANTARA_PHASE105_BOOT\r\n");
    if (!nusantara_arm64_install_exception_vectors())
        phase105_fail("cannot install VBAR_EL1");
    if (nusantara_gicv3_distributor_init(&gic, &mmio, PHASE105_GICD_BASE, 100000u) != NUSANTARA_GICV3_OK)
        phase105_fail("GICD initialization failed");
    if (nusantara_gicv3_redistributor_wake(&gic, PHASE105_GICR_BASE) != NUSANTARA_GICV3_OK)
        phase105_fail("GICR wake failed");

    cpu_interface.context = 0;
    cpu_interface.write_sre_el1 = cpu_write_sre;
    cpu_interface.write_pmr_el1 = cpu_write_pmr;
    cpu_interface.write_bpr1_el1 = cpu_write_bpr1;
    cpu_interface.write_igrpen1_el1 = cpu_write_igrpen1;
    cpu_interface.read_iar1_el1 = cpu_read_iar1;
    cpu_interface.write_eoir1_el1 = cpu_write_eoir1;
    cpu_interface.isb = platform_isb;
    if (nusantara_gicv3_cpu_interface_enable(&gic, &cpu_interface) != NUSANTARA_GICV3_OK)
        phase105_fail("GIC CPU interface initialization failed");
    if (nusantara_gicv3_enable_ppi(&gic, PHASE105_TIMER_PPI) != NUSANTARA_GICV3_OK)
        phase105_fail("physical timer PPI enable failed");
    if (nusantara_arm64_timer_init(&timer, &timer_io) != NUSANTARA_ARM64_TIMER_OK)
        phase105_fail("CNTFRQ_EL0 unavailable");

    nusantara_os_scheduler_init(&scheduler);
    if (!nusantara_arm64_exception_context_prepare(
            &frame_a, task_a_stack, sizeof(task_a_stack),
            (uintptr_t)task_a, 0u, (uintptr_t)task_returned))
        phase105_fail("task A exception frame creation failed");
    if (!nusantara_arm64_exception_context_prepare(
            &frame_b, task_b_stack, sizeof(task_b_stack),
            (uintptr_t)task_b, 0u, (uintptr_t)task_returned))
        phase105_fail("task B exception frame creation failed");

    /*
     * Every brand-new task frame must enter with IRQ unmasked. Phase 104's
     * first-task trampoline does this for the boot-selected task only; this
     * harness also prepares the second READY task for later ERET dispatch.
     */
    frame_a->spsr_el1 &= ~(1ull << 7);
    frame_b->spsr_el1 &= ~(1ull << 7);

    if (nusantara_os_scheduler_add(&scheduler, (uintptr_t)frame_a, 0, 1u, &task_a_id) != NUSANTARA_OS_SCHEDULER_OK)
        phase105_fail("task A scheduler registration failed");
    if (nusantara_os_scheduler_add(&scheduler, (uintptr_t)frame_b, 0, 1u, &task_b_id) != NUSANTARA_OS_SCHEDULER_OK)
        phase105_fail("task B scheduler registration failed");
    if (task_a_id == task_b_id ||
        nusantara_os_scheduler_schedule(&scheduler, &first_task) != NUSANTARA_OS_SCHEDULER_OK ||
        first_task == 0)
        phase105_fail("initial scheduler selection failed");

    if (nusantara_arm64_irq_runtime_init(
            &irq_runtime, &timer, &cpu_interface, &scheduler,
            PHASE105_TIMER_PPI, PHASE105_TIMER_INTERVAL_MS,
            0, task_selected, 0) != NUSANTARA_ARM64_IRQ_RUNTIME_OK)
        phase105_fail("IRQ runtime initialization failed");
    if (nusantara_arm64_irq_scheduler_init(&irq_scheduler, &irq_runtime, &scheduler) !=
        NUSANTARA_ARM64_IRQ_SCHEDULER_OK)
        phase105_fail("IRQ scheduler integration failed");
    if (nusantara_arm64_timer_arm_ms(&timer, PHASE105_TIMER_INTERVAL_MS) != NUSANTARA_ARM64_TIMER_OK)
        phase105_fail("cannot arm CNTP timer");

    uart_puts("NUSANTARA_PHASE105_TIMER_ARMED\r\n");
    (void)nusantara_arm64_irq_scheduler_start_first_task(&irq_scheduler);
    phase105_fail("first-task ERET unexpectedly returned");
}
