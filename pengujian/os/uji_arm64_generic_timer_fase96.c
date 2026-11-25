/* SPDX-License-Identifier: Apache-2.0 */
#include "generic_timer.h"

#include <assert.h>
#include <stdio.h>
#include <string.h>

typedef struct timer_mock {
    uint64_t frequency;
    uint64_t counter;
    uint32_t control;
    int32_t tval;
    unsigned control_writes;
    unsigned tval_writes;
    unsigned barriers;
} timer_mock_t;

static uint64_t mock_frequency(void *context) {
    return ((timer_mock_t *)context)->frequency;
}
static uint64_t mock_counter(void *context) {
    return ((timer_mock_t *)context)->counter;
}
static uint32_t mock_control(void *context) {
    return ((timer_mock_t *)context)->control;
}
static void mock_write_tval(void *context, int32_t ticks) {
    timer_mock_t *mock = (timer_mock_t *)context;
    mock->tval = ticks;
    mock->tval_writes++;
    mock->control &= ~NUSANTARA_ARM64_TIMER_CTL_ISTATUS;
}
static void mock_write_control(void *context, uint32_t value) {
    timer_mock_t *mock = (timer_mock_t *)context;
    mock->control = value;
    mock->control_writes++;
}
static void mock_isb(void *context) {
    ((timer_mock_t *)context)->barriers++;
}

static nusantara_arm64_timer_io_t make_io(timer_mock_t *mock) {
    nusantara_arm64_timer_io_t io;
    memset(&io, 0, sizeof(io));
    io.context = mock;
    io.read_frequency = mock_frequency;
    io.read_counter = mock_counter;
    io.read_control = mock_control;
    io.write_tval = mock_write_tval;
    io.write_control = mock_write_control;
    io.isb = mock_isb;
    return io;
}

int main(void) {
    timer_mock_t mock = { .frequency = 1000000u, .counter = 900u };
    nusantara_arm64_timer_io_t io = make_io(&mock);
    nusantara_arm64_generic_timer_t timer;

    assert(nusantara_arm64_timer_init(&timer, &io) == NUSANTARA_ARM64_TIMER_OK);
    assert(timer.initialized == 1u);
    assert(timer.frequency_hz == 1000000u);

    assert(nusantara_arm64_timer_arm_ticks(&timer, 250u) == NUSANTARA_ARM64_TIMER_OK);
    assert(mock.tval == 250);
    assert(mock.control == NUSANTARA_ARM64_TIMER_CTL_ENABLE);
    assert(timer.last_deadline == 1150u);
    assert(timer.armed == 1u);
    assert(mock.control_writes == 2u);
    assert(mock.tval_writes == 1u);
    assert(mock.barriers == 3u);

    uint8_t expired = 0u;
    mock.control |= NUSANTARA_ARM64_TIMER_CTL_ISTATUS;
    assert(nusantara_arm64_timer_is_expired(&timer, &expired) == NUSANTARA_ARM64_TIMER_OK);
    assert(expired == 1u);
    mock.control &= ~NUSANTARA_ARM64_TIMER_CTL_ISTATUS;
    assert(nusantara_arm64_timer_is_expired(&timer, &expired) == NUSANTARA_ARM64_TIMER_OK);
    assert(expired == 0u);

    assert(nusantara_arm64_timer_arm_ms(&timer, 1u) == NUSANTARA_ARM64_TIMER_OK);
    assert(mock.tval == 1000);
    assert(nusantara_arm64_timer_arm_ms(&timer, 2u) == NUSANTARA_ARM64_TIMER_OK);
    assert(mock.tval == 2000);
    assert(nusantara_arm64_timer_arm_ms(&timer, 0u) == NUSANTARA_ARM64_TIMER_INVALID_INTERVAL);
    assert(nusantara_arm64_timer_arm_ticks(&timer, 0u) == NUSANTARA_ARM64_TIMER_INVALID_INTERVAL);
    assert(nusantara_arm64_timer_arm_ticks(&timer, (uint64_t)NUSANTARA_ARM64_TIMER_MAX_TICKS + 1u) ==
        NUSANTARA_ARM64_TIMER_INVALID_INTERVAL);

    assert(nusantara_arm64_timer_stop(&timer) == NUSANTARA_ARM64_TIMER_OK);
    assert(mock.control == NUSANTARA_ARM64_TIMER_CTL_IMASK);
    assert(timer.armed == 0u);

    mock.frequency = 0u;
    assert(nusantara_arm64_timer_init(&timer, &io) == NUSANTARA_ARM64_TIMER_UNAVAILABLE);
    assert(nusantara_arm64_timer_arm_ticks(&timer, 10u) == NUSANTARA_ARM64_TIMER_INVALID_ARGUMENT);

    mock.frequency = UINT64_MAX;
    assert(nusantara_arm64_timer_init(&timer, &io) == NUSANTARA_ARM64_TIMER_OK);
    assert(nusantara_arm64_timer_arm_ms(&timer, UINT64_MAX) == NUSANTARA_ARM64_TIMER_OVERFLOW);

    puts("Phase 96: ARM64 Generic Timer contract tests passed");
    return 0;
}
