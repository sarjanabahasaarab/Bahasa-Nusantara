/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Pembangun Arsip ZIP Standar PKZIP + CRC-32 Murni (Method 0 STORE)
 * Digunakan agar artefak .apk dan .aab memiliki struktur ZIP sah yang dapat dibaca alat standar.
 */

import { muatModulNode } from '../../../gui/platform/node_bridge';

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
  public static sanitasiNamaEntriZip(nama: string): string {
    if (!nama || typeof nama !== 'string') {
      throw new Error('Nama entri ZIP tidak boleh kosong.');
    }
    if (nama.includes('\0')) {
      throw new Error(`Nama entri ZIP mengandung karakter NUL ilegal: '${nama}'`);
    }
    if (nama.includes('\\') || /^[a-zA-Z]:/.test(nama)) {
      throw new Error(`Nama entri ZIP tidak boleh memakai backslash atau prefix drive: '${nama}'`);
    }
    const bersih = nama.replace(/^\/+/, '');
    if (!bersih || bersih.endsWith('/')) {
      throw new Error(`Nama entri berkas ZIP tidak sah: '${nama}'`);
    }
    const segmen = bersih.split('/');
    for (const s of segmen) {
      if (!s || s === '.' || s === '..') {
        throw new Error(`Zip-Slip traversal terdeteksi pada nama entri ZIP: '${nama}'`);
      }
    }
    return segmen.join('/');
  }

  public static buatArsipZip(daftarEntri: EntriZip[]): Uint8Array {
    const encoder = new TextEncoder();
    const localChunks: Uint8Array[] = [];
    const centralChunks: Uint8Array[] = [];
    const entriTerdaftar = new Set<string>();
    let offset = 0;

    for (const entri of daftarEntri) {
      if (entri.nama.startsWith('/')) {
        throw new Error(`Jalur absolut dilarang dalam entri ZIP: '${entri.nama}'`);
      }
      const namaNorm = ZipBuilder.sanitasiNamaEntriZip(entri.nama);
      if (entriTerdaftar.has(namaNorm)) {
        throw new Error(`Entri ZIP duplikat terdeteksi: '${namaNorm}'`);
      }
      entriTerdaftar.add(namaNorm);
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

  public static validasiDanBacaArsipZip(zipBytes: Uint8Array): {
    valid: boolean;
    daftarEntri: { nama: string; ukuran: number; crc32: number; data: Uint8Array }[];
    galat?: string;
  } {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    if (!(zipBytes instanceof Uint8Array) || zipBytes.length < 22) {
      return { valid: false, daftarEntri: [], galat: 'Ukuran arsip ZIP terlalu kecil (< 22 byte).' };
    }

    const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
    // Cari End of Central Directory (PK\x05\x06) dari akhir
    let eocdOffset = -1;
    const minSearch = Math.max(0, zipBytes.length - 65557);
    for (let i = zipBytes.length - 22; i >= minSearch; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) {
      return { valid: false, daftarEntri: [], galat: 'Header End-of-Central-Directory (EOCD) PKZIP tidak ditemukan.' };
    }

    const totalCdEntries = view.getUint16(eocdOffset + 10, true);
    const cdSize = view.getUint32(eocdOffset + 12, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    if (cdOffset + cdSize > eocdOffset) {
      return { valid: false, daftarEntri: [], galat: 'Offset/ukuran Central Directory melampaui EOCD.' };
    }

    const daftarEntri: { nama: string; ukuran: number; crc32: number; data: Uint8Array }[] = [];
    let ptr = cdOffset;
    for (let idx = 0; idx < totalCdEntries; idx++) {
      if (ptr + 46 > cdOffset + cdSize || view.getUint32(ptr, true) !== 0x02014b50) {
        return { valid: false, daftarEntri: [], galat: `Central Directory Header korup pada entri #${idx}.` };
      }
      const metode = view.getUint16(ptr + 10, true);
      const crcExpected = view.getUint32(ptr + 16, true);
      const compSize = view.getUint32(ptr + 20, true);
      const uncompSize = view.getUint32(ptr + 24, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHdrOffset = view.getUint32(ptr + 42, true);

      if (ptr + 46 + nameLen > cdOffset + cdSize) {
        return { valid: false, daftarEntri: [], galat: 'Panjang nama file pada Central Directory korup.' };
      }

      let rawName = '';
      try {
        rawName = decoder.decode(zipBytes.subarray(ptr + 46, ptr + 46 + nameLen));
      } catch {
        return { valid: false, daftarEntri: [], galat: 'Encoding UTF-8 nama file ZIP tidak sah.' };
      }

      if (rawName.startsWith('/')) {
        return { valid: false, daftarEntri: [], galat: `Zip-Slip terdeteksi (jalur absolut): '${rawName}'` };
      }
      let safeName = '';
      try {
        safeName = ZipBuilder.sanitasiNamaEntriZip(rawName);
      } catch (e: any) {
        return { valid: false, daftarEntri: [], galat: e.message };
      }

      if (localHdrOffset + 30 > cdOffset || view.getUint32(localHdrOffset, true) !== 0x04034b50) {
        return { valid: false, daftarEntri: [], galat: `Local File Header tidak valid untuk '${safeName}'.` };
      }
      const lhNameLen = view.getUint16(localHdrOffset + 26, true);
      const lhExtraLen = view.getUint16(localHdrOffset + 28, true);
      const dataStart = localHdrOffset + 30 + lhNameLen + lhExtraLen;
      const dataEnd = dataStart + compSize;
      if (dataEnd > cdOffset || uncompSize > 1024 * 1024 * 1024) {
        return { valid: false, daftarEntri: [], galat: `Rentang data atau ukuran hasil dekompresi tidak sah untuk '${safeName}'.` };
      }
      const namaLokal = zipBytes.subarray(localHdrOffset + 30, localHdrOffset + 30 + lhNameLen);
      let namaLokalTeks = '';
      try { namaLokalTeks = decoder.decode(namaLokal); } catch {
        return { valid: false, daftarEntri: [], galat: `Nama local header tidak sah untuk '${safeName}'.` };
      }
      if (namaLokalTeks !== rawName) {
        return { valid: false, daftarEntri: [], galat: `Nama local header dan central directory tidak cocok untuk '${safeName}'.` };
      }

      const compressed = zipBytes.subarray(dataStart, dataEnd);
      let payload: Uint8Array;
      if (metode === 0) {
        if (compSize !== uncompSize) return { valid: false, daftarEntri: [], galat: `Ukuran STORE tidak konsisten untuk '${safeName}'.` };
        payload = compressed;
      } else if (metode === 8) {
        const zlib = muatModulNode<any>('zlib');
        if (!zlib || typeof zlib.inflateRawSync !== 'function') {
          return { valid: false, daftarEntri: [], galat: 'Dukungan DEFLATE memerlukan Node.js zlib runtime.' };
        }
        try {
          const inflated = zlib.inflateRawSync(Buffer.from(compressed), { maxOutputLength: Math.max(1, uncompSize + 1) });
          if (inflated.length !== uncompSize) {
            return { valid: false, daftarEntri: [], galat: `Ukuran hasil DEFLATE tidak cocok untuk '${safeName}'.` };
          }
          payload = new Uint8Array(inflated);
        } catch (err: any) {
          return { valid: false, daftarEntri: [], galat: `DEFLATE gagal diverifikasi untuk '${safeName}': ${err.message}` };
        }
      } else {
        return { valid: false, daftarEntri: [], galat: `Metode kompresi ZIP ${metode} tidak didukung untuk '${safeName}'.` };
      }

      const actualCrc = hitungCRC32(payload);
      if (actualCrc !== crcExpected) {
        return {
          valid: false,
          daftarEntri: [],
          galat: `Checksum CRC-32 tidak cocok pada '${safeName}' (diharapkan ${crcExpected.toString(16)}, aktual ${actualCrc.toString(16)}).`,
        };
      }

      daftarEntri.push({
        nama: safeName,
        ukuran: uncompSize,
        crc32: actualCrc,
        data: new Uint8Array(payload),
      });

      ptr += 46 + nameLen + extraLen + commentLen;
    }

    return { valid: true, daftarEntri };
  }
}
