# Panduan Pemecahan Masalah (Troubleshooting) NUSANTARA OS

## 1. Emulator QEMU Tidak Ditemukan
**Penyebab:** Biner `qemu-system-x86_64` belum terpasang di sistem host atau belum masuk ke variabel lingkungan `PATH`.
**Solusi:**
- Jalankan pemeriksaan: `nusantara os toolchain`
- Pasang paket QEMU sesuai sistem operasi host:
  - Ubuntu/Debian: `sudo apt-get install -y qemu-system-x86`
  - Arch Linux: `sudo pacman -S qemu-system-x86`
  - macOS: `brew install qemu`
  - Windows: `winget install SoftwareFreedomConservancy.QEMU`
- Sebagai alternatif, jalankan simulasi internal: `nusantara os simulate`

## 2. Header Multiboot2 Gagal Terbaca
**Penyebab:** Magic header tidak berada di dalam 32768 byte pertama berkas ELF atau checksum tidak menghasilkan jumlah 0.
**Solusi:**
- Jalankan inspeksi: `nusantara os inspect-boot biner/kernel.elf`
- Periksa linker script `linker.ld` untuk memastikan bagian `.multiboot2` dimuat pada alamat fisik 1 MiB (`0x00100000`) sebelum bagian kode lainnya.

## 3. QEMU Menampilkan Triple Fault / Reboot Berulang
**Penyebab:** CPU mengalami exception tetapi IDT belum siap, atau terjadi kesalahan pada tabel halaman (Page Fault sebelum handler terpasang).
**Solusi:**
- Jalankan QEMU dengan opsi `-no-reboot -d int,cpu_reset`:
  ```bash
  qemu-system-x86_64 -kernel biner/kernel.elf -serial stdio -display none -no-reboot -d int,cpu_reset
  ```
- Periksa log serial `qemu-serial.log` atau gunakan debugger GDB via `./scripts/debug-qemu`.
