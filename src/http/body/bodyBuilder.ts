/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35
 * Pembentuk dan Serializer Muatan Permintaan HTTP (Body Builder)
 */

import * as crypto from 'node:crypto';
import { BagianMultipart, TipeBody } from '../types';
import { PetaHeader } from '../headers/headerMap';
import { GalatSerialisasiHTTP } from '../errors/httpError';

export interface HasilSerialisasiBody {
  buffer: Buffer;
  contentType?: string;
  panjangBytes: number;
}

export class PembentukBodyHTTP {
  /**
   * Menghasilkan muatan biner dan tajuk Content-Type yang sesuai berdasarkan tipe body.
   */
  public static proses(
    body: any,
    tipe: TipeBody | undefined,
    headers: PetaHeader
  ): HasilSerialisasiBody | null {
    if (body === undefined || body === null) {
      return null;
    }

    // 1. Jika body sudah berupa Buffer
    if (Buffer.isBuffer(body)) {
      if (!headers.punya('content-type')) {
        headers.tetapkan('Content-Type', 'application/octet-stream');
      }
      headers.tetapkan('Content-Length', body.length);
      return { buffer: body, contentType: headers.ambil('content-type'), panjangBytes: body.length };
    }

    // 2. Deteksi otomatis jika tipe tidak ditentukan eksplisit
    const tipeTerpilih = tipe || PembentukBodyHTTP.deteksiTipe(body);

    switch (tipeTerpilih) {
      case 'json': {
        try {
          const jsonStr = typeof body === 'string' ? body : JSON.stringify(body);
          const buf = Buffer.from(jsonStr, 'utf-8');
          if (!headers.punya('content-type')) {
            headers.tetapkan('Content-Type', 'application/json; charset=utf-8');
          }
          headers.tetapkan('Content-Length', buf.length);
          return { buffer: buf, contentType: headers.ambil('content-type'), panjangBytes: buf.length };
        } catch (err: any) {
          throw new GalatSerialisasiHTTP(`Gagal mengonversi data ke JSON: ${err.message}`, err);
        }
      }

      case 'form': {
        try {
          let paramStr = '';
          if (typeof body === 'string') {
            paramStr = body;
          } else if (typeof body === 'object') {
            const usp = new URLSearchParams();
            for (const [k, v] of Object.entries(body)) {
              if (Array.isArray(v)) {
                for (const item of v) usp.append(k, String(item));
              } else if (v !== undefined && v !== null) {
                usp.append(k, String(v));
              }
            }
            paramStr = usp.toString();
          }
          const buf = Buffer.from(paramStr, 'utf-8');
          if (!headers.punya('content-type')) {
            headers.tetapkan('Content-Type', 'application/x-www-form-urlencoded; charset=utf-8');
          }
          headers.tetapkan('Content-Length', buf.length);
          return { buffer: buf, contentType: headers.ambil('content-type'), panjangBytes: buf.length };
        } catch (err: any) {
          throw new GalatSerialisasiHTTP(`Gagal memformat form urlencoded: ${err.message}`, err);
        }
      }

      case 'multipart': {
        return PembentukBodyHTTP.bangunMultipart(body, headers);
      }

      case 'teks': {
        const str = String(body);
        const buf = Buffer.from(str, 'utf-8');
        if (!headers.punya('content-type')) {
          headers.tetapkan('Content-Type', 'text/plain; charset=utf-8');
        }
        headers.tetapkan('Content-Length', buf.length);
        return { buffer: buf, contentType: headers.ambil('content-type'), panjangBytes: buf.length };
      }

      case 'biner': {
        const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
        if (!headers.punya('content-type')) {
          headers.tetapkan('Content-Type', 'application/octet-stream');
        }
        headers.tetapkan('Content-Length', buf.length);
        return { buffer: buf, contentType: headers.ambil('content-type'), panjangBytes: buf.length };
      }

      default: {
        const str = String(body);
        const buf = Buffer.from(str, 'utf-8');
        headers.tetapkan('Content-Length', buf.length);
        return { buffer: buf, panjangBytes: buf.length };
      }
    }
  }

  private static deteksiTipe(body: any): TipeBody {
    if (typeof body === 'string') {
      const pangkas = body.trim();
      if ((pangkas.startsWith('{') && pangkas.endsWith('}')) || (pangkas.startsWith('[') && pangkas.endsWith(']'))) {
        return 'json';
      }
      return 'teks';
    }
    if (Array.isArray(body) && body.length > 0 && typeof body[0] === 'object' && 'nama' in body[0] && 'nilai' in body[0]) {
      return 'multipart';
    }
    if (typeof body === 'object' && body !== null) {
      return 'json';
    }
    return 'teks';
  }

  private static bangunMultipart(
    input: BagianMultipart[] | Record<string, any>,
    headers: PetaHeader
  ): HasilSerialisasiBody {
    const boundary = `----NusantaraFormBoundary${crypto.randomBytes(12).toString('hex')}`;
    const chunks: Buffer[] = [];

    const daftarBagian: BagianMultipart[] = Array.isArray(input)
      ? input
      : Object.entries(input).map(([k, v]) => ({
          nama: k,
          nilai: v,
        }));

    for (const bagian of daftarBagian) {
      chunks.push(Buffer.from(`--${boundary}\r\n`, 'utf-8'));

      if (bagian.namaBerkas) {
        const mime = bagian.mimeType || 'application/octet-stream';
        chunks.push(
          Buffer.from(
            `Content-Disposition: form-data; name="${bagian.nama}"; filename="${bagian.namaBerkas}"\r\nContent-Type: ${mime}\r\n\r\n`,
            'utf-8'
          )
        );
      } else {
        chunks.push(
          Buffer.from(`Content-Disposition: form-data; name="${bagian.nama}"\r\n\r\n`, 'utf-8')
        );
      }

      if (Buffer.isBuffer(bagian.nilai)) {
        chunks.push(bagian.nilai);
      } else {
        chunks.push(Buffer.from(String(bagian.nilai), 'utf-8'));
      }

      chunks.push(Buffer.from('\r\n', 'utf-8'));
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));
    const buffer = Buffer.concat(chunks);

    const contentType = `multipart/form-data; boundary=${boundary}`;
    headers.tetapkan('Content-Type', contentType);
    headers.tetapkan('Content-Length', buffer.length);

    return { buffer, contentType, panjangBytes: buffer.length };
  }
}
