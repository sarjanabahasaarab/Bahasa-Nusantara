/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 GICv3 driver contract (Phase 95).
 */
#ifndef NUSANTARA_ARM64_GICV3_H
#define NUSANTARA_ARM64_GICV3_H

#include <stdint.h>

#define NUSANTARA_GICV3_IRQ_SGI_FIRST 0u
#define NUSANTARA_GICV3_IRQ_PPI_FIRST 16u
#define NUSANTARA_GICV3_IRQ_SPI_FIRST 32u
#define NUSANTARA_GICV3_IRQ_SPURIOUS_MIN 1020u
#define NUSANTARA_GICV3_MAX_IRQS 1020u

#define NUSANTARA_GICD_CTLR 0x0000u
#define NUSANTARA_GICD_TYPER 0x0004u
#define NUSANTARA_GICD_IGROUPR 0x0080u
#define NUSANTARA_GICD_ISENABLER 0x0100u
#define NUSANTARA_GICD_ICENABLER 0x0180u
#define NUSANTARA_GICD_IPRIORITYR 0x0400u
#define NUSANTARA_GICD_IROUTER 0x6000u
#define NUSANTARA_GICD_CTLR_RWP (1u << 31)
#define NUSANTARA_GICD_CTLR_ARE_NS (1u << 4)
#define NUSANTARA_GICD_CTLR_ENABLE_G1NS (1u << 1)

#define NUSANTARA_GICR_WAKER 0x0014u
#define NUSANTARA_GICR_WAKER_PROCESSOR_SLEEP (1u << 1)
#define NUSANTARA_GICR_WAKER_CHILDREN_ASLEEP (1u << 2)
#define NUSANTARA_GICR_SGI_BASE 0x10000u
#define NUSANTARA_GICR_IGROUPR0 (NUSANTARA_GICR_SGI_BASE + 0x0080u)
#define NUSANTARA_GICR_ISENABLER0 (NUSANTARA_GICR_SGI_BASE + 0x0100u)
#define NUSANTARA_GICR_IPRIORITYR (NUSANTARA_GICR_SGI_BASE + 0x0400u)

#define NUSANTARA_GICV3_PRIORITY_DEFAULT 0xa0u
#define NUSANTARA_GICV3_AFFINITY_ROUTE_MASK 0x000000ff00ffffffull

typedef enum nusantara_gicv3_status {
    NUSANTARA_GICV3_OK = 0,
    NUSANTARA_GICV3_INVALID_ARGUMENT,
    NUSANTARA_GICV3_TIMEOUT,
    NUSANTARA_GICV3_INVALID_IRQ,
    NUSANTARA_GICV3_INVALID_AFFINITY,
    NUSANTARA_GICV3_NOT_INITIALIZED
} nusantara_gicv3_status_t;

typedef struct nusantara_gicv3_mmio {
    void *context;
    uint32_t (*read32)(void *context, uintptr_t address);
    void (*write32)(void *context, uintptr_t address, uint32_t value);
    uint64_t (*read64)(void *context, uintptr_t address);
    void (*write64)(void *context, uintptr_t address, uint64_t value);
    void (*barrier)(void *context);
} nusantara_gicv3_mmio_t;

typedef struct nusantara_gicv3_cpu_interface {
    void *context;
    void (*write_sre_el1)(void *context, uint64_t value);
    void (*write_pmr_el1)(void *context, uint64_t value);
    void (*write_bpr1_el1)(void *context, uint64_t value);
    void (*write_igrpen1_el1)(void *context, uint64_t value);
    uint32_t (*read_iar1_el1)(void *context);
    void (*write_eoir1_el1)(void *context, uint32_t token);
    void (*isb)(void *context);
} nusantara_gicv3_cpu_interface_t;

typedef struct nusantara_gicv3 {
    nusantara_gicv3_mmio_t mmio;
    uintptr_t distributor_base;
    uintptr_t redistributor_base;
    uint32_t interrupt_count;
    uint32_t poll_limit;
    uint8_t distributor_ready;
    uint8_t redistributor_ready;
    uint8_t cpu_interface_ready;
} nusantara_gicv3_t;

/* Bases must come from trusted firmware/platform memory description and be mapped Device memory. */
nusantara_gicv3_status_t nusantara_gicv3_distributor_init(
    nusantara_gicv3_t *gic, const nusantara_gicv3_mmio_t *mmio,
    uintptr_t distributor_base, uint32_t poll_limit);
nusantara_gicv3_status_t nusantara_gicv3_redistributor_wake(
    nusantara_gicv3_t *gic, uintptr_t redistributor_base);
nusantara_gicv3_status_t nusantara_gicv3_cpu_interface_enable(
    nusantara_gicv3_t *gic, const nusantara_gicv3_cpu_interface_t *cpu);
nusantara_gicv3_status_t nusantara_gicv3_enable_spi(nusantara_gicv3_t *gic, uint32_t intid);
nusantara_gicv3_status_t nusantara_gicv3_enable_ppi(nusantara_gicv3_t *gic, uint32_t intid);
nusantara_gicv3_status_t nusantara_gicv3_route_spi(
    nusantara_gicv3_t *gic, uint32_t intid, uint64_t affinity_route);
uint32_t nusantara_gicv3_acknowledge(const nusantara_gicv3_cpu_interface_t *cpu);
void nusantara_gicv3_end_interrupt(const nusantara_gicv3_cpu_interface_t *cpu, uint32_t token);

#endif
