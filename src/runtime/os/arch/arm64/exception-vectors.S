/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 exception frame return integration (Phase 103).
 * The selected frame is 288 bytes followed by the x16/x17 scratch pair.
 */
.section .text.exception_vectors, "ax"
.balign 2048
.global arm64_exception_vectors
.type arm64_exception_vectors, %function
arm64_exception_vectors:
.macro ARM64_VECTOR_SLOT number
    b arm64_vector_stub_\number
    .space 124
.endm
ARM64_VECTOR_SLOT 0
ARM64_VECTOR_SLOT 1
ARM64_VECTOR_SLOT 2
ARM64_VECTOR_SLOT 3
ARM64_VECTOR_SLOT 4
ARM64_VECTOR_SLOT 5
ARM64_VECTOR_SLOT 6
ARM64_VECTOR_SLOT 7
ARM64_VECTOR_SLOT 8
ARM64_VECTOR_SLOT 9
ARM64_VECTOR_SLOT 10
ARM64_VECTOR_SLOT 11
ARM64_VECTOR_SLOT 12
ARM64_VECTOR_SLOT 13
ARM64_VECTOR_SLOT 14
ARM64_VECTOR_SLOT 15
.size arm64_exception_vectors, . - arm64_exception_vectors

.global nusantara_arm64_install_exception_vectors
.type nusantara_arm64_install_exception_vectors, %function
nusantara_arm64_install_exception_vectors:
    mrs x0, CurrentEL
    cmp x0, #4
    b.ne 1f
    adrp x1, arm64_exception_vectors
    add x1, x1, :lo12:arm64_exception_vectors
    msr VBAR_EL1, x1
    isb
    mov w0, #1
    ret
1:
    mov w0, wzr
    ret
.size nusantara_arm64_install_exception_vectors, . - nusantara_arm64_install_exception_vectors

.macro ARM64_VECTOR_SP0_STUB number
.global arm64_vector_stub_\number
.type arm64_vector_stub_\number, %function
arm64_vector_stub_\number:
    b arm64_exception_sp0_fail_stop
.size arm64_vector_stub_\number, . - arm64_vector_stub_\number
.endm
.macro ARM64_VECTOR_STUB number
.global arm64_vector_stub_\number
.type arm64_vector_stub_\number, %function
arm64_vector_stub_\number:
    sub sp, sp, #16
    stp x16, x17, [sp]
    mov x16, #\number
    b arm64_exception_common
.size arm64_vector_stub_\number, . - arm64_vector_stub_\number
.endm
ARM64_VECTOR_SP0_STUB 0
ARM64_VECTOR_SP0_STUB 1
ARM64_VECTOR_SP0_STUB 2
ARM64_VECTOR_SP0_STUB 3
ARM64_VECTOR_STUB 4
ARM64_VECTOR_STUB 5
ARM64_VECTOR_STUB 6
ARM64_VECTOR_STUB 7
ARM64_VECTOR_STUB 8
ARM64_VECTOR_STUB 9
ARM64_VECTOR_STUB 10
ARM64_VECTOR_STUB 11
ARM64_VECTOR_STUB 12
ARM64_VECTOR_STUB 13
ARM64_VECTOR_STUB 14
ARM64_VECTOR_STUB 15

.type arm64_exception_sp0_fail_stop, %function
arm64_exception_sp0_fail_stop:
    msr daifset, #0xf
2:
    wfe
    b 2b
.size arm64_exception_sp0_fail_stop, . - arm64_exception_sp0_fail_stop

.type arm64_exception_common, %function
arm64_exception_common:
    sub sp, sp, #288
    stp x0, x1, [sp, #0]
    stp x2, x3, [sp, #16]
    stp x4, x5, [sp, #32]
    stp x6, x7, [sp, #48]
    stp x8, x9, [sp, #64]
    stp x10, x11, [sp, #80]
    stp x12, x13, [sp, #96]
    stp x14, x15, [sp, #112]
    ldp x0, x1, [sp, #288]
    stp x0, x1, [sp, #128]
    stp x18, x19, [sp, #144]
    stp x20, x21, [sp, #160]
    stp x22, x23, [sp, #176]
    stp x24, x25, [sp, #192]
    stp x26, x27, [sp, #208]
    stp x28, x29, [sp, #224]
    str x30, [sp, #240]
    mrs x0, esr_el1
    str x0, [sp, #248]
    mrs x0, far_el1
    str x0, [sp, #256]
    mrs x0, elr_el1
    str x0, [sp, #264]
    mrs x0, spsr_el1
    str x0, [sp, #272]
    str x16, [sp, #280]
    mov x0, sp
    bl nusantara_arm64_exception_dispatch
    cbz x0, arm64_exception_sp0_fail_stop
    mov sp, x0
    ldr x0, [sp, #264]
    msr elr_el1, x0
    ldr x0, [sp, #272]
    msr spsr_el1, x0
    ldp x0, x1, [sp, #0]
    ldp x2, x3, [sp, #16]
    ldp x4, x5, [sp, #32]
    ldp x6, x7, [sp, #48]
    ldp x8, x9, [sp, #64]
    ldp x10, x11, [sp, #80]
    ldp x12, x13, [sp, #96]
    ldp x14, x15, [sp, #112]
    ldp x16, x17, [sp, #128]
    ldp x18, x19, [sp, #144]
    ldp x20, x21, [sp, #160]
    ldp x22, x23, [sp, #176]
    ldp x24, x25, [sp, #192]
    ldp x26, x27, [sp, #208]
    ldp x28, x29, [sp, #224]
    ldr x30, [sp, #240]
    add sp, sp, #288
    add sp, sp, #16
    eret
.size arm64_exception_common, . - arm64_exception_common

/* Weak fallback returns the incoming frame unchanged. */
.weak nusantara_arm64_exception_dispatch
.type nusantara_arm64_exception_dispatch, %function
nusantara_arm64_exception_dispatch:
    ret
.size nusantara_arm64_exception_dispatch, . - nusantara_arm64_exception_dispatch
