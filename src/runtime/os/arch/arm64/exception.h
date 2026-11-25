/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 exception frame ABI (Phase 94).
 */
#ifndef NUSANTARA_ARM64_EXCEPTION_H
#define NUSANTARA_ARM64_EXCEPTION_H

#include <stddef.h>
#include <stdint.h>

#define NUSANTARA_ARM64_EXCEPTION_VECTOR_COUNT 16u
#define NUSANTARA_ARM64_EXCEPTION_VECTOR_SLOT_BYTES 128u
#define NUSANTARA_ARM64_EXCEPTION_TABLE_BYTES 2048u
#define NUSANTARA_ARM64_EXCEPTION_FRAME_BYTES 288u

typedef struct nusantara_arm64_exception_frame {
    uint64_t x[31];       /* x0..x30, 8-byte slots */
    uint64_t esr_el1;     /* Exception Syndrome Register */
    uint64_t far_el1;     /* Fault Address Register */
    uint64_t elr_el1;     /* Exception Link Register */
    uint64_t spsr_el1;    /* Saved Program Status Register */
    uint64_t vector;      /* 0..15, table slot number */
} nusantara_arm64_exception_frame_t;

_Static_assert(sizeof(nusantara_arm64_exception_frame_t) == NUSANTARA_ARM64_EXCEPTION_FRAME_BYTES,
               "AArch64 exception frame ABI size mismatch");
_Static_assert(offsetof(nusantara_arm64_exception_frame_t, esr_el1) == 248u,
               "AArch64 exception frame ESR offset mismatch");
_Static_assert(offsetof(nusantara_arm64_exception_frame_t, vector) == 280u,
               "AArch64 exception frame vector offset mismatch");

#endif
