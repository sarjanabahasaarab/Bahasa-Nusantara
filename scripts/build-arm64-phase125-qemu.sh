#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$1"
BUILD="/tmp/nusantara-phase125-build"
mkdir -p "$BUILD" "$(dirname "$OUT")"
cd "$ROOT"
for source in phase125-qemu address-space mmu mmu-control exception \
              elf64-loader elf64-load process-bootstrap process-scheduler \
              gicv3 generic_timer irq-runtime irq-scheduler; do
  clang --target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2 \
    -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only \
    -Wall -Wextra -Werror -pedantic -Isrc/runtime/os/arch/arm64 \
    -Isrc/runtime/os/arch/arm64/freestanding -Isrc/runtime/os/scheduler \
    -c "src/runtime/os/arch/arm64/$source.c" -o "$BUILD/$source.o"
done
clang --target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2 \
  -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only \
  -Wall -Wextra -Werror -pedantic -Isrc/runtime/os/arch/arm64/freestanding \
  -c src/runtime/os/arch/arm64/freestanding/memory.c -o "$BUILD/memory.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/phase125-entry.S -o "$BUILD/phase125-entry.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/exception-vectors.S -o "$BUILD/exception-vectors.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2 \
  -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only \
  -Wall -Wextra -Werror -pedantic -Isrc/runtime/os/scheduler \
  -c src/runtime/os/scheduler/scheduler.c -o "$BUILD/scheduler.o"
ld.lld -m aarch64elf -nostdlib -T src/runtime/os/arch/arm64/phase117-image.ld \
  -o "$BUILD/nusantara-phase125.elf" \
  "$BUILD/phase125-entry.o" "$BUILD/exception-vectors.o" "$BUILD/phase125-qemu.o" \
  "$BUILD/address-space.o" "$BUILD/mmu.o" "$BUILD/mmu-control.o" "$BUILD/exception.o" \
  "$BUILD/elf64-loader.o" "$BUILD/elf64-load.o" "$BUILD/process-bootstrap.o" \
  "$BUILD/process-scheduler.o" "$BUILD/gicv3.o" "$BUILD/generic_timer.o" \
  "$BUILD/irq-runtime.o" "$BUILD/irq-scheduler.o" "$BUILD/scheduler.o" "$BUILD/memory.o"
llvm-readelf -h "$BUILD/nusantara-phase125.elf" | grep -Eq 'Machine:.*AArch64'
llvm-objcopy -O binary "$BUILD/nusantara-phase125.elf" "$OUT"
test -s "$OUT"
echo "Phase 125 private-memory scheduling image built: $OUT"
