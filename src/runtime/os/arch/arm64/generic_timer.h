/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — AArch64 Generic Timer contract (Phase 96).
 */
#ifndef NUSANTARA_ARM64_GENERIC_TIMER_H
#define NUSANTARA_ARM64_GENERIC_TIMER_H

#include <stdint.h>

#define NUSANTARA_ARM64_TIMER_CTL_ENABLE (1u << 0)
#define NUSANTARA_ARM64_TIMER_CTL_IMASK  (1u << 1)
#define NUSANTARA_ARM64_TIMER_CTL_ISTATUS (1u << 2)
#define NUSANTARA_ARM64_TIMER_MAX_TICKS 0x7fffffffu

typedef enum nusantara_arm64_timer_status {
    NUSANTARA_ARM64_TIMER_OK = 0,
    NUSANTARA_ARM64_TIMER_INVALID_ARGUMENT,
    NUSANTARA_ARM64_TIMER_UNAVAILABLE,
    NUSANTARA_ARM64_TIMER_INVALID_INTERVAL,
    NUSANTARA_ARM64_TIMER_OVERFLOW
} nusantara_arm64_timer_status_t;

/*
 * Platform boundary for EL1 physical timer registers. Production callbacks
 * must access CNTPCT_EL0/CNTFRQ_EL0/CNTP_TVAL_EL0/CNTP_CTL_EL0 and execute ISB.
 * Keeping access behind callbacks makes host tests safe (no privileged ops).
 */
typedef struct nusantara_arm64_timer_io {
    void *context;
    uint64_t (*read_frequency)(void *context);
    uint64_t (*read_counter)(void *context);
    uint32_t (*read_control)(void *context);
    void (*write_tval)(void *context, int32_t ticks);
    void (*write_control)(void *context, uint32_t value);
    void (*isb)(void *context);
} nusantara_arm64_timer_io_t;

typedef struct nusantara_arm64_generic_timer {
    nusantara_arm64_timer_io_t io;
    uint64_t frequency_hz;
    uint64_t last_deadline;
    uint32_t last_interval_ticks;
    uint8_t initialized;
    uint8_t armed;
} nusantara_arm64_generic_timer_t;

/* Reads CNTFRQ_EL0; does not enable interrupts or change DAIF. */
nusantara_arm64_timer_status_t nusantara_arm64_timer_init(
    nusantara_arm64_generic_timer_t *timer,
    const nusantara_arm64_timer_io_t *io);

/* Program a one-shot EL1 physical timer interval, with a signed 32-bit bound. */
nusantara_arm64_timer_status_t nusantara_arm64_timer_arm_ticks(
    nusantara_arm64_generic_timer_t *timer, uint64_t ticks);

/* Convert milliseconds to ticks using ceiling division, then arm one-shot. */
nusantara_arm64_timer_status_t nusantara_arm64_timer_arm_ms(
    nusantara_arm64_generic_timer_t *timer, uint64_t milliseconds);

/* Mask and disable the timer without changing the processor interrupt mask. */
nusantara_arm64_timer_status_t nusantara_arm64_timer_stop(
    nusantara_arm64_generic_timer_t *timer);

/* Read the architectural timer status bit; does not acknowledge an interrupt. */
nusantara_arm64_timer_status_t nusantara_arm64_timer_is_expired(
    nusantara_arm64_generic_timer_t *timer, uint8_t *expired);

#endif
