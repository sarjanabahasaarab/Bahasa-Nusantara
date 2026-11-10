# Arsitektur Booting Kernel NUSANTARA OS (x86_64)

## 1. Ikhtisar Alur Booting
Booting kernel NUSANTARA OS mengikuti urutan fase standar bare-metal x86_64:

```
[BIOS / UEFI]
       │
       ▼
[Bootloader: GRUB 2 / QEMU -kernel]
       │ Memuat biner ELF64 ke memori fisik (1 MiB / 0x00100000)
       ▼
[Entry Point 32-bit: _start (boot.S)]
       │ - Matikan interupsi (CLI)
       │ - Validasi magic Multiboot2 (EAX = 0x36D76289)
       │ - Simpan pointer Multiboot2 info (EBX)
       ▼
[Deteksi CPUID & Long Mode Support]
       │ - Uji EFLAGS ID bit (CPUID capability)
       │ - CPUID extended 0x80000001 (Long Mode bit 29 di EDX)
       ▼
[Inisialisasi Tabel Halaman 4-Level Awal]
       │ - PML4, PDPT, PD (2 MiB Huge Pages)
       │ - Identity mapping (0 s.d. 2 MiB)
       │ - Higher-half mapping (0xFFFF800000000000 s.d. +2 MiB)
       ▼
[Aktivasi Long Mode x86_64]
       │ - Muat CR3 dengan PML4
       │ - Aktifkan CR4.PAE (bit 5)
       │ - Aktifkan IA32_EFER.LME (bit 8 di MSR 0xC0000080)
       │ - Aktifkan CR0.PG (Paging) & CR0.PE (Protected Mode)
       ▼
[Pemuatan GDT 64-bit & Far Jump]
       │ - lgdt [gdt64_ptr]
       │ - ljmp $0x08, $long_mode_entry
       ▼
[Entry Point 64-bit: kernel_entry.S]
       │ - Set segment register data (DS, ES, SS = 0x10)
       │ - Setup stack pointer 64-bit (RSP)
       │ - Inisialisasi UART 16550 serial COM1 (0x3F8)
       │ - Pancarkan sentinel wajib: NUSANTARA_KERNEL_BOOT_OK
       ▼
[Kernel Main Loop & Runtime]
       │ - Inisialisasi PMM, VMM, IDT, PIC, Timer, VFS
       ▼
[Kernel Running]
```

## 2. Pemisahan Lingkungan
1. **Mode 32-bit Protected Mode**: Diberikan oleh bootloader Multiboot2, paging nonaktif.
2. **Mode 64-bit Long Mode (Sub-mode 64-bit)**: Diaktifkan melalui bootstrap assembly `boot.S` sebelum kode kernel Nusantara dijalankan.
