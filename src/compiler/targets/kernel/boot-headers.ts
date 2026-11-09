/**
 * Header Bootloader Spesifikasi Multiboot2 & Limine untuk Kernel Nusantara.
 */

export const MULTIBOOT2_HEADER_MAGIC = 0xE85250D6;
export const MULTIBOOT2_BOOTLOADER_MAGIC = 0x36D76289;
export const MULTIBOOT2_ARCH_I386 = 0; // Multiboot2 entry point runs in 32-bit protected mode

export interface Multiboot2Tag {
  type: number;
  flags: number;
  size: number;
  data?: Uint8Array;
}

export class Multiboot2HeaderBuilder {
  private tags: Multiboot2Tag[] = [];

  addTag(type: number, flags: number, data: Uint8Array = new Uint8Array(0)): this {
    // Ukuran tag = 8 (header tag) + data.length, diratakan ke kelipatan 8
    const rawSize = 8 + data.byteLength;
    const alignedSize = Math.ceil(rawSize / 8) * 8;
    this.tags.push({ type, flags, size: alignedSize, data });
    return this;
  }

  addFramebufferTag(width = 1024, height = 768, bpp = 32): this {
    // Framebuffer tag: type = 5, flags = 0, size = 20 (aligned to 24)
    const buf = new Uint8Array(12);
    const view = new DataView(buf.buffer);
    view.setUint32(0, width, true);
    view.setUint32(4, height, true);
    view.setUint32(8, bpp, true);
    return this.addTag(5, 0, buf);
  }

  build(): Uint8Array {
    // Hitung total panjang header
    // Header pokok = 16 bytes:
    // [0..3]: magic (0xE85250D6)
    // [4..7]: architecture (0)
    // [8..11]: header_length
    // [12..15]: checksum
    let tagsTotalLength = 0;
    for (const tag of this.tags) {
      tagsTotalLength += tag.size;
    }
    // Tambahkan End Tag: type = 0, flags = 0, size = 8
    const endTagSize = 8;
    const totalLength = 16 + tagsTotalLength + endTagSize;

    // Checksum: -(magic + arch + totalLength) >>> 0
    const magic = MULTIBOOT2_HEADER_MAGIC;
    const arch = MULTIBOOT2_ARCH_I386;
    const checksum = (0x100000000 - ((magic + arch + totalLength) >>> 0)) >>> 0;

    const buffer = new Uint8Array(totalLength);
    const view = new DataView(buffer.buffer);

    view.setUint32(0, magic, true);
    view.setUint32(4, arch, true);
    view.setUint32(8, totalLength, true);
    view.setUint32(12, checksum, true);

    let offset = 16;
    for (const tag of this.tags) {
      view.setUint16(offset, tag.type, true);
      view.setUint16(offset + 2, tag.flags, true);
      view.setUint32(offset + 4, tag.size, true);
      if (tag.data && tag.data.byteLength > 0) {
        buffer.set(tag.data, offset + 8);
      }
      offset += tag.size;
    }

    // End Tag
    view.setUint16(offset, 0, true);
    view.setUint16(offset + 2, 0, true);
    view.setUint32(offset + 4, 8, true);

    return buffer;
  }

  static verify(bytes: Uint8Array): { valid: boolean; error?: string; headerLength?: number } {
    if (bytes.byteLength < 16) {
      return { valid: false, error: 'Ukuran header kurang dari 16 byte' };
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint32(0, true);
    if (magic !== MULTIBOOT2_HEADER_MAGIC) {
      return {
        valid: false,
        error: `Magic Multiboot2 tidak cocok: 0x${magic.toString(16).toUpperCase()} != 0x${MULTIBOOT2_HEADER_MAGIC.toString(16).toUpperCase()}`,
      };
    }
    const arch = view.getUint32(4, true);
    const length = view.getUint32(8, true);
    const checksum = view.getUint32(12, true);

    const sum = (magic + arch + length + checksum) >>> 0;
    if (sum !== 0) {
      return {
        valid: false,
        error: `Checksum Multiboot2 tidak valid: jumlah = 0x${sum.toString(16)} (seharusnya 0)`,
      };
    }

    return { valid: true, headerLength: length };
  }
}
