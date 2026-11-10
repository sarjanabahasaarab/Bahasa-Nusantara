# Header & Tag Multiboot2 pada NUSANTARA OS

## 1. Format Header Multiboot2
Header Multiboot2 diletakkan pada 32768 byte pertama berkas biner ELF dan harus selaras 8-byte (64-bit boundary).

| Offset (Byte) | Field | Ukuran | Nilai / Deskripsi |
|---|---|---|---|
| 0 | `magic` | 4 bytes (u32) | `0xE85250D6` (MULTIBOOT2_HEADER_MAGIC) |
| 4 | `architecture` | 4 bytes (u32) | `0` (i386 32-bit protected mode entry) |
| 8 | `header_length` | 4 bytes (u32) | Total panjang header dalam byte (kelipatan 8) |
| 12 | `checksum` | 4 bytes (u32) | `-(magic + architecture + header_length)` |
| 16..N | `tags` | Variabel | Daftar Tag Multiboot2 |
| N..N+8 | `end_tag` | 8 bytes | Type 0, Flags 0, Size 8 |

## 2. Rumus Validasi Checksum
```c
(magic + architecture + header_length + checksum) == 0 (modulo 2^32)
```

## 3. Tag-Tag yang Didukung
- **Type 0 (End Tag)**: Menandai batas akhir tag dalam header (wajib).
- **Type 1 (Information Request)**: Meminta bootloader menyediakan tag tertentu (misal memory map, framebuffer).
- **Type 5 (Framebuffer Tag)**: Meminta inisialisasi mode grafis (resolusi 1024x768x32 bpp).

## 4. Perintah Inspeksi CLI
```bash
nusantara os inspect-boot biner/kernel.elf
```
Menampilkan seluruh field, hasil verifikasi checksum, dan kompatibilitas bootloader.
