/* SPDX-License-Identifier: Apache-2.0
 * Phase 111: QEMU proof of EL0 write denial on an EL1-only kernel mapping.
 */
#include <stdint.h>
#include "mmu-control.h"
#include "exception.h"

#define UART_BASE UINT64_C(0x09000000)
#define UART_FR   UINT64_C(0x18)
#define UART_DR   UINT64_C(0x00)
#define DESC_VALID UINT64_C(1)
#define DESC_TABLE UINT64_C(2)
#define DESC_BLOCK UINT64_C(1)
#define DESC_PAGE  UINT64_C(3)
#define DESC_AF (UINT64_C(1) << 10)
#define DESC_SH_INNER (UINT64_C(3) << 8)
#define DESC_AP_EL0_RW (UINT64_C(1) << 6)
#define DESC_ATTR_DEVICE (UINT64_C(1) << 2)
#define DESC_PXN (UINT64_C(1) << 53)
#define DESC_UXN (UINT64_C(1) << 54)
#define DESC_ADDR_MASK UINT64_C(0x0000fffffffff000)
#define KERNEL_BASE UINT64_C(0x40000000)
#define USER_ALIAS  UINT64_C(0x50000000)
#define USER_CODE_PA UINT64_C(0x40200000)
#define USER_STACK_PA UINT64_C(0x40201000)
#define EXPECTED_KERNEL_VA UINT64_C(0x40080000)

extern void phase111_user_entry(void);
extern char __bss_start[], __bss_end[];
extern char phase111_user_stack_end[];

static _Alignas(4096) uint64_t l0[512];
static _Alignas(4096) uint64_t l1_low[512];
static _Alignas(4096) uint64_t l1_ram[512];
static _Alignas(4096) uint64_t l2_low[512];
static _Alignas(4096) uint64_t l2_ram[512];
static _Alignas(4096) uint64_t l3_user[512];
static _Alignas(4096) uint8_t kernel_stack[8192];

static void uart_putc(char c)
{
    volatile uint32_t *fr = (volatile uint32_t *)(uintptr_t)(UART_BASE + UART_FR);
    volatile uint32_t *dr = (volatile uint32_t *)(uintptr_t)(UART_BASE + UART_DR);
    while ((*fr & (1u << 5)) != 0u) { }
    *dr = (uint32_t)(uint8_t)c;
}
static void uart_puts(const char *s)
{
    while (*s != '\0') uart_putc(*s++);
}
static void halt(void)
{
    __asm__ volatile("msr daifset, #0xf" ::: "memory");
    for (;;) __asm__ volatile("wfe");
}
static uint64_t table_desc(const void *p)
{
    return ((uint64_t)(uintptr_t)p & DESC_ADDR_MASK) | DESC_VALID | DESC_TABLE;
}
static void build_tables(void)
{
    unsigned i;
    /* TTBR0 L0 -> L1; identity map the low UART window and RAM window. */
    l0[0] = table_desc(l1_low);
    l1_low[0] = table_desc(l2_low);
    l2_low[72] = (UINT64_C(0x09000000) & UINT64_C(0x0000ffffffe00000)) |
        DESC_VALID | DESC_BLOCK | DESC_AF | DESC_SH_INNER | DESC_ATTR_DEVICE;
    l1_low[1] = table_desc(l2_ram);
    /* 0x40000000..0x401fffff: EL1 RW/executable, never EL0. */
    l2_ram[0] = (KERNEL_BASE & UINT64_C(0x0000ffffffe00000)) |
        DESC_VALID | DESC_BLOCK | DESC_AF | DESC_SH_INNER | DESC_UXN;
    /* 0x40200000: user code; 0x40201000: user stack. */
    l2_ram[1] = table_desc(l3_user);
    l3_user[0] = (USER_CODE_PA & DESC_ADDR_MASK) | DESC_PAGE | DESC_AF |
        DESC_SH_INNER | DESC_AP_EL0_RW | DESC_PXN;
    l3_user[1] = (USER_STACK_PA & DESC_ADDR_MASK) | DESC_PAGE | DESC_AF |
        DESC_SH_INNER | DESC_AP_EL0_RW | DESC_PXN | DESC_UXN;
    /* 0x50000000 alias maps the same two user-owned physical pages. */
    l2_ram[128] = table_desc(l3_user);
    for (i = 2u; i < 512u; ++i) {
        (void)i;
    }
}
static int enable_mmu(void)
{
    build_tables();
    return nusantara_arm64_mmu_enable_el1((uint64_t)(uintptr_t)l0);
}
static void enter_user(void)
{
    const uintptr_t user_sp = (uintptr_t)(USER_ALIAS + UINT64_C(0x2000));
    const uintptr_t user_pc = (uintptr_t)USER_ALIAS;
    __asm__ volatile(
        "msr sp_el0, %0\n"
        "msr elr_el1, %1\n"
        "msr spsr_el1, xzr\n"
        "isb\n"
        "eret\n"
        :: "r"(user_sp), "r"(user_pc) : "memory");
    __builtin_unreachable();
}
void phase111_main(void)
{
    (void)kernel_stack;
    uart_puts("NUSANTARA_PHASE111_BOOT\r\n");
    if (!nusantara_arm64_install_exception_vectors()) {
        uart_puts("NUSANTARA_PHASE111_FAIL_VBAR\r\n");
        halt();
    }
    if (!enable_mmu()) {
        uart_puts("NUSANTARA_PHASE111_FAIL_MMU_ENABLE\r\n");
        halt();
    }
    uart_puts("NUSANTARA_PHASE111_MMU_ENABLED\r\n");
    uart_puts("NUSANTARA_PHASE111_EL0_ENTER\r\n");
    enter_user();
}
nusantara_arm64_exception_frame_t *nusantara_arm64_exception_dispatch(
    nusantara_arm64_exception_frame_t *frame)
{
    nusantara_arm64_mmu_fault_t fault;
    if (frame != 0 && frame->vector == 8u &&
        nusantara_arm64_mmu_decode_fault(frame->esr_el1, &fault) &&
        fault.exception_class == 0x24u &&
        fault.fault_status == 0x0eu &&
        fault.write == 1u &&
        frame->far_el1 == EXPECTED_KERNEL_VA) {
        uart_puts("NUSANTARA_PHASE111_KERNEL_ACCESS_BLOCKED\r\n");
        uart_puts("NUSANTARA_PHASE111_PERMISSION_FAULT_OK\r\n");
        uart_puts("NUSANTARA_PHASE111_PASS\r\n");
        halt();
    }
    uart_puts("NUSANTARA_PHASE111_UNEXPECTED_EXCEPTION\r\n");
    halt();
    return 0;
}
