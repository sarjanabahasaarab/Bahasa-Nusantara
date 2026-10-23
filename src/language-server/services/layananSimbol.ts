/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NodeProgram,
  PernyataanAST,
  JenisNodeAST,
  NodeDeklarasiVariabel,
  NodeDeklarasiTetap,
  NodeDeklarasiFungsi,
} from '../../parser/ast';
import { DokumenTeks, ManajerDokumen, jalurBerkasKeUri } from '../documents/manajerDokumen';
import {
  SimbolDokumenLSP,
  InformasiSimbolLSP,
  JenisSimbolLSP,
  RentangLSP,
} from '../protocol/types';
import { PembacaBerkas } from '../../modul/pembacaBerkas';
import { Parser } from '../../parser/parser';

/**
 * Layanan Ekstraksi Simbol Dokumen dan Pencarian Simbol Workspace Bahasa NUSANTARA.
 */
export class LayananSimbol {
  /**
   * Menghasilkan pohon simbol dokumen berhierarki (Document Symbols) untuk editor outline / breadcrumb.
   */
  public dapatkanSimbolDokumen(
    dokumen: DokumenTeks,
    program?: NodeProgram
  ): SimbolDokumenLSP[] {
    if (dokumen.simbolCache) {
      return dokumen.simbolCache;
    }

    if (!program) {
      return [];
    }

    const daftarSimbol: SimbolDokumenLSP[] = [];

    // 1. Simbol Modul / Program Utama
    const namaEntri = program.namaProgram || (program.deklarasiModul ? program.deklarasiModul.namaModul : 'program');
    const rentangProgram = this.ubahRentangAstKeLsp(program.posisi);

    const anakProgram: SimbolDokumenLSP[] = [];

    // 2. Simbol Impor
    if (program.daftarImpor) {
      for (const imp of program.daftarImpor) {
        anakProgram.push({
          name: imp.aliasModul ? `${imp.sumberModul} sebagai ${imp.aliasModul}` : imp.sumberModul,
          detail: 'impor modul',
          kind: JenisSimbolLSP.Module,
          range: this.ubahRentangAstKeLsp(imp.posisi),
          selectionRange: this.ubahRentangAstKeLsp(imp.posisi),
        });
      }
    }

    // 3. Simbol Fungsi
    if (program.daftarFungsi) {
      for (const fn of program.daftarFungsi) {
        const params = fn.parameter.map(p => `${p.nama}: ${p.tipeData}`).join(', ');
        const anakFungsi: SimbolDokumenLSP[] = [];

        // Parameter sebagai anak simbol fungsi
        for (const p of fn.parameter) {
          anakFungsi.push({
            name: p.nama,
            detail: p.tipeData,
            kind: JenisSimbolLSP.Variable,
            range: this.ubahRentangAstKeLsp(p.posisi),
            selectionRange: this.ubahRentangAstKeLsp(p.posisi),
          });
        }

        // Variabel lokal fungsi
        this.kumpulkanSimbolVariabel(fn.tubuh, anakFungsi);

        anakProgram.push({
          name: fn.nama,
          detail: `(${params}): ${fn.tipeKembalian || 'kosong'}`,
          kind: JenisSimbolLSP.Function,
          range: this.ubahRentangAstKeLsp(fn.posisi),
          selectionRange: this.ubahRentangAstKeLsp(fn.posisi),
          children: anakFungsi.length > 0 ? anakFungsi : undefined,
        });
      }
    }

    // 4. Variabel Tingkat Program / Tubuh Utama
    if (program.tubuhUtama) {
      this.kumpulkanSimbolVariabel(program.tubuhUtama, anakProgram);
    }

    // Masukkan ke simbol teratas jika ada program
    daftarSimbol.push({
      name: namaEntri,
      detail: program.deklarasiModul ? 'modul' : 'program utama',
      kind: program.deklarasiModul ? JenisSimbolLSP.Module : JenisSimbolLSP.Namespace,
      range: rentangProgram,
      selectionRange: rentangProgram,
      children: anakProgram,
    });

    dokumen.simbolCache = daftarSimbol;
    return daftarSimbol;
  }

  /**
   * Mencari simbol di seluruh workspace proyek berdasarkan kata kunci kueri.
   */
  public dapatkanSimbolWorkspace(
    query: string,
    manajerDokumen: ManajerDokumen,
    pembacaBerkas?: PembacaBerkas,
    direktoriKerja?: string
  ): InformasiSimbolLSP[] {
    const hasil: InformasiSimbolLSP[] = [];
    const kataKueri = (query || '').toLowerCase().trim();

    // 1. Periksa seluruh dokumen yang sedang terbuka di memori
    const dokumenTerbuka = manajerDokumen.ambilSemuaDokumen();
    for (const dok of dokumenTerbuka) {
      if (dok.astCache) {
        this.cariSimbolDiProgram(dok.astCache, dok.uri, kataKueri, hasil);
      }
    }

    // 2. Jika ada pembaca berkas, periksa berkas .nusantara yang belum dibuka di memori
    if (pembacaBerkas && direktoriKerja) {
      try {
        const berkasTersedia = this.temukanBerkasNusantara(pembacaBerkas, direktoriKerja);
        for (const jalur of berkasTersedia) {
          const uri = jalurBerkasKeUri(jalur);
          if (manajerDokumen.ambilDokumen(uri)) {
            continue; // Sudah diproses di langkah 1
          }

          try {
            const konten = pembacaBerkas.baca(jalur);
            const parser = new Parser(konten);
            const ast = parser.parse();
            this.cariSimbolDiProgram(ast, uri, kataKueri, hasil);
          } catch (e) {
            // Lewati berkas bermasalah
          }
        }
      } catch (err) {
        // Abaikan galat pemindaian
      }
    }

    return hasil;
  }

  private kumpulkanSimbolVariabel(
    daftar: PernyataanAST[],
    tujuan: SimbolDokumenLSP[]
  ): void {
    for (const stmt of daftar) {
      if (stmt.jenis === JenisNodeAST.DEKLARASI_VARIABEL) {
        const v = stmt as NodeDeklarasiVariabel;
        tujuan.push({
          name: v.nama,
          detail: v.tipeData,
          kind: JenisSimbolLSP.Variable,
          range: this.ubahRentangAstKeLsp(v.posisi),
          selectionRange: this.ubahRentangAstKeLsp(v.posisi),
        });
      } else if (stmt.jenis === JenisNodeAST.DEKLARASI_TETAP) {
        const t = stmt as NodeDeklarasiTetap;
        tujuan.push({
          name: t.nama,
          detail: t.tipeData,
          kind: JenisSimbolLSP.Constant,
          range: this.ubahRentangAstKeLsp(t.posisi),
          selectionRange: this.ubahRentangAstKeLsp(t.posisi),
        });
      }
    }
  }

  private cariSimbolDiProgram(
    program: NodeProgram,
    uri: string,
    kueri: string,
    tujuan: InformasiSimbolLSP[]
  ): void {
    const cocok = (nama: string) => !kueri || nama.toLowerCase().includes(kueri);

    if (program.namaProgram && cocok(program.namaProgram)) {
      tujuan.push({
        name: program.namaProgram,
        kind: JenisSimbolLSP.Namespace,
        location: { uri, range: this.ubahRentangAstKeLsp(program.posisi) },
      });
    }

    if (program.daftarFungsi) {
      for (const fn of program.daftarFungsi) {
        if (cocok(fn.nama)) {
          tujuan.push({
            name: fn.nama,
            kind: JenisSimbolLSP.Function,
            location: { uri, range: this.ubahRentangAstKeLsp(fn.posisi) },
            containerName: program.namaProgram,
          });
        }
      }
    }

    if (program.tubuhUtama) {
      for (const stmt of program.tubuhUtama) {
        if (stmt.jenis === JenisNodeAST.DEKLARASI_VARIABEL) {
          const v = stmt as NodeDeklarasiVariabel;
          if (cocok(v.nama)) {
            tujuan.push({
              name: v.nama,
              kind: JenisSimbolLSP.Variable,
              location: { uri, range: this.ubahRentangAstKeLsp(v.posisi) },
              containerName: program.namaProgram,
            });
          }
        } else if (stmt.jenis === JenisNodeAST.DEKLARASI_TETAP) {
          const t = stmt as NodeDeklarasiTetap;
          if (cocok(t.nama)) {
            tujuan.push({
              name: t.nama,
              kind: JenisSimbolLSP.Constant,
              location: { uri, range: this.ubahRentangAstKeLsp(t.posisi) },
              containerName: program.namaProgram,
            });
          }
        }
      }
    }
  }

  private temukanBerkasNusantara(fs: PembacaBerkas, dirBasis: string): string[] {
    const hasil: string[] = [];
    if (!fs.daftarDirektori || !fs.apakahDirektori) return hasil;

    const pindai = (dir: string) => {
      try {
        const entri = fs.daftarDirektori!(dir);
        for (const item of entri) {
          const jalurPenuh = dir === '/' ? `/${item}` : `${dir}/${item}`;
          if (['.git', '.nusantara', 'node_modules', 'vendor', 'cache'].includes(item)) {
            continue;
          }
          if (fs.apakahDirektori!(jalurPenuh)) {
            pindai(jalurPenuh);
          } else if (item.endsWith('.nusantara')) {
            hasil.push(jalurPenuh);
          }
        }
      } catch (e) {
        // Abaikan galat direktori
      }
    };

    pindai(dirBasis);
    return hasil;
  }

  private ubahRentangAstKeLsp(pos: any): RentangLSP {
    if (!pos || !pos.awal || !pos.akhir) {
      return {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      };
    }
    return {
      start: {
        line: Math.max(0, pos.awal.baris - 1),
        character: Math.max(0, pos.awal.kolom - 1),
      },
      end: {
        line: Math.max(0, pos.akhir.baris - 1),
        character: Math.max(0, pos.akhir.kolom - 1),
      },
    };
  }
}
