# Phase 102 — AArch64 Context Switching

## Implemented contract

This phase adds a cooperative AAPCS64 context-switch primitive. It saves and
restores x19–x30 plus SP in a 96-byte, 16-byte-aligned frame. A first-run task
frame carries its argument in x19, entry function in x20, exit callback in x21,
and the task trampoline in x30. The C helper builds this frame at the aligned
top of caller-owned stack memory; no heap is required.

The scheduler task already owns `saved_stack_pointer`, so the C switch wrapper
uses that field directly. A NULL previous task is permitted when transferring
from the boot/idle context for the first time.

## Important boundary

This is a cooperative context switch across a normal AAPCS64 call boundary.
It is not yet safe to switch arbitrary interrupted instruction streams by
calling it from an IRQ handler: caller-saved registers, ELR_EL1, SPSR_EL1,
SP_EL0, SIMD/FP state, and exception-frame ownership require a separate
interrupt-return context contract. Phase 103 must connect IRQ dispatch to a
full exception-frame scheduler path and prove it in QEMU.

The caller must choose the next runnable task, ensure its stack is mapped and
writable, and prevent concurrent scheduler mutation. This phase does not
unmask IRQs, modify DAIF, create address spaces, or enter EL0.

## Validation

The host contract test checks stack bounds, 16-byte alignment, frame contents,
and invalid inputs. CI cross-assembles the AArch64 implementation and checks
the object architecture and exported entry points. Host tests do not execute
privileged AArch64 switching instructions.
