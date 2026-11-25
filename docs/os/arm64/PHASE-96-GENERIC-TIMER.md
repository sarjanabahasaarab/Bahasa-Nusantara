# Phase 96 — ARM64 Generic Timer

Status: implementation and host-contract tests added; hardware interrupt delivery remains integration work.

## Scope

This phase adds a bounded, callback-driven driver for the AArch64 EL1 physical Generic Timer. The platform adapter is responsible for mapping the callbacks to:

- `CNTFRQ_EL0` — architected counter frequency
- `CNTPCT_EL0` — physical counter
- `CNTP_TVAL_EL0` — relative timer value
- `CNTP_CTL_EL0` — timer enable, mask, and status

The driver validates a non-zero counter frequency, supports one-shot intervals in ticks or milliseconds, uses ceiling conversion for milliseconds, rejects zero and out-of-range intervals, and masks the timer before reprogramming it. The timer control sequence is followed by ISB through the platform callback.

## Safety boundaries

- This code does not change DAIF and does not unmask IRQ exceptions.
- It does not install an interrupt handler, acknowledge the GIC, or perform scheduler ticks.
- Timer expiry status is observable, but interrupt delivery depends on the exception-vector dispatcher and GICv3 integration.
- The platform must confirm that EL1 physical timer access is enabled by firmware/hypervisor and supply the architectural register callbacks.
- `CNTP_TVAL_EL0` is a signed 32-bit relative interval; values above `0x7fffffff` are rejected.
- Host tests use mock callbacks and never execute privileged AArch64 instructions.

## Validation

The Phase 96 workflow compiles and runs the host mock contract tests with strict warnings, then cross-compiles the driver for `aarch64-none-elf`.

## Follow-up

Integrate a real AArch64 register adapter, timer interrupt dispatch, GIC EOI path, and scheduler tick only after platform interrupt routing and exception dispatch are verified on QEMU and hardware.
