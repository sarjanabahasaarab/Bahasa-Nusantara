/* SPDX-License-Identifier: Apache-2.0 */
.section .usercode, "ax"
.balign 4096
.global phase113_user_entry
.type phase113_user_entry, %function
phase113_user_entry:
    /* Same VA, distinct backing frame in each process. */
    movz x9, #0x1000, lsl #16
    add x9, x9, #0x1000
    str x0, [x9]
    svc #0
    /* Mapped only in process A: process B must take a translation fault. */
    movz x9, #0x1000, lsl #16
    add x9, x9, #0x3000
    ldr x10, [x9]
1:  wfe
    b 1b
.size phase113_user_entry, . - phase113_user_entry
.section .note.GNU-stack,"",%progbits
