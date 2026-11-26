/* SPDX-License-Identifier: Apache-2.0 */
#include "mmu-control.h"
#include "mmu.h"
uint64_t nusantara_arm64_mmu_tcr_value(void)
{
    return NUSANTARA_ARM64_MMU_TCR_T0SZ_48BIT |
           NUSANTARA_ARM64_MMU_TCR_IRGN0_WBWA |
           NUSANTARA_ARM64_MMU_TCR_ORGN0_WBWA |
           NUSANTARA_ARM64_MMU_TCR_SH0_INNER |
           NUSANTARA_ARM64_MMU_TCR_TG0_4K |
           NUSANTARA_ARM64_MMU_TCR_EPD1 |
           NUSANTARA_ARM64_MMU_TCR_IPS_40BIT;
}
uint64_t nusantara_arm64_mmu_mair_value(void)
{
    return NUSANTARA_ARM64_MMU_MAIR_NORMAL_WBWA |
           (NUSANTARA_ARM64_MMU_MAIR_DEVICE_NGNRE << 8);
}
int nusantara_arm64_mmu_enable_el1(uint64_t root_physical)
{
    if ((root_physical & (NUSANTARA_ARM64_PAGE_SIZE - 1u)) != 0u ||
        (root_physical & ~NUSANTARA_ARM64_PA_MASK) != 0u)
        return NUSANTARA_ARM64_MMU_CONTROL_INVALID;
#if defined(__aarch64__)
    {
        uint64_t current_el, sctlr;
        __asm__ volatile("mrs %0, CurrentEL" : "=r"(current_el));
        if (((current_el >> 2) & 3u) != 1u)
            return NUSANTARA_ARM64_MMU_CONTROL_INVALID;
        __asm__ volatile("mrs %0, SCTLR_EL1" : "=r"(sctlr));
        if ((sctlr & NUSANTARA_ARM64_MMU_SCTLR_M) != 0u)
            return NUSANTARA_ARM64_MMU_CONTROL_INVALID;
        {
            const uint64_t mair = nusantara_arm64_mmu_mair_value();
            const uint64_t tcr = nusantara_arm64_mmu_tcr_value();
            __asm__ volatile(
                "msr mair_el1, %0\n"
                "msr tcr_el1, %1\n"
                "msr ttbr0_el1, %2\n"
                "dsb sy\n"
                "tlbi vmalle1\n"
                "dsb sy\n"
                "isb\n"
                "mrs %3, sctlr_el1\n"
                "orr %3, %3, %4\n"
                "msr sctlr_el1, %3\n"
                "isb\n"
                : "=&r"(sctlr)
                : "r"(mair), "r"(tcr), "r"(root_physical),
                  "r"(NUSANTARA_ARM64_MMU_SCTLR_M |
                      NUSANTARA_ARM64_MMU_SCTLR_C |
                      NUSANTARA_ARM64_MMU_SCTLR_I)
                : "memory");
        }
    }
    return NUSANTARA_ARM64_MMU_CONTROL_OK;
#else
    (void)root_physical;
    return NUSANTARA_ARM64_MMU_CONTROL_INVALID;
#endif
}
int nusantara_arm64_mmu_decode_fault(uint64_t esr,
    nusantara_arm64_mmu_fault_t *fault)
{
    uint8_t ec, fsc;
    if (fault == 0) return NUSANTARA_ARM64_MMU_CONTROL_INVALID;
    ec = (uint8_t)((esr >> 26) & 0x3fu);
    fsc = (uint8_t)(esr & 0x3fu);
    fault->exception_class = ec;
    fault->fault_status = fsc;
    fault->write = (uint8_t)((esr >> 6) & 1u);
    fault->instruction = (uint8_t)(ec == 0x20u || ec == 0x21u);
    fault->level = (uint8_t)(fsc & 3u);
    /* Translation, access-flag and permission faults occupy FSC 0x04..0x0f. */
    if (fsc < 0x04u || fsc > 0x0fu)
        return NUSANTARA_ARM64_MMU_CONTROL_INVALID;
    return NUSANTARA_ARM64_MMU_CONTROL_OK;
}
