/* SPDX-License-Identifier: Apache-2.0
 * Phase 108 EL0 payload: invoke WRITE then EXIT using SVC #0.
 */
.section .text.user, "ax"
.balign 4
.global phase108_user_entry
.type phase108_user_entry, %function
phase108_user_entry:
    adr x0, phase108_user_message
    mov x1, #phase108_user_message_end - phase108_user_message
    mov x8, #1
    svc #0
    cmp x0, x1
    b.ne phase108_user_failed
    mov x0, #0
    mov x8, #2
    svc #0
phase108_user_failed:
    mov x0, #1
    mov x8, #2
    svc #0
1:
    wfe
    b 1b
.size phase108_user_entry, . - phase108_user_entry

.section .rodata.user, "a"
.balign 4
.global phase108_user_message
.global phase108_user_message_end
phase108_user_message:
    .asciz "NUSANTARA_PHASE108_EL0_SVC_WRITE_OK\r\n"
phase108_user_message_end:
.section .note.GNU-stack,"",%progbits
