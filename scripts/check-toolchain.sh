#!/usr/bin/env bash
set -e

echo "======================================================================"
echo "          PEMERIKSAAN TOOLCHAIN HOST NUSANTARA OS KERNEL             "
echo "======================================================================"

check_tool() {
    local name="$1"
    local bin="$2"
    if command -v "$bin" >/dev/null 2>&1; then
        local ver=$("$bin" --version 2>/dev/null | head -n 1)
        if [ -z "$ver" ]; then
            ver=$("$bin" -v 2>&1 | head -n 1 || true)
        fi
        if [ -z "$ver" ]; then
            ver="Terpasang (versi tidak diketahui)"
        fi
        printf "  %-32s : [TERSEDIA] %s\n" "$name ($bin)" "$ver"
        return 0
    else
        printf "  %-32s : [MISSING] Tidak ditemukan pada PATH\n" "$name ($bin)"
        return 1
    fi
}

echo "Status Perangkat Toolchain Wajib (Phase 50 Verification):"
check_tool "QEMU x86_64 Emulator" "qemu-system-x86_64" || true
check_tool "Clang C/C++ Compiler" "clang" || true
check_tool "LLD Linker (ld.lld) " "ld.lld" || true
check_tool "LLD Linker (lld)    " "lld" || true
check_tool "Xorriso ISO Utility " "xorriso" || true
check_tool "GRUB mkrescue Tool  " "grub-mkrescue" || true
check_tool "GRUB file Validator " "grub-file" || true
check_tool "GRUB mkstandalone   " "grub-mkstandalone" || true
check_tool "NASM Assembler      " "nasm" || true
check_tool "GNU Make Utility    " "make" || true
check_tool "GNU C Compiler (GCC)" "gcc" || true
check_tool "Binary Objdump Tool " "objdump" || true
check_tool "ELF Reader Tool     " "readelf" || true
check_tool "SHA256 Hash Tool    " "sha256sum" || true
check_tool "Timeout Process Tool" "timeout" || true

echo "======================================================================"
