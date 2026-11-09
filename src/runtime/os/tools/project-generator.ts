/**
 * Generator Struktur Proyek Kernel Nusantara (nusantara os new).
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

    // 1. nusantara.os.json
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
            entry: 'kernel_main',
          },
          memori: {
            heap_kb: 16384,
            stack_kb: 64,
            base_address: '0xFFFFFFFF80000000',
          },
          drivers: ['serial', 'vga_text', 'pit_timer', 'ps2_keyboard'],
        },
        null,
        2
      ) + '\n',
    });

    // 2. Linker script
    files.push({
      path: `${name}/target/kernel/x86_64/linker.ld`,
      content: generateKernelLinkerScript(),
    });

    // 3. Main kernel source code: src/kernel.nusantara
    files.push({
      path: `${name}/src/kernel.nusantara`,
      content: `// ==========================================
// KERNEL NUSANTARA - Titik Masuk Utama
// Target: ${target}
// ==========================================

gunakan std:os;

fungsi kernel_main() {
    // Inisialisasi output serial COM1 dan konsol
    tulisKonsol("[NUSANTARA OS] Memulai booting kernel minimal...");
    tulisKonsol("[NUSANTARA OS] Arsitektur: x86_64 freestanding");
    tulisKonsol("[NUSANTARA OS] Bootloader Multiboot2 berhasil dikenali.");

    // Alokasi buffer memori heap awal
    alokasi = alokasiMemori(4096, 16);
    tulisKonsol("[NUSANTARA OS] Buffer heap 4KB berhasil dialokasikan.");

    // Tampilkan diagnostik memori
    laporan = laporanMemori();
    tulisKonsol(laporan);

    tulisKonsol("[NUSANTARA OS] Kernel aktif dalam keadaan siaga.");
    kembalikan 0;
}
`,
    });

    // 4. Driver Serial: src/drivers/serial.nusantara
    files.push({
      path: `${name}/src/drivers/serial.nusantara`,
      content: `// Driver Serial Port UART 16550 (COM1 - 0x3F8)

konstanta COM1_PORT = 0x3F8;

fungsi inisialisasiSerial() {
    // Port I/O 115200 8N1
    kembalikan benar;
}

fungsi tulisSerialChar(karakter) {
    kembalikan benar;
}
`,
    });

    // 5. Driver VGA: src/drivers/vga.nusantara
    files.push({
      path: `${name}/src/drivers/vga.nusantara`,
      content: `// Driver Konsol VGA Text Mode 80x25 (0xB8000)

konstanta VGA_BUFFER = 0xB8000;
konstanta VGA_WIDTH = 80;
konstanta VGA_HEIGHT = 25;

fungsi bersihkanLayar() {
    kembalikan benar;
}

fungsi cetakTeks(teks, warna) {
    kembalikan benar;
}
`,
    });

    // 6. README.md
    files.push({
      path: `${name}/README.md`,
      content: `# ${name}

Proyek Kernel Sistem Operasi berbasis Bahasa Pemrograman NUSANTARA.

## Arsitektur
- **Target**: \`${target}\`
- **Boot Protocol**: \`${bootProtocol}\` (Multiboot2 specification)
- **Model Memori**: Higher-half 64-bit (\`0xFFFFFFFF80000000\`)
- **Linker Script**: \`target/kernel/x86_64/linker.ld\`

## Perintah CLI
\`\`\`bash
# Memeriksa target yang didukung
nusantara os targets

# Membangun biner ELF kernel
nusantara os build

# Menginspeksi struktur ELF, segment, dan Multiboot2 header
nusantara os inspect biner/kernel.elf

# Menjalankan pada emulator QEMU
nusantara os run biner/kernel.elf
\`\`\`
`,
    });

    return files;
  }
}
