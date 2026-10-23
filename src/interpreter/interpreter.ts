/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  NodeProgram,
  PernyataanAST,
  EkspresiAST,
  JenisNodeAST,
  NodeDeklarasiVariabel,
  NodeDeklarasiTetap,
  NodePenugasan,
  NodePenugasanIndeks,
  NodePercabanganJika,
  NodePerulanganSelama,
  NodePerulanganUntuk,
  NodeInstruksiKembalikan,
  NodePernyataanEkspresi,
  NodeDeklarasiFungsi,
  NodeLiteral,
  NodePengidentifikasi,
  NodeEkspresiUnari,
  NodeEkspresiBiner,
  NodeEkspresiPengelompokan,
  NodePemanggilanFungsi,
  NodeLiteralDaftar,
  NodeLiteralPeta,
  NodeAksesIndeks,
  NodePernyataanImpor,
  NodePernyataanEkspor,
  NodeAksesAnggota,
} from '../parser/ast';
import { Parser } from '../parser/parser';
import { Lingkungan } from './environment';
import {
  NilaiRuntime,
  JenisNilaiRuntime,
  buatTeks,
  buatBilangan,
  buatDesimal,
  buatLogika,
  buatKarakter,
  buatKosong,
  buatDaftar,
  buatPeta,
  buatModul,
  NilaiModul,
  formatNilaiTeks,
  NilaiFungsiPengguna,
  NilaiFungsiBawaan,
} from './nilai';
import { GalatRuntime, JenisGalatRuntime, BingkaiTumpukan } from './galat';
import { OutputWriter, PenulisOutputBuffer, PenulisOutputKonsol } from './outputWriter';
import { SinyalHentikan, SinyalLanjutkan, SinyalKembalikan } from './sinyal';
import { PemeriksaTipe } from '../tipe/pemeriksaTipe';
import { apakahKompatibel } from '../tipe/kompatibilitas';
import { evaluasiOperasiUnari, evaluasiOperasiBiner } from '../operator/evaluasi';
import {
  PemuatModul,
  ResolverModul,
  PembacaBerkas,
  PembacaBerkasNode,
  PembacaBerkasMemori,
  CatatanModul,
} from '../modul';
import { SandboxBerkas } from '../stdlib';
import { deteksiKonteksPaket } from '../diagnostik';

export interface OpsiInterpreter {
  maksimalIterasiPerulangan?: number;
  pemuatModul?: PemuatModul;
  resolverModul?: ResolverModul;
  pembacaBerkas?: PembacaBerkas;
  direktoriBasis?: string;
  sandboxBerkas?: SandboxBerkas;
  argumenCLI?: string[];
  envOverrides?: Record<string, string>;
}

/**
 * Mesin Interpreter Resmi Bahasa NUSANTARA (Phase 8, 15, & 17).
 * Mengevaluasi dan mengeksekusi pohon sintaksis abstrak (AST) hasil Parser.
 */
export class Interpreter {
  private readonly lingkunganGlobal: Lingkungan;
  private lingkunganSaatIni: Lingkungan;
  private readonly outputWriter: OutputWriter;
  private readonly tumpukanPanggilan: BingkaiTumpukan[] = [];
  private readonly maksimalIterasiPerulangan: number;
  private pemuatModul: PemuatModul;
  private direktoriBasis?: string;
  private modulAktifSaatIni?: { nama: string; jalurBerkas?: string };

  constructor(outputWriter?: OutputWriter, opsi?: OpsiInterpreter) {
    this.outputWriter = outputWriter || new PenulisOutputKonsol();
    this.maksimalIterasiPerulangan = opsi?.maksimalIterasiPerulangan ?? 1_000_000;
    this.direktoriBasis = opsi?.direktoriBasis;
    this.lingkunganGlobal = new Lingkungan();
    this.lingkunganSaatIni = this.lingkunganGlobal;

    // Inisialisasi subsistem modul
    if (opsi?.pemuatModul) {
      this.pemuatModul = opsi.pemuatModul;
    } else {
      const pembaca =
        opsi?.pembacaBerkas ||
        (typeof window !== 'undefined' ? new PembacaBerkasMemori() : new PembacaBerkasNode());
      const resolver =
        opsi?.resolverModul ||
        new ResolverModul(pembaca, { direktoriAkarProyek: opsi?.direktoriBasis });
      const sandboxBerkas =
        opsi?.sandboxBerkas || new SandboxBerkas(pembaca, opsi?.direktoriBasis);
      this.pemuatModul = new PemuatModul(resolver, pembaca, {
        sandboxBerkas,
        argumenCLI: opsi?.argumenCLI,
        envOverrides: opsi?.envOverrides,
      });
    }

    // Registrasi fungsi bawaan resmi
    this.inisialisasiFungsiBawaan();
  }

  private inisialisasiFungsiBawaan(): void {
    // Fungsi bawaan: tampilkan(...)
    const fnTampilkan: NilaiFungsiBawaan = {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'tampilkan',
      eksekusi: (argumen: NilaiRuntime[]) => {
        const teks = argumen.map(a => formatNilaiTeks(a)).join(' ');
        this.outputWriter.tulisBaris(teks);
        return buatKosong();
      },
    };
    this.lingkunganGlobal.definisikan('tampilkan', fnTampilkan, true);

    // Fungsi bawaan: panjang(koleksi)
    const fnPanjang: NilaiFungsiBawaan = {
      jenis: JenisNilaiRuntime.FUNGSI_BAWAAN,
      nama: 'panjang',
      eksekusi: (argumen: NilaiRuntime[]) => {
        if (argumen.length !== 1) {
          throw new GalatRuntime(
            JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
            `Fungsi 'panjang' membutuhkan 1 argumen, tetapi menerima ${argumen.length}.`,
            undefined,
            [...this.tumpukanPanggilan]
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
          `Fungsi 'panjang' hanya mendukung daftar, peta, atau teks, bukan '${target.jenis}'.`,
          undefined,
          [...this.tumpukanPanggilan]
        );
      },
    };
    this.lingkunganGlobal.definisikan('panjang', fnPanjang, true);
  }

  public dapatkanPemuatModul(): PemuatModul {
    return this.pemuatModul;
  }

  public tetapkanPemuatModul(pemuat: PemuatModul): void {
    this.pemuatModul = pemuat;
  }

  /**
   * Mengeksekusi kode program mentah (.nusantara).
   */
  public jalankanKode(sumber: string, direktoriBasis?: string): void {
    const basis = direktoriBasis || this.direktoriBasis;
    const parser = new Parser(sumber);
    const ast = parser.parse();

    const galatParser = parser.dapatkanDaftarGalat();
    if (galatParser.length > 0) {
      throw new GalatRuntime(
        JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
        `Tidak dapat mengeksekusi program karena terdapat ${galatParser.length} kesalahan sintaksis: ${galatParser[0].message}`
      );
    }

    // Analisis Semantik & Pemeriksaan Tipe Statis (Phase 9 & 15)
    const pemeriksa = new PemeriksaTipe(this.pemuatModul);
    const galatTipe = pemeriksa.periksa(ast, basis);
    if (galatTipe.length > 0) {
      const g = galatTipe[0];
      const jenisRuntime =
        g.jenis === 'MODIFIKASI_TETAP'
          ? JenisGalatRuntime.KONSTANTA_DIUBAH
          : g.jenis === 'MODUL_TIDAK_DITEMUKAN'
          ? JenisGalatRuntime.MODUL_TIDAK_DITEMUKAN
          : g.jenis === 'ANGGOTA_MODUL_TIDAK_DITEMUKAN' || g.jenis === 'ANGGOTA_INTERNAL_TERLINDUNGI'
          ? JenisGalatRuntime.ANGGOTA_MODUL_TIDAK_DITEMUKAN
          : JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID;
      throw new GalatRuntime(
        jenisRuntime,
        g.message,
        g.posisi
      );
    }

    this.interpretasikan(ast, basis);
  }

  /**
   * Titik masuk interpretasi pohon AST program.
   */
  public interpretasikan(program: NodeProgram, direktoriBasis?: string): void {
    const basis = direktoriBasis || this.direktoriBasis;
    try {
      this.tumpukanPanggilan.push({ namaKonteks: `program ${program.namaProgram}` });

      // 0. Proses impor modul jika ada pada program utama
      if (program.daftarImpor && program.daftarImpor.length > 0) {
        for (const imp of program.daftarImpor) {
          this.prosesPernyataanImpor(imp, this.lingkunganGlobal, basis);
        }
      }

      // 1. Daftarkan seluruh deklarasi fungsi ke lingkungan global
      for (const fn of program.daftarFungsi) {
        const nilaiFn: NilaiFungsiPengguna = {
          jenis: JenisNilaiRuntime.FUNGSI,
          deklarasi: fn,
          lingkunganPenutup: this.lingkunganSaatIni,
        };
        this.lingkunganGlobal.definisikan(fn.nama, nilaiFn, true);
      }

      // 2. Eksekusi tubuh utama (blok mulai ... selesai)
      for (const stmt of program.tubuhUtama) {
        this.eksekusiPernyataan(stmt);
      }
    } catch (e: any) {
      if (e instanceof SinyalHentikan) {
        throw new GalatRuntime(
          JenisGalatRuntime.KENDALI_DI_LUAR_KONTEKS,
          "Instruksi 'hentikan' tidak dapat digunakan di luar blok perulangan.",
          program.posisi.awal,
          [...this.tumpukanPanggilan]
        );
      }
      if (e instanceof SinyalLanjutkan) {
        throw new GalatRuntime(
          JenisGalatRuntime.KENDALI_DI_LUAR_KONTEKS,
          "Instruksi 'lanjutkan' tidak dapat digunakan di luar blok perulangan.",
          program.posisi.awal,
          [...this.tumpukanPanggilan]
        );
      }
      if (e instanceof SinyalKembalikan) {
        throw new GalatRuntime(
          JenisGalatRuntime.KENDALI_DI_LUAR_KONTEKS,
          "Instruksi 'kembalikan' tidak dapat digunakan di luar tubuh fungsi.",
          program.posisi.awal,
          [...this.tumpukanPanggilan]
        );
      }
      throw e;
    } finally {
      this.tumpukanPanggilan.pop();
    }
  }

  private prosesPernyataanImpor(
    stmt: NodePernyataanImpor,
    lingk: Lingkungan,
    direktoriBasis?: string
  ): void {
    const catatan: CatatanModul = this.pemuatModul.muatModul(
      stmt.sumberModul,
      direktoriBasis,
      stmt.posisi?.awal
    );
    const kunciNamespace = stmt.aliasModul || catatan.nama;

    const nilaiModul = buatModul(catatan.nama, catatan.ekspor, catatan.lingkungan!, catatan.jalurBerkas);
    lingk.definisikan(kunciNamespace, nilaiModul, true);

    // Destrukturisasi impor: impor { tambah } dari matematika
    if (stmt.itemImpor && stmt.itemImpor.length > 0) {
      for (const item of stmt.itemImpor) {
        const val = catatan.ekspor.get(item.nama);
        if (val === undefined) {
          if (catatan.simbolInternal.has(item.nama)) {
            throw new GalatRuntime(
              JenisGalatRuntime.ANGGOTA_MODUL_TIDAK_DITEMUKAN,
              `Simbol '${item.nama}' bersifat internal pada modul '${catatan.nama}' dan tidak diekspor.`,
              item.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          throw new GalatRuntime(
            JenisGalatRuntime.ANGGOTA_MODUL_TIDAK_DITEMUKAN,
            `Simbol '${item.nama}' tidak ditemukan pada ekspor modul '${catatan.nama}'.`,
            item.posisi.awal,
            [...this.tumpukanPanggilan]
          );
        }
        const namaTerikat = item.alias || item.nama;
        lingk.definisikan(namaTerikat, val, true);
      }
    }
  }

  // ==========================================================================
  // EKSEKUSI PERNYATAAN (STATEMENTS)
  // ==========================================================================

  private eksekusiPernyataan(stmt: PernyataanAST): void {
    switch (stmt.jenis) {
      case JenisNodeAST.PERNYATAAN_IMPOR: {
        this.prosesPernyataanImpor(
          stmt as NodePernyataanImpor,
          this.lingkunganSaatIni,
          this.direktoriBasis
        );
        break;
      }

      case JenisNodeAST.PERNYATAAN_EKSPOR: {
        const exp = stmt as NodePernyataanEkspor;
        if (exp.deklarasi) {
          this.eksekusiPernyataan(exp.deklarasi as PernyataanAST);
        }
        break;
      }

      case JenisNodeAST.DEKLARASI_VARIABEL: {
        const s = stmt as NodeDeklarasiVariabel;
        const nilai = this.evaluasiEkspresi(s.nilaiAwal);
        this.lingkunganSaatIni.definisikan(s.nama, nilai, false, s.tipeData);
        break;
      }

      case JenisNodeAST.DEKLARASI_TETAP: {
        const s = stmt as NodeDeklarasiTetap;
        const nilai = this.evaluasiEkspresi(s.nilaiAwal);
        this.lingkunganSaatIni.definisikan(s.nama, nilai, true, s.tipeData);
        break;
      }

      case JenisNodeAST.PENUGASAN: {
        const s = stmt as NodePenugasan;
        const nilaiBaru = this.evaluasiEkspresi(s.nilai);
        this.lingkunganSaatIni.tetapkan(s.target, nilaiBaru, s.posisi.awal);
        break;
      }

      case JenisNodeAST.PENUGASAN_INDEKS: {
        const s = stmt as NodePenugasanIndeks;
        this.eksekusiPenugasanIndeks(s);
        break;
      }

      case JenisNodeAST.PERCABANGAN_JIKA: {
        const s = stmt as NodePercabanganJika;
        const hasilKondisi = this.evaluasiEkspresi(s.kondisi);

        if (hasilKondisi.jenis !== JenisNilaiRuntime.LOGIKA) {
          throw new GalatRuntime(
            JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
            `Kondisi percabangan 'jika' harus bertipe logika (benar/salah), bukan ${hasilKondisi.jenis}.`,
            s.kondisi.posisi.awal,
            [...this.tumpukanPanggilan]
          );
        }

        if (hasilKondisi.nilai === true) {
          this.eksekusiBlok(s.cabangMaka);
        } else if (s.cabangSelain) {
          this.eksekusiBlok(s.cabangSelain);
        }
        break;
      }

      case JenisNodeAST.PERULANGAN_SELAMA: {
        const s = stmt as NodePerulanganSelama;
        let iterasi = 0;
        while (true) {
          if (this.maksimalIterasiPerulangan > 0 && ++iterasi > this.maksimalIterasiPerulangan) {
            throw new GalatRuntime(
              JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI,
              `Batas maksimal iterasi perulangan (${this.maksimalIterasiPerulangan}) terlampaui. Kemungkinan terjadi perulangan tak terbatas (infinite loop).`,
              s.kondisi.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }

          const kondisi = this.evaluasiEkspresi(s.kondisi);
          if (kondisi.jenis !== JenisNilaiRuntime.LOGIKA) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Kondisi perulangan 'selama' harus bertipe logika (benar/salah), bukan ${kondisi.jenis}.`,
              s.kondisi.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }

          if (!kondisi.nilai) break;

          try {
            this.eksekusiBlok(s.tubuh);
          } catch (e: any) {
            if (e instanceof SinyalHentikan) break;
            if (e instanceof SinyalLanjutkan) continue;
            throw e;
          }
        }
        break;
      }

      case JenisNodeAST.PERULANGAN_UNTUK: {
        const s = stmt as NodePerulanganUntuk;
        const awal = this.evaluasiEkspresi(s.nilaiAwal);
        const akhir = this.evaluasiEkspresi(s.nilaiAkhir);

        if (awal.jenis !== JenisNilaiRuntime.BILANGAN || akhir.jenis !== JenisNilaiRuntime.BILANGAN) {
          throw new GalatRuntime(
            JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
            "Rentang perulangan 'untuk' ('dari' dan 'sampai') harus bernilai bilangan bulat.",
            s.posisi.awal,
            [...this.tumpukanPanggilan]
          );
        }

        // Rentang kosong: jika awal > akhir, tubuh perulangan dilewati 0 kali
        if (awal.nilai > akhir.nilai) {
          break;
        }

        const lingkunganLoop = new Lingkungan(this.lingkunganSaatIni);
        const simpanLingkungan = this.lingkunganSaatIni;
        this.lingkunganSaatIni = lingkunganLoop;

        let iterasi = 0;
        try {
          for (let i = awal.nilai; i <= akhir.nilai; i++) {
            if (this.maksimalIterasiPerulangan > 0 && ++iterasi > this.maksimalIterasiPerulangan) {
              throw new GalatRuntime(
                JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI,
                `Batas maksimal iterasi perulangan (${this.maksimalIterasiPerulangan}) terlampaui. Kemungkinan terjadi perulangan tak terbatas (infinite loop).`,
                s.posisi.awal,
                [...this.tumpukanPanggilan]
              );
            }
            lingkunganLoop.definisikan(s.variabelPenghitung, buatBilangan(i), false, 'bilangan');
            try {
              for (const st of s.tubuh) {
                this.eksekusiPernyataan(st);
              }
            } catch (e: any) {
              if (e instanceof SinyalHentikan) break;
              if (e instanceof SinyalLanjutkan) continue;
              throw e;
            }
          }
        } finally {
          this.lingkunganSaatIni = simpanLingkungan;
        }
        break;
      }

      case JenisNodeAST.INSTRUKSI_HENTIKAN:
        throw new SinyalHentikan();

      case JenisNodeAST.INSTRUKSI_LANJUTKAN:
        throw new SinyalLanjutkan();

      case JenisNodeAST.INSTRUKSI_KEMBALIKAN: {
        const s = stmt as NodeInstruksiKembalikan;
        const nilaiKembalian = s.nilai ? this.evaluasiEkspresi(s.nilai) : buatKosong();
        throw new SinyalKembalikan(nilaiKembalian);
      }

      case JenisNodeAST.PERNYATAAN_EKSPRESI: {
        const s = stmt as NodePernyataanEkspresi;
        this.evaluasiEkspresi(s.ekspresi);
        break;
      }

      case JenisNodeAST.PERNYATAAN_BLOK: {
        this.eksekusiBlok((stmt as any).daftarPernyataan);
        break;
      }
    }
  }

  private eksekusiBlok(daftarPernyataan: PernyataanAST[]): void {
    const lingkunganLokal = new Lingkungan(this.lingkunganSaatIni);
    const lingkunganSebelumnya = this.lingkunganSaatIni;
    this.lingkunganSaatIni = lingkunganLokal;

    try {
      for (const st of daftarPernyataan) {
        this.eksekusiPernyataan(st);
      }
    } finally {
      this.lingkunganSaatIni = lingkunganSebelumnya;
    }
  }

  // ==========================================================================
  // EVALUASI EKSPRESI (EXPRESSIONS)
  // ==========================================================================

  public evaluasiEkspresi(expr: EkspresiAST): NilaiRuntime {
    switch (expr.jenis) {
      case JenisNodeAST.LITERAL: {
        const l = expr as NodeLiteral;
        switch (l.tipeLiteral) {
          case 'bilangan':
            return buatBilangan(l.nilaiTerurai as number);
          case 'desimal':
            return buatDesimal(l.nilaiTerurai as number);
          case 'teks':
            return buatTeks(l.nilaiTerurai as string);
          case 'karakter':
            return buatKarakter(l.nilaiTerurai as string);
          case 'logika':
            return buatLogika(l.nilaiTerurai as boolean);
          case 'kosong':
            return buatKosong();
        }
        break;
      }

      case JenisNodeAST.PENGIDENTIFIKASI: {
        const id = expr as NodePengidentifikasi;
        return this.lingkunganSaatIni.ambil(id.nama, id.posisi.awal);
      }

      case JenisNodeAST.EKSPRESI_PENGELOMPOKAN: {
        const g = expr as NodeEkspresiPengelompokan;
        return this.evaluasiEkspresi(g.ekspresi);
      }

      case JenisNodeAST.EKSPRESI_UNARI: {
        const u = expr as NodeEkspresiUnari;
        const arg = this.evaluasiEkspresi(u.argumen);
        return evaluasiOperasiUnari(u.operator, arg, u.posisi.awal, [...this.tumpukanPanggilan]);
      }

      case JenisNodeAST.EKSPRESI_BINER: {
        const b = expr as NodeEkspresiBiner;

        // Evaluasi Hubung Singkat (Short-circuit Evaluation) untuk Operator Logika
        if (b.operator === 'dan') {
          const kiri = this.evaluasiEkspresi(b.kiri);
          if (kiri.jenis !== JenisNilaiRuntime.LOGIKA) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Operan operator 'dan' harus bertipe logika, bukan ${kiri.jenis}.`,
              b.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          // Jika kiri salah, hubung singkat: tidak perlu evaluasi cabang kanan
          if (!kiri.nilai) return buatLogika(false);

          const kanan = this.evaluasiEkspresi(b.kanan);
          if (kanan.jenis !== JenisNilaiRuntime.LOGIKA) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Operan operator 'dan' harus bertipe logika, bukan ${kanan.jenis}.`,
              b.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          return buatLogika(kanan.nilai);
        }

        if (b.operator === 'atau') {
          const kiri = this.evaluasiEkspresi(b.kiri);
          if (kiri.jenis !== JenisNilaiRuntime.LOGIKA) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Operan operator 'atau' harus bertipe logika, bukan ${kiri.jenis}.`,
              b.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          // Jika kiri benar, hubung singkat: tidak perlu evaluasi cabang kanan
          if (kiri.nilai) return buatLogika(true);

          const kanan = this.evaluasiEkspresi(b.kanan);
          if (kanan.jenis !== JenisNilaiRuntime.LOGIKA) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Operan operator 'atau' harus bertipe logika, bukan ${kanan.jenis}.`,
              b.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          return buatLogika(kanan.nilai);
        }

        // Operasi Biner Biasa
        const kiri = this.evaluasiEkspresi(b.kiri);
        const kanan = this.evaluasiEkspresi(b.kanan);

        return this.evaluasiOperasiBiner(b.operator, kiri, kanan, b.posisi.awal);
      }

      case JenisNodeAST.PEMANGGILAN_FUNGSI: {
        const c = expr as NodePemanggilanFungsi;
        let callee: NilaiRuntime;
        let namaModulKonteks: string | undefined;

        if (c.target) {
          const targetVal = this.evaluasiEkspresi(c.target);
          if (targetVal.jenis === JenisNilaiRuntime.MODUL) {
            const mod = targetVal as NilaiModul;
            namaModulKonteks = mod.jalurBerkas ? mod.jalurBerkas.replace(/\\/g, '/').split('/').pop() : mod.nama;
            const f = mod.ekspor.get(c.namaFungsi);
            if (!f) {
              const modulErr = this.modulAktifSaatIni?.jalurBerkas || this.modulAktifSaatIni?.nama;
              throw new GalatRuntime(
                JenisGalatRuntime.ANGGOTA_MODUL_TIDAK_DITEMUKAN,
                `Fungsi atau anggota '${c.namaFungsi}' tidak ditemukan pada modul '${mod.nama}'.`,
                c.posisi.awal,
                [...this.tumpukanPanggilan],
                modulErr
              );
            }
            callee = f;
          } else {
            const modulErr = this.modulAktifSaatIni?.jalurBerkas || this.modulAktifSaatIni?.nama;
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Target pemanggilan bukan merupakan modul, melainkan '${targetVal.jenis}'.`,
              c.posisi.awal,
              [...this.tumpukanPanggilan],
              modulErr
            );
          }
        } else {
          callee = this.lingkunganSaatIni.ambil(c.namaFungsi, c.posisi.awal);
        }

        // Evaluasi seluruh argumen
        const argumenTerurai = c.argumen.map(arg => this.evaluasiEkspresi(arg));

        if (callee.jenis === JenisNilaiRuntime.FUNGSI_BAWAAN) {
          return callee.eksekusi(argumenTerurai);
        }

        if (callee.jenis === JenisNilaiRuntime.FUNGSI) {
          return this.panggilFungsiPengguna(callee, argumenTerurai, c, namaModulKonteks);
        }

        const modulErr = this.modulAktifSaatIni?.jalurBerkas || this.modulAktifSaatIni?.nama;
        throw new GalatRuntime(
          JenisGalatRuntime.FUNGSI_TIDAK_DITEMUKAN,
          `'${c.namaFungsi}' bukan merupakan fungsi yang dapat dipanggil.`,
          c.posisi.awal,
          [...this.tumpukanPanggilan],
          modulErr
        );
      }

      case JenisNodeAST.LITERAL_DAFTAR: {
        const d = expr as NodeLiteralDaftar;
        const elemen = d.elemen.map(el => this.evaluasiEkspresi(el));
        return buatDaftar(elemen);
      }

      case JenisNodeAST.LITERAL_PETA: {
        const p = expr as NodeLiteralPeta;
        const map = new Map<string, NilaiRuntime>();
        for (const pas of p.pasangan) {
          map.set(pas.kunci, this.evaluasiEkspresi(pas.nilai));
        }
        return buatPeta(map);
      }

      case JenisNodeAST.AKSES_INDEKS: {
        const a = expr as NodeAksesIndeks;
        const koleksiVal = this.evaluasiEkspresi(a.koleksi);
        const indeksVal = this.evaluasiEkspresi(a.indeks);

        if (koleksiVal.jenis === JenisNilaiRuntime.DAFTAR) {
          if (indeksVal.jenis !== JenisNilaiRuntime.BILANGAN) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Indeks daftar harus bertipe bilangan bulat, bukan ${indeksVal.jenis}.`,
              a.indeks.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          const idx = indeksVal.nilai;
          if (idx < 0 || idx >= koleksiVal.elemen.length) {
            throw new GalatRuntime(
              JenisGalatRuntime.BATAS_INDEKS_TERLAMPAUI,
              `Indeks daftar ${idx} di luar batas (panjang daftar: ${koleksiVal.elemen.length}).`,
              a.indeks.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          return koleksiVal.elemen[idx];
        }

        if (koleksiVal.jenis === JenisNilaiRuntime.PETA) {
          if (indeksVal.jenis !== JenisNilaiRuntime.TEKS) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Kunci peta harus bertipe teks, bukan ${indeksVal.jenis}.`,
              a.indeks.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          const kunci = indeksVal.nilai;
          if (!koleksiVal.nilai.has(kunci)) {
            throw new GalatRuntime(
              JenisGalatRuntime.KUNCI_TIDAK_DITEMUKAN,
              `Kunci '${kunci}' tidak ditemukan pada peta.`,
              a.indeks.posisi.awal,
              [...this.tumpukanPanggilan]
            );
          }
          return koleksiVal.nilai.get(kunci)!;
        }

        throw new GalatRuntime(
          JenisGalatRuntime.TIPE_BUKAN_KOLEKSI,
          `Operasi pengindeksan tidak didukung pada nilai bertipe '${koleksiVal.jenis}'.`,
          a.koleksi.posisi.awal,
          [...this.tumpukanPanggilan]
        );
      }

      case JenisNodeAST.AKSES_ANGGOTA: {
        const a = expr as NodeAksesAnggota;
        const targetVal = this.evaluasiEkspresi(a.target);
        if (targetVal.jenis === JenisNilaiRuntime.MODUL) {
          const mod = targetVal as NilaiModul;
          const val = mod.ekspor.get(a.anggota);
          if (val === undefined) {
            const modulErr = this.modulAktifSaatIni?.jalurBerkas || this.modulAktifSaatIni?.nama;
            throw new GalatRuntime(
              JenisGalatRuntime.ANGGOTA_MODUL_TIDAK_DITEMUKAN,
              `Anggota '${a.anggota}' tidak ditemukan pada modul '${mod.nama}'.`,
              a.posisi.awal,
              [...this.tumpukanPanggilan],
              modulErr
            );
          }
          return val;
        }
        const modulErr = this.modulAktifSaatIni?.jalurBerkas || this.modulAktifSaatIni?.nama;
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Akses anggota menggunakan titik '.' hanya didukung pada modul.`,
          a.posisi.awal,
          [...this.tumpukanPanggilan],
          modulErr
        );
      }
    }

    return buatKosong();
  }

  private eksekusiPenugasanIndeks(s: NodePenugasanIndeks): void {
    if (s.koleksi.jenis === JenisNodeAST.PENGIDENTIFIKASI) {
      const id = (s.koleksi as NodePengidentifikasi).nama;
      if (this.lingkunganSaatIni.apakahTetap(id)) {
        throw new GalatRuntime(
          JenisGalatRuntime.KONSTANTA_DIUBAH,
          `Koleksi '${id}' bersifat tetap dan elemennya tidak dapat diubah.`,
          s.posisi.awal,
          [...this.tumpukanPanggilan]
        );
      }
    }

    const koleksiVal = this.evaluasiEkspresi(s.koleksi);
    const indeksVal = this.evaluasiEkspresi(s.indeks);
    const nilaiBaru = this.evaluasiEkspresi(s.nilai);

    if (koleksiVal.jenis === JenisNilaiRuntime.DAFTAR) {
      if (indeksVal.jenis !== JenisNilaiRuntime.BILANGAN) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Indeks daftar harus bertipe bilangan bulat, bukan ${indeksVal.jenis}.`,
          s.indeks.posisi.awal,
          [...this.tumpukanPanggilan]
        );
      }
      const idx = indeksVal.nilai;
      if (idx < 0 || idx >= koleksiVal.elemen.length) {
        throw new GalatRuntime(
          JenisGalatRuntime.BATAS_INDEKS_TERLAMPAUI,
          `Indeks daftar ${idx} di luar batas (panjang daftar: ${koleksiVal.elemen.length}).`,
          s.indeks.posisi.awal,
          [...this.tumpukanPanggilan]
        );
      }
      koleksiVal.elemen[idx] = nilaiBaru;
      return;
    }

    if (koleksiVal.jenis === JenisNilaiRuntime.PETA) {
      if (indeksVal.jenis !== JenisNilaiRuntime.TEKS) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Kunci peta harus bertipe teks, bukan ${indeksVal.jenis}.`,
          s.indeks.posisi.awal,
          [...this.tumpukanPanggilan]
        );
      }
      koleksiVal.nilai.set(indeksVal.nilai, nilaiBaru);
      return;
    }

    throw new GalatRuntime(
      JenisGalatRuntime.TIPE_BUKAN_KOLEKSI,
      `Operasi penugasan indeks tidak didukung pada nilai bertipe '${koleksiVal.jenis}'.`,
      s.koleksi.posisi.awal,
      [...this.tumpukanPanggilan]
    );
  }

  private evaluasiOperasiBiner(
    op: string,
    kiri: NilaiRuntime,
    kanan: NilaiRuntime,
    posisi?: any
  ): NilaiRuntime {
    return evaluasiOperasiBiner(
      op,
      kiri,
      kanan,
      posisi,
      [...this.tumpukanPanggilan],
      this.modulAktifSaatIni?.jalurBerkas || this.modulAktifSaatIni?.nama
    );
  }

  private panggilFungsiPengguna(
    fungsi: NilaiFungsiPengguna,
    argumen: NilaiRuntime[],
    nodePanggil: NodePemanggilanFungsi,
    namaModulKonteks?: string
  ): NilaiRuntime {
    const fnDeklarasi = fungsi.deklarasi;
    const modulNamaAktif = fungsi.jalurBerkas || fungsi.namaModul || namaModulKonteks;

    // Batas kedalaman pemanggilan rekursif (Stack Overflow Protection)
    if (this.tumpukanPanggilan.length > 500) {
      throw new GalatRuntime(
        JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI,
        `Batas kedalaman pemanggilan fungsi rekursif terlampaui pada fungsi '${fnDeklarasi.nama}'.`,
        nodePanggil.posisi.awal,
        [...this.tumpukanPanggilan],
        modulNamaAktif
      );
    }

    // Periksa jumlah parameter vs argumen
    if (argumen.length !== fnDeklarasi.parameter.length) {
      throw new GalatRuntime(
        JenisGalatRuntime.ARGUMEN_FUNGSI_TIDAK_SESUAI,
        `Fungsi '${fnDeklarasi.nama}' membutuhkan ${fnDeklarasi.parameter.length} argumen, tetapi menerima ${argumen.length}.`,
        nodePanggil.posisi.awal,
        [...this.tumpukanPanggilan],
        modulNamaAktif
      );
    }

    // Buat lingkungan lingkup lokal baru bertaut pada penutup leksikal
    const lingkunganFungsi = new Lingkungan(fungsi.lingkunganPenutup);
    for (let i = 0; i < fnDeklarasi.parameter.length; i++) {
      const p = fnDeklarasi.parameter[i];
      if (p.tipeData && !apakahKompatibel(p.tipeData, argumen[i].jenis)) {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Parameter '${p.nama}' pada fungsi '${fnDeklarasi.nama}' membutuhkan ${p.tipeData}, tetapi menerima ${argumen[i].jenis}.`,
          nodePanggil.posisi.awal,
          [...this.tumpukanPanggilan],
          modulNamaAktif
        );
      }
      lingkunganFungsi.definisikan(p.nama, argumen[i], false, p.tipeData);
    }

    const simpanLingkungan = this.lingkunganSaatIni;
    const simpanModulAktif = this.modulAktifSaatIni;
    if (modulNamaAktif) {
      this.modulAktifSaatIni = {
        nama: fungsi.namaModul || modulNamaAktif,
        jalurBerkas: fungsi.jalurBerkas || modulNamaAktif,
      };
    }

    this.lingkunganSaatIni = lingkunganFungsi;
    const infoPaket = deteksiKonteksPaket(fungsi.jalurBerkas || modulNamaAktif);
    this.tumpukanPanggilan.push({
      namaKonteks: `fungsi ${fnDeklarasi.nama}`,
      posisi: nodePanggil.posisi.awal,
      namaModul: modulNamaAktif,
      berkas: fungsi.jalurBerkas,
      namaPaket: infoPaket?.namaPaket,
      versiPaket: infoPaket?.versiPaket,
    });

    try {
      for (const stmt of fnDeklarasi.tubuh) {
        this.eksekusiPernyataan(stmt);
      }
      if (fnDeklarasi.tipeKembalian && fnDeklarasi.tipeKembalian !== 'kosong') {
        throw new GalatRuntime(
          JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
          `Fungsi '${fnDeklarasi.nama}' harus mengembalikan ${fnDeklarasi.tipeKembalian}, tetapi tidak mengembalikan nilai.`,
          nodePanggil.posisi.awal,
          [...this.tumpukanPanggilan],
          modulNamaAktif
        );
      }
      return buatKosong();
    } catch (e: any) {
      if (e instanceof SinyalKembalikan) {
        if (fnDeklarasi.tipeKembalian && fnDeklarasi.tipeKembalian !== 'kosong') {
          if (e.nilai.jenis === JenisNilaiRuntime.KOSONG) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Fungsi '${fnDeklarasi.nama}' harus mengembalikan ${fnDeklarasi.tipeKembalian}, tetapi tidak mengembalikan nilai.`,
              nodePanggil.posisi.awal,
              [...this.tumpukanPanggilan],
              modulNamaAktif
            );
          }
          if (!apakahKompatibel(fnDeklarasi.tipeKembalian, e.nilai.jenis)) {
            throw new GalatRuntime(
              JenisGalatRuntime.OPERASI_TIPE_TIDAK_VALID,
              `Fungsi '${fnDeklarasi.nama}' harus mengembalikan nilai bertipe '${fnDeklarasi.tipeKembalian}', tetapi mengembalikan '${e.nilai.jenis}'.`,
              nodePanggil.posisi.awal,
              [...this.tumpukanPanggilan],
              modulNamaAktif
            );
          }
        }
        return e.nilai;
      }
      throw e;
    } finally {
      this.tumpukanPanggilan.pop();
      this.lingkunganSaatIni = simpanLingkungan;
      this.modulAktifSaatIni = simpanModulAktif;
    }
  }
}
