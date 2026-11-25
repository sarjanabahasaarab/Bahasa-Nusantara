/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 cooperative context switch (Phase 102).
 *
 * AAPCS64 callee-saved state: x19-x29, x30 and SP. The 96-byte frame
 * preserves 16-byte stack alignment. Caller-saved registers are governed
 * by the normal C ABI; asynchronous preemption requires the exception frame.
 */
.section .text.nusantara_context_switch, "ax"
.balign 4
.global nusantara_arm64_context_switch_asm
.type nusantara_arm64_context_switch_asm, %function
nusantara_arm64_context_switch_asm:
    stp     x19, x20, [sp, #-96]!
    stp     x21, x22, [sp, #16]
    stp     x23, x24, [sp, #32]
    stp     x25, x26, [sp, #48]
    stp     x27, x28, [sp, #64]
    stp     x29, x30, [sp, #80]
    cbz     x0, 1f
    mov     x2, sp
    str     x2, [x0]
1:
    mov     sp, x1
    ldp     x19, x20, [sp, #0]
    ldp     x21, x22, [sp, #16]
    ldp     x23, x24, [sp, #32]
    ldp     x25, x26, [sp, #48]
    ldp     x27, x28, [sp, #64]
    ldp     x29, x30, [sp, #80]
    add     sp, sp, #96
    ret
.size nusantara_arm64_context_switch_asm, . - nusantara_arm64_context_switch_asm

/* First-run frame contract: x19=argument, x20=entry, x21=exit callback. */
.global nusantara_arm64_task_trampoline
.type nusantara_arm64_task_trampoline, %function
nusantara_arm64_task_trampoline:
    mov     x0, x19
    blr     x20
    blr     x21
1:
    wfe
    b       1b
.size nusantara_arm64_task_trampoline, . - nusantara_arm64_task_trampoline
