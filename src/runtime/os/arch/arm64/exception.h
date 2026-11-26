/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_EXCEPTION_H
#define NUSANTARA_ARM64_EXCEPTION_H
#include <stddef.h>
#include <stdint.h>
#define NUSANTARA_ARM64_EXCEPTION_VECTOR_COUNT 16u
#define NUSANTARA_ARM64_EXCEPTION_VECTOR_SLOT_BYTES 128u
#define NUSANTARA_ARM64_EXCEPTION_TABLE_BYTES 2048u
#define NUSANTARA_ARM64_EXCEPTION_FRAME_BYTES 304u
#define NUSANTARA_ARM64_EXCEPTION_SCRATCH_BYTES 16u
#define NUSANTARA_ARM64_EXCEPTION_CONTEXT_BYTES 320u
#define NUSANTARA_ARM64_SPSR_EL1H_MASKED 0x3c5u
#define NUSANTARA_ARM64_SPSR_EL0T 0x000u
typedef struct nusantara_arm64_exception_frame {
    uint64_t x[31];
    uint64_t esr_el1;
    uint64_t far_el1;
    uint64_t elr_el1;
    uint64_t spsr_el1;
    uint64_t vector;
    uint64_t sp_el0;
    uint64_t reserved;
} nusantara_arm64_exception_frame_t;
typedef nusantara_arm64_exception_frame_t *(*nusantara_arm64_exception_handler_fn)(
    void *context, nusantara_arm64_exception_frame_t *frame);
int nusantara_arm64_install_exception_vectors(void);
int nusantara_arm64_exception_set_handler(
    nusantara_arm64_exception_handler_fn handler, void *context);
nusantara_arm64_exception_frame_t *nusantara_arm64_exception_dispatch(nusantara_arm64_exception_frame_t *frame);
/* Restore an initial frame; IRQs become visible only when ERET enters the task. */
void nusantara_arm64_exception_start_first_task(uintptr_t frame_pointer);
int nusantara_arm64_exception_context_prepare(
    nusantara_arm64_exception_frame_t **initial_frame,
    void *stack, size_t stack_size,
    uintptr_t entry, uintptr_t argument, uintptr_t return_address);
/* Build a kernel-stack exception frame that enters an already mapped EL0 image. */
int nusantara_arm64_exception_user_context_prepare(
    nusantara_arm64_exception_frame_t **initial_frame,
    void *kernel_stack, size_t kernel_stack_size,
    uintptr_t user_entry, uintptr_t user_stack_top,
    uintptr_t argument, uintptr_t return_address);
_Static_assert(sizeof(nusantara_arm64_exception_frame_t) == NUSANTARA_ARM64_EXCEPTION_FRAME_BYTES,
               "AArch64 exception frame ABI size mismatch");
_Static_assert(offsetof(nusantara_arm64_exception_frame_t, esr_el1) == 248u,
               "AArch64 exception frame ESR offset mismatch");
_Static_assert(offsetof(nusantara_arm64_exception_frame_t, vector) == 280u,
               "AArch64 exception frame vector offset mismatch");
_Static_assert(offsetof(nusantara_arm64_exception_frame_t, sp_el0) == 288u,
               "AArch64 exception frame SP_EL0 offset mismatch");
#endif
