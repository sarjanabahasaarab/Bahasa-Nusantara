#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$1"
BUILD="/tmp/nusantara-phase119-build"
mkdir -p "$BUILD" "$(dirname "$OUT")"
cd "$ROOT"
for source in phase119-qemu address-space mmu mmu-control exception \
              elf64-loader elf64-load process-bootstrap user-syscall user-memory; do
  clang --target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2 \
    -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only \
    -Wall -Wextra -Werror -pedantic -Isrc/runtime/os/arch/arm64 \
    -Isrc/runtime/os/arch/arm64/freestanding \
    -c "src/runtime/os/arch/arm64/$source.c" -o "$BUILD/$source.o"
done
clang --target=aarch64-none-elf -mcpu=cortex-a57 -std=c11 -O2 \
  -ffreestanding -fno-builtin -fno-stack-protector -fno-pic -mgeneral-regs-only \
  -Wall -Wextra -Werror -pedantic -Isrc/runtime/os/arch/arm64/freestanding \
  -c src/runtime/os/arch/arm64/freestanding/memory.c -o "$BUILD/memory.o"
for source in phase119-entry exception-vectors; do
  clang --target=aarch64-none-elf -mcpu=cortex-a57 -ffreestanding -fno-stack-protector \
    -c "src/runtime/os/arch/arm64/$source.S" -o "$BUILD/$source.o"
done
ld.lld -m aarch64elf -nostdlib -T src/runtime/os/arch/arm64/phase117-image.ld \
  -o "$BUILD/nusantara-phase119.elf" \
  "$BUILD/phase119-entry.o" "$BUILD/exception-vectors.o" \
  "$BUILD/phase119-qemu.o" "$BUILD/address-space.o" "$BUILD/mmu.o" \
  "$BUILD/mmu-control.o" "$BUILD/exception.o" "$BUILD/elf64-loader.o" \
  "$BUILD/elf64-load.o" "$BUILD/process-bootstrap.o" \
  "$BUILD/user-syscall.o" "$BUILD/memory.o"
llvm-readelf -h "$BUILD/nusantara-phase119.elf" | grep -Eq 'Machine:.*AArch64'
llvm-objcopy -O binary "$BUILD/nusantara-phase119.elf" "$OUT"
test -s "$OUT"
echo "Phase 118 EL0 syscall image built: $OUT"
