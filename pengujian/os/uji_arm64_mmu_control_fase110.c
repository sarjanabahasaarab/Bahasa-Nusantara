/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include "mmu-control.h"
int main(void)
{
    nusantara_arm64_mmu_fault_t fault;
    uint64_t expected_tcr = UINT64_C(16) | (UINT64_C(1) << 8) |
        (UINT64_C(1) << 10) | (UINT64_C(3) << 12) |
        (UINT64_C(1) << 23) | (UINT64_C(2) << 32);
    assert(nusantara_arm64_mmu_tcr_value() == expected_tcr);
    assert(nusantara_arm64_mmu_mair_value() == UINT64_C(0x04ff));
    assert(!nusantara_arm64_mmu_enable_el1(UINT64_C(0x40000001)));
    assert(!nusantara_arm64_mmu_enable_el1(UINT64_C(0x100000000000)));
    /* Lower-EL data permission fault, level 3, write access. */
    assert(nusantara_arm64_mmu_decode_fault(
        (UINT64_C(0x24) << 26) | (UINT64_C(1) << 6) | UINT64_C(0x0f),
        &fault));
    assert(fault.exception_class == 0x24u);
    assert(fault.fault_status == 0x0fu);
    assert(fault.write == 1u);
    assert(fault.instruction == 0u);
    assert(fault.level == 3u);
    /* Lower-EL instruction permission fault. */
    assert(nusantara_arm64_mmu_decode_fault(
        (UINT64_C(0x20) << 26) | UINT64_C(0x0e), &fault));
    assert(fault.instruction == 1u);
    assert(fault.write == 0u);
    assert(!nusantara_arm64_mmu_decode_fault(
        (UINT64_C(0x24) << 26) | UINT64_C(0x05), &fault));
    assert(!nusantara_arm64_mmu_decode_fault(0u, &fault));
    assert(!nusantara_arm64_mmu_decode_fault(UINT64_C(0x0f), 0));
    return 0;
}
