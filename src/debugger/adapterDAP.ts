/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Debug Adapter Protocol (DAP) Foundation untuk Bahasa NUSANTARA (Phase 25)
 */

import { PenelusurNUSANTARA } from './penelusur';
import { SesiDebug } from './sesiDebug';
import { PermintaanDAP, ResponDAP, PeristiwaDAP } from './types';

/**
 * Adapter untuk menghubungkan engine Penelusur NUSANTARA dengan protokol DAP (Debug Adapter Protocol).
 * Digunakan oleh editor IDE (seperti VS Code) untuk debugging terstandarisasi.
 */
export class AdapterDAPNUSANTARA {
  private seq = 1;
  private readonly penelusur: PenelusurNUSANTARA;
  private sesi?: SesiDebug;

  constructor(penelusur?: PenelusurNUSANTARA) {
    this.penelusur = penelusur || new PenelusurNUSANTARA();
  }

  public dapatkanPenelusur(): PenelusurNUSANTARA {
    return this.penelusur;
  }

  public dapatkanSesi(): SesiDebug | undefined {
    return this.sesi;
  }

  /**
   * Titik masuk pemrosesan pesan permintaan DAP.
   */
  public prosesPermintaan(permintaan: PermintaanDAP): ResponDAP {
    const respon: ResponDAP = {
      seq: this.seq++,
      type: 'response',
      request_seq: permintaan.seq,
      command: permintaan.command,
      success: true,
    };

    try {
      switch (permintaan.command) {
        case 'initialize': {
          respon.body = {
            supportsConfigurationDoneRequest: true,
            supportsFunctionBreakpoints: false,
            supportsConditionalBreakpoints: true,
            supportsHitConditionalBreakpoints: false,
            supportsEvaluateForHovers: true,
            supportsStepBack: false,
            supportsSetVariable: false,
            supportsRestartFrame: false,
            supportsGotoTargetsRequest: false,
            supportsStepInTargetsRequest: false,
            supportsCompletionsRequest: false,
            supportsModulesRequest: true,
          };
          break;
        }

        case 'launch': {
          const args = permintaan.arguments || {};
          const berkas = args.program || args.berkas || 'program.nusantara';
          const sumber = args.sumber || '';
          this.sesi = this.penelusur.buatSesi({ berkas, sumber });
          respon.body = {
            idSesi: this.sesi.id,
            status: this.sesi.status,
          };
          break;
        }

        case 'setBreakpoints': {
          const args = permintaan.arguments || {};
          const berkas = args.source?.path || args.berkas || this.sesi?.berkasSumber || 'program.nusantara';
          const bpDiminta = args.breakpoints || [];
          const hasilDAP: any[] = [];

          for (const item of bpDiminta) {
            const baris = item.line || item.baris;
            const res = this.penelusur.tambahBreakpoint(berkas, baris, {
              kondisi: item.condition,
            });
            hasilDAP.push({
              id: res.breakpoint.id,
              verified: res.validasi.valid,
              line: res.breakpoint.baris,
              message: res.validasi.pesan,
            });
          }

          respon.body = {
            breakpoints: hasilDAP,
          };
          break;
        }

        case 'continue': {
          if (!this.sesi) throw new Error('Sesi debug belum diinisialisasi.');
          respon.body = {
            allThreadsContinued: true,
          };
          break;
        }

        case 'next': {
          if (!this.sesi) throw new Error('Sesi debug belum diinisialisasi.');
          respon.body = {};
          break;
        }

        case 'stepIn': {
          if (!this.sesi) throw new Error('Sesi debug belum diinisialisasi.');
          respon.body = {};
          break;
        }

        case 'stepOut': {
          if (!this.sesi) throw new Error('Sesi debug belum diinisialisasi.');
          respon.body = {};
          break;
        }

        case 'pause': {
          this.penelusur.mintaJeda();
          respon.body = {};
          break;
        }

        case 'stackTrace': {
          if (!this.sesi) throw new Error('Sesi debug belum diinisialisasi.');
          const stackFrames = this.sesi.tumpukanBingkai.map(f => ({
            id: f.indeks,
            name: f.namaFungsi,
            source: {
              name: f.berkas.split('/').pop(),
              path: f.berkas,
            },
            line: f.baris,
            column: f.kolom,
          }));

          respon.body = {
            stackFrames,
            totalFrames: stackFrames.length,
          };
          break;
        }

        case 'scopes': {
          const args = permintaan.arguments || {};
          const frameId = args.frameId ?? 0;
          respon.body = {
            scopes: [
              {
                name: 'Locals',
                variablesReference: 1000 + frameId,
                expensive: false,
              },
              {
                name: 'Globals',
                variablesReference: 2000,
                expensive: true,
              },
            ],
          };
          break;
        }

        case 'variables': {
          if (!this.sesi) throw new Error('Sesi debug belum diinisialisasi.');
          const args = permintaan.arguments || {};
          const ref = args.variablesReference || 0;
          const variabelDAP: any[] = [];

          if (ref >= 1000 && ref < 2000) {
            const frameId = ref - 1000;
            const locals = this.sesi.dapatkanVariabelLokal(frameId);
            for (const [nama, v] of locals.entries()) {
              variabelDAP.push({
                name: nama,
                value: v.formatTeks,
                type: v.tipe,
                variablesReference: 0,
              });
            }
          } else if (ref === 2000) {
            const globals = this.sesi.dapatkanVariabelGlobal();
            for (const [nama, v] of globals.entries()) {
              variabelDAP.push({
                name: nama,
                value: v.formatTeks,
                type: v.tipe,
                variablesReference: 0,
              });
            }
          }

          respon.body = {
            variables: variabelDAP,
          };
          break;
        }

        case 'evaluate': {
          if (!this.sesi) throw new Error('Sesi debug belum diinisialisasi.');
          const args = permintaan.arguments || {};
          const expr = args.expression || '';
          const frameId = args.frameId;

          const hasil = this.sesi.evaluasiEkspresi(expr, frameId);
          if (hasil.berhasil) {
            respon.body = {
              result: hasil.formatTeks || 'kosong',
              type: hasil.tipe || 'kosong',
              variablesReference: 0,
            };
          } else {
            respon.success = false;
            respon.message = hasil.galat;
          }
          break;
        }

        case 'disconnect': {
          respon.body = {};
          break;
        }

        default: {
          respon.success = false;
          respon.message = `Perintah DAP '${permintaan.command}' tidak didukung.`;
          break;
        }
      }
    } catch (e: any) {
      respon.success = false;
      respon.message = e?.message || String(e);
    }

    return respon;
  }
}
