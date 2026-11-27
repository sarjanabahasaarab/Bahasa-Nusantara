# Phase 115 — ARM64 EL0 Process Bootstrap

## Scope

Phase 115 verifies the initial AArch64 exception frame needed to start a loaded
static ELF process at EL0t. It uses the existing
`nusantara_arm64_exception_user_context_prepare` implementation.

## Verified contract

- The kernel exception frame is 16-byte aligned and fits in the supplied kernel stack.
- ELR_EL1 is initialized to the validated user ELF entry point.
- SPSR_EL1 selects EL0t.
- SP_EL0 receives a 16-byte-aligned user stack top.
- X0 carries the initial argument and X30 carries the process-exit trampoline.
- Remaining general-purpose registers and exception metadata start at zero.
- Invalid entry, undersized kernel stack, and unaligned user stack are rejected.

## Not yet implemented or certified

This phase's test does not allocate/map a user stack, install TTBR0, execute ERET
under QEMU, implement a process scheduler, or implement a real exit syscall.
The return address is a supplied trampoline address; its executable mapping and
exit service remain the responsibility of later process-runtime work.
