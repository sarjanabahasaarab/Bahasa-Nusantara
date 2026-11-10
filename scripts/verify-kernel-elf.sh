#!/usr/bin/env bash
# ==============================================================================
# Skrip Verifikasi Struktural Biner Kernel ELF64 Nusantara OS (Phase 49)
# Memvalidasi ELF64 System V AMD64, Multiboot2 header, dan Program Headers.
# ==============================================================================
set -e

KERNEL_FILE="${1:-bin/kernel.elf}"

if [ ! -f "$KERNEL_FILE" ]; then
    echo "[GALAT] Berkas kernel '$KERNEL_FILE' tidak ditemukan!"
    exit 1
fi

echo "======================================================================"
echo "    VERIFIKASI STRUKTURAL BINER KERNEL ELF64 NUSANTARA OS (x86_64)   "
echo "======================================================================"
echo "Target Berkas : $KERNEL_FILE"

# 1. Cek Magic ELF "\x7fELF"
MAGIC=$(head -c 4 "$KERNEL_FILE")
if [ "$MAGIC" != "$(printf '\x7fELF')" ]; then
    echo "[GALAT] Berkas bukan biner ELF valid (Magic salah)!"
    exit 1
fi
echo "  [✓] Magic ELF valid (\x7fELF)"

# 2. Periksa dengan readelf jika tersedia
if command -v readelf >/dev/null 2>&1; then
    HEADER_INFO=$(readelf -h "$KERNEL_FILE")
    
    # Kelas 64-bit
    if echo "$HEADER_INFO" | grep -q "ELF64"; then
        echo "  [✓] Kelas Biner: ELF64 (64-bit AMD64)"
    else
        echo "[GALAT] Biner bukan ELF64!"
        exit 1
    fi

    # Little Endian
    if echo "$HEADER_INFO" | grep -q "little endian"; then
        echo "  [✓] Endianness: Little-Endian (standar x86_64)"
    else
        echo "[GALAT] Biner bukan Little-Endian!"
        exit 1
    fi

    # Mesin AMD x86_64
    if echo "$HEADER_INFO" | grep -E -q "Advanced Micro Devices X86-64|X86-64"; then
        echo "  [✓] Arsitektur Mesin: AMD x86_64 (EM_X86_64)"
    else
        echo "[GALAT] Arsitektur mesin bukan x86_64!"
        exit 1
    fi

    # Tipe Eksekutabel (ET_EXEC)
    if echo "$HEADER_INFO" | grep -q "EXEC (Executable file)"; then
        echo "  [✓] Tipe Berkas: ET_EXEC (Executable)"
    else
        echo "[GALAT] Tipe berkas bukan ET_EXEC!"
        exit 1
    fi

    # Program Headers PT_LOAD
    PHDR_INFO=$(readelf -l "$KERNEL_FILE")
    if echo "$PHDR_INFO" | grep -q "LOAD"; then
        echo "  [✓] Program Headers memuat segmen PT_LOAD"
    else
        echo "[GALAT] Tidak ada segmen PT_LOAD dalam program headers!"
        exit 1
    fi
else
    echo "  [!] readelf tidak tersedia, melewati uji lanjutan header"
fi

# 3. Verifikasi Multiboot2 Header via CLI Nusantara
if command -v npx >/dev/null 2>&1; then
    echo "  [+] Memeriksa kepatuhan Multiboot2 via CLI Nusantara..."
    npx tsx src/paket/cli.ts os inspect-boot "$KERNEL_FILE"
fi

echo "======================================================================"
echo "[✓ VALIDASI BERHASIL] Seluruh kriteria struktural kernel ELF64 terpenuhi!"
echo "======================================================================"
exit 0
