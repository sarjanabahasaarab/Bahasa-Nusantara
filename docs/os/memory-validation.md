# Validasi Manajemen Memori Kernel: PMM, VMM, & Heap

## 1. Physical Memory Manager (PMM)
- **Bitmap Allocator**: Setiap bit mewakili 1 frame halaman fisik berukuran 4 KiB (4096 byte).
- **Reservasi Memori Perangkat Keras**:
  - Alamat `0x00000000` s.d. `0x000FFFFF` (1 MiB pertama): Direservasi untuk IVT, BDA, BIOS data, VGA buffer (`0xB8000`), dan kernel image.
  - Alamat `0xFEC00000` (IOAPIC) dan `0xFEE00000` (Local APIC).
- **Alokasi DMA Kontinu**: Fungsi `allocateContiguous(count, align)` menjamin frame-frame bersebelahan di memori fisik untuk perangkat berkecepatan tinggi tanpa dispersi.

## 2. Virtual Memory Manager (VMM)
- **4-Level Paging (x86_64)**:
  - `PML4` (Level 4): Bit 47..39 dari alamat virtual.
  - `PDPT` (Level 3): Bit 38..30.
  - `PD` (Level 2): Bit 29..21.
  - `PT` (Level 1): Bit 20..12.
  - Offset Halaman: Bit 11..0.
- **Penegakan Izin Halaman**:
  - Present bit (bit 0): Halaman aktif di RAM.
  - Read/Write bit (bit 1): Proteksi penulisan memori.
  - User/Supervisor bit (bit 2): Akses user space dilarang menyentuh ruang kernel.
  - No-Execute (NX) bit (bit 63): Mencegah eksekusi kode pada segmen data/stack.

## 3. Kernel Heap Allocator
- Dilengkapi header biner `HeapAllocationHeader` dengan magic number validasi (`0x4E555341` / 'NUSA').
- Mencegah *double-free* dan menolak pointer sembarang yang tidak berasal dari heap kernel aktif.
