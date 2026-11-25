/* SPDX-License-Identifier: Apache-2.0
 * Phase 105: standalone QEMU virt image entry for real GICv3 timer preemption.
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
    /* Emit a byte before touching EL2 system registers for boot diagnosis. */
    movz    x9, #0x0900, lsl #16
    mov     w10, wzr
    str     w10, [x9, #0x30]
    mov     w10, #13
    str     w10, [x9, #0x24]
    mov     w10, #1
    str     w10, [x9, #0x28]
    mov     w10, #0x70
    str     w10, [x9, #0x2c]
    mov     w10, #0x101
    str     w10, [x9, #0x30]
    mov     w10, #'E'
1:
    ldr     w11, [x9, #0x18]
    tbnz    w11, #5, 1b
    str     w10, [x9]
    mrs     x20, CurrentEL
    cmp     x20, #0x8
    b.eq    phase105_enter_el1
    cmp     x20, #0x4
    b.eq    phase105_el1_entry
    b       phase105_halt
phase105_enter_el1:
    mov     x1, #0x80000000
    msr     hcr_el2, x1
    mov     x1, #3
    msr     cnthctl_el2, x1
    msr     cntvoff_el2, xzr
    mov     x1, #1
    msr     ICC_SRE_EL2, x1
    isb
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
    movz    x3, #0x0900, lsl #16
    mov     w4, wzr
    str     w4, [x3, #0x30]
    mov     w4, #13
    str     w4, [x3, #0x24]
    mov     w4, #1
    str     w4, [x3, #0x28]
    mov     w4, #0x70
    str     w4, [x3, #0x2c]
    mov     w4, #0x101
    str     w4, [x3, #0x30]
    bl      nusantara_phase105_main
4:
    msr     daifset, #0xf
    wfe
    b       4b
phase105_halt:
    msr     daifset, #0xf
5:
    wfe
    b       5b
.size _start, . - _start
.section .bss.stack, "aw", %nobits
.balign 16
phase105_boot_stack_bottom:
    .skip   16384
.global phase105_boot_stack_top
phase105_boot_stack_top:
.section .note.GNU-stack,"",%progbits
