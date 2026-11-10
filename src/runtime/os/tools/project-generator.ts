/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generator Struktur Proyek Kernel Nusantara (nusantara os new).
 * Target: Phase 49 (v0.49.0)
 */

import { generateKernelLinkerScript } from '../../../compiler/targets/kernel/kernel-linker-script.js';

export interface GeneratedKernelFile {
  path: string;
  content: string;
}

export interface ProjectGeneratorOptions {
  name: string;
  target?: string;
  bootProtocol?: 'multiboot2' | 'limine';
}

export class KernelProjectGenerator {
  public static generateManifest(options: ProjectGeneratorOptions): GeneratedKernelFile[] {
    const name = options.name || 'kernel-nusantara';
    const target = options.target || 'nusantara-x86_64-kernel';
    const bootProtocol = options.bootProtocol || 'multiboot2';

    const files: GeneratedKernelFile[] = [];

    // 1. nusantara.toml
    files.push({
      path: `${name}/nusantara.toml`,
      content: `[paket]
nama = "${name}"
versi = "0.1.0"
tipe = "kernel"
deskripsi = "Proyek Sistem Operasi Mandiri Berbasis Bahasa Nusantara"
penulis = ["Pengembang Nusantara"]
lisensi = "Apache-2.0"

[target.kernel]
arsitektur = "x86_64"
boot_protocol = "${bootProtocol}"
entry = "_start"
linker_script = "linker.ld"
load_address = "0x00100000"
virtual_base = "0xFFFF800000000000"
heap_size_kb = 16384
stack_size_kb = 64

[emulator]
default = "qemu"
qemu_binary = "qemu-system-x86_64"
qemu_memory = "128M"
qemu_serial = "stdio"
`,
    });

    // 2. nusantara.os.json
    files.push({
      path: `${name}/nusantara.os.json`,
      content: JSON.stringify(
        {
          nama: name,
          versi: '0.1.0',
          target,
          boot: {
            protokol: bootProtocol,
            header: 'multiboot2',
            entry: '_start',
            kernel_entry64: 'kernel_main',
          },
          memori: {
            heap_kb: 16384,
            stack_kb: 64,
            physical_base: '0x00100000',
            virtual_base: '0xFFFF800000000000',
          },
          drivers: ['serial_uart16550', 'vga_text', 'pit_timer', 'ps2_keyboard'],
        },
        null,
        2
      ) + '\n',
    });

    // 3. Linker script: linker.ld
    files.push({
      path: `${name}/linker.ld`,
      content: generateKernelLinkerScript({
        entryPoint: '_start',
        physicalBase: '0x00100000',
        virtualBase: '0xFFFF800000000000',
      }),
    });

    // 4. GRUB configuration: boot/grub/grub.cfg
    files.push({
      path: `${name}/boot/grub/grub.cfg`,
      content: `set timeout=0
set default=0

menuentry "NUSANTARA OS (${name}) x86_64" {
    multiboot2 /boot/${name}.elf
    boot
}
`,
    });

    // 5. 32-bit Assembly Bootstrap: src/boot/boot.S
    files.push({
      path: `${name}/src/boot/boot.S`,
      content: `/*
 * Nusantara Kernel Bootstrap (Multiboot2 to 64-bit Long Mode)
 * Target: x86_64 Bare-Metal
 */

.set MULTIBOOT2_MAGIC,    0xE85250D6
.set MULTIBOOT2_ARCH_32,  0
.set MULTIBOOT2_BOOT_MAGIC, 0x36D76289

.section .multiboot2, "a"
.align 8
multiboot2_header_start:
    .long MULTIBOOT2_MAGIC
    .long MULTIBOOT2_ARCH_32
    .long multiboot2_header_end - multiboot2_header_start
    .long -(MULTIBOOT2_MAGIC + MULTIBOOT2_ARCH_32 + (multiboot2_header_end - multiboot2_header_start))

    /* Tag Akhir (End Tag) */
    .short 0
    .short 0
    .long 8
multiboot2_header_end:

.section .boot_text, "ax"
.code32
.global _start
_start:
    cli
    cld

    /* 1. Verifikasi magic Multiboot2 */
    cmp %eax, MULTIBOOT2_BOOT_MAGIC
    jne .no_multiboot

    /* Simpan pointer struktur Multiboot2 info dari EBX */
    mov %ebx, (multiboot_info_ptr)

    /* 2. Cek dukungan CPUID */
    pushfl
    pop %eax
    mov %eax, %ecx
    xor $0x00200000, %eax
    push %eax
    popfl
    pushfl
    pop %eax
    xor %ecx, %eax
    jz .no_cpuid

    /* 3. Cek dukungan Long Mode (x86_64) via CPUID */
    mov $0x80000000, %eax
    cpuid
    cmp $0x80000001, %eax
    jb .no_long_mode

    mov $0x80000001, %eax
    cpuid
    test $(1 << 29), %edx
    jz .no_long_mode

    /* 4. Siapkan Page Table 4-Level Awal (Identity & Higher-Half) */
    mov $boot_pml4, %edi
    xor %eax, %eax
    mov $0x0C00, %ecx
    rep stosl

    /* PML4[0] & PML4[256] -> boot_pdpt */
    mov $boot_pdpt, %eax
    or $0x03, %eax
    mov %eax, (boot_pml4)
    mov %eax, (boot_pml4 + 256 * 8)

    /* PDPT[0] -> boot_pd */
    mov $boot_pd, %eax
    or $0x03, %eax
    mov %eax, (boot_pdpt)

    /* PD[0] -> 2MB Huge Page (0x83 = Present | Read-Write | Huge) */
    mov $0x00000083, %eax
    mov %eax, (boot_pd)

    /* 5. Aktifkan PAE & Pasang CR3 */
    mov $boot_pml4, %eax
    mov %eax, %cr3

    mov %cr4, %eax
    or $(1 << 5), %eax
    mov %eax, %cr4

    /* 6. Aktifkan Long Mode (LME) di IA32_EFER MSR */
    mov $0xC0000080, %ecx
    rdmsr
    or $(1 << 8), %eax
    wrmsr

    /* 7. Aktifkan Paging di CR0 */
    mov %cr0, %eax
    or $(1 << 31) | (1 << 0), %eax
    mov %eax, %cr0

    /* 8. Muat GDT 64-bit dan Far Jump */
    lgdt (gdt64_ptr)
    ljmp $0x08, $long_mode_entry

.no_multiboot:
    movl $0x4F524F45, (0xB8000) /* "ER" merah di VGA */
    hlt
    jmp .no_multiboot

.no_cpuid:
.no_long_mode:
    movl $0x4F4E4F4C, (0xB8000) /* "LN" merah di VGA */
    hlt
    jmp .no_long_mode

.section .boot_data, "aw"
.align 4096
boot_pml4:
    .skip 4096
boot_pdpt:
    .skip 4096
boot_pd:
    .skip 4096

.align 8
gdt64:
    .quad 0x0000000000000000 /* Null Descriptor */
    .quad 0x00AF9A000000FFFF /* 64-bit Code Segment (0x08) */
    .quad 0x00CF92000000FFFF /* 64-bit Data Segment (0x10) */
gdt64_end:

gdt64_ptr:
    .short gdt64_end - gdt64 - 1
    .long gdt64

.global multiboot_info_ptr
multiboot_info_ptr:
    .long 0
`,
    });

    // 6. 64-bit Kernel Entry: src/boot/kernel_entry.S
    files.push({
      path: `${name}/src/boot/kernel_entry.S`,
      content: `/*
 * Nusantara Kernel 64-bit Long Mode Transition & Serial Init
 */

.code64
.section .text
.global long_mode_entry
.extern kernel_main

long_mode_entry:
    /* Muat segment selector 64-bit data */
    mov $0x10, %ax
    mov %ax, %ds
    mov %ax, %es
    mov %ax, %ss
    xor %ax, %ax
    mov %ax, %fs
    mov %ax, %gs

    /* Siapkan Kernel Stack 64-bit */
    mov $stack_top, %rsp

    /* Inisialisasi UART 16550 COM1 Port 0x3F8 */
    mov $0x3F9, %dx
    xor %al, %al
    out %al, %dx

    mov $0x3FB, %dx
    mov $0x80, %al
    out %al, %dx

    mov $0x3F8, %dx
    mov $0x01, %al
    out %al, %dx

    mov $0x3F9, %dx
    xor %al, %al
    out %al, %dx

    mov $0x3FB, %dx
    mov $0x03, %al
    out %al, %dx

    mov $0x3FA, %dx
    mov $0xC7, %al
    out %al, %dx

    mov $0x3FC, %dx
    mov $0x0B, %al
    out %al, %dx

    /* Kirim Sentinel Boot ke Serial UART */
    lea boot_sentinel(%rip), %rsi
.send_char:
    lodsb
    test %al, %al
    jz .sentinel_done
    mov $0x3F8, %dx
    out %al, %dx
    jmp .send_char
.sentinel_done:

    /* Panggil fungsi utama kernel Nusantara */
    call kernel_main

.halt_loop:
    cli
    hlt
    jmp .halt_loop

.section .rodata
boot_sentinel:
    .string "NUSANTARA_KERNEL_BOOT_OK\\r\\n"

.section .bss
.align 16
stack_bottom:
    .skip 65536 /* 64 KiB Stack */
stack_top:
`,
    });

    // 7. Freestanding Runtime: src/runtime/freestanding.c
    files.push({
      path: `${name}/src/runtime/freestanding.c`,
      content: `/*
 * Freestanding C Runtime Support untuk Nusantara OS
 */

#include <stddef.h>
#include <stdint.h>

void *memcpy(void *dest, const void *src, size_t n) {
    uint8_t *d = (uint8_t *)dest;
    const uint8_t *s = (const uint8_t *)src;
    for (size_t i = 0; i < n; i++) {
        d[i] = s[i];
    }
    return dest;
}

void *memset(void *s, int c, size_t n) {
    uint8_t *p = (uint8_t *)s;
    for (size_t i = 0; i < n; i++) {
        p[i] = (uint8_t)c;
    }
    return s;
}

int memcmp(const void *s1, const void *s2, size_t n) {
    const uint8_t *p1 = (const uint8_t *)s1;
    const uint8_t *p2 = (const uint8_t *)s2;
    for (size_t i = 0; i < n; i++) {
        if (p1[i] != p2[i]) return p1[i] - p2[i];
    }
    return 0;
}

size_t strlen(const char *s) {
    size_t len = 0;
    while (s[len]) len++;
    return len;
}
`,
    });

    // 8. Main Nusantara Kernel: src/kernel/main.nusantara
    files.push({
      path: `${name}/src/kernel/main.nusantara`,
      content: `// ==========================================
// KERNEL NUSANTARA - Titik Masuk Utama
// Target: ${target}
// ==========================================

gunakan "std:os" sebagai os;

program KernelUtama
mulai
    // Log informasi boot ke konsol serial
    os.tulisKonsol("[NUSANTARA OS] Long Mode 64-bit aktif.");
    os.tulisKonsol("[NUSANTARA OS] Sentinel boot: NUSANTARA_KERNEL_BOOT_OK");

    // Alokasi memori heap awal
    buffer = os.alokasiMemori(4096);
    os.tulisKonsol("[NUSANTARA OS] Alokasi heap 4 KiB berhasil.");

    // Laporan status memori
    laporan = os.laporanMemori();
    os.tulisKonsol(laporan);

    // Kuantum thread aktif
    os.yieldThread();
selesai
`,
    });

    // 9. Makefile
    files.push({
      path: `${name}/Makefile`,
      content: `CC = clang
LD = ld.lld
QEMU = qemu-system-x86_64

CFLAGS = -target x86_64-unknown-none-elf -ffreestanding -mno-red-zone -mcmodel=kernel -O2 -Wall
LDFLAGS = -nostdlib -T linker.ld

KERNEL = bin/${name}.elf
ISO = bin/${name}.iso

all: $(KERNEL)

$(KERNEL): src/boot/boot.S src/boot/kernel_entry.S src/runtime/freestanding.c
	@mkdir -p bin
	@nusantara os build --output=$(KERNEL)

iso: $(KERNEL)
	@mkdir -p isodir/boot/grub
	@cp $(KERNEL) isodir/boot/${name}.elf
	@cp boot/grub/grub.cfg isodir/boot/grub/grub.cfg
	@grub-mkrescue -o $(ISO) isodir

run: $(KERNEL)
	$(QEMU) -kernel $(KERNEL) -serial stdio -display none

test: $(KERNEL)
	@./scripts/test-qemu

clean:
	rm -rf bin isodir qemu-serial.log
`,
    });

    // 10. Automation Scripts
    files.push({
      path: `${name}/scripts/check-toolchain`,
      content: `#!/usr/bin/env bash
set -e
echo "=== Pemeriksaan Toolchain Nusantara OS ==="
command -v qemu-system-x86_64 >/dev/null 2>&1 && echo "  [✓] QEMU x86_64 tersedia" || echo "  [✗] QEMU x86_64 tidak ditemukan"
command -v clang >/dev/null 2>&1 && echo "  [✓] Clang tersedia" || echo "  [✗] Clang tidak ditemukan"
command -v ld.lld >/dev/null 2>&1 && echo "  [✓] LLD linker tersedia" || echo "  [✗] LLD linker tidak ditemukan"
command -v xorriso >/dev/null 2>&1 && echo "  [✓] Xorriso tersedia" || echo "  [✗] Xorriso tidak ditemukan"
command -v gdb >/dev/null 2>&1 && echo "  [✓] GDB debugger tersedia" || echo "  [✗] GDB debugger tidak ditemukan"
`,
    });

    files.push({
      path: `${name}/scripts/build-kernel`,
      content: `#!/usr/bin/env bash
set -e
mkdir -p bin
nusantara os build --output=bin/${name}.elf
nusantara os inspect-boot bin/${name}.elf
`,
    });

    files.push({
      path: `${name}/scripts/run-qemu`,
      content: `#!/usr/bin/env bash
set -e
if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
    echo "[GALAT] qemu-system-x86_64 tidak ditemukan pada sistem host."
    echo "Pasang QEMU terlebih dahulu (misal: sudo apt install qemu-system-x86)."
    exit 1
fi
qemu-system-x86_64 -kernel bin/${name}.elf -m 128M -serial stdio -display none -no-reboot
`,
    });

    files.push({
      path: `${name}/scripts/test-qemu`,
      content: `#!/usr/bin/env bash
set -e
echo "Menjalankan uji boot native QEMU..."
if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
    echo "[SKIPPED] QEMU tidak terpasang di host (SIMULATION_ONLY)."
    exit 0
fi
qemu-system-x86_64 -kernel bin/${name}.elf -m 128M -serial file:qemu-serial.log -display none -no-reboot -device isa-debug-exit,iobase=0xf4,iosize=0x04 &
PID=$!
sleep 2
kill $PID 2>/dev/null || true
if grep -q "NUSANTARA_KERNEL_BOOT_OK" qemu-serial.log; then
    echo "[QEMU_BOOT_PASS] Sentinel berhasil ditemukan di serial log!"
    exit 0
else
    echo "[QEMU_BOOT_FAIL] Sentinel tidak ditemukan di serial log."
    exit 1
fi
`,
    });

    files.push({
      path: `${name}/scripts/debug-qemu`,
      content: `#!/usr/bin/env bash
set -e
echo "Menjalankan QEMU dalam mode GDB server (-s -S di port 1234)..."
qemu-system-x86_64 -kernel bin/${name}.elf -m 128M -serial stdio -display none -s -S
`,
    });

    // 11. README.md
    files.push({
      path: `${name}/docs/README.md`,
      content: `# ${name} — Nusantara OS Kernel

Proyek kernel mandiri berbasis bahasa pemrograman NUSANTARA dengan target x86_64 bare-metal.

## Struktur Direktori
- \`src/boot/\`: Bootstrap 32-bit Multiboot2 (\`boot.S\`) dan transisi Long Mode (\`kernel_entry.S\`).
- \`src/kernel/\`: Kode sumber kernel Nusantara (\`main.nusantara\`).
- \`src/runtime/\`: Rutinitas freestanding dasar (\`freestanding.c\`).
- \`boot/grub/\`: Konfigurasi bootloader GRUB (\`grub.cfg\`).
- \`scripts/\`: Skrip otomatisasi build, periksa toolchain, QEMU runner, dan testing.
- \`linker.ld\`: Linker script higher-half kernel x86_64.

## Membangun & Menjalankan
\`\`\`bash
# 1. Periksa ketersediaan toolchain
./scripts/check-toolchain

# 2. Bangun biner ELF kernel
nusantara os build

# 3. Periksa header Multiboot2
nusantara os inspect-boot bin/${name}.elf

# 4. Jalankan simulasi kernel
nusantara os simulate

# 5. Jalankan emulator QEMU sesungguhnya (jika QEMU terpasang)
nusantara os run bin/${name}.elf
\`\`\`
`,
    });

    return files;
  }
}
