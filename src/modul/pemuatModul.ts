/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas } from './pembacaBerkas';
import { ResolverModul } from './resolverModul';
import { CatatanModul, StatusPemuatanModul, InfoSimbolModul } from './jenisModul';
import { GalatModul, JenisGalatModul } from './galatModul';
import { Parser } from '../parser/parser';
import {
  NodeProgram,
  JenisNodeAST,
  NodeDeklarasiFungsi,
  NodeDeklarasiVariabel,
  NodeDeklarasiTetap,
  NodePernyataanEkspor,
} from '../parser/ast';
import { Lingkungan } from '../interpreter/environment';
import {
  NilaiRuntime,
  JenisNilaiRuntime,
  NilaiFungsiPengguna,
  NilaiFungsiBawaan,
  formatNilaiTeks,
  buatKosong,
  buatBilangan,
  buatModul,
} from '../interpreter/nilai';
import { GalatRuntime, JenisGalatRuntime } from '../interpreter/galat';
import { PemeriksaTipe } from '../tipe/pemeriksaTipe';
import { PosisiSumber } from '../lexer/posisi';
import { normalisasiNamaModulStandar, buatCatatanModulStandar, SandboxBerkas } from '../stdlib';

export interface OpsiPemuatModul {
  resolver?: ResolverModul;
  pembaca?: PembacaBerkas;
  sandboxBerkas?: SandboxBerkas;
  argumenCLI?: string[];
  envOverrides?: Record<string, string>;
}

/**
 * Pemuat Modul (Module Loader & Cache) Bahasa NUSANTARA (Phase 15 & 17).
 * Bertanggung jawab atas siklus hidup modul, pencegahan pemuatan ganda,
 * integrasi Standard Library resmi, dan deteksi ketergantungan melingkar.
 */
export class PemuatModul {
  private readonly resolver: ResolverModul;
  private readonly pembaca: PembacaBerkas;
  private readonly sandboxBerkas?: SandboxBerkas;
  private readonly argumenCLI?: string[];
  private readonly envOverrides?: Record<string, string>;
  private readonly cache = new Map<string, CatatanModul>();
  private readonly tumpukanPemuatan: Array<{ id: string; nama: string; posisi?: PosisiSumber }> = [];

  constructor(resolver: ResolverModul, pembaca: PembacaBerkas, opsi?: OpsiPemuatModul) {
    this.resolver = resolver;
    this.pembaca = pembaca;
    this.sandboxBerkas = opsi?.sandboxBerkas;
    this.argumenCLI = opsi?.argumenCLI;
    this.envOverrides = opsi?.envOverrides;
  }

  /**
   * Mengambil catatan modul yang sudah ada di cache berdasarkan ID atau nama.
   */
  public dapatkanDariCache(id: string): CatatanModul | undefined {
    return this.cache.get(id);
  }

  /**
   * Mengembalikan seluruh modul yang tersimpan dalam cache.
   */
  public dapatkanSeluruhCache(): ReadonlyMap<string, CatatanModul> {
    return this.cache;
  }

  /**
   * Menghapus cache modul untuk tujuan pengujian.
   */
  public bersihkanCache(): void {
    this.cache.clear();
    this.tumpukanPemuatan.length = 0;
  }

  public dapatkanAtauBuatModulStandar(namaStd: string): CatatanModul {
    const idStd = `stdlib:${namaStd}`;
    if (this.cache.has(idStd)) {
      return this.cache.get(idStd)!;
    }
    const catatanStd = buatCatatanModulStandar(namaStd, {
      sandboxBerkas: this.sandboxBerkas,
      argumenCLI: this.argumenCLI,
      envOverrides: this.envOverrides,
    });
    this.cache.set(idStd, catatanStd);
    this.cache.set(namaStd, catatanStd);
    return catatanStd;
  }

  /**
   * Memuat modul secara utuh, menangani parsing, type checking, isolasi scope, dan ekstraksi ekspor.
   */
  public muatModul(
    namaAtauJalur: string,
    direktoriPemanggil?: string,
    posisi?: PosisiSumber
  ): CatatanModul {
    const bersih = namaAtauJalur.trim().replace(/^["']|["']$/g, '');

    // 0. Jika terdapat prefix resmi std:, langsung muat modul standar
    const prefixDikenal = ['std:', 'stdlib:', 'nusantara:', 'std/', 'stdlib/', 'nusantara/'];
    if (prefixDikenal.some(p => bersih.startsWith(p))) {
      const namaStd = normalisasiNamaModulStandar(bersih);
      if (namaStd) {
        return this.dapatkanAtauBuatModulStandar(namaStd);
      }
    }

    // Periksa cache berdasarkan nama atau jalur langsung
    if (this.cache.has(namaAtauJalur)) {
      const c = this.cache.get(namaAtauJalur)!;
      if (c.status === StatusPemuatanModul.SUDAH_DIMUAT) return c;
    }

    // 1. Selesaikan lokasi berkas fisik secara aman melalui Resolver
    let jalurKanonikal: string;
    try {
      jalurKanonikal = this.resolver.selesaikan(namaAtauJalur, direktoriPemanggil, posisi);
    } catch (err: any) {
      // Jika berkas fisik tidak ditemukan, periksa apakah nama modul merupakan Standard Library
      const namaStd = normalisasiNamaModulStandar(namaAtauJalur);
      if (namaStd) {
        return this.dapatkanAtauBuatModulStandar(namaStd);
      }
      throw err;
    }

    // Dapatkan nama identitas modul dari nama berkas (tanpa ekstensi .nusantara)
    const namaBerkas = jalurKanonikal.replace(/\\/g, '/').split('/').pop() || namaAtauJalur;
    const namaModulIdentitas = namaBerkas.replace(/\.nusantara$/, '');

    // 2. Periksa cache modul
    if (this.cache.has(jalurKanonikal)) {
      const entriCache = this.cache.get(jalurKanonikal)!;

      // Deteksi Ketergantungan Melingkar (Circular Dependency Detection)
      if (entriCache.status === StatusPemuatanModul.SEDANG_DIMUAT) {
        const rantai = this.tumpukanPemuatan.map(t => t.nama);
        rantai.push(entriCache.nama || namaModulIdentitas);

        throw new GalatModul(
          JenisGalatModul.KETERGANTUNGAN_MELINGKAR,
          `terdeteksi ketergantungan melingkar:\n${rantai.join('\n→ ')}`,
          posisi,
          entriCache.nama || namaModulIdentitas,
          rantai
        );
      }

      // Modul sudah dimuat sebelumnya: gunakan representasi cache tanpa evaluasi ulang
      if (entriCache.status === StatusPemuatanModul.SUDAH_DIMUAT) {
        return entriCache;
      }
    }

    // 3. Inisialisasi catatan modul baru dengan status SEDANG_DIMUAT
    const catatan: CatatanModul = {
      id: jalurKanonikal,
      nama: namaModulIdentitas,
      jalurBerkas: jalurKanonikal,
      status: StatusPemuatanModul.SEDANG_DIMUAT,
      ekspor: new Map<string, NilaiRuntime>(),
      simbolEkspor: new Map<string, InfoSimbolModul>(),
      simbolInternal: new Set<string>(),
    };

    this.cache.set(jalurKanonikal, catatan);
    this.tumpukanPemuatan.push({ id: jalurKanonikal, nama: namaModulIdentitas, posisi });

    try {
      // 4. Baca kode sumber berkas
      let kontenSumber: string;
      try {
        kontenSumber = this.pembaca.baca(jalurKanonikal);
      } catch (err: any) {
        catatan.status = StatusPemuatanModul.GAGAL_DIMUAT;
        throw new GalatModul(
          JenisGalatModul.MODUL_RUSAK,
          `Gagal membaca berkas modul '${jalurKanonikal}': ${err.message}`,
          posisi,
          namaModulIdentitas
        );
      }

      // 5. Lakukan Parsing AST terhadap modul
      const parser = new Parser(kontenSumber);
      const ast: NodeProgram = parser.parse();

      const daftarGalatParser = parser.dapatkanDaftarGalat();
      if (daftarGalatParser.length > 0) {
        catatan.status = StatusPemuatanModul.GAGAL_DIMUAT;
        const g = daftarGalatParser[0];
        throw new GalatModul(
          JenisGalatModul.MODUL_RUSAK,
          `Kesalahan sintaksis di dalam modul '${namaModulIdentitas}' (${jalurKanonikal}): ${g.message}`,
          g.tokenDitemukan?.posisi?.awal,
          namaModulIdentitas
        );
      }

      // Jika modul mendeklarasikan nama modul eksplisit (modul NamaModul)
      if (ast.deklarasiModul) {
        catatan.nama = ast.deklarasiModul.namaModul;
      }
      catatan.ast = ast;

      // 6. Muat dependensi sub-modul yang diimpor oleh modul ini
      const direktoriModulIni = this.pembaca.direktoriDari(jalurKanonikal);
      const subModulTerimpor = new Map<string, CatatanModul>();

      if (ast.daftarImpor && ast.daftarImpor.length > 0) {
        for (const stmtImpor of ast.daftarImpor) {
          const subCatatan = this.muatModul(
            stmtImpor.sumberModul,
            direktoriModulIni,
            stmtImpor.posisi?.awal
          );
          const kunciNamespace = stmtImpor.aliasModul || subCatatan.nama;
          subModulTerimpor.set(kunciNamespace, subCatatan);
        }
      }

      // 7. Lakukan Pemeriksaan Sistem Tipe (Type System) untuk Modul
      const pemeriksa = new PemeriksaTipe(this);
      const galatTipe = pemeriksa.periksa(ast);
      if (galatTipe.length > 0) {
        catatan.status = StatusPemuatanModul.GAGAL_DIMUAT;
        const g = galatTipe[0];
        throw new GalatModul(
          JenisGalatModul.MODUL_RUSAK,
          `Kesalahan sistem tipe di dalam modul '${catatan.nama}' (${jalurKanonikal}): ${g.message}`,
          g.posisi,
          catatan.nama
        );
      }

      // 8. Buat Lingkungan Scope Terisolasi untuk Modul
      const lingkunganModul = new Lingkungan();
      catatan.lingkungan = lingkunganModul;

      // Daftarkan fungsi bawaan dasar
      this.inisialisasiFungsiBawaan(lingkunganModul);

      // Daftarkan sub-modul terimpor ke dalam scope modul ini
      for (const [namaNs, subCat] of subModulTerimpor) {
        const nilaiModulSub = buatModul(subCat.nama, subCat.ekspor, subCat.lingkungan!, subCat.jalurBerkas);
        lingkunganModul.definisikan(namaNs, nilaiModulSub, true);
      }

      // 9. Registrasikan fungsi-fungsi internal modul
      for (const fn of ast.daftarFungsi) {
        const nilaiFn: NilaiFungsiPengguna = {
          jenis: JenisNilaiRuntime.FUNGSI,
          deklarasi: fn,
          lingkunganPenutup: lingkunganModul,
        };
        lingkunganModul.definisikan(fn.nama, nilaiFn, true);
      }

      // 10. Identifikasi Anggota yang Diekspor vs Internal
      const namaDieksporEksplisit = new Set<string>();

      // Ekspor melalui deklarasi eksplisit: ekspor fungsi ..., ekspor variabel ..., ekspor daftarNama
      if (ast.daftarEkspor) {
        for (const exp of ast.daftarEkspor) {
          if (exp.namaEkspor) {
            for (const n of exp.namaEkspor) {
              namaDieksporEksplisit.add(n);
            }
          }
          if (exp.deklarasi) {
            if (exp.deklarasi.jenis === JenisNodeAST.DEKLARASI_FUNGSI) {
              const fn = exp.deklarasi as NodeDeklarasiFungsi;
              namaDieksporEksplisit.add(fn.nama);
              const nilaiFn: NilaiFungsiPengguna = {
                jenis: JenisNilaiRuntime.FUNGSI,
                deklarasi: fn,
                lingkunganPenutup: lingkunganModul,
              };
              lingkunganModul.definisikan(fn.nama, nilaiFn, true);
            } else if (
              exp.deklarasi.jenis === JenisNodeAST.DEKLARASI_VARIABEL ||
              exp.deklarasi.jenis === JenisNodeAST.DEKLARASI_TETAP
            ) {
              const dek = exp.deklarasi as NodeDeklarasiVariabel | NodeDeklarasiTetap;
              namaDieksporEksplisit.add(dek.nama);
            }
          }
        }
      }

      // 11. Eksekusi tubuh inisialisasi modul (evaluasi variabel, tetap, dan penugasan)
      for (const stmt of ast.tubuhUtama) {
        this.evaluasiPernyataanInisialisasiModul(stmt, lingkunganModul);
      }

      // 12. Kumpulkan entri ekspor dan identifikasi simbol internal
      for (const [namaSimbol, entri] of lingkunganModul.dapatkanSemuaSimbol()) {
        // Abaikan fungsi bawaan standar dari ekspor modul
        if (namaSimbol === 'tampilkan' || namaSimbol === 'panjang') continue;
        if (subModulTerimpor.has(namaSimbol)) continue;

        if (namaDieksporEksplisit.has(namaSimbol)) {
          catatan.ekspor.set(namaSimbol, entri.nilai);
          if (entri.nilai.jenis === JenisNilaiRuntime.FUNGSI) {
            const fnVal = entri.nilai as NilaiFungsiPengguna;
            catatan.simbolEkspor.set(namaSimbol, {
              nama: namaSimbol,
              kategori: 'fungsi',
              tipeData: fnVal.deklarasi.tipeKembalian || 'kosong',
              parameter: fnVal.deklarasi.parameter.map(p => ({
                nama: p.nama,
                tipe: p.tipeData || 'apapun',
              })),
              tipeKembalian: fnVal.deklarasi.tipeKembalian || 'kosong',
              tetap: true,
            });
          } else {
            catatan.simbolEkspor.set(namaSimbol, {
              nama: namaSimbol,
              kategori: entri.tetap ? 'tetap' : 'variabel',
              tipeData: entri.tipeData,
              tetap: entri.tetap,
            });
          }
        } else {
          catatan.simbolInternal.add(namaSimbol);
        }
      }

      // 13. Pemuatan berhasil: tandai status SUDAH_DIMUAT
      catatan.status = StatusPemuatanModul.SUDAH_DIMUAT;
      return catatan;
    } finally {
      this.tumpukanPemuatan.pop();
    }
  }

  private inisialisasiFungsiBawaan(lingkungan: Lingkungan): void {
    const fnTampilkan: NilaiFungsiBawaan = {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'tampilkan',
      eksekusi: (argumen: NilaiRuntime[]) => {
        const teks = argumen.map(a => formatNilaiTeks(a)).join(' ');
        if (typeof console !== 'undefined' && console.log) {
          console.log(teks);
        }
        return buatKosong();
      },
    };
    lingkungan.definisikan('tampilkan', fnTampilkan, true);

    const fnPanjang: NilaiFungsiBawaan = {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'panjang',
      eksekusi: (argumen: NilaiRuntime[]) => {
        if (argumen.length !== 1) {
          throw new GalatRuntime(
            JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
            `Fungsi 'panjang' membutuhkan 1 argumen, tetapi menerima ${argumen.length}.`
          );
        }
        const target = argumen[0];
        if (target.jenis === JenisNilaiRuntime.DAFTAR) {
          return buatBilangan(target.elemen.length);
        }
        if (target.jenis === JenisNilaiRuntime.PETA) {
          return buatBilangan(target.nilai.size);
        }
        if (target.jenis === JenisNilaiRuntime.TEKS) {
          return buatBilangan(target.nilai.length);
        }
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Argumen untuk fungsi 'panjang' harus berupa daftar, peta, atau teks.`
        );
      },
    };
    lingkungan.definisikan('panjang', fnPanjang, true);
  }

  private evaluasiPernyataanInisialisasiModul(stmt: any, lingkungan: Lingkungan): void {
    if (stmt.jenis === JenisNodeAST.DEKLARASI_VARIABEL) {
      const val = this.evaluasiEkspresiSederhana(stmt.nilaiAwal, lingkungan);
      lingkungan.definisikan(stmt.nama, val, false, stmt.tipeData, stmt.posisi?.awal);
    } else if (stmt.jenis === JenisNodeAST.DEKLARASI_TETAP) {
      const val = this.evaluasiEkspresiSederhana(stmt.nilaiAwal, lingkungan);
      lingkungan.definisikan(stmt.nama, val, true, stmt.tipeData, stmt.posisi?.awal);
    } else if (stmt.jenis === JenisNodeAST.PERNYATAAN_EKSPOR) {
      const exp = stmt as NodePernyataanEkspor;
      if (exp.deklarasi) {
        this.evaluasiPernyataanInisialisasiModul(exp.deklarasi, lingkungan);
      }
    }
  }

  private evaluasiEkspresiSederhana(expr: any, lingkungan: Lingkungan): NilaiRuntime {
    switch (expr.jenis) {
      case JenisNodeAST.LITERAL: {
        switch (expr.tipeLiteral) {
          case 'bilangan':
            return { jenis: JenisNilaiRuntime.BILANGAN, nilai: expr.nilaiTerurai };
          case 'desimal':
            return { jenis: JenisNilaiRuntime.DESIMAL, nilai: expr.nilaiTerurai };
          case 'teks':
            return { jenis: JenisNilaiRuntime.TEKS, nilai: expr.nilaiTerurai };
          case 'karakter':
            return { jenis: JenisNilaiRuntime.KARAKTER, nilai: expr.nilaiTerurai };
          case 'logika':
            return { jenis: JenisNilaiRuntime.LOGIKA, nilai: expr.nilaiTerurai };
          case 'kosong':
            return { jenis: JenisNilaiRuntime.KOSONG, nilai: null };
          default:
            return { jenis: JenisNilaiRuntime.TEKS, nilai: expr.nilaiMentah };
        }
      }
      case JenisNodeAST.LITERAL_DAFTAR: {
        const el = (expr.elemen || []).map((e: any) => this.evaluasiEkspresiSederhana(e, lingkungan));
        return { jenis: JenisNilaiRuntime.DAFTAR, elemen: el };
      }
      case JenisNodeAST.LITERAL_PETA: {
        const peta = new Map<string, NilaiRuntime>();
        for (const p of expr.pasangan || []) {
          peta.set(p.kunci, this.evaluasiEkspresiSederhana(p.nilai, lingkungan));
        }
        return { jenis: JenisNilaiRuntime.PETA, nilai: peta };
      }
      case JenisNodeAST.PENGIDENTIFIKASI: {
        return lingkungan.ambil(expr.nama, expr.posisi?.awal);
      }
      default:
        return { jenis: JenisNilaiRuntime.KOSONG, nilai: null };
    }
  }
}
