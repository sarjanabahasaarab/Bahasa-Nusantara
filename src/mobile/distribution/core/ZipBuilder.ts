/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Pembangun Arsip ZIP Standar PKZIP + CRC-32 Murni (Method 0 STORE)
 * Digunakan agar artefak .apk dan .aab memiliki struktur ZIP sah yang dapat dibaca alat standar.
 */

export interface EntriZip {
  nama: string;
  konten: string | Uint8Array;
}

const TABEL_CRC32 = (() => {
  const tabel = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    tabel[i] = c >>> 0;
  }
  return tabel;
})();

export function hitungCRC32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = TABEL_CRC32[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(arr: Uint8Array, offset: number, val: number): void {
  arr[offset] = val & 0xff;
  arr[offset + 1] = (val >>> 8) & 0xff;
}

function writeU32(arr: Uint8Array, offset: number, val: number): void {
  arr[offset] = val & 0xff;
  arr[offset + 1] = (val >>> 8) & 0xff;
  arr[offset + 2] = (val >>> 16) & 0xff;
  arr[offset + 3] = (val >>> 24) & 0xff;
}

export class ZipBuilder {
  public static buatArsipZip(daftarEntri: EntriZip[]): Uint8Array {
    const encoder = new TextEncoder();
    const localChunks: Uint8Array[] = [];
    const centralChunks: Uint8Array[] = [];
    let offset = 0;

    for (const entri of daftarEntri) {
      const namaNorm = entri.nama.replace(/^\/+/, '');
      const nameBytes = encoder.encode(namaNorm);
      const dataBytes = typeof entri.konten === 'string' ? encoder.encode(entri.konten) : entri.konten;
      const crc = hitungCRC32(dataBytes);
      const size = dataBytes.length;

      // Local File Header (30 bytes + nameLen)
      const localHdr = new Uint8Array(30 + nameBytes.length);
      writeU32(localHdr, 0, 0x04034b50); // PK\x03\x04
      writeU16(localHdr, 4, 20);         // Version needed: 2.0
      writeU16(localHdr, 6, 0x0800);     // UTF-8 filename flag
      writeU16(localHdr, 8, 0);          // Compression method: 0 (STORE)
      writeU16(localHdr, 10, 0);         // Mod time
      writeU16(localHdr, 12, 0x5421);    // Mod date
      writeU32(localHdr, 14, crc);       // CRC-32
      writeU32(localHdr, 18, size);      // Compressed size
      writeU32(localHdr, 22, size);      // Uncompressed size
      writeU16(localHdr, 26, nameBytes.length);
      writeU16(localHdr, 28, 0);
      localHdr.set(nameBytes, 30);

      localChunks.push(localHdr, dataBytes);

      // Central Directory Header (46 bytes + nameLen)
      const cdHdr = new Uint8Array(46 + nameBytes.length);
      writeU32(cdHdr, 0, 0x02014b50);    // PK\x01\x02
      writeU16(cdHdr, 4, 20);            // Version made by
      writeU16(cdHdr, 6, 20);            // Version needed
      writeU16(cdHdr, 8, 0x0800);        // UTF-8 flag
      writeU16(cdHdr, 10, 0);            // Compression method: STORE
      writeU16(cdHdr, 12, 0);
      writeU16(cdHdr, 14, 0x5421);
      writeU32(cdHdr, 16, crc);
      writeU32(cdHdr, 20, size);
      writeU32(cdHdr, 24, size);
      writeU16(cdHdr, 28, nameBytes.length);
      writeU16(cdHdr, 30, 0);
      writeU16(cdHdr, 32, 0);
      writeU16(cdHdr, 34, 0);
      writeU16(cdHdr, 36, 0);
      writeU32(cdHdr, 38, 0);
      writeU32(cdHdr, 42, offset);       // Relative offset of local header
      cdHdr.set(nameBytes, 46);

      centralChunks.push(cdHdr);
      offset += localHdr.length + dataBytes.length;
    }

    const centralOffset = offset;
    let centralSize = 0;
    for (const c of centralChunks) centralSize += c.length;

    // End of Central Directory (22 bytes)
    const eocd = new Uint8Array(22);
    writeU32(eocd, 0, 0x06054b50);       // PK\x05\x06
    writeU16(eocd, 4, 0);
    writeU16(eocd, 6, 0);
    writeU16(eocd, 8, daftarEntri.length);
    writeU16(eocd, 10, daftarEntri.length);
    writeU32(eocd, 12, centralSize);
    writeU32(eocd, 16, centralOffset);
    writeU16(eocd, 20, 0);

    const totalLen = offset + centralSize + eocd.length;
    const hasil = new Uint8Array(totalLen);
    let cursor = 0;
    for (const chunk of localChunks) {
      hasil.set(chunk, cursor);
      cursor += chunk.length;
    }
    for (const chunk of centralChunks) {
      hasil.set(chunk, cursor);
      cursor += chunk.length;
    }
    hasil.set(eocd, cursor);
    return hasil;
  }
}
