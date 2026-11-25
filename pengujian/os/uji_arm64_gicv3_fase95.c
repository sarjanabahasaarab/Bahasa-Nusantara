/* SPDX-License-Identifier: Apache-2.0
 * Phase 95 — GICv3 host-side register and sequencing tests.
 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "../../src/runtime/os/arch/arm64/gicv3.h"

#define DIST_BASE ((uintptr_t)0x10000000u)
#define REDIST_BASE ((uintptr_t)0x20000000u)
#define DIST_BYTES 0x10000u
#define REDIST_BYTES 0x20000u

typedef struct mock_hw {
    uint32_t dist[DIST_BYTES / 4u];
    uint32_t redist[REDIST_BYTES / 4u];
    uint64_t route_spi40;
    uint32_t iar_token;
    uint32_t eoir_token;
    uint64_t sre, pmr, bpr, igrpen;
    uint32_t isb_count;
} mock_hw_t;

static uint32_t read32(void *context, uintptr_t address) {
    mock_hw_t *hw = context;
    if (address >= DIST_BASE && address < DIST_BASE + DIST_BYTES) return hw->dist[(address - DIST_BASE) / 4u];
    if (address >= REDIST_BASE && address < REDIST_BASE + REDIST_BYTES) return hw->redist[(address - REDIST_BASE) / 4u];
    return 0u;
}
static void write32(void *context, uintptr_t address, uint32_t value) {
    mock_hw_t *hw = context;
    if (address >= DIST_BASE && address < DIST_BASE + DIST_BYTES) hw->dist[(address - DIST_BASE) / 4u] = value;
    if (address >= REDIST_BASE && address < REDIST_BASE + REDIST_BYTES) {
        hw->redist[(address - REDIST_BASE) / 4u] = value;
        if (address == REDIST_BASE + NUSANTARA_GICR_WAKER &&
            (value & NUSANTARA_GICR_WAKER_PROCESSOR_SLEEP) == 0u) {
            hw->redist[NUSANTARA_GICR_WAKER / 4u] &= ~NUSANTARA_GICR_WAKER_CHILDREN_ASLEEP;
        }
    }
}
static uint64_t read64(void *context, uintptr_t address) {
    mock_hw_t *hw = context;
    (void)address;
    return hw->route_spi40;
}
static void write64(void *context, uintptr_t address, uint64_t value) {
    mock_hw_t *hw = context;
    (void)address;
    hw->route_spi40 = value;
}
static void barrier(void *context) { (void)context; }
static void write_sre(void *context, uint64_t v) { ((mock_hw_t *)context)->sre = v; }
static void write_pmr(void *context, uint64_t v) { ((mock_hw_t *)context)->pmr = v; }
static void write_bpr(void *context, uint64_t v) { ((mock_hw_t *)context)->bpr = v; }
static void write_igrpen(void *context, uint64_t v) { ((mock_hw_t *)context)->igrpen = v; }
static uint32_t read_iar(void *context) { return ((mock_hw_t *)context)->iar_token; }
static void write_eoir(void *context, uint32_t v) { ((mock_hw_t *)context)->eoir_token = v; }
static void isb(void *context) { ((mock_hw_t *)context)->isb_count++; }

int main(void) {
    mock_hw_t hw;
    memset(&hw, 0, sizeof(hw));
    hw.dist[NUSANTARA_GICD_TYPER / 4u] = 1u; /* 64 interrupt IDs */
    hw.redist[NUSANTARA_GICR_WAKER / 4u] = NUSANTARA_GICR_WAKER_PROCESSOR_SLEEP |
        NUSANTARA_GICR_WAKER_CHILDREN_ASLEEP;

    const nusantara_gicv3_mmio_t mmio = { &hw, read32, write32, read64, write64, barrier };
    const nusantara_gicv3_cpu_interface_t cpu = {
        &hw, write_sre, write_pmr, write_bpr, write_igrpen, read_iar, write_eoir, isb
    };
    nusantara_gicv3_t gic;

    assert(nusantara_gicv3_distributor_init(&gic, &mmio, DIST_BASE, 8u) == NUSANTARA_GICV3_OK);
    assert(gic.interrupt_count == 64u);
    assert(gic.distributor_ready == 1u);
    assert(hw.dist[(NUSANTARA_GICD_CTLR / 4u)] ==
        (NUSANTARA_GICD_CTLR_ARE_NS | NUSANTARA_GICD_CTLR_ENABLE_G1NS));
    assert(hw.dist[(NUSANTARA_GICD_ICENABLER / 4u) + 1u] == 0xffffffffu);
    assert(hw.dist[(NUSANTARA_GICD_IGROUPR / 4u) + 1u] == 0xffffffffu);
    assert(hw.dist[(NUSANTARA_GICD_IPRIORITYR / 4u) + 8u] == 0xa0a0a0a0u);

    assert(nusantara_gicv3_enable_spi(&gic, 40u) == NUSANTARA_GICV3_OK);
    assert(hw.dist[(NUSANTARA_GICD_ISENABLER / 4u) + 1u] == (1u << 8));
    assert(nusantara_gicv3_enable_spi(&gic, 64u) == NUSANTARA_GICV3_INVALID_IRQ);
    assert(nusantara_gicv3_route_spi(&gic, 40u, 0x0000000100020304ull) == NUSANTARA_GICV3_OK);
    assert(hw.route_spi40 == 0x0000000100020304ull);
    assert(nusantara_gicv3_route_spi(&gic, 40u, 1ull << 31) == NUSANTARA_GICV3_INVALID_AFFINITY);

    assert(nusantara_gicv3_redistributor_wake(&gic, REDIST_BASE) == NUSANTARA_GICV3_OK);
    assert(gic.redistributor_ready == 1u);
    assert((hw.redist[NUSANTARA_GICR_WAKER / 4u] & NUSANTARA_GICR_WAKER_PROCESSOR_SLEEP) == 0u);
    assert(nusantara_gicv3_enable_ppi(&gic, 27u) == NUSANTARA_GICV3_OK);
    assert(hw.redist[NUSANTARA_GICR_ISENABLER0 / 4u] == (1u << 27));
    assert(nusantara_gicv3_enable_ppi(&gic, 15u) == NUSANTARA_GICV3_INVALID_IRQ);

    assert(nusantara_gicv3_cpu_interface_enable(&gic, &cpu) == NUSANTARA_GICV3_OK);
    assert(hw.sre == 1u && hw.pmr == 0xffu && hw.bpr == 0u && hw.igrpen == 1u);
    assert(hw.isb_count == 2u);

    hw.iar_token = 40u;
    const uint32_t token = nusantara_gicv3_acknowledge(&cpu);
    assert(token == 40u);
    nusantara_gicv3_end_interrupt(&cpu, token);
    assert(hw.eoir_token == 40u);
    hw.eoir_token = 0u;
    hw.iar_token = 1023u;
    const uint32_t spurious = nusantara_gicv3_acknowledge(&cpu);
    nusantara_gicv3_end_interrupt(&cpu, spurious);
    assert(hw.eoir_token == 0u);

    hw.dist[NUSANTARA_GICD_TYPER / 4u] = 31u; /* 1024 encodings; 1020 usable INTIDs. */
    assert(nusantara_gicv3_distributor_init(&gic, &mmio, DIST_BASE, 8u) == NUSANTARA_GICV3_OK);
    assert(gic.interrupt_count == NUSANTARA_GICV3_MAX_IRQS);
    assert(hw.dist[(NUSANTARA_GICD_ICENABLER / 4u) + 31u] == 0xffffffffu);
    assert(hw.dist[(NUSANTARA_GICD_IGROUPR / 4u) + 31u] == 0xffffffffu);
    assert(nusantara_gicv3_enable_spi(&gic, 1019u) == NUSANTARA_GICV3_OK);
    assert(hw.dist[(NUSANTARA_GICD_ISENABLER / 4u) + 31u] == (1u << 27));
    assert(nusantara_gicv3_enable_spi(&gic, 1020u) == NUSANTARA_GICV3_INVALID_IRQ);

    assert(nusantara_gicv3_distributor_init(&gic, &mmio, DIST_BASE + 4u, 8u) == NUSANTARA_GICV3_INVALID_ARGUMENT);
    puts("Phase 95: GICv3 distributor, redistributor, CPU interface and IRQ token tests passed.");
    return 0;
}
