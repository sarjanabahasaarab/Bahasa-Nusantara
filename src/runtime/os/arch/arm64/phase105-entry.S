/* SPDX-License-Identifier: Apache-2.0
 * Phase 105: QEMU virt entry, based on the proven Phase 92 Image contract.
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
    .org    0x800
.global _start
.type _start, %function
_start:
    msr     daifset, #0xf
    /* Early PL011 marker distinguishes image-entry failures from EL handoff. */
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
    mov     w3, #'P'
1:
    ldr     w4, [x2, #0x18]
    tbnz    w4, #5, 1b
    str     w3, [x2]
    mov     x19, x0
    mrs     x20, CurrentEL
    cmp     x20, #0x8
    b.eq    phase105_enter_el1
    cmp     x20, #0x4
    b.eq    phase105_el1_entry
    b       phase105_halt

/* Same EL2 -> EL1h transition as Phase 92, plus physical timer access. */
phase105_enter_el1:
    mov     x1, #0x80000000
    msr     hcr_el2, x1
    mov     x1, #3
    msr     cnthctl_el2, x1
    msr     cntvoff_el2, xzr
    mov     x1, #1
    msr     ICC_SRE_EL2, x1
    mov     x1, #0x3c5
    msr     spsr_el2, x1
    adr     x1, phase105_el1_entry
    msr     elr_el2, x1
    isb
    eret

phase105_el1_entry:
    msr     daifset, #0xf
    adrp    x1, phase105_boot_stack_top
    add     x1, x1, :lo12:phase105_boot_stack_top
    mov     sp, x1

    /* Clear BSS before C uses static scheduler, GIC and task-stack storage. */
    adrp    x1, __bss_start
    add     x1, x1, :lo12:__bss_start
    adrp    x2, __bss_end
    add     x2, x2, :lo12:__bss_end
2:
    cmp     x1, x2
    b.hs    3f
    stp     xzr, xzr, [x1], #16
    b       2b
3:
    movz    x2, #0x0900, lsl #16
    mov     w3, #'E'
4:
    ldr     w4, [x2, #0x18]
    tbnz    w4, #5, 4b
    str     w3, [x2]
    cbz     x19, phase105_boot_fail
    tst     x19, #7
    b.ne    phase105_boot_fail
    adrp    x0, phase105_entry_ok_message
    add     x0, x0, :lo12:phase105_entry_ok_message
    bl      phase105_uart_puts
    mov     w3, #'C'
8:
    ldr     w4, [x2, #0x18]
    tbnz    w4, #5, 8b
    str     w3, [x2]
    bl      nusantara_phase105_main
    mov     w3, #'R'
9:
    ldr     w4, [x2, #0x18]
    tbnz    w4, #5, 9b
    str     w3, [x2]
    b       phase105_halt

phase105_boot_fail:
    adrp    x0, phase105_boot_fail_message
    add     x0, x0, :lo12:phase105_boot_fail_message
    bl      phase105_uart_puts
phase105_halt:
    msr     daifset, #0xf
5:
    wfe
    b       5b

/* x0 = NUL-terminated message; clobbers x0-x1, preserves x2 UART base. */
phase105_uart_puts:
    ldrb    w1, [x0], #1
    cbz     w1, 6f
7:
    ldr     w3, [x2, #0x18]
    tbnz    w3, #5, 7b
    str     w1, [x2]
    b       phase105_uart_puts
6:
    ret
.size _start, . - _start

.section .rodata, "a"
.balign 4
phase105_entry_ok_message:
    .asciz  "NUSANTARA_PHASE105_ENTRY_OK\r\n"
phase105_boot_fail_message:
    .asciz  "NUSANTARA_PHASE105_ENTRY_FAIL\r\n"

.section .bss.stack, "aw", %nobits
.balign 16
phase105_boot_stack_bottom:
    .skip   16384
.global phase105_boot_stack_top
phase105_boot_stack_top:
.section .note.GNU-stack,"",%progbits
