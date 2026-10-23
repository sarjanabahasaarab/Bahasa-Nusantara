/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Parser } from '../../parser/parser';
import { PemeriksaTipe } from '../../tipe/pemeriksaTipe';
import { LinterNUSANTARA } from '../../toolchain/linter';
import { mesinDiagnostikDefault, TingkatDiagnostik } from '../../diagnostik';
import { DokumenTeks } from '../documents/manajerDokumen';
import { DiagnostikLSP, TingkatKeparahanDiagnostikLSP, RentangLSP } from '../protocol/types';
import { NodeProgram } from '../../parser/ast';

/**
 * Layanan Diagnostik Real-Time Bahasa NUSANTARA untuk LSP.
 */
export class LayananDiagnostik {
  /**
   * Menganalisis dokumen teks dan menghasilkan daftar diagnostik LSP.
   */
  public analisisDokumen(dokumen: DokumenTeks): { program?: NodeProgram; diagnostik: DiagnostikLSP[] } {
    if (dokumen.diagnostikCache && dokumen.astCache) {
      return { program: dokumen.astCache, diagnostik: dokumen.diagnostikCache };
    }

    const hasilDiagnostik: DiagnostikLSP[] = [];
    const parser = new Parser(dokumen.konten);
    let program: NodeProgram | undefined;

    try {
      program = parser.parse();
      dokumen.astCache = program;
    } catch (err: any) {
      // Tangkap galat fatal parser jika ada
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
        kodeSumber: dokumen.konten,
        namaBerkas: dokumen.jalur,
      });
      hasilDiagnostik.push(this.ubahKeDiagnostikLSP(diag, dokumen));
    }

    // Ambil daftar galat parser non-fatal
    const galatParser = parser.dapatkanDaftarGalat();
    for (const galat of galatParser) {
      const diag = mesinDiagnostikDefault.ubahKeDiagnostik(galat, {
        kodeSumber: dokumen.konten,
        namaBerkas: dokumen.jalur,
      });
      hasilDiagnostik.push(this.ubahKeDiagnostikLSP(diag, dokumen));
    }

    // Jika program berhasil terbentuk sebagian atau utuh, jalankan Type Checker & Linter
    if (program) {
      try {
        const pemeriksaTipe = new PemeriksaTipe();
        const galatTipe = pemeriksaTipe.periksa(program);
        for (const galat of galatTipe) {
          const diag = mesinDiagnostikDefault.ubahKeDiagnostik(galat, {
            kodeSumber: dokumen.konten,
            namaBerkas: dokumen.jalur,
          });
          hasilDiagnostik.push(this.ubahKeDiagnostikLSP(diag, dokumen));
        }
      } catch (err: any) {
        const diag = mesinDiagnostikDefault.ubahKeDiagnostik(err, {
          kodeSumber: dokumen.konten,
          namaBerkas: dokumen.jalur,
        });
        hasilDiagnostik.push(this.ubahKeDiagnostikLSP(diag, dokumen));
      }

      // Jalankan Linter statis Phase 19 (NUS-W001 s/d NUS-W004)
      try {
        const linter = new LinterNUSANTARA(dokumen.konten, dokumen.jalur);
        const peringatanLinter = linter.periksa(program);
        for (const warn of peringatanLinter) {
          hasilDiagnostik.push(this.ubahKeDiagnostikLSP(warn, dokumen));
        }
      } catch (err) {
        // Abaikan galat internal linter agar tidak mengganggu editor
      }
    }

    dokumen.diagnostikCache = hasilDiagnostik;
    return { program, diagnostik: hasilDiagnostik };
  }

  /**
   * Mengonversi model Diagnostik internal NUSANTARA (Phase 18) ke DiagnostikLSP.
   */
  public ubahKeDiagnostikLSP(diag: any, dokumen: DokumenTeks): DiagnostikLSP {
    let range: RentangLSP;

    if (diag.lokasi && typeof diag.lokasi.baris === 'number') {
      const line = Math.max(0, diag.lokasi.baris - 1);
      const character = Math.max(0, (diag.lokasi.kolom || 1) - 1);
      const panjang = diag.lokasi.panjang || 1;

      range = {
        start: { line, character },
        end: { line, character: character + panjang },
      };
    } else {
      // Default ke awal dokumen jika lokasi tidak terlacak
      range = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      };
    }

    let severity = TingkatKeparahanDiagnostikLSP.Error;
    if (diag.tingkat === TingkatDiagnostik.PERINGATAN) {
      severity = TingkatKeparahanDiagnostikLSP.Warning;
    } else if (diag.tingkat === TingkatDiagnostik.INFORMASI) {
      severity = TingkatKeparahanDiagnostikLSP.Information;
    }

    let message = diag.pesan || 'Ditemukan masalah pada kode sumber.';
    if (diag.saran) {
      message += ` (Saran: ${diag.saran})`;
    }

    return {
      range,
      severity,
      code: diag.kode,
      source: 'nusantara',
      message,
    };
  }
}
