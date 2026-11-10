# Linker Script Higher-Half Kernel x86_64

## 1. Tata Letak Memori
Linker script menempatkan biner pada alamat fisik 1 MiB (`0x00100000`) untuk menghindari tabrakan dengan BIOS/VGA memory di bawah 1 MiB, dan memetakan kode kernel ke virtual higher-half address space:

```ld
ENTRY(_start)

KERNEL_PHYS_BASE = 0x00100000;
KERNEL_VIRT_BASE = 0xFFFF800000000000;

SECTIONS
{
    . = KERNEL_PHYS_BASE;

    .boot ALIGN(4K) :
    {
        _boot_start = .;
        *(.multiboot2)
        *(.boot_text)
        *(.boot_data)
        _boot_end = .;
    }

    . += KERNEL_VIRT_BASE;
    _kernel_start = .;

    .text ALIGN(4K) : AT(ADDR(.text) - KERNEL_VIRT_BASE)
    {
        *(.text .text.*)
    }

    .rodata ALIGN(4K) : AT(ADDR(.rodata) - KERNEL_VIRT_BASE)
    {
        *(.rodata .rodata.*)
    }

    .data ALIGN(4K) : AT(ADDR(.data) - KERNEL_VIRT_BASE)
    {
        *(.data .data.*)
    }

    .bss ALIGN(4K) : AT(ADDR(.bss) - KERNEL_VIRT_BASE)
    {
        _bss_start = .;
        *(COMMON)
        *(.bss .bss.*)
        _bss_end = .;
    }

    _kernel_end = .;
}
```

## 2. Parameter Kunci
- `AT(...)`: Menentukan alamat pemuatan fisik (Physical Load Address) yang berbeda dengan alamat tautan virtual (Virtual Link Address).
- `ALIGN(4K)`: Memastikan setiap bagian sejajar dengan batas halaman 4 KiB x86_64 untuk memudahkan penetapan hak akses halaman paging (Read-Only, Writable, NX bit).
