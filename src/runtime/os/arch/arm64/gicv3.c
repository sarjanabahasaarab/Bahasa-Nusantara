/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — bounded, callback-driven GICv3 driver (Phase 95).
 */
#include "gicv3.h"

#define GICV3_BANK_BYTES 4u
#define GICV3_IRQS_PER_BANK 32u
#define GICV3_PRIORITY_WORDS_PER_BANK 8u
#define GICV3_RWP_MASK NUSANTARA_GICD_CTLR_RWP

static int mmio_valid(const nusantara_gicv3_mmio_t *m) {
    return m && m->read32 && m->write32 && m->read64 && m->write64 && m->barrier;
}

static int cpu_valid(const nusantara_gicv3_cpu_interface_t *c) {
    return c && c->write_sre_el1 && c->write_pmr_el1 && c->write_bpr1_el1 &&
        c->write_igrpen1_el1 && c->read_iar1_el1 && c->write_eoir1_el1 && c->isb;
}

static int wait_distributor_ready(nusantara_gicv3_t *gic) {
    for (uint32_t i = 0; i < gic->poll_limit; ++i) {
        if ((gic->mmio.read32(gic->mmio.context,
             gic->distributor_base + NUSANTARA_GICD_CTLR) & GICV3_RWP_MASK) == 0u) return 1;
    }
    return 0;
}

nusantara_gicv3_status_t nusantara_gicv3_distributor_init(
    nusantara_gicv3_t *gic, const nusantara_gicv3_mmio_t *mmio,
    uintptr_t distributor_base, uint32_t poll_limit) {
    if (!gic || !mmio_valid(mmio) || distributor_base == 0u || (distributor_base & 0xffffu) != 0u || poll_limit == 0u) {
        return NUSANTARA_GICV3_INVALID_ARGUMENT;
    }

    gic->mmio = *mmio;
    gic->distributor_base = distributor_base;
    gic->redistributor_base = 0u;
    gic->interrupt_count = 0u;
    gic->poll_limit = poll_limit;
    gic->distributor_ready = 0u;
    gic->redistributor_ready = 0u;
    gic->cpu_interface_ready = 0u;

    const uintptr_t ctlr = distributor_base + NUSANTARA_GICD_CTLR;
    mmio->write32(mmio->context, ctlr, 0u);
    mmio->barrier(mmio->context);
    if (!wait_distributor_ready(gic)) return NUSANTARA_GICV3_TIMEOUT;

    const uint32_t typer = mmio->read32(mmio->context, distributor_base + NUSANTARA_GICD_TYPER);
    uint32_t count = ((typer & 0x1fu) + 1u) * GICV3_IRQS_PER_BANK;
    if (count > NUSANTARA_GICV3_MAX_IRQS) count = NUSANTARA_GICV3_MAX_IRQS;
    if (count <= NUSANTARA_GICV3_IRQ_SPI_FIRST) return NUSANTARA_GICV3_INVALID_ARGUMENT;

    const uint32_t bank_count = (count + GICV3_IRQS_PER_BANK - 1u) / GICV3_IRQS_PER_BANK;
    for (uint32_t bank = 1u; bank < bank_count; ++bank) {
        const uintptr_t bank_offset = (uintptr_t)bank * GICV3_BANK_BYTES;
        mmio->write32(mmio->context, distributor_base + NUSANTARA_GICD_ICENABLER + bank_offset, 0xffffffffu);
        mmio->write32(mmio->context, distributor_base + NUSANTARA_GICD_IGROUPR + bank_offset, 0xffffffffu);
        for (uint32_t word = 0u; word < GICV3_PRIORITY_WORDS_PER_BANK; ++word) {
            const uintptr_t priority_offset = NUSANTARA_GICD_IPRIORITYR +
                (uintptr_t)bank * GICV3_IRQS_PER_BANK + (uintptr_t)word * GICV3_BANK_BYTES;
            mmio->write32(mmio->context, distributor_base + priority_offset, 0xa0a0a0a0u);
        }
    }

    mmio->barrier(mmio->context);
    mmio->write32(mmio->context, ctlr,
        NUSANTARA_GICD_CTLR_ARE_NS | NUSANTARA_GICD_CTLR_ENABLE_G1NS);
    mmio->barrier(mmio->context);
    if (!wait_distributor_ready(gic)) return NUSANTARA_GICV3_TIMEOUT;

    gic->interrupt_count = count;
    gic->distributor_ready = 1u;
    return NUSANTARA_GICV3_OK;
}

nusantara_gicv3_status_t nusantara_gicv3_redistributor_wake(
    nusantara_gicv3_t *gic, uintptr_t redistributor_base) {
    if (!gic || !gic->distributor_ready || !gic->mmio.read32 || !gic->mmio.write32 ||
        !gic->mmio.barrier || redistributor_base == 0u || (redistributor_base & 0xffffu) != 0u) {
        return NUSANTARA_GICV3_INVALID_ARGUMENT;
    }
    const uintptr_t waker = redistributor_base + NUSANTARA_GICR_WAKER;
    uint32_t value = gic->mmio.read32(gic->mmio.context, waker);
    value &= ~NUSANTARA_GICR_WAKER_PROCESSOR_SLEEP;
    gic->mmio.write32(gic->mmio.context, waker, value);
    gic->mmio.barrier(gic->mmio.context);
    for (uint32_t i = 0; i < gic->poll_limit; ++i) {
        value = gic->mmio.read32(gic->mmio.context, waker);
        if ((value & NUSANTARA_GICR_WAKER_CHILDREN_ASLEEP) == 0u) {
            gic->redistributor_base = redistributor_base;
            gic->redistributor_ready = 1u;
            return NUSANTARA_GICV3_OK;
        }
    }
    return NUSANTARA_GICV3_TIMEOUT;
}

nusantara_gicv3_status_t nusantara_gicv3_cpu_interface_enable(
    nusantara_gicv3_t *gic, const nusantara_gicv3_cpu_interface_t *cpu) {
    if (!gic || !gic->distributor_ready || !gic->redistributor_ready || !cpu_valid(cpu)) {
        return NUSANTARA_GICV3_INVALID_ARGUMENT;
    }
    cpu->write_sre_el1(cpu->context, 1u);
    cpu->isb(cpu->context);
    cpu->write_pmr_el1(cpu->context, 0xffu);
    cpu->write_bpr1_el1(cpu->context, 0u);
    cpu->write_igrpen1_el1(cpu->context, 1u);
    cpu->isb(cpu->context);
    gic->cpu_interface_ready = 1u;
    return NUSANTARA_GICV3_OK;
}

nusantara_gicv3_status_t nusantara_gicv3_enable_spi(nusantara_gicv3_t *gic, uint32_t intid) {
    if (!gic || !gic->distributor_ready) return NUSANTARA_GICV3_NOT_INITIALIZED;
    if (intid < NUSANTARA_GICV3_IRQ_SPI_FIRST || intid >= gic->interrupt_count) return NUSANTARA_GICV3_INVALID_IRQ;
    const uintptr_t offset = NUSANTARA_GICD_ISENABLER + (uintptr_t)(intid / 32u) * GICV3_BANK_BYTES;
    gic->mmio.write32(gic->mmio.context, gic->distributor_base + offset, 1u << (intid % 32u));
    gic->mmio.barrier(gic->mmio.context);
    return NUSANTARA_GICV3_OK;
}

nusantara_gicv3_status_t nusantara_gicv3_enable_ppi(nusantara_gicv3_t *gic, uint32_t intid) {
    if (!gic || !gic->redistributor_ready) return NUSANTARA_GICV3_NOT_INITIALIZED;
    if (intid < NUSANTARA_GICV3_IRQ_PPI_FIRST || intid >= NUSANTARA_GICV3_IRQ_SPI_FIRST) return NUSANTARA_GICV3_INVALID_IRQ;
    const uintptr_t offset = NUSANTARA_GICR_ISENABLER0;
    gic->mmio.write32(gic->mmio.context, gic->redistributor_base + offset,
        1u << intid);
    gic->mmio.barrier(gic->mmio.context);
    return NUSANTARA_GICV3_OK;
}

nusantara_gicv3_status_t nusantara_gicv3_route_spi(
    nusantara_gicv3_t *gic, uint32_t intid, uint64_t affinity_route) {
    if (!gic || !gic->distributor_ready) return NUSANTARA_GICV3_NOT_INITIALIZED;
    if (intid < NUSANTARA_GICV3_IRQ_SPI_FIRST || intid >= gic->interrupt_count) return NUSANTARA_GICV3_INVALID_IRQ;
    if ((affinity_route & ~NUSANTARA_GICV3_AFFINITY_ROUTE_MASK) != 0u) return NUSANTARA_GICV3_INVALID_AFFINITY;
    const uintptr_t offset = NUSANTARA_GICD_IROUTER + (uintptr_t)intid * 8u;
    gic->mmio.write64(gic->mmio.context, gic->distributor_base + offset, affinity_route);
    gic->mmio.barrier(gic->mmio.context);
    return NUSANTARA_GICV3_OK;
}

uint32_t nusantara_gicv3_acknowledge(const nusantara_gicv3_cpu_interface_t *cpu) {
    if (!cpu || !cpu->read_iar1_el1) return NUSANTARA_GICV3_IRQ_SPURIOUS_MIN;
    return cpu->read_iar1_el1(cpu->context);
}

void nusantara_gicv3_end_interrupt(const nusantara_gicv3_cpu_interface_t *cpu, uint32_t token) {
    if (!cpu || !cpu->write_eoir1_el1 || (token & 0x00ffffffu) >= NUSANTARA_GICV3_IRQ_SPURIOUS_MIN) return;
    cpu->write_eoir1_el1(cpu->context, token);
}
