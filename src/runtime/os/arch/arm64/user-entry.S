/* SPDX-License-Identifier: Apache-2.0
 * Phase 106: enter AArch64 EL0t from EL1 using an exception return.
 */
.section .text.user_entry, "ax"
.balign 4
.global nusantara_arm64_enter_user
.type nusantara_arm64_enter_user, %function
nusantara_arm64_enter_user:
    cbz x0, 1f
    cbz x1, 1f
    tst x1, #0xf
    b.ne 1f
    msr daifset, #0xf
    msr sp_el0, x1
    msr elr_el1, x0
    msr spsr_el1, xzr
    mov x0, x2
    isb
    eret
1:
    msr daifset, #0xf
2:
    wfe
    b 2b
.size nusantara_arm64_enter_user, . - nusantara_arm64_enter_user
.section .note.GNU-stack,"",%progbits
