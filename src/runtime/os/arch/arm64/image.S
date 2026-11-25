/* SPDX-License-Identifier: Apache-2.0
 * Phase 92: minimal AArch64 Linux-Image-compatible entry for QEMU virt.
 * This is NUSANTARA OS code; Linux is not linked or executed.
 */
.section .text.boot.header, "ax"
.balign 8
.global _image_start
_image_start:
    b       _start
    .word   0
    .quad   0x00080000
    .quad   _image_end - _image_start
    .quad   0
    .quad   0
    .quad   0
    .quad   0
    .word   0x644d5241
    .word   0

    /* AArch64 Image entry code begins at byte offset 0x800. */
    .org    0x800
.global _start
.type _start, %function
_start:
    msr     daifset, #0xf
    mrs     x20, CurrentEL
    cmp     x20, #0x8
    b.eq    arm64_enter_el1
    cmp     x20, #0x4
    b.eq    arm64_el1_entry
    b       arm64_halt

/* QEMU virt normally enters at EL2. Configure AArch64 EL1h and ERET. */
arm64_enter_el1:
    mov     x1, #0x80000000
    msr     hcr_el2, x1
    mov     x1, #0x3c5
    msr     spsr_el2, x1
    adr     x1, arm64_el1_entry
    msr     elr_el2, x1
    isb
    eret

arm64_el1_entry:
    msr     daifset, #0xf
    mov     x19, x0
    adrp    x1, arm64_stack_top
    add     x1, x1, :lo12:arm64_stack_top
    mov     sp, x1

    /* PL011: disable, set 115200 baud/8N1, then enable UART and TX. */
    movz    x2, #0x0900, lsl #16
    mov     w3, wzr
    str     w3, [x2, #0x30]
    mov     w3, #13
    str     w3, [x2, #0x24]
    mov     w3, #1
    str     w3, [x2, #0x28]
    mov     w3, #0x70
    str     w3, [x2, #0x2c]
    mov     w3, #0x101
    str     w3, [x2, #0x30]

    cbz     x19, arm64_boot_fail
    tst     x19, #7
    b.ne    arm64_boot_fail
    adrp    x0, arm64_boot_ok_message
    add     x0, x0, :lo12:arm64_boot_ok_message
    b       arm64_uart_puts

arm64_boot_fail:
    adrp    x0, arm64_boot_fail_message
    add     x0, x0, :lo12:arm64_boot_fail_message
arm64_uart_puts:
    ldrb    w1, [x0], #1
    cbz     w1, arm64_boot_halt
arm64_uart_wait_tx:
    ldr     w3, [x2, #0x18]
    tbnz    w3, #5, arm64_uart_wait_tx
    str     w1, [x2]
    b       arm64_uart_puts

arm64_boot_halt:
    ldr     w3, [x2, #0x18]
    tbnz    w3, #3, arm64_boot_halt
    dsb     sy
arm64_halt:
    wfe
    b       arm64_halt
.size _start, . - _start

.section .rodata, "a"
.balign 4
arm64_boot_ok_message:
    .asciz  "NUSANTARA_ARM64_BOOT_OK\r\n"
arm64_boot_fail_message:
    .asciz  "NUSANTARA_ARM64_BOOT_FAIL\r\n"

.section .bss.stack, "aw", %nobits
.balign 16
.global arm64_stack_bottom
arm64_stack_bottom:
    .skip   16384
.global arm64_stack_top
arm64_stack_top:
