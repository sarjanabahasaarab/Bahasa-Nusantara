# Phase 122 — ARM64 process scheduler/syscall integration

## Purpose

Connect the frame-returning EL0 syscall dispatcher from Phase 121 to the process scheduler from Phase 120. The adapter turns `yield` and `exit` system calls into a saved-frame handoff and address-space switch.

## Implementation

- Preserve caller-provided user-range validation and write callbacks while rebinding their context through the adapter.
- Route `yield_frame` to `nusantara_arm64_process_scheduler_yield`.
- Route `exit_frame` to `nusantara_arm64_process_scheduler_exit`.
- Return the selected process frame only when the scheduler reports success.
- When the final process exits, the process scheduler deactivates its address space and installs the configured kernel root. If a valid, aligned EL1h idle frame was supplied, the adapter returns that frame; otherwise it returns NULL so exception dispatch fails closed rather than restoring a dead user process.
- Keep process reclamation separate: a terminated process must be reaped only after its address space is no longer active.

## Validation

The Phase 122 host integration contract compiles with strict C11 warnings as errors. It exercises two process bindings, user write, A-to-B yield, B exit back to A, and final A exit to the kernel idle frame. This is a host contract test; it does not claim QEMU execution, timer preemption, or physical-hardware certification.

## Safety constraints

- The idle frame must be a prepared EL1h frame with a nonzero ELR and 16-byte alignment.
- A failed scheduler switch returns NULL to the exception dispatcher.
- No terminated process is freed from inside its own syscall; reclamation remains a separate scheduler/reaper responsibility.
