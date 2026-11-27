/* SPDX-License-Identifier: Apache-2.0 */
OUTPUT_FORMAT("elf64-littleaarch64")
OUTPUT_ARCH(aarch64)
ENTRY(_image_start)
SECTIONS {
  . = 0x40080000;
  _image_start = .;
  .text : ALIGN(0x800) {
    KEEP(*(.text.boot.header))
    *(.text.boot)
    *(.text.exception_vectors)
    *(.text*)
  }
  .rodata : ALIGN(16) { *(.rodata*) }
  .data : ALIGN(16) { *(.data*) }
  .bss (NOLOAD) : ALIGN(4096) {
    __bss_start = .;
    *(.bss.stack) *(.bss*) *(COMMON)
    . = ALIGN(4096);
    __bss_end = .;
  }
  _image_end = .;
  /DISCARD/ : { *(.comment) *(.note*) *(.eh_frame*) }
}
