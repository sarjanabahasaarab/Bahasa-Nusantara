/* SPDX-License-Identifier: Apache-2.0
 * Phase 92: QEMU virt AArch64 Image layout.
 */
OUTPUT_FORMAT("elf64-littleaarch64")
OUTPUT_ARCH(aarch64)
ENTRY(_image_start)

SECTIONS
{
  . = 0x40080000;
  _image_start = .;

  .text : ALIGN(0x800) {
    KEEP(*(.text.boot.header))
    *(.text.boot)
    *(.text*)
  }

  .rodata : ALIGN(16) {
    *(.rodata*)
  }

  _image_end = .;

  .bss (NOLOAD) : ALIGN(16) {
    *(.bss.stack)
    *(.bss*)
    *(COMMON)
  }

  /DISCARD/ : {
    *(.comment)
    *(.note*)
    *(.eh_frame*)
  }
}
