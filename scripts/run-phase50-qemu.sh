#!/usr/bin/env bash
set -euo pipefail

ARTIFACTS_DIR="artifacts/phase50"
LOG_FILE="${ARTIFACTS_DIR}/serial.log"
QEMU_LOG_FILE="${ARTIFACTS_DIR}/qemu.log"
BOOT_LOG_FILE="${ARTIFACTS_DIR}/boot.log"
DEBUG_LOG_FILE="${ARTIFACTS_DIR}/qemu-debug.log"
SENTINEL_REPORT_FILE="${ARTIFACTS_DIR}/qemu-sentinel-report.json"
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
rm -f "$LOG_FILE" "$QEMU_LOG_FILE" "$BOOT_LOG_FILE" "$DEBUG_LOG_FILE" "$SENTINEL_REPORT_FILE"

QEMU_EXIT=0
timeout --kill-after=2s "${TIMEOUT_SEC}s" qemu-system-x86_64 \
    -machine pc \
    -cpu qemu64,+nx \
    -cdrom "$ISO_FILE" \
    -boot d \
    -m 512M \
    -serial file:"$LOG_FILE" \
    -display none \
    -nographic \
    -no-reboot \
    -device isa-debug-exit,iobase=0xf4,iosize=0x04 \
    -d cpu_reset,guest_errors \
    -D "$DEBUG_LOG_FILE" || QEMU_EXIT=$?

echo "Kode Keluar QEMU mentah: $QEMU_EXIT"

if [ ! -f "$DEBUG_LOG_FILE" ]; then
    : > "$DEBUG_LOG_FILE"
fi

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

if [ -s "$DEBUG_LOG_FILE" ]; then
    echo "--- CUPLIKAN QEMU DEBUG LOG ($DEBUG_LOG_FILE) ---"
    tail -n 80 "$DEBUG_LOG_FILE"
fi

# 7. Validasi Strict 19 Sentinel, Anti-Duplikasi, Urutan, Panic, & SHA-256 Artefak
echo "[7/7] Menjalankan Strict 19-Sentinel Validator ($SENTINEL_REPORT_FILE)..."
VALIDATOR_EXIT=0
npx tsx scripts/validate-qemu-sentinels.ts \
    --serial "$LOG_FILE" \
    --debug-log "$DEBUG_LOG_FILE" \
    --artifacts-dir "$ARTIFACTS_DIR" \
    --json-out "$SENTINEL_REPORT_FILE" \
    --exit-code "$QEMU_EXIT" || VALIDATOR_EXIT=$?

if [ "$QEMU_EXIT" -ne 1 ] || [ "$VALIDATOR_EXIT" -ne 0 ]; then
    echo "======================================================================"
    echo "     [QEMU_CERTIFICATION_FAIL] Pengujian belum memenuhi seluruh syarat."
    echo "     QEMU_EXIT=$QEMU_EXIT | VALIDATOR_EXIT=$VALIDATOR_EXIT"
    echo "======================================================================"
    exit 1
fi

echo "[8/8] Menyinkronkan laporan sertifikasi dari bukti QEMU aktual..."
npx tsx scripts/finalize-phase50-certification.ts --artifacts-dir "$ARTIFACTS_DIR"

echo "======================================================================"
echo "     [QEMU_CERTIFICATION_PASS] SELURUH TAHAPAN KERNEL & USER MODE OK! "
echo "======================================================================"
exit 0
