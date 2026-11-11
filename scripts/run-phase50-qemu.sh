#!/usr/bin/env bash
set -e

ARTIFACTS_DIR="artifacts/phase50"
LOG_FILE="${ARTIFACTS_DIR}/serial.log"
ISO_FILE="${ARTIFACTS_DIR}/nusantara-phase50.iso"
EXIT_CODE_FILE="${ARTIFACTS_DIR}/qemu-exit-code.txt"
TIMEOUT_SEC=10

mkdir -p "$ARTIFACTS_DIR"

echo "======================================================================"
echo "    NUSANTARA OS PHASE 50: QEMU HEADLESS BARE-METAL VALIDATION RUNNER  "
echo "======================================================================"

# 1. Periksa ketersediaan toolchain
echo "[1/7] Memeriksa status toolchain host..."
./scripts/check-toolchain.sh

# 2. Bangun biner ELF dan artefak
echo "[2/7] Membangun kernel ELF, user ELFs, dan ISO..."
npm run build:artifacts-v50

# 3. Validasi struktur biner ELF
echo "[3/7] Memvalidasi struktur biner kernel dan aplikasi pengguna..."
if [ -f "$ARTIFACTS_DIR/elf-validation.txt" ]; then
    cat "$ARTIFACTS_DIR/elf-validation.txt"
fi

# 4. Periksa ketersediaan QEMU
echo "[4/7] Memeriksa ketersediaan emulator QEMU x86_64..."
if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
    echo "======================================================================"
    echo "[PERINGATAN TRANSPARAN] qemu-system-x86_64 TIDAK TERPASANG di host ini."
    echo "Status Eksekusi Hardware : NOT EXECUTED / SIMULATION_ONLY"
    echo "Status Kesiapan CI       : CI_READY (.github/workflows/kernel-boot-qemu.yml)"
    echo "Sertifikasi QEMU aktual akan dijalankan pada runner CI Ubuntu GitHub Actions."
    echo "======================================================================"
    
    echo "STATUS: NOT EXECUTED (Toolchain missing on host container)" > "$EXIT_CODE_FILE"
    echo "REASON: qemu-system-x86_64 is not installed in the local environment." >> "$EXIT_CODE_FILE"
    exit 0
fi

# 5. Eksekusi QEMU Headless jika qemu terpasang
echo "[5/7] Menjalankan QEMU headless dengan monitor serial (Timeout: ${TIMEOUT_SEC}s)..."
rm -f "$LOG_FILE"

QEMU_EXIT=0
timeout --kill-after=2s "${TIMEOUT_SEC}s" qemu-system-x86_64 \
    -cdrom "$ISO_FILE" \
    -boot d \
    -m 512M \
    -serial file:"$LOG_FILE" \
    -display none \
    -no-reboot \
    -no-shutdown \
    -device isa-debug-exit,iobase=0xf4,iosize=0x04 || QEMU_EXIT=$?

echo "Kode Keluar QEMU mentah: $QEMU_EXIT"

# 6. Analisis Exit Code Berdasarkan Kontrak Port 0xF4
# Pada isa-debug-exit: exit_code = (val << 1) | 1
# val = 0x00 (SUCCESS) -> exit_code = 1
# val = 0x01 (PANIC)   -> exit_code = 3
# timeout              -> exit_code = 124
echo "[6/7] Menganalisis kode keluar dan serial output..."
STATUS_ANALYSIS="UNKNOWN"

if [ "$QEMU_EXIT" -eq 1 ]; then
    STATUS_ANALYSIS="EXPECTED_SUCCESS (Port 0xF4 val=0x00)"
elif [ "$QEMU_EXIT" -eq 3 ]; then
    STATUS_ANALYSIS="KERNEL_PANIC (Port 0xF4 val=0x01)"
elif [ "$QEMU_EXIT" -eq 124 ]; then
    STATUS_ANALYSIS="TIMEOUT (Kernel loop menggantung / tidak selesai dalam ${TIMEOUT_SEC}s)"
else
    STATUS_ANALYSIS="QEMU_ERROR / CRASH (Kode keluar tak terduga: $QEMU_EXIT)"
fi

echo "Hasil Analisis: $STATUS_ANALYSIS"
echo "QEMU_RAW_EXIT_CODE: $QEMU_EXIT" > "$EXIT_CODE_FILE"
echo "ANALYSIS: $STATUS_ANALYSIS" >> "$EXIT_CODE_FILE"

# 7. Verifikasi Keberadaan Seluruh 18 Sentinel Serial
echo "[7/7] Memverifikasi seluruh 18 sentinel diagnostik di serial log..."
SENTINELS=(
    "NUSANTARA_BOOT_START"
    "NUSANTARA_MULTIBOOT2_OK"
    "NUSANTARA_CPU_LONG_MODE_OK"
    "NUSANTARA_PAGING_OK"
    "NUSANTARA_GDT64_OK"
    "NUSANTARA_LONG_MODE_ENTERED"
    "NUSANTARA_IDT_OK"
    "NUSANTARA_MEMORY_MANAGER_OK"
    "NUSANTARA_KERNEL_MAIN_ENTERED"
    "NUSANTARA_KERNEL_BOOT_OK"
    "NUSANTARA_USERMODE_ENTERED"
    "HELLO FROM NUSANTARA USER MODE"
    "NUSANTARA_SYSCALL_OK"
    "NUSANTARA_PROCESS_EXIT_OK"
    "NUSANTARA_PROCESS_ISOLATION_OK"
    "NUSANTARA_USER_FAULT_ISOLATED"
    "NUSANTARA_KERNEL_SURVIVED_USER_FAULT"
    "NUSANTARA_USERMODE_TEST_PASS"
)

TOTAL_SENTINELS=${#SENTINELS[@]}
FOUND_COUNT=0

if [ -f "$LOG_FILE" ]; then
    echo "======================================================================"
    echo "                        SERIAL UART LOG DITEMUKAN                     "
    echo "======================================================================"
    cat "$LOG_FILE"
    echo "======================================================================"

    for s in "${SENTINELS[@]}"; do
        if grep -F -q "$s" "$LOG_FILE"; then
            ((FOUND_COUNT++))
            echo "  [✓] $s"
        else
            echo "  [✗] $s (TIDAK DITEMUKAN)"
        fi
    done
else
    echo "[PERINGATAN] Berkas serial log tidak ditemukan."
fi

echo "----------------------------------------------------------------------"
echo "Sentinel Ditemukan: $FOUND_COUNT / $TOTAL_SENTINELS"

if [ "$FOUND_COUNT" -eq "$TOTAL_SENTINELS" ] && [ "$QEMU_EXIT" -eq 1 ]; then
    echo "======================================================================"
    echo "     [QEMU_CERTIFICATION_PASS] SELURUH TAHAPAN KERNEL & USER MODE OK! "
    echo "======================================================================"
    exit 0
else
    echo "======================================================================"
    echo "     [QEMU_CERTIFICATION_FAIL] Pengujian belum memenuhi seluruh syarat."
    echo "======================================================================"
    exit 1
fi
