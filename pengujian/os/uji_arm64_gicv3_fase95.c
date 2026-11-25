    hw.dist[NUSANTARA_GICD_TYPER / 4u] = 31u; /* Architectural INTID ceiling includes reserved 1020–1023. */
    assert(nusantara_gicv3_distributor_init(&gic, &mmio, DIST_BASE, 8u) == NUSANTARA_GICV3_OK);
    assert(gic.interrupt_count == NUSANTARA_GICV3_MAX_IRQS);
    assert(hw.dist[(NUSANTARA_GICD_ICENABLER / 4u) + 31u] == 0xffffffffu);
    assert(hw.dist[(NUSANTARA_GICD_IGROUPR / 4u) + 31u] == 0xffffffffu);
    assert(nusantara_gicv3_enable_spi(&gic, 1019u) == NUSANTARA_GICV3_OK);
    assert(hw.dist[(NUSANTARA_GICD_ISENABLER / 4u) + 31u] == (1u << 27));
    assert(nusantara_gicv3_enable_spi(&gic, 1020u) == NUSANTARA_GICV3_INVALID_IRQ);

    assert(nusantara_gicv3_distributor_init(&gic, &mmio, DIST_BASE + 4u, 8u) == NUSANTARA_GICV3_INVALID_ARGUMENT);