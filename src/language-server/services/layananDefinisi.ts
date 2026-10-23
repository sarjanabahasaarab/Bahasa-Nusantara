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
import { Parser } from '../../parser/parser';
import { DokumenTeks, ManajerDokumen, jalurBerkasKeUri } from '../documents/manajerDokumen';
import { LokasiLSP, PosisiLSP, RentangLSP } from '../protocol/types';
import { PembacaBerkas } from '../../modul/pembacaBerkas';

/**
 * Layanan Go-to-Definition (Lompat ke Definisi) Bahasa NUSANTARA.
 */
export class LayananDefinisi {
  private readonly manajerDokumen: ManajerDokumen;
  private readonly pembacaBerkas?: PembacaBerkas;
  private readonly direktoriKerja?: string;

  constructor(manajerDokumen: ManajerDokumen, pembacaBerkas?: PembacaBerkas, direktoriKerja?: string) {
    this.manajerDokumen = manajerDokumen;
    this.pembacaBerkas = pembacaBerkas;
    this.direktoriKerja = direktoriKerja;
  }

  /**
   * Menemukan lokasi deklarasi simbol pada posisi kursor.
   */
  public dapatkanDefinisi(
    dokumen: DokumenTeks,
    posisi: PosisiLSP,
    program?: NodeProgram
  ): LokasiLSP | null {
    const barisTeks = this.ambilBarisTeks(dokumen.konten, posisi.line);
    if (!barisTeks) return null;

    const tokenInfo = this.ekstrakTokenDiKursor(barisTeks, posisi.character);
    if (!tokenInfo) return null;

    const { kata, kataSebelumTitik } = tokenInfo;

    // 1. Jika ada target titik (misal: utilitas.hitung), cari deklarasi di modul eksternal
    if (kataSebelumTitik && program) {
      const lokasiModul = this.cariDefinisiDiModulEksternal(kataSebelumTitik, kata, program, dokumen);
      if (lokasiModul) {
        return lokasiModul;
      }
    }

    // 2. Cari di dalam dokumen lokal (Fungsi, Parameter, Variabel)
    if (program) {
      // 2a. Cek apakah cocok dengan nama fungsi di dokumen ini
      if (program.daftarFungsi) {
        for (const fn of program.daftarFungsi) {
          if (fn.nama === kata) {
            return {
              uri: dokumen.uri,
              range: this.ubahRentangAstKeLsp(fn.posisi),
            };
          }

          // Cek parameter dan variabel lokal jika kursor berada di dalam fungsi ini
          if (this.apakahPosisiDiDalamRentang(posisi, fn.posisi)) {
            for (const param of fn.parameter) {
              if (param.nama === kata) {
                return {
                  uri: dokumen.uri,
                  range: this.ubahRentangAstKeLsp(param.posisi),
                };
              }
            }

            const varLokal = this.cariVariabelDiDaftar(fn.tubuh, kata);
            if (varLokal) {
              return {
                uri: dokumen.uri,
                range: this.ubahRentangAstKeLsp(varLokal.posisi),
              };
            }
          }
        }
      }

      // 2b. Cek variabel di tubuh utama program
      if (program.tubuhUtama) {
        const varUtama = this.cariVariabelDiDaftar(program.tubuhUtama, kata);
        if (varUtama) {
          return {
            uri: dokumen.uri,
            range: this.ubahRentangAstKeLsp(varUtama.posisi),
          };
        }
      }

      // 2c. Cek apakah simbol berasal dari destrukturisasi impor (impor { simbol } dari "modul")
      if (program.daftarImpor) {
        for (const imp of program.daftarImpor) {
          if (imp.itemImpor) {
            for (const item of imp.itemImpor) {
              if (item.alias === kata || item.nama === kata) {
                // Cari definisi di berkas modul sumber
                const lokasiDiModul = this.cariDefinisiDiModulEksternal(
                  imp.sumberModul,
                  item.nama,
                  program,
                  dokumen
                );
                if (lokasiDiModul) {
                  return lokasiDiModul;
                }
                // Jika berkas luar tidak ditemukan, lompat ke baris pernyataan impor
                return {
                  uri: dokumen.uri,
                  range: this.ubahRentangAstKeLsp(item.posisi || imp.posisi),
                };
              }
            }
          }

          // Jika kursor berada di alias modul
          if (imp.aliasModul === kata || imp.sumberModul === kata) {
            const jalurModul = this.selesaikanJalurBerkasModul(imp.sumberModul, dokumen.jalur);
            if (jalurModul) {
              return {
                uri: jalurBerkasKeUri(jalurModul),
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 0 },
                },
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Mencari definisi simbol di modul eksternal lintas berkas (Cross-File Go-to-Definition).
   */
  private cariDefinisiDiModulEksternal(
    namaModulAtauAlias: string,
    namaSimbol: string,
    program: NodeProgram,
    dokumen: DokumenTeks
  ): LokasiLSP | null {
    let sumberModul = namaModulAtauAlias;
    if (program.daftarImpor) {
      for (const imp of program.daftarImpor) {
        if (imp.aliasModul === namaModulAtauAlias) {
          sumberModul = imp.sumberModul;
          break;
        }
      }
    }

    const jalurBerkas = this.selesaikanJalurBerkasModul(sumberModul, dokumen.jalur);
    if (!jalurBerkas) return null;

    const uriTarget = jalurBerkasKeUri(jalurBerkas);

    let kontenModul: string | undefined;
    const dokTerbuka = this.manajerDokumen.ambilDokumen(uriTarget);
    if (dokTerbuka) {
      kontenModul = dokTerbuka.konten;
    } else if (this.pembacaBerkas) {
      const adaBerkas = typeof this.pembacaBerkas.apakahAda === 'function'
        ? this.pembacaBerkas.apakahAda(jalurBerkas)
        : (this.pembacaBerkas as any).ada(jalurBerkas);
      if (adaBerkas) {
        kontenModul = this.pembacaBerkas.baca(jalurBerkas);
      }
    }

    if (!kontenModul) return null;

    try {
      const parser = new Parser(kontenModul);
      const astModul = parser.parse();

      // Cari fungsi di modul tersebut
      if (astModul.daftarFungsi) {
        for (const fn of astModul.daftarFungsi) {
          if (fn.nama === namaSimbol) {
            return {
              uri: uriTarget,
              range: this.ubahRentangAstKeLsp(fn.posisi),
            };
          }
        }
      }

      // Cari deklarasi ekspor di modul tersebut
      if (astModul.daftarEkspor) {
        for (const eksp of astModul.daftarEkspor) {
          if (eksp.deklarasi && (eksp.deklarasi as any).nama === namaSimbol) {
            return {
              uri: uriTarget,
              range: this.ubahRentangAstKeLsp(eksp.deklarasi.posisi),
            };
          }
        }
      }

      // Cari variabel di tubuh modul
      if (astModul.tubuhUtama) {
        const varModul = this.cariVariabelDiDaftar(astModul.tubuhUtama, namaSimbol);
        if (varModul) {
          return {
            uri: uriTarget,
            range: this.ubahRentangAstKeLsp(varModul.posisi),
          };
        }
      }
    } catch (err) {
      // Gagal parse modul luar, abaikan dengan aman
    }

    return null;
  }

  /**
   * Menyelesaikan resolusi jalur berkas modul relatif terhadap berkas pemanggil atau direktori kerja.
   */
  private selesaikanJalurBerkasModul(namaModul: string, jalurPemanggil: string): string | null {
    let namaBerkas = namaModul;
    if (!namaBerkas.endsWith('.nusantara')) {
      namaBerkas += '.nusantara';
    }

    // Jalur direktori pemanggil
    const segmen = jalurPemanggil.split(/[/\\]/);
    segmen.pop();
    const dirPemanggil = segmen.join('/') || '.';

    const kandidatJalur = [
      `${dirPemanggil}/${namaBerkas}`,
      `${dirPemanggil}/modul/${namaBerkas}`,
      `/${namaBerkas}`,
      `/src/${namaBerkas}`,
      `/${namaModul}/${namaBerkas}`,
    ];

    if (this.direktoriKerja) {
      kandidatJalur.unshift(`${this.direktoriKerja}/${namaBerkas}`);
      kandidatJalur.unshift(`${this.direktoriKerja}/src/${namaBerkas}`);
    }

    for (const jalur of kandidatJalur) {
      const uri = jalurBerkasKeUri(jalur);
      if (this.manajerDokumen.ambilDokumen(uri)) {
        return jalur;
      }
      if (this.pembacaBerkas) {
        const adaBerkas = typeof this.pembacaBerkas.apakahAda === 'function'
          ? this.pembacaBerkas.apakahAda(jalur)
          : (this.pembacaBerkas as any).ada(jalur);
        if (adaBerkas) {
          return jalur;
        }
      }
    }

    return null;
  }

  private cariVariabelDiDaftar(
    daftar: PernyataanAST[],
    nama: string
  ): (NodeDeklarasiVariabel | NodeDeklarasiTetap) | null {
    for (const stmt of daftar) {
      if (stmt.jenis === JenisNodeAST.DEKLARASI_VARIABEL) {
        const v = stmt as NodeDeklarasiVariabel;
        if (v.nama === nama) return v;
      } else if (stmt.jenis === JenisNodeAST.DEKLARASI_TETAP) {
        const t = stmt as NodeDeklarasiTetap;
        if (t.nama === nama) return t;
      }
    }
    return null;
  }

  private ambilBarisTeks(konten: string, nomorBaris: number): string {
    const baris = konten.split('\n');
    return baris[nomorBaris] || '';
  }

  private ekstrakTokenDiKursor(
    barisTeks: string,
    kolom: number
  ): { kata: string; kataSebelumTitik?: string } | null {
    if (kolom > barisTeks.length) kolom = barisTeks.length;

    let awal = kolom;
    let akhir = kolom;
    const regexKarakter = /[a-zA-Z0-9_]/;

    while (awal > 0 && regexKarakter.test(barisTeks[awal - 1])) {
      awal--;
    }
    while (akhir < barisTeks.length && regexKarakter.test(barisTeks[akhir])) {
      akhir++;
    }

    if (awal === akhir) return null;

    const kata = barisTeks.substring(awal, akhir);

    let kataSebelumTitik: string | undefined;
    if (awal > 0 && barisTeks[awal - 1] === '.') {
      let awalModul = awal - 1;
      while (awalModul > 0 && regexKarakter.test(barisTeks[awalModul - 1])) {
        awalModul--;
      }
      kataSebelumTitik = barisTeks.substring(awalModul, awal - 1).trim();
    }

    return { kata, kataSebelumTitik };
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

  private apakahPosisiDiDalamRentang(posisi: PosisiLSP, rentang: any): boolean {
    if (!rentang || !rentang.awal || !rentang.akhir) return false;
    const barisKursor = posisi.line + 1;
    return barisKursor >= rentang.awal.baris && barisKursor <= rentang.akhir.baris;
  }
}
