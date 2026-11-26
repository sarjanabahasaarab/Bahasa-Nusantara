#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-/tmp/nusantara-phase111/Image}"
BUILD="/tmp/nusantara-phase111-build"
mkdir -p "$BUILD" "$(dirname "$OUT")"
cd "$ROOT"
COMMON=(--target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2
  -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only
  -Wall -Wextra -Werror -pedantic -Isrc/runtime/os/arch/arm64)
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/phase111-qemu.c -o "$BUILD/phase111-qemu.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/mmu-control.c -o "$BUILD/mmu-control.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/exception-vectors.S -o "$BUILD/exception-vectors.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/phase111-entry.S -o "$BUILD/phase111-entry.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/phase111-user.S -o "$BUILD/phase111-user.o"
ld.lld -m aarch64elf -nostdlib -T src/runtime/os/arch/arm64/phase111-image.ld \
  -o "$BUILD/nusantara-phase111.elf" \
  "$BUILD/phase111-entry.o" "$BUILD/exception-vectors.o" "$BUILD/phase111-user.o" \
  "$BUILD/phase111-qemu.o" "$BUILD/mmu-control.o"
llvm-readelf -h "$BUILD/nusantara-phase111.elf" | grep -Eq 'Machine:.*AArch64'
llvm-objcopy -O binary "$BUILD/nusantara-phase111.elf" "$OUT"
test -s "$OUT"
echo "Phase 111 MMU permission-fault image built: $OUT"
