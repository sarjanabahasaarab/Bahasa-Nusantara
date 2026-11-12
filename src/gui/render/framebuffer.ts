/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Rasterizer Software RGBA32 & Eksportir Gambar (BMP / PPM) Tanpa Ketergantungan GPU
 */

export interface WarnaRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const GLIF_ASCII_5X7: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  '"': [0x0a, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00],
  '#': [0x0a, 0x1f, 0x0a, 0x0a, 0x1f, 0x0a, 0x00],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '*': [0x00, 0x0a, 0x04, 0x1f, 0x04, 0x0a, 0x00],
  '+': [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  ',': [0x00, 0x00, 0x00, 0x00, 0x04, 0x04, 0x08],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x06, 0x06],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x06, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ':': [0x00, 0x06, 0x06, 0x00, 0x06, 0x06, 0x00],
  ';': [0x00, 0x06, 0x06, 0x00, 0x06, 0x04, 0x08],
  '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  '=': [0x00, 0x00, 0x1f, 0x00, 0x1f, 0x00, 0x00],
  '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  '?': [0x0e, 0x11, 0x01, 0x06, 0x04, 0x00, 0x04],
  '@': [0x0e, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0e],
  'A': [0x04, 0x0a, 0x11, 0x11, 0x1f, 0x11, 0x11],
  'B': [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  'C': [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  'D': [0x1c, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1c],
  'E': [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  'F': [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  'G': [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  'H': [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  'I': [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  'M': [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  'O': [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  'P': [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  'Q': [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  'R': [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  'S': [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  'T': [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  'X': [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  'Z': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '[': [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  ']': [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
  '_': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f],
  'a': [0x00, 0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  'b': [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e],
  'c': [0x00, 0x00, 0x0e, 0x10, 0x10, 0x11, 0x0e],
  'd': [0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f],
  'e': [0x00, 0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  'f': [0x06, 0x09, 0x08, 0x1c, 0x08, 0x08, 0x08],
  'g': [0x00, 0x00, 0x0f, 0x11, 0x0f, 0x01, 0x0e],
  'h': [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11],
  'i': [0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  'j': [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0c],
  'k': [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  'l': [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  'm': [0x00, 0x00, 0x1a, 0x15, 0x15, 0x11, 0x11],
  'n': [0x00, 0x00, 0x1e, 0x11, 0x11, 0x11, 0x11],
  'o': [0x00, 0x00, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  'p': [0x00, 0x00, 0x1e, 0x11, 0x1e, 0x10, 0x10],
  'q': [0x00, 0x00, 0x0f, 0x11, 0x0f, 0x01, 0x01],
  'r': [0x00, 0x00, 0x16, 0x19, 0x10, 0x10, 0x10],
  's': [0x00, 0x00, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  't': [0x08, 0x08, 0x1c, 0x08, 0x08, 0x09, 0x06],
  'u': [0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0d],
  'v': [0x00, 0x00, 0x11, 0x11, 0x11, 0x0a, 0x04],
  'w': [0x00, 0x00, 0x11, 0x11, 0x15, 0x15, 0x0a],
  'x': [0x00, 0x00, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  'y': [0x00, 0x00, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  'z': [0x00, 0x00, 0x1f, 0x02, 0x04, 0x08, 0x1f],
};

export function uraiWarnaHex(warna: string, alphaDefault: number = 255): WarnaRGBA {
  const bersih = warna.trim();
  if (bersih.startsWith('#')) {
    const hex = bersih.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16) || 0,
        g: parseInt(hex[1] + hex[1], 16) || 0,
        b: parseInt(hex[2] + hex[2], 16) || 0,
        a: alphaDefault,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16) || 0,
        g: parseInt(hex.slice(2, 4), 16) || 0,
        b: parseInt(hex.slice(4, 6), 16) || 0,
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) || 255 : alphaDefault,
      };
    }
  }
  return { r: 15, g: 23, b: 42, a: alphaDefault };
}

export class KanvasFramebuffer {
  public readonly lebar: number;
  public readonly tinggi: number;
  public readonly piksel: Uint8Array;
  private klipAktif: { x1: number; y1: number; x2: number; y2: number };

  constructor(lebar: number, tinggi: number, latarAwal: string = '#f8fafc') {
    this.lebar = Math.max(1, Math.round(lebar));
    this.tinggi = Math.max(1, Math.round(tinggi));
    this.piksel = new Uint8Array(this.lebar * this.tinggi * 4);
    this.klipAktif = { x1: 0, y1: 0, x2: this.lebar, y2: this.tinggi };
    this.bersihkan(latarAwal);
  }

  public bersihkan(warna: string): void {
    const c = uraiWarnaHex(warna);
    for (let i = 0; i < this.piksel.length; i += 4) {
      this.piksel[i] = c.r;
      this.piksel[i + 1] = c.g;
      this.piksel[i + 2] = c.b;
      this.piksel[i + 3] = c.a;
    }
  }

  public tetapkanKlip(x: number, y: number, lebar: number, tinggi: number): void {
    this.klipAktif = {
      x1: Math.max(0, Math.round(x)),
      y1: Math.max(0, Math.round(y)),
      x2: Math.min(this.lebar, Math.round(x + lebar)),
      y2: Math.min(this.tinggi, Math.round(y + tinggi)),
    };
  }

  public resetKlip(): void {
    this.klipAktif = { x1: 0, y1: 0, x2: this.lebar, y2: this.tinggi };
  }

  public setPiksel(x: number, y: number, c: WarnaRGBA): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (
      px < this.klipAktif.x1 ||
      px >= this.klipAktif.x2 ||
      py < this.klipAktif.y1 ||
      py >= this.klipAktif.y2
    ) {
      return;
    }
    const idx = (py * this.lebar + px) * 4;
    if (c.a >= 255) {
      this.piksel[idx] = c.r;
      this.piksel[idx + 1] = c.g;
      this.piksel[idx + 2] = c.b;
      this.piksel[idx + 3] = 255;
    } else if (c.a > 0) {
      const alpha = c.a / 255;
      const inv = 1 - alpha;
      this.piksel[idx] = Math.round(c.r * alpha + this.piksel[idx] * inv);
      this.piksel[idx + 1] = Math.round(c.g * alpha + this.piksel[idx + 1] * inv);
      this.piksel[idx + 2] = Math.round(c.b * alpha + this.piksel[idx + 2] * inv);
      this.piksel[idx + 3] = 255;
    }
  }

  public getPiksel(x: number, y: number): WarnaRGBA {
    const px = Math.max(0, Math.min(this.lebar - 1, Math.round(x)));
    const py = Math.max(0, Math.min(this.tinggi - 1, Math.round(y)));
    const idx = (py * this.lebar + px) * 4;
    return {
      r: this.piksel[idx],
      g: this.piksel[idx + 1],
      b: this.piksel[idx + 2],
      a: this.piksel[idx + 3],
    };
  }

  public isiPersegi(x: number, y: number, lebar: number, tinggi: number, warna: string): void {
    const c = uraiWarnaHex(warna);
    const x1 = Math.max(this.klipAktif.x1, Math.round(x));
    const y1 = Math.max(this.klipAktif.y1, Math.round(y));
    const x2 = Math.min(this.klipAktif.x2, Math.round(x + lebar));
    const y2 = Math.min(this.klipAktif.y2, Math.round(y + tinggi));
    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        this.setPiksel(px, py, c);
      }
    }
  }

  public gambarGarisPersegi(x: number, y: number, lebar: number, tinggi: number, warna: string, tebal: number = 1): void {
    if (lebar <= 0 || tinggi <= 0 || tebal <= 0) return;
    this.isiPersegi(x, y, lebar, tebal, warna);
    this.isiPersegi(x, y + tinggi - tebal, lebar, tebal, warna);
    this.isiPersegi(x, y, tebal, tinggi, warna);
    this.isiPersegi(x + lebar - tebal, y, tebal, tinggi, warna);
  }

  public isiLingkaran(cx: number, cy: number, radius: number, warna: string): void {
    const c = uraiWarnaHex(warna);
    const r2 = radius * radius;
    const minY = Math.round(cy - radius);
    const maxY = Math.round(cy + radius);
    const minX = Math.round(cx - radius);
    const maxX = Math.round(cx + radius);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= r2) {
          this.setPiksel(px, py, c);
        }
      }
    }
  }

  public gambarTeks(teks: string, x: number, y: number, warna: string, skala: number = 1): void {
    const c = uraiWarnaHex(warna);
    const s = Math.max(1, Math.round(skala));
    let cursorX = Math.round(x);
    const baseY = Math.round(y);
    for (let i = 0; i < teks.length; i++) {
      const ch = teks[i];
      const bitmap = GLIF_ASCII_5X7[ch] || GLIF_ASCII_5X7[ch.toUpperCase()] || GLIF_ASCII_5X7['?'];
      if (bitmap) {
        for (let row = 0; row < 7; row++) {
          const bits = bitmap[row];
          for (let col = 0; col < 5; col++) {
            if ((bits >> (4 - col)) & 1) {
              for (let sy = 0; sy < s; sy++) {
                for (let sx = 0; sx < s; sx++) {
                  this.setPiksel(cursorX + col * s + sx, baseY + row * s + sy, c);
                }
              }
            }
          }
        }
      }
      cursorX += 6 * s;
    }
  }

  /**
   * Mengekspor framebuffer ke format biner PPM (P6) standar yang dapat dibuka pembaca gambar.
   */
  public eksporPPM(): Uint8Array {
    const headerStr = `P6\n${this.lebar} ${this.tinggi}\n255\n`;
    const header = new Uint8Array(headerStr.length);
    for (let i = 0; i < headerStr.length; i++) {
      header[i] = headerStr.charCodeAt(i);
    }
    const body = new Uint8Array(this.lebar * this.tinggi * 3);
    let bi = 0;
    for (let i = 0; i < this.piksel.length; i += 4) {
      body[bi++] = this.piksel[i];
      body[bi++] = this.piksel[i + 1];
      body[bi++] = this.piksel[i + 2];
    }
    const out = new Uint8Array(header.length + body.length);
    out.set(header, 0);
    out.set(body, header.length);
    return out;
  }

  /**
   * Mengekspor framebuffer ke format biner Windows Bitmap 24-bit (.bmp) standar.
   */
  public eksporBMP(): Uint8Array {
    const rowBytes = this.lebar * 3;
    const paddedRowBytes = Math.ceil(rowBytes / 4) * 4;
    const pixelDataSize = paddedRowBytes * this.tinggi;
    const fileSize = 54 + pixelDataSize;
    const buf = new Uint8Array(fileSize);
    const view = new DataView(buf.buffer);

    // File Header (14 byte)
    buf[0] = 0x42; // 'B'
    buf[1] = 0x4d; // 'M'
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true);

    // DIB BITMAPINFOHEADER (40 byte)
    view.setUint32(14, 40, true);
    view.setInt32(18, this.lebar, true);
    view.setInt32(22, this.tinggi, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, pixelDataSize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);

    // BMP menyimpan piksel BGR bottom-up
    for (let y = 0; y < this.tinggi; y++) {
      const srcY = this.tinggi - 1 - y;
      const dstRow = 54 + y * paddedRowBytes;
      for (let x = 0; x < this.lebar; x++) {
        const srcIdx = (srcY * this.lebar + x) * 4;
        const dstIdx = dstRow + x * 3;
        buf[dstIdx] = this.piksel[srcIdx + 2]; // B
        buf[dstIdx + 1] = this.piksel[srcIdx + 1]; // G
        buf[dstIdx + 2] = this.piksel[srcIdx]; // R
      }
    }
    return buf;
  }

  public hitungHashFNV1a(): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < this.piksel.length; i++) {
      hash ^= this.piksel[i];
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}
