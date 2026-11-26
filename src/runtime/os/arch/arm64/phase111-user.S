/* SPDX-License-Identifier: Apache-2.0 */
.section .usercode, "ax"
.balign 4
.global phase111_user_entry
.type phase111_user_entry, %function
phase111_user_entry:
    /* Attempt a store to the EL1-only identity-mapped kernel image. */
    movz x0, #0x4008, lsl #16
    mov x1, #0x5a
    str x1, [x0]
1:
    wfe
    b 1b
.size phase111_user_entry, . - phase111_user_entry
.section .note.GNU-stack,"",%progbits
