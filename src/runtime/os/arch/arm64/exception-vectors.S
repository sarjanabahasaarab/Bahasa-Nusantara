/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 exception vectors (Phase 94).
 *
 * Install arm64_exception_vectors at VBAR_EL1 only after the kernel has
 * established a valid EL1 stack. Every vector slot is exactly 128 bytes;
 * the complete vector table is 2 KiB aligned.
 */
.section .text.exception_vectors, "ax"
.balign 2048
.global arm64_exception_vectors
.type arm64_exception_vectors, %function
arm64_exception_vectors:

.macro ARM64_VECTOR_SLOT number
    b       arm64_vector_stub_\number
    .space  124
.endm

/* Current EL using SP_EL0: synchronous, IRQ, FIQ, SError. */
ARM64_VECTOR_SLOT 0
ARM64_VECTOR_SLOT 1
ARM64_VECTOR_SLOT 2
ARM64_VECTOR_SLOT 3

/* Current EL using SP_ELx. */
ARM64_VECTOR_SLOT 4
ARM64_VECTOR_SLOT 5
ARM64_VECTOR_SLOT 6
ARM64_VECTOR_SLOT 7

/* Lower EL using AArch64. */
ARM64_VECTOR_SLOT 8
ARM64_VECTOR_SLOT 9
ARM64_VECTOR_SLOT 10
ARM64_VECTOR_SLOT 11

/* Lower EL using AArch32. */
ARM64_VECTOR_SLOT 12
ARM64_VECTOR_SLOT 13
ARM64_VECTOR_SLOT 14
ARM64_VECTOR_SLOT 15

.size arm64_exception_vectors, . - arm64_exception_vectors

/* Each stub preserves x16/x17 before using x16 as the vector identifier. */
.macro ARM64_VECTOR_STUB number
.global arm64_vector_stub_\number
.type arm64_vector_stub_\number, %function
arm64_vector_stub_\number:
    sub     sp, sp, #16
    stp     x16, x17, [sp]
    mov     x16, #\number
    b       arm64_exception_common
.size arm64_vector_stub_\number, . - arm64_vector_stub_\number
.endm

ARM64_VECTOR_STUB 0
ARM64_VECTOR_STUB 1
ARM64_VECTOR_STUB 2
ARM64_VECTOR_STUB 3
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

/*
 * Frame layout (288 bytes, 16-byte aligned):
 * x0..x30 at offsets 0..240; ESR/FAR/ELR/SPSR/vector at 248..280.
 * The 16-byte x16/x17 scratch pair remains immediately above the frame.
 */
.type arm64_exception_common, %function
arm64_exception_common:
    sub     sp, sp, #288
    stp     x0,  x1,  [sp, #0]
    stp     x2,  x3,  [sp, #16]
    stp     x4,  x5,  [sp, #32]
    stp     x6,  x7,  [sp, #48]
    stp     x8,  x9,  [sp, #64]
    stp     x10, x11, [sp, #80]
    stp     x12, x13, [sp, #96]
    stp     x14, x15, [sp, #112]
    ldp     x0, x1, [sp, #288]
    stp     x0, x1, [sp, #128]
    stp     x18, x19, [sp, #144]
    stp     x20, x21, [sp, #160]
    stp     x22, x23, [sp, #176]
    stp     x24, x25, [sp, #192]
    stp     x26, x27, [sp, #208]
    stp     x28, x29, [sp, #224]
    str     x30, [sp, #240]

    mrs     x0, esr_el1
    str     x0, [sp, #248]
    mrs     x0, far_el1
    str     x0, [sp, #256]
    mrs     x0, elr_el1
    str     x0, [sp, #264]
    mrs     x0, spsr_el1
    str     x0, [sp, #272]
    str     x16, [sp, #280]

    mov     x0, sp
    bl      nusantara_arm64_exception_dispatch

    /* A returning dispatcher may adjust ELR/SPSR in the saved frame. */
    ldr     x0, [sp, #264]
    msr     elr_el1, x0
    ldr     x0, [sp, #272]
    msr     spsr_el1, x0

    ldp     x0,  x1,  [sp, #0]
    ldp     x2,  x3,  [sp, #16]
    ldp     x4,  x5,  [sp, #32]
    ldp     x6,  x7,  [sp, #48]
    ldp     x8,  x9,  [sp, #64]
    ldp     x10, x11, [sp, #80]
    ldp     x12, x13, [sp, #96]
    ldp     x14, x15, [sp, #112]
    ldp     x16, x17, [sp, #128]
    ldp     x18, x19, [sp, #144]
    ldp     x20, x21, [sp, #160]
    ldp     x22, x23, [sp, #176]
    ldp     x24, x25, [sp, #192]
    ldp     x26, x27, [sp, #208]
    ldp     x28, x29, [sp, #224]
    ldr     x30, [sp, #240]
    add     sp, sp, #288
    add     sp, sp, #16
    eret
.size arm64_exception_common, . - arm64_exception_common

/* Weak fail-closed default. A real kernel dispatcher may override this symbol. */
.weak nusantara_arm64_exception_dispatch
.type nusantara_arm64_exception_dispatch, %function
nusantara_arm64_exception_dispatch:
1:
    wfe
    b       1b
.size nusantara_arm64_exception_dispatch, . - nusantara_arm64_exception_dispatch
