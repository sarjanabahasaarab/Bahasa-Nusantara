#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-/tmp/nusantara-phase108/Image}"
BUILD="/tmp/nusantara-phase108-build"
mkdir -p "$BUILD" "$(dirname "$OUT")"
cd "$ROOT"
COMMON=(--target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2
  -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only
  -Wall -Wextra -Werror -pedantic
  -Isrc/runtime/os/arch/arm64)
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/phase108-qemu.c -o "$BUILD/phase108-qemu.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/exception.c -o "$BUILD/exception.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/exception-router.c -o "$BUILD/exception-router.o"
clang "${COMMON[@]}" -c src/runtime/os/arch/arm64/user-syscall.c -o "$BUILD/user-syscall.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/exception-vectors.S -o "$BUILD/exception-vectors.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/phase108-entry.S -o "$BUILD/phase108-entry.o"
clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
  -c src/runtime/os/arch/arm64/phase108-user.S -o "$BUILD/phase108-user.o"
ld.lld -m aarch64elf -nostdlib -T src/runtime/os/arch/arm64/phase108-image.ld \
  -o "$BUILD/nusantara-phase108.elf" \
  "$BUILD/phase108-entry.o" "$BUILD/exception-vectors.o" "$BUILD/phase108-user.o" \
  "$BUILD/phase108-qemu.o" "$BUILD/exception.o" "$BUILD/exception-router.o" "$BUILD/user-syscall.o"
llvm-readelf -h "$BUILD/nusantara-phase108.elf" | grep -Eq 'Machine:.*AArch64'
llvm-objcopy -O binary "$BUILD/nusantara-phase108.elf" "$OUT"
test -s "$OUT"
echo "Phase 108 EL0 QEMU Image built: $OUT"
