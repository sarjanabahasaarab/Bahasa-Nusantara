/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_EXCEPTION_H
#define NUSANTARA_ARM64_EXCEPTION_H
#include <stddef.h>
#include <stdint.h>
#define NUSANTARA_ARM64_EXCEPTION_VECTOR_COUNT 16u
#define NUSANTARA_ARM64_EXCEPTION_VECTOR_SLOT_BYTES 128u
#define NUSANTARA_ARM64_EXCEPTION_TABLE_BYTES 2048u
#define NUSANTARA_ARM64_EXCEPTION_FRAME_BYTES 288u
#define NUSANTARA_ARM64_EXCEPTION_SCRATCH_BYTES 16u
#define NUSANTARA_ARM64_EXCEPTION_CONTEXT_BYTES 304u
#define NUSANTARA_ARM64_SPSR_EL1H_MASKED 0x3c5u
typedef struct nusantara_arm64_exception_frame {
    uint64_t x[31];
    uint64_t esr_el1;
    uint64_t far_el1;
    uint64_t elr_el1;
    uint64_t spsr_el1;
    uint64_t vector;
} nusantara_arm64_exception_frame_t;
typedef nusantara_arm64_exception_frame_t *(*nusantara_arm64_exception_handler_fn)(
    void *context, nusantara_arm64_exception_frame_t *frame);
int nusantara_arm64_install_exception_vectors(void);
int nusantara_arm64_exception_set_handler(
    nusantara_arm64_exception_handler_fn handler, void *context);
nusantara_arm64_exception_frame_t *nusantara_arm64_exception_dispatch(nusantara_arm64_exception_frame_t *frame);
/* Restore an initial EL1h frame and enable IRQs only as ERET enters the first task. */
void nusantara_arm64_exception_start_first_task(uintptr_t frame_pointer);
int nusantara_arm64_exception_context_prepare(
    nusantara_arm64_exception_frame_t **initial_frame,
    void *stack, size_t stack_size,
    uintptr_t entry, uintptr_t argument, uintptr_t return_address);
_Static_assert(sizeof(nusantara_arm64_exception_frame_t) == NUSANTARA_ARM64_EXCEPTION_FRAME_BYTES,
               "AArch64 exception frame ABI size mismatch");
_Static_assert(offsetof(nusantara_arm64_exception_frame_t, esr_el1) == 248u,
               "AArch64 exception frame ESR offset mismatch");
_Static_assert(offsetof(nusantara_arm64_exception_frame_t, vector) == 280u,
               "AArch64 exception frame vector offset mismatch");
#endif
