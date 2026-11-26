/* SPDX-License-Identifier: Apache-2.0 */
.section .text.boot.header, "ax"
.balign 8
.global _image_start
_image_start:
    b _start
    .word 0
    .quad 0x00080000
    .quad _image_end - _image_start
    .quad 0
    .quad 0
    .quad 0
    .quad 0
    .word 0x644d5241
    .word 0
    .org 0x800
.global _start
.type _start, %function
_start:
    msr daifset, #0xf
    mov x19, x0
    mrs x20, CurrentEL
    cmp x20, #8
    b.eq enter_el1
    cmp x20, #4
    b.eq el1_entry
    b halt_entry
enter_el1:
    mov x1, #0x80000000
    msr hcr_el2, x1
    mov x1, #3
    msr cnthctl_el2, x1
    msr cntvoff_el2, xzr
    mov x1, #1
    msr ICC_SRE_EL2, x1
    mov x1, #0x3c5
    msr spsr_el2, x1
    adr x1, el1_entry
    msr elr_el2, x1
    isb
    eret
el1_entry:
    msr daifset, #0xf
    adrp x1, phase113_boot_stack_top
    add x1, x1, :lo12:phase113_boot_stack_top
    mov sp, x1
    movz x2, #0x0900, lsl #16
    mov w3, wzr
    str w3, [x2, #0x30]
    mov w3, #13
    str w3, [x2, #0x24]
    mov w3, #1
    str w3, [x2, #0x28]
    mov w3, #0x70
    str w3, [x2, #0x2c]
    mov w3, #0x101
    str w3, [x2, #0x30]
    adrp x1, __bss_start
    add x1, x1, :lo12:__bss_start
    adrp x2, __bss_end
    add x2, x2, :lo12:__bss_end
1:  cmp x1, x2
    b.hs 2f
    stp xzr, xzr, [x1], #16
    b 1b
2:  mov x0, x19
    bl phase113_main
    b halt_entry
halt_entry:
    msr daifset, #0xf
3:  wfe
    b 3b
.size _start, . - _start
.section .bss.stack, "aw", %nobits
.balign 16
    .skip 16384
.global phase113_boot_stack_top
phase113_boot_stack_top:
.section .note.GNU-stack,"",%progbits
