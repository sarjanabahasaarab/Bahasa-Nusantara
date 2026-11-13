#!/usr/bin/env bash
set -euo pipefail

ARTIFACTS_DIR="artifacts/phase50"
LOG_FILE="${ARTIFACTS_DIR}/serial.log"
QEMU_LOG_FILE="${ARTIFACTS_DIR}/qemu.log"
BOOT_LOG_FILE="${ARTIFACTS_DIR}/boot.log"
DEBUG_LOG_FILE="${ARTIFACTS_DIR}/qemu-debug.log"
ISO_FILE="${ARTIFACTS_DIR}/nusantara-phase50.iso"
EXIT_CODE_FILE="${ARTIFACTS_DIR}/qemu-exit-code.txt"
TIMEOUT_SEC=15
SKIP_BUILD="${1:-}"

mkdir -p "$ARTIFACTS_DIR"

echo "======================================================================"
echo "    NUSANTARA OS PHASE 50: QEMU HEADLESS BARE-METAL VALIDATION RUNNER  "
echo "======================================================================"

# 1. Periksa ketersediaan toolchain
echo "[1/7] Memeriksa status toolchain host..."
./scripts/check-toolchain.sh

# 2. Bangun biner ELF dan ISO bootable (kecuali --skip-build)
if [ "$SKIP_BUILD" != "--skip-build" ]; then
    echo "[2/7] Membangun kernel ELF, user ELFs, dan GRUB2 ISO..."
    npm run build:artifacts-v50
else
    echo "[2/7] Melewati tahap build (--skip-build), memakai artefak staging..."
fi

# 3. Validasi struktur biner ELF
echo "[3/7] Memvalidasi struktur biner kernel dan aplikasi pengguna..."
if [ -f "$ARTIFACTS_DIR/elf-validation.txt" ]; then
    cat "$ARTIFACTS_DIR/elf-validation.txt"
fi

# 4. Periksa ketersediaan QEMU & ISO
echo "[4/7] Memeriksa ketersediaan emulator QEMU x86_64 dan ISO..."
if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
    echo "======================================================================"
    echo "[PERINGATAN TRANSPARAN] qemu-system-x86_64 TIDAK TERPASANG di host ini."
    echo "Status Eksekusi Hardware : NOT EXECUTED / SIMULATION_ONLY"
    echo "Status Kesiapan CI       : CI_READY (.github/workflows/kernel-boot-qemu.yml)"
    echo "Sertifikasi QEMU aktual akan dijalankan pada runner CI Ubuntu GitHub Actions."
    exit 0
fi

if [ ! -s "$ISO_FILE" ]; then
    echo "[GALAT FATAL] Image ISO bootable '$ISO_FILE' tidak ditemukan atau kosong!"
    echo "              Pastikan grub-mkrescue dan xorriso terpasang saat build artefak."
    exit 1
fi

# 5. Eksekusi QEMU Headless
echo "[5/7] Menjalankan QEMU headless dengan monitor serial (Timeout: ${TIMEOUT_SEC}s)..."
rm -f "$LOG_FILE" "$QEMU_LOG_FILE" "$BOOT_LOG_FILE" "$DEBUG_LOG_FILE"

QEMU_EXIT=0
timeout --kill-after=2s "${TIMEOUT_SEC}s" qemu-system-x86_64 \
    -cdrom "$ISO_FILE" \
    -boot d \
    -m 512M \
    -serial file:"$LOG_FILE" \
    -display none \
    -no-reboot \
    -no-shutdown \
    -device isa-debug-exit,iobase=0xf4,iosize=0x04 \
    -d cpu_reset \
    -D "$DEBUG_LOG_FILE" || QEMU_EXIT=$?

echo "Kode Keluar QEMU mentah: $QEMU_EXIT"

# Salin log serial aktual jika ada SEBELUM mengevaluasi kegagalan agar debugging tetap lengkap
if [ -f "$LOG_FILE" ]; then
    cp -f "$LOG_FILE" "$QEMU_LOG_FILE"
    cp -f "$LOG_FILE" "$BOOT_LOG_FILE"
fi

echo "======================================================================"
echo "                        SERIAL UART LOG MENTAH QEMU                   "
echo "======================================================================"
if [ -s "$LOG_FILE" ]; then
    cat "$LOG_FILE"
else
    echo "[PERINGATAN] Berkas serial log kosong atau tidak terbuat ($LOG_FILE)."
fi
echo "======================================================================"

# 6. Analisis Exit Code Berdasarkan Kontrak Port 0xF4
echo "[6/7] Menganalisis kode keluar dan diagnosa CPU..."
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

if [ "$QEMU_EXIT" -ne 1 ]; then
    if [ -s "$DEBUG_LOG_FILE" ]; then
        echo "--- CUPLIKAN QEMU DEBUG LOG ($DEBUG_LOG_FILE) ---"
        tail -n 60 "$DEBUG_LOG_FILE"
    fi
    echo "[GAGAL] QEMU berhenti dengan kode keluar $QEMU_EXIT ($STATUS_ANALYSIS)"
    exit 1
fi

if [ ! -s "$LOG_FILE" ]; then
    echo "[GAGAL] Serial log kosong meskipun QEMU keluar dengan kode 1!"
    exit 1
fi

if grep -q "NUSANTARA_KERNEL_PANIC" "$LOG_FILE"; then
    echo "[GAGAL] Kernel Panic terdeteksi di dalam log serial QEMU!"
    exit 1
fi

# 7. Verifikasi Keberadaan Seluruh 18 Sentinel Serial Secara Berurutan
echo "[7/7] Memverifikasi seluruh 18 sentinel diagnostik secara berurutan..."
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
LAST_LINE=0
ORDER_OK=true

for s in "${SENTINELS[@]}"; do
    MATCH_LINE=$(awk -v last="$LAST_LINE" -v pattern="$s" 'NR > last && index($0, pattern) { print NR; exit }' "$LOG_FILE")
    if [ -n "$MATCH_LINE" ]; then
        ((FOUND_COUNT++)) || true
        LAST_LINE=$MATCH_LINE
        echo "  [✓] Sentinel #$FOUND_COUNT (Baris $MATCH_LINE): $s"
    else
        echo "  [✗] Sentinel TIDAK DITEMUKAN SECARA BERURUTAN (setelah baris $LAST_LINE): $s"
        ORDER_OK=false
    fi
done

echo "----------------------------------------------------------------------"
echo "Sentinel Ditemukan Berurutan: $FOUND_COUNT / $TOTAL_SENTINELS"

if [ "$FOUND_COUNT" -eq "$TOTAL_SENTINELS" ] && [ "$ORDER_OK" = true ]; then
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
