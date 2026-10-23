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
  const bufferLength = Buffer.byteLength(jsonStr, 'utf-8');
  return `Content-Length: ${bufferLength}\r\n\r\n${jsonStr}`;
}

/**
 * Parser streaming untuk pesan berbingkai Content-Length JSON-RPC dari stream teks/buffer.
 */
export class PembacaBingkaiLSP {
  private bufferTeks = '';

  /**
   * Menerima potongan teks masuk dan mengekstrak pesan-pesan JSON-RPC yang lengkap.
   */
  public prosesPotongan(potongan: string): PesanJSONRPC[] {
    this.bufferTeks += potongan;
    const daftarPesan: PesanJSONRPC[] = [];

    while (true) {
      const indeksHeaderAkhir = this.bufferTeks.indexOf('\r\n\r\n');
      if (indeksHeaderAkhir === -1) {
        break; // Header belum lengkap
      }

      const barisHeader = this.bufferTeks.substring(0, indeksHeaderAkhir);
      let panjangKonten = -1;

      for (const baris of barisHeader.split('\r\n')) {
        const cocokan = baris.match(/Content-Length:\s*(\d+)/i);
        if (cocokan) {
          panjangKonten = parseInt(cocokan[1], 10);
          break;
        }
      }

      if (panjangKonten === -1) {
        // Format header tidak sah, lewati hingga pembatas berikutnya
        this.bufferTeks = this.bufferTeks.substring(indeksHeaderAkhir + 4);
        continue;
      }

      const awalKonten = indeksHeaderAkhir + 4;
      const totalPanjangDibutuhkan = awalKonten + panjangKonten;

      const bufferAsli = Buffer.from(this.bufferTeks, 'utf-8');
      if (bufferAsli.length < totalPanjangDibutuhkan) {
        // Konten belum sepenuhnya tiba
        break;
      }

      // Potong payload konten
      const kontenBuf = bufferAsli.subarray(awalKonten, totalPanjangDibutuhkan);
      const kontenTeks = kontenBuf.toString('utf-8');

      // Potong sisa buffer
      const sisaBuf = bufferAsli.subarray(totalPanjangDibutuhkan);
      this.bufferTeks = sisaBuf.toString('utf-8');

      try {
        const pesanTerurai = JSON.parse(kontenTeks);
        daftarPesan.push(pesanTerurai);
      } catch (err) {
        // JSON tidak valid
      }
    }

    return daftarPesan;
  }

  /**
   * Mengosongkan buffer parser.
   */
  public bersihkan(): void {
    this.bufferTeks = '';
  }
}
