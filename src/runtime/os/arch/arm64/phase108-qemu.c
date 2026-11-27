/* SPDX-License-Identifier: Apache-2.0
 * Phase 108: execute a real AArch64 EL0 payload and return through SVC.
 */
#include <stddef.h>
#include <stdint.h>
#include "exception.h"
#include "exception-router.h"
#include "user-syscall.h"

#define PHASE108_UART_BASE ((uintptr_t)0x09000000u)
#define PHASE108_UART_FR   0x18u
#define PHASE108_UART_DR   0x00u
#define PHASE108_MAX_WRITE 128u

extern void phase108_user_entry(void);
extern const char phase108_user_message[];
extern const char phase108_user_message_end[];

static _Alignas(16) uint8_t kernel_stack[8192];
static _Alignas(16) uint8_t user_stack[4096];
static nusantara_arm64_exception_router_t exception_router;
static volatile uint64_t write_seen;
static volatile uint64_t exit_seen;

static void uart_putc(char ch)
{
    volatile uint32_t *fr = (volatile uint32_t *)(PHASE108_UART_BASE + PHASE108_UART_FR);
    volatile uint32_t *dr = (volatile uint32_t *)(PHASE108_UART_BASE + PHASE108_UART_DR);
    while ((*fr & (1u << 5)) != 0u) { }
    *dr = (uint32_t)(uint8_t)ch;
}
static void uart_puts(const char *s)
{
    while (*s != '\0') uart_putc(*s++);
}
static void stop_forever(void)
{
    __asm__ volatile("msr daifset, #0xf" ::: "memory");
    for (;;) __asm__ volatile("wfe");
}
static int validate_user_range(void *context, uintptr_t address, size_t length)
{
    uintptr_t start = (uintptr_t)context;
    uintptr_t end = (uintptr_t)phase108_user_message_end;
    if (address < start || address > end || length > PHASE108_MAX_WRITE)
        return 0;
    return length <= (size_t)(end - address);
}
static int64_t write_user(void *context, uintptr_t address, size_t length)
{
    const char *p = (const char *)address;
    size_t i;
    (void)context;
    for (i = 0u; i < length; ++i) uart_putc(p[i]);
    ++write_seen;
    return (int64_t)length;
}
static int64_t exit_user(void *context, int status)
{
    (void)context;
    ++exit_seen;
    if (status == 0 && write_seen == 1u) {
        uart_puts("NUSANTARA_PHASE108_EL0_EXIT_OK\r\n");
    } else {
        uart_puts("NUSANTARA_PHASE108_EL0_EXIT_FAIL\r\n");
    }
    stop_forever();
    return status;
}
static int64_t yield_user(void *context)
{
    (void)context;
    return 0;
}
static nusantara_arm64_exception_frame_t *unexpected_irq(
    void *context, nusantara_arm64_exception_frame_t *frame)
{
    (void)context;
    (void)frame;
    uart_puts("NUSANTARA_PHASE108_UNEXPECTED_IRQ\r\n");
    return 0;
}

void phase108_main(uintptr_t dtb)
{
    const nusantara_arm64_user_syscall_ops_t syscall_ops = {
        (void *)phase108_user_message,
        validate_user_range,
        write_user,
        exit_user,
        yield_user,
        0,
        0
    };
    nusantara_arm64_exception_frame_t *initial = 0;
    (void)dtb;
    uart_puts("NUSANTARA_PHASE108_BOOT\r\n");
    if (!nusantara_arm64_install_exception_vectors()) {
        uart_puts("NUSANTARA_PHASE108_FAIL_VBAR\r\n");
        stop_forever();
    }
    if (!nusantara_arm64_user_syscall_init(&syscall_ops)) {
        uart_puts("NUSANTARA_PHASE108_FAIL_SYSCALL_INIT\r\n");
        stop_forever();
    }
    if (!nusantara_arm64_exception_router_init(
            &exception_router, unexpected_irq, 0,
            nusantara_arm64_user_syscall_handle_exception, (void *)&syscall_ops)) {
        uart_puts("NUSANTARA_PHASE108_FAIL_ROUTER_INIT\r\n");
        stop_forever();
    }
    if (!nusantara_arm64_exception_user_context_prepare(
            &initial, kernel_stack, sizeof(kernel_stack),
            (uintptr_t)phase108_user_entry,
            (uintptr_t)(user_stack + sizeof(user_stack)),
            0u, (uintptr_t)phase108_user_entry)) {
        uart_puts("NUSANTARA_PHASE108_FAIL_USER_FRAME\r\n");
        stop_forever();
    }
    uart_puts("NUSANTARA_PHASE108_EL0_ENTER\r\n");
    nusantara_arm64_exception_start_first_task((uintptr_t)initial);
    uart_puts("NUSANTARA_PHASE108_FAIL_ERET_RETURNED\r\n");
    stop_forever();
}
