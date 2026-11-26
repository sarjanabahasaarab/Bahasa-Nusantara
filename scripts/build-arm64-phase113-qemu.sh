#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$1"
BUILD="/tmp/nusantara-phase113-build"
mkdir -p "$BUILD" "$(dirname "$OUT")"
cd "$ROOT"
for source in phase113-qemu address-space mmu mmu-control exception; do
  clang --target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2 \
    -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only \
    -Wall -Wextra -Werror -pedantic -Isrc/runtime/os/arch/arm64 \
    -c "src/runtime/os/arch/arm64/$source.c" -o "$BUILD/$source.o"
done
for source in phase113-entry exception-vectors phase113-user; do
  clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
    -c "src/runtime/os/arch/arm64/$source.S" -o "$BUILD/$source.o"
done
ld.lld -m aarch64elf -nostdlib -T src/runtime/os/arch/arm64/phase113-image.ld \
  -o "$BUILD/nusantara-phase113.elf" \
  "$BUILD/phase113-entry.o" "$BUILD/exception-vectors.o" "$BUILD/phase113-user.o" \
  "$BUILD/phase113-qemu.o" "$BUILD/address-space.o" "$BUILD/mmu.o" \
  "$BUILD/mmu-control.o" "$BUILD/exception.o"
llvm-readelf -h "$BUILD/nusantara-phase113.elf" | grep -Eq 'Machine:.*AArch64'
llvm-objcopy -O binary "$BUILD/nusantara-phase113.elf" "$OUT"
test -s "$OUT"
echo "Phase 113 process-isolation image built: $OUT"
