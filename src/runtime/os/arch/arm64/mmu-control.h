/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_ARM64_MMU_CONTROL_H
#define NUSANTARA_ARM64_MMU_CONTROL_H
#include <stdint.h>
#define NUSANTARA_ARM64_MMU_CONTROL_OK 1
#define NUSANTARA_ARM64_MMU_CONTROL_INVALID 0
#define NUSANTARA_ARM64_MMU_MAIR_NORMAL_WBWA UINT64_C(0xff)
#define NUSANTARA_ARM64_MMU_MAIR_DEVICE_NGNRE UINT64_C(0x04)
#define NUSANTARA_ARM64_MMU_TCR_T0SZ_48BIT UINT64_C(16)
#define NUSANTARA_ARM64_MMU_TCR_IRGN0_WBWA (UINT64_C(1) << 8)
#define NUSANTARA_ARM64_MMU_TCR_ORGN0_WBWA (UINT64_C(1) << 10)
#define NUSANTARA_ARM64_MMU_TCR_SH0_INNER (UINT64_C(3) << 12)
#define NUSANTARA_ARM64_MMU_TCR_TG0_4K (UINT64_C(0) << 14)
#define NUSANTARA_ARM64_MMU_TCR_EPD1 (UINT64_C(1) << 23)
#define NUSANTARA_ARM64_MMU_TCR_IPS_40BIT (UINT64_C(2) << 32)
#define NUSANTARA_ARM64_MMU_SCTLR_M (UINT64_C(1) << 0)
#define NUSANTARA_ARM64_MMU_SCTLR_C (UINT64_C(1) << 2)
#define NUSANTARA_ARM64_MMU_SCTLR_I (UINT64_C(1) << 12)
typedef struct nusantara_arm64_mmu_fault {
    uint8_t exception_class;
    uint8_t fault_status;
    uint8_t write;
    uint8_t instruction;
    uint8_t level;
} nusantara_arm64_mmu_fault_t;
/* Constants for a 4 KiB, 48-bit TTBR0 regime, 40-bit physical address space. */
uint64_t nusantara_arm64_mmu_tcr_value(void);
uint64_t nusantara_arm64_mmu_mair_value(void);
/*
 * EL1-only, irreversible until a controlled MMU-off transition.
 * Caller MUST have identity-mapped the executing code, stack, vectors,
 * page tables, all RAM in use, and every MMIO range accessed after enabling.
 * All descriptors must use AttrIdx values matching the installed MAIR.
 * Do not call from an EL0 context or with live DMA/device addresses unmapped.
 */
int nusantara_arm64_mmu_enable_el1(uint64_t root_physical);
int nusantara_arm64_mmu_decode_fault(uint64_t esr,
    nusantara_arm64_mmu_fault_t *fault);
#endif
