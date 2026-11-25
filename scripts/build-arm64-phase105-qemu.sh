#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-/tmp/nusantara-phase105/Image}"
BUILD="/tmp/nusantara-phase105-build"
mkdir -p "$BUILD" "$(dirname "$OUT")"
cd "$ROOT"
COMMON=(--target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2
  -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only
  -Wall -Wextra -Werror -pedantic
  -Isrc/runtime/os/arch/arm64 -Isrc/runtime/os/scheduler)
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/phase105-qemu.c -o "$BUILD/phase105-qemu.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/exception.c -o "$BUILD/exception.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/generic_timer.c -o "$BUILD/generic_timer.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/irq-runtime.c -o "$BUILD/irq-runtime.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/gicv3.c -o "$BUILD/gicv3.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/irq-scheduler.c -o "$BUILD/irq-scheduler.o"
clang "${COMMON[@]}" -c src/runtime/os/scheduler/scheduler.c -o "$BUILD/scheduler.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/exception-vectors.S -o "$BUILD/exception-vectors.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/phase105-entry.S -o "$BUILD/phase105-entry.o"
ld.lld -m aarch64elf -nostdlib -T src/runtime/os/arch/arm64/phase105-image.ld \
  -o "$BUILD/nusantara-phase105.elf" \
  "$BUILD/phase105-entry.o" "$BUILD/exception-vectors.o" \
  "$BUILD/phase105-qemu.o" "$BUILD/exception.o" "$BUILD/generic_timer.o" \
  "$BUILD/irq-runtime.o" "$BUILD/gicv3.o" "$BUILD/irq-scheduler.o" "$BUILD/scheduler.o"
llvm-readelf -h "$BUILD/nusantara-phase105.elf" | grep -Eq 'Machine:.*AArch64'
echo "Phase 105 linked entry symbols:"
llvm-nm -n "$BUILD/nusantara-phase105.elf" | grep -E '(_start|nusantara_phase105_main|phase105_uart_puts)'
echo "Phase 105 C main disassembly:"
llvm-objdump -d --no-show-raw-insn "$BUILD/nusantara-phase105.elf" | sed -n '/<nusantara_phase105_main>:/,+48p'
if llvm-objdump -d --disassemble-symbols=nusantara_phase105_main "$BUILD/nusantara-phase105.elf" | grep -Eq '\\b(q[0-9]+|v[0-9]+)\\b'; then
  echo "Phase 105 C entry must not use FP/SIMD before context support is enabled" >&2
  exit 1
fi
llvm-objcopy -O binary "$BUILD/nusantara-phase105.elf" "$OUT"
test -s "$OUT"
echo "Phase 105 AArch64 Image built: $OUT"
