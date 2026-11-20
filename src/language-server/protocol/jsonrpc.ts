/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Kode Galat Standar JSON-RPC 2.0 & LSP.
 */
export enum KodeGalatJSONRPC {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerNotInitialized = -32002,
  UnknownErrorCode = -32001,
  RequestCancelled = -32800,
}

export interface PermintaanJSONRPC {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

export interface NotifikasiJSONRPC {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface ResponsSuksesJSONRPC {
  jsonrpc: '2.0';
  id: number | string | null;
  result: any;
}

export interface ObjekGalatJSONRPC {
  code: number;
  message: string;
  data?: any;
}

export interface ResponsGalatJSONRPC {
  jsonrpc: '2.0';
  id: number | string | null;
  error: ObjekGalatJSONRPC;
}

export type PesanJSONRPC = PermintaanJSONRPC | NotifikasiJSONRPC | ResponsSuksesJSONRPC | ResponsGalatJSONRPC;

/**
 * Membungkus payload JSON menjadi pesan berbingkai LSP (Header Content-Length).
 */
export function formatPesanBingkaiLSP(payload: any): string {
  const jsonStr = JSON.stringify(payload);
  const bufferLength = typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(jsonStr).length
    : (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function'
      ? Buffer.byteLength(jsonStr, 'utf-8')
      : jsonStr.length);
  return `Content-Length: ${bufferLength}\r\n\r\n${jsonStr}`;
}

/**
 * Parser streaming untuk pesan berbingkai Content-Length JSON-RPC dari stream teks/buffer.
 */
export class PembacaBingkaiLSP {
  private bufferTeks = '';

  constructor(
    private readonly batasMaksimumKontenByte = 16 * 1024 * 1024,
    private readonly batasMaksimumHeaderByte = 8 * 1024
  ) {
    if (
      !Number.isSafeInteger(batasMaksimumKontenByte) ||
      batasMaksimumKontenByte < 1 ||
      !Number.isSafeInteger(batasMaksimumHeaderByte) ||
      batasMaksimumHeaderByte < 32
    ) {
      throw new RangeError('Batas ukuran bingkai LSP tidak valid.');
    }
  }

  /**
   * Menerima potongan teks masuk dan mengekstrak pesan-pesan lengkap.
   * Ukuran header dan payload dibatasi untuk mencegah buffer exhaustion.
   */
  public prosesPotongan(potongan: string): PesanJSONRPC[] {
    this.bufferTeks += potongan;
    const daftarPesan: PesanJSONRPC[] = [];

    while (true) {
      const indeksHeaderAkhir = this.bufferTeks.indexOf('\\r\\n\\r\\n');
      if (indeksHeaderAkhir === -1) {
        if (this.hitungByte(this.bufferTeks) > this.batasMaksimumHeaderByte) {
          this.bersihkan();
          throw new RangeError('Header LSP melebihi batas ukuran maksimum.');
        }
        break;
      }

      const byteHeader = this.hitungByte(this.bufferTeks.slice(0, indeksHeaderAkhir + 4));
      if (byteHeader > this.batasMaksimumHeaderByte) {
        this.bersihkan();
        throw new RangeError('Header LSP melebihi batas ukuran maksimum.');
      }

      const barisHeader = this.bufferTeks.substring(0, indeksHeaderAkhir);
      const daftarPanjang = barisHeader
        .split('\\r\\n')
        .filter(baris => /^Content-Length\\s*:/i.test(baris));

      if (daftarPanjang.length !== 1) {
        this.bersihkan();
        throw new Error('Bingkai LSP harus memiliki tepat satu header Content-Length.');
      }

      const cocokPanjang = daftarPanjang[0].match(/^Content-Length:\\s*(\\d+)\\s*$/i);
      if (!cocokPanjang) {
        this.bersihkan();
        throw new Error('Nilai header Content-Length tidak valid.');
      }

      const panjangKonten = Number(cocokPanjang[1]);
      if (!Number.isSafeInteger(panjangKonten) || panjangKonten < 0) {
        this.bersihkan();
        throw new RangeError('Nilai Content-Length berada di luar rentang aman.');
      }
      if (panjangKonten > this.batasMaksimumKontenByte) {
        this.bersihkan();
        throw new RangeError('Payload LSP melebihi batas ukuran maksimum.');
      }

      const awalKontenKarakter = indeksHeaderAkhir + 4;
      const awalKontenByte = this.hitungByte(this.bufferTeks.slice(0, awalKontenKarakter));
      const akhirKontenByte = awalKontenByte + panjangKonten;

      if (typeof Buffer !== 'undefined') {
        const bufferAsli = Buffer.from(this.bufferTeks, 'utf-8');
        if (bufferAsli.length < akhirKontenByte) break;

        const kontenBuf = bufferAsli.subarray(awalKontenByte, akhirKontenByte);
        const kontenTeks = kontenBuf.toString('utf-8');
        this.bufferTeks = bufferAsli.subarray(akhirKontenByte).toString('utf-8');

        try {
          daftarPesan.push(JSON.parse(kontenTeks));
        } catch {
          // Payload JSON rusak dibuang; parser tetap dapat memproses bingkai berikutnya.
        }
      } else {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const bufferAsli = encoder.encode(this.bufferTeks);
        if (bufferAsli.length < akhirKontenByte) break;

        const kontenBuf = bufferAsli.subarray(awalKontenByte, akhirKontenByte);
        const kontenTeks = decoder.decode(kontenBuf);
        this.bufferTeks = decoder.decode(bufferAsli.subarray(akhirKontenByte));

        try {
          daftarPesan.push(JSON.parse(kontenTeks));
        } catch {
          // Payload JSON rusak dibuang; parser tetap dapat memproses bingkai berikutnya.
        }
      }
    }

    return daftarPesan;
  }

  private hitungByte(teks: string): number {
    if (typeof Buffer !== 'undefined') return Buffer.byteLength(teks, 'utf-8');
    return new TextEncoder().encode(teks).length;
  }

  public bersihkan(): void {
    this.bufferTeks = '';
  }
}
