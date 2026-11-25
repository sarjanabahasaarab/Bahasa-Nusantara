/* SPDX-License-Identifier: Apache-2.0
 * NUSANTARA OS — bounded EL1 physical Generic Timer driver (Phase 96).
 */
#include "generic_timer.h"

static int io_valid(const nusantara_arm64_timer_io_t *io) {
    return io && io->read_frequency && io->read_counter && io->read_control &&
        io->write_tval && io->write_control && io->isb;
}

nusantara_arm64_timer_status_t nusantara_arm64_timer_init(
    nusantara_arm64_generic_timer_t *timer,
    const nusantara_arm64_timer_io_t *io) {
    if (!timer || !io_valid(io)) return NUSANTARA_ARM64_TIMER_INVALID_ARGUMENT;

    timer->io = *io;
    timer->frequency_hz = 0u;
    timer->last_deadline = 0u;
    timer->last_interval_ticks = 0u;
    timer->initialized = 0u;
    timer->armed = 0u;

    const uint64_t frequency = io->read_frequency(io->context);
    if (frequency == 0u) return NUSANTARA_ARM64_TIMER_UNAVAILABLE;

    timer->frequency_hz = frequency;
    timer->initialized = 1u;
    return NUSANTARA_ARM64_TIMER_OK;
}

nusantara_arm64_timer_status_t nusantara_arm64_timer_arm_ticks(
    nusantara_arm64_generic_timer_t *timer, uint64_t ticks) {
    if (!timer || !timer->initialized) return NUSANTARA_ARM64_TIMER_INVALID_ARGUMENT;
    if (ticks == 0u || ticks > NUSANTARA_ARM64_TIMER_MAX_TICKS) {
        return NUSANTARA_ARM64_TIMER_INVALID_INTERVAL;
    }

    const uint64_t now = timer->io.read_counter(timer->io.context);
    if (now > UINT64_MAX - ticks) return NUSANTARA_ARM64_TIMER_OVERFLOW;

    /* Mask first so a previous interval cannot fire while registers are updated. */
    timer->io.write_control(timer->io.context, NUSANTARA_ARM64_TIMER_CTL_IMASK);
    timer->io.isb(timer->io.context);
    timer->io.write_tval(timer->io.context, (int32_t)ticks);
    timer->io.isb(timer->io.context);
    timer->io.write_control(timer->io.context, NUSANTARA_ARM64_TIMER_CTL_ENABLE);
    timer->io.isb(timer->io.context);

    timer->last_interval_ticks = (uint32_t)ticks;
    timer->last_deadline = now + ticks;
    timer->armed = 1u;
    return NUSANTARA_ARM64_TIMER_OK;
}

nusantara_arm64_timer_status_t nusantara_arm64_timer_arm_ms(
    nusantara_arm64_generic_timer_t *timer, uint64_t milliseconds) {
    if (!timer || !timer->initialized) return NUSANTARA_ARM64_TIMER_INVALID_ARGUMENT;
    if (milliseconds == 0u) return NUSANTARA_ARM64_TIMER_INVALID_INTERVAL;

    /* Split the product to avoid overflowing frequency * milliseconds. */
    const uint64_t whole_seconds = milliseconds / 1000u;
    const uint64_t remainder_ms = milliseconds % 1000u;
    if (whole_seconds > (uint64_t)NUSANTARA_ARM64_TIMER_MAX_TICKS / timer->frequency_hz) {
        return NUSANTARA_ARM64_TIMER_OVERFLOW;
    }
    const uint64_t whole_ticks = whole_seconds * timer->frequency_hz;
    /* frequency_hz * remainder_ms is safe after quotient/remainder reduction. */
    uint64_t fractional_ticks = 0u;
    if (remainder_ms != 0u) {
        if (timer->frequency_hz > UINT64_MAX / remainder_ms) {
            return NUSANTARA_ARM64_TIMER_OVERFLOW;
        }
        const uint64_t fractional_product = timer->frequency_hz * remainder_ms;
        fractional_ticks = fractional_product / 1000u +
            ((fractional_product % 1000u) != 0u ? 1u : 0u);
    }
    if (whole_ticks > NUSANTARA_ARM64_TIMER_MAX_TICKS ||
        fractional_ticks > NUSANTARA_ARM64_TIMER_MAX_TICKS - whole_ticks) {
        return NUSANTARA_ARM64_TIMER_OVERFLOW;
    }

    return nusantara_arm64_timer_arm_ticks(timer, whole_ticks + fractional_ticks);
}

nusantara_arm64_timer_status_t nusantara_arm64_timer_stop(
    nusantara_arm64_generic_timer_t *timer) {
    if (!timer || !timer->initialized) return NUSANTARA_ARM64_TIMER_INVALID_ARGUMENT;
    timer->io.write_control(timer->io.context, NUSANTARA_ARM64_TIMER_CTL_IMASK);
    timer->io.isb(timer->io.context);
    timer->armed = 0u;
    return NUSANTARA_ARM64_TIMER_OK;
}

nusantara_arm64_timer_status_t nusantara_arm64_timer_is_expired(
    nusantara_arm64_generic_timer_t *timer, uint8_t *expired) {
    if (!timer || !timer->initialized || !expired) {
        return NUSANTARA_ARM64_TIMER_INVALID_ARGUMENT;
    }
    *expired = (timer->io.read_control(timer->io.context) &
        NUSANTARA_ARM64_TIMER_CTL_ISTATUS) != 0u ? 1u : 0u;
    return NUSANTARA_ARM64_TIMER_OK;
}
