/* SPDX-License-Identifier: Apache-2.0
 * Phase 105: QEMU virt entry; retain the proven Phase 92 EL transition.
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
1:
    cmp     x1, x2
    b.hs    2f
    stp     xzr, xzr, [x1], #16
    b       1b
2:
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
3:
    msr     daifset, #0xf
    wfe
    b       3b
phase105_halt:
    msr     daifset, #0xf
4:
    wfe
    b       4b
.size _start, . - _start
.section .bss.stack, "aw", %nobits
.balign 16
phase105_boot_stack_bottom:
    .skip   16384
.global phase105_boot_stack_top
phase105_boot_stack_top:
.section .note.GNU-stack,"",%progbits
