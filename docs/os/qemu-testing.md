# Pengujian Boot Native Menggunakan Emulator QEMU

## 1. Menjalankan Boot Native
Untuk mengeksekusi biner kernel secara langsung pada emulator QEMU:
```bash
nusantara os run biner/kernel.elf
```
Atau menggunakan script helper:
```bash
./scripts/run-qemu biner/kernel.elf
```

## 2. Pengujian Headless Otomatis dengan Sentinel Verifikasi
NUSANTARA OS menggunakan sentinel teks unik yang dipancarkan oleh kernel 64-bit melalui port serial UART 16550 COM1:
```
NUSANTARA_KERNEL_BOOT_OK
```

Jalankan pengujian terotomasi:
```bash
./scripts/test-qemu biner/kernel.elf
```

Skrip ini akan:
1. Memulai QEMU headless dengan flag `-serial file:qemu-serial.log`.
2. Menghubungkan perangkat `isa-debug-exit` untuk terminasi terkendali.
3. Menunggu output kernel dengan timeout 5 detik.
4. Memvalidasi keberadaan string `NUSANTARA_KERNEL_BOOT_OK` dalam berkas `qemu-serial.log`.
5. Memberikan kode status `0` (QEMU_BOOT_PASS) atau `1` (QEMU_BOOT_FAIL).

## 3. Pemisahan Status Uji
- **QEMU_BOOT_PASS**: Kernel berhasil boot di emulator QEMU sungguhan dan memancarkan sentinel.
- **SIMULATION_ONLY**: Emulator QEMU tidak ada di host; sistem menjalankan simulasi virtual kernel internal secara aman dan transparan tanpa mengklaim kelulusan QEMU.
