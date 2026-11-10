# Spesifikasi Bootloader & Protokol Boot NUSANTARA OS

## 1. Protokol Terpilih: Multiboot2 Specification
NUSANTARA OS secara resmi mengadopsi protokol **Multiboot2 Specification** (Free Software Foundation) sebagai antarmuka bootloader bare-metal default.

### Alasan Pemilihan:
1. **Dukungan Universal**: Didukung secara native oleh GRUB 2, QEMU (`-kernel`), dan Limine.
2. **Fleksibilitas Informasi Boot**: Menyediakan tag informasi memori (E820/BIOS memory map), modul kernel, framebuffer grafis, dan command line arguments.
3. **Standarisasi Teruji**: Menghilangkan ketergantungan pada kode bootstrap BIOS 16-bit real mode.

## 2. Kontrak Saat Menyerahkan Kendali
Bootloader Multiboot2 menjamin kondisi CPU berikut saat melompat ke entry point `_start`:
- **EAX**: Memuat magic number `0x36D76289` (MULTIBOOT2_BOOTLOADER_MAGIC).
- **EBX**: Memuat alamat fisik 32-bit dari struktur informasi Multiboot2.
- **CS**: 32-bit read/execute code segment dengan offset base `0x0` dan limit `0xFFFFFFFF`.
- **DS, ES, FS, GS, SS**: 32-bit read/write data segment dengan offset base `0x0` dan limit `0xFFFFFFFF`.
- **A20 Gate**: Sudah aktif.
- **CR0**: Bit 0 (PE) bernilai 1, Bit 31 (PG) bernilai 0 (Paging NONAKTIF).
- **EFLAGS**: Bit 9 (IF) bernilai 0 (Interupsi MATI).
