/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PermintaanJSONRPC,
  NotifikasiJSONRPC,
  ResponsSuksesJSONRPC,
  ResponsGalatJSONRPC,
  PesanJSONRPC,
  KodeGalatJSONRPC,
} from './protocol/jsonrpc';
import {
  ParameterInisialisasiLSP,
  HasilInisialisasiLSP,
  KemampuanServerLSP,
  ItemDokumenTeksLSP,
  ParameterPerubahanDokumenLSP,
  PengidentifikasiDokumenTeksLSP,
  ParameterKompleksiLSP,
  ParameterPosisiDokumenTeksLSP,
  ParameterSimbolWorkspaceLSP,
  ParameterPublikasiDiagnostikLSP,
} from './protocol/types';
import { ManajerDokumen, uriKeJalurBerkas } from './documents/manajerDokumen';
import { LayananDiagnostik } from './services/layananDiagnostik';
import { LayananKompleksi } from './services/layananKompleksi';
import { LayananHover } from './services/layananHover';
import { LayananDefinisi } from './services/layananDefinisi';
import { LayananSimbol } from './services/layananSimbol';
import { PembacaBerkas } from '../modul/pembacaBerkas';

export type PengirimPesanLSP = (pesan: PesanJSONRPC) => void;
export type PencatatLogLSP = (level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR', pesan: string) => void;

export interface OpsiServerBahasa {
  pembacaBerkas?: PembacaBerkas;
  direktoriKerja?: string;
  pengirimPesan?: PengirimPesanLSP;
  pencatatLog?: PencatatLogLSP;
  janganKeluarOtomatis?: boolean;
}

/**
 * Server Bahasa Resmi NUSANTARA (NUSANTARA Language Server - Phase 20).
 * Mengimplementasikan protokol Language Server Protocol (LSP) standar via JSON-RPC 2.0.
 */
export class ServerBahasaNUSANTARA {
  private readonly manajerDokumen: ManajerDokumen;
  private readonly layananDiagnostik: LayananDiagnostik;
  private readonly layananKompleksi: LayananKompleksi;
  private readonly layananHover: LayananHover;
  private readonly layananDefinisi: LayananDefinisi;
  private readonly layananSimbol: LayananSimbol;

  private pembacaBerkas?: PembacaBerkas;
  private direktoriKerja?: string;
  private pengirimPesan: PengirimPesanLSP;
  private pencatatLog: PencatatLogLSP;
  private janganKeluarOtomatis: boolean;

  private terinisialisasi = false;
  private sedangShutdown = false;

  constructor(opsi: OpsiServerBahasa = {}) {
    this.pembacaBerkas = opsi.pembacaBerkas;
    this.direktoriKerja = opsi.direktoriKerja;
    this.pengirimPesan = opsi.pengirimPesan || (() => {});
    this.janganKeluarOtomatis = opsi.janganKeluarOtomatis ?? false;
    this.pencatatLog = opsi.pencatatLog || ((level, msg) => {
      // Gunakan stderr agar tidak mencemari stdout komunikasi LSP
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(`[NUSANTARA-LSP ${level}] ${msg}\n`);
      }
    });

    this.manajerDokumen = new ManajerDokumen();
    this.layananDiagnostik = new LayananDiagnostik();
    this.layananKompleksi = new LayananKompleksi();
    this.layananHover = new LayananHover();
    this.layananDefinisi = new LayananDefinisi(this.manajerDokumen, this.pembacaBerkas, this.direktoriKerja);
    this.layananSimbol = new LayananSimbol();
  }

  /**
   * Menetapkan atau memperbarui fungsi pengirim pesan keluar (ke klien/editor).
   */
  public pasangPengirimPesan(pengirim: PengirimPesanLSP): void {
    this.pengirimPesan = pengirim;
  }

  /**
   * Mengambil instance manajer dokumen.
   */
  public dapatkanManajerDokumen(): ManajerDokumen {
    return this.manajerDokumen;
  }

  /**
   * Memproses pesan JSON-RPC yang masuk dari klien/editor.
   */
  public async tanganiPesan(pesan: PesanJSONRPC): Promise<PesanJSONRPC | null> {
    if (!pesan || typeof pesan !== 'object' || pesan.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: (pesan as any)?.id || null,
        error: {
          code: KodeGalatJSONRPC.InvalidRequest,
          message: 'Permintaan JSON-RPC 2.0 tidak valid.',
        },
      };
    }

    // 1. Tangani Notifikasi (tanpa id)
    if (!('id' in pesan) || pesan.id === undefined) {
      this.tanganiNotifikasi(pesan as NotifikasiJSONRPC);
      return null;
    }

    // 2. Tangani Permintaan (memiliki id)
    const permintaan = pesan as PermintaanJSONRPC;
    try {
      const hasil = await this.tanganiPermintaan(permintaan);
      return {
        jsonrpc: '2.0',
        id: permintaan.id,
        result: hasil,
      };
    } catch (err: any) {
      this.pencatatLog('ERROR', `Galat saat memproses metode ${permintaan.method}: ${err.message || err}`);
      return {
        jsonrpc: '2.0',
        id: permintaan.id,
        error: {
          code: err.code || KodeGalatJSONRPC.InternalError,
          message: err.message || 'Terjadi kesalahan internal pada Language Server.',
          data: err.data,
        },
      };
    }
  }

  /**
   * Router penanganan permintaan (Request Handler).
   */
  private async tanganiPermintaan(req: PermintaanJSONRPC): Promise<any> {
    switch (req.method) {
      case 'initialize':
        return this.tanganiInisialisasi(req.params as ParameterInisialisasiLSP);

      case 'shutdown':
        this.sedangShutdown = true;
        this.pencatatLog('INFO', 'Server menerima permintaan shutdown.');
        return null;

      case 'textDocument/completion': {
        this.pastikanTerinisialisasi();
        const p = req.params as ParameterKompleksiLSP;
        const dok = this.manajerDokumen.ambilDokumen(p.textDocument.uri);
        if (!dok) return { isIncomplete: false, items: [] };

        const analisis = this.layananDiagnostik.analisisDokumen(dok);
        return this.layananKompleksi.dapatkanKompleksi(dok, p.position, analisis.program);
      }

      case 'textDocument/hover': {
        this.pastikanTerinisialisasi();
        const p = req.params as ParameterPosisiDokumenTeksLSP;
        const dok = this.manajerDokumen.ambilDokumen(p.textDocument.uri);
        if (!dok) return null;

        const analisis = this.layananDiagnostik.analisisDokumen(dok);
        return this.layananHover.dapatkanHover(dok, p.position, analisis.program);
      }

      case 'textDocument/definition': {
        this.pastikanTerinisialisasi();
        const p = req.params as ParameterPosisiDokumenTeksLSP;
        const dok = this.manajerDokumen.ambilDokumen(p.textDocument.uri);
        if (!dok) return null;

        const analisis = this.layananDiagnostik.analisisDokumen(dok);
        return this.layananDefinisi.dapatkanDefinisi(dok, p.position, analisis.program);
      }

      case 'textDocument/documentSymbol': {
        this.pastikanTerinisialisasi();
        const p = req.params as { textDocument: PengidentifikasiDokumenTeksLSP };
        const dok = this.manajerDokumen.ambilDokumen(p.textDocument.uri);
        if (!dok) return [];

        const analisis = this.layananDiagnostik.analisisDokumen(dok);
        return this.layananSimbol.dapatkanSimbolDokumen(dok, analisis.program);
      }

      case 'workspace/symbol': {
        this.pastikanTerinisialisasi();
        const p = req.params as ParameterSimbolWorkspaceLSP;
        return this.layananSimbol.dapatkanSimbolWorkspace(
          p.query,
          this.manajerDokumen,
          this.pembacaBerkas,
          this.direktoriKerja
        );
      }

      default:
        throw {
          code: KodeGalatJSONRPC.MethodNotFound,
          message: `Metode '${req.method}' tidak didukung oleh Language Server NUSANTARA.`,
        };
    }
  }

  /**
   * Router penanganan notifikasi satu arah (Notification Handler).
   */
  private tanganiNotifikasi(notif: NotifikasiJSONRPC): void {
    switch (notif.method) {
      case 'initialized':
        this.pencatatLog('INFO', 'Klien editor mengonfirmasi inisialisasi (initialized).');
        break;

      case 'exit':
        this.pencatatLog('INFO', 'Server keluar sesuai permintaan klien (exit).');
        if (!this.janganKeluarOtomatis && typeof process !== 'undefined' && process.exit) {
          process.exit(this.sedangShutdown ? 0 : 1);
        }
        break;

      case 'textDocument/didOpen': {
        const p = notif.params as { textDocument: ItemDokumenTeksLSP };
        if (p && p.textDocument) {
          const dok = this.manajerDokumen.bukaDokumen(
            p.textDocument.uri,
            p.textDocument.languageId,
            p.textDocument.version,
            p.textDocument.text
          );
          this.kirimDiagnostikDokumen(dok);
        }
        break;
      }

      case 'textDocument/didChange': {
        const p = notif.params as ParameterPerubahanDokumenLSP;
        if (p && p.textDocument && p.contentChanges) {
          const dok = this.manajerDokumen.perbaruiDokumen(
            p.textDocument.uri,
            p.textDocument.version,
            p.contentChanges
          );
          if (dok) {
            this.kirimDiagnostikDokumen(dok);
          }
        }
        break;
      }

      case 'textDocument/didClose': {
        const p = notif.params as { textDocument: PengidentifikasiDokumenTeksLSP };
        if (p && p.textDocument) {
          this.manajerDokumen.tutupDokumen(p.textDocument.uri);
          // Bersihkan diagnostik dokumen yang ditutup
          this.kirimNotifikasiLSP('textDocument/publishDiagnostics', {
            uri: p.textDocument.uri,
            diagnostics: [],
          });
        }
        break;
      }

      default:
        this.pencatatLog('DEBUG', `Notifikasi '${notif.method}' diterima dan diabaikan.`);
        break;
    }
  }

  /**
   * Menangani permintaan inisialisasi awal LSP.
   */
  private tanganiInisialisasi(params: ParameterInisialisasiLSP): HasilInisialisasiLSP {
    if (params.rootUri) {
      this.direktoriKerja = uriKeJalurBerkas(params.rootUri);
    } else if (params.rootPath) {
      this.direktoriKerja = params.rootPath;
    } else if (params.workspaceFolders && params.workspaceFolders.length > 0) {
      this.direktoriKerja = uriKeJalurBerkas(params.workspaceFolders[0].uri);
    }

    this.terinisialisasi = true;
    this.pencatatLog('INFO', `Inisialisasi selesai. Direktori kerja: ${this.direktoriKerja || 'in-memory'}`);

    const capabilities: KemampuanServerLSP = {
      textDocumentSync: {
        openClose: true,
        change: 1, // Full document sync
      },
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.', '"'],
      },
      hoverProvider: true,
      definitionProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
    };

    return {
      capabilities,
      serverInfo: {
        name: 'nusantara-language-server',
        version: '0.20.0',
      },
    };
  }

  /**
   * Menganalisis dokumen dan mempublikasikan diagnostik secara otomatis ke editor.
   */
  public kirimDiagnostikDokumen(dokumen: any): void {
    const analisis = this.layananDiagnostik.analisisDokumen(dokumen);
    const paramDiagnostik: ParameterPublikasiDiagnostikLSP = {
      uri: dokumen.uri,
      version: dokumen.version,
      diagnostics: analisis.diagnostik,
    };

    this.kirimNotifikasiLSP('textDocument/publishDiagnostics', paramDiagnostik);
  }

  /**
   * Mengirim notifikasi JSON-RPC keluar ke editor klien.
   */
  private kirimNotifikasiLSP(metode: string, parameter: any): void {
    const notif: NotifikasiJSONRPC = {
      jsonrpc: '2.0',
      method: metode,
      params: parameter,
    };
    this.pengirimPesan(notif);
  }

  private pastikanTerinisialisasi(): void {
    if (!this.terinisialisasi) {
      throw {
        code: KodeGalatJSONRPC.ServerNotInitialized,
        message: 'Language Server belum diinisialisasi oleh klien editor.',
      };
    }
  }
}
