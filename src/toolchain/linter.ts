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
  NodeDeklarasiFungsi,
  NodeEkspresiBiner,
} from '../parser/ast';
import {
  Diagnostik,
  TingkatDiagnostik,
  KategoriDiagnostik,
  buatCuplikanSumber,
} from '../diagnostik';

/**
 * Pengidentifikasi Aturan Linter Bahasa NUSANTARA (Phase 19).
 */
export enum KodeAturanLinter {
  VARIABEL_TIDAK_DIGUNAKAN = 'NUS-W001',
  KODE_TAK_TERJANGKAU = 'NUS-W002',
  PERBANDINGAN_IDENTIK = 'NUS-W003',
  IMPOR_TIDAK_DIGUNAKAN = 'NUS-W004',
}

/**
 * Penganalisis Statis Ringan (Linter Dasar) Bahasa NUSANTARA (Phase 19).
 */
export class LinterNUSANTARA {
  private readonly kodeSumber?: string;
  private readonly namaBerkas: string;
  private readonly daftarDiagnostik: Diagnostik[] = [];

  constructor(kodeSumber?: string, namaBerkas = 'program.nusantara') {
    this.kodeSumber = kodeSumber;
    this.namaBerkas = namaBerkas;
  }

  /**
   * Menjalankan seluruh pemeriksaan linter pada AST program.
   */
  public periksa(program: NodeProgram): Diagnostik[] {
    this.daftarDiagnostik.length = 0;

    // 1. Periksa impor tidak digunakan (NUS-W004)
    this.periksaImpor(program);

    // 2. Periksa variabel tingkat program (NUS-W001)
    const simbolTerpakaiGlobal = new Set<string>();
    this.kumpulkanSimbolTerpakai(program, simbolTerpakaiGlobal);

    this.periksaVariabelLingkup(
      program.tubuhUtama,
      simbolTerpakaiGlobal,
      program.daftarEkspor.flatMap(e => e.namaEkspor || [])
    );

    // 3. Periksa fungsi-fungsi
    for (const fn of program.daftarFungsi) {
      this.periksaFungsi(fn);
    }

    // 4. Periksa kode tidak terjangkau (NUS-W002)
    this.periksaKodeTakTerjangkauDalamDaftar(program.tubuhUtama);
    for (const fn of program.daftarFungsi) {
      this.periksaKodeTakTerjangkauDalamDaftar(fn.tubuh);
    }

    // 5. Periksa perbandingan identik (NUS-W003)
    this.periksaPerbandinganIdentik(program);

    return [...this.daftarDiagnostik];
  }

  private periksaImpor(program: NodeProgram): void {
    const simbolTerpakai = new Set<string>();
    this.kumpulkanSimbolTerpakai(program, simbolTerpakai);

    for (const imp of program.daftarImpor) {
      if (imp.itemImpor && imp.itemImpor.length > 0) {
        for (const item of imp.itemImpor) {
          const namaEfektif = item.alias || item.nama;
          if (!simbolTerpakai.has(namaEfektif) && !namaEfektif.startsWith('_')) {
            this.tambahDiagnostik(
              KodeAturanLinter.IMPOR_TIDAK_DIGUNAKAN,
              `Simbol '${namaEfektif}' diimpor dari '${imp.sumberModul}', tetapi tidak pernah digunakan.`,
              'Impor simbol tanpa penggunaan nyata dapat dibersihkan untuk menyederhanakan kode.',
              `Hapus '${namaEfektif}' dari daftar impor.`,
              item.posisi
            );
          }
        }
      } else {
        const namaEfektif = imp.aliasModul || imp.sumberModul;
        if (!simbolTerpakai.has(namaEfektif) && !namaEfektif.startsWith('_')) {
          this.tambahDiagnostik(
            KodeAturanLinter.IMPOR_TIDAK_DIGUNAKAN,
            `Modul '${namaEfektif}' diimpor, tetapi tidak pernah diakses dalam berkas ini.`,
            'Modul yang tidak digunakan menambah ketergantungan yang tidak perlu.',
            `Hapus pernyataan impor '${namaEfektif}'.`,
            imp.posisi
          );
        }
      }
    }
  }

  private periksaFungsi(fn: NodeDeklarasiFungsi): void {
    const simbolTerpakai = new Set<string>();
    for (const stmt of fn.tubuh) {
      this.kumpulkanSimbolTerpakaiPernyataan(stmt, simbolTerpakai);
    }

    // Periksa variabel yang dideklarasikan di dalam fungsi
    const daftarParam = new Set(fn.parameter.map(p => p.nama));
    this.periksaVariabelLingkup(fn.tubuh, simbolTerpakai, [], daftarParam);
  }

  private periksaVariabelLingkup(
    daftarPernyataan: PernyataanAST[],
    simbolTerpakai: Set<string>,
    namaDiekspor: string[] = [],
    parameterDiabaikan: Set<string> = new Set()
  ): void {
    const diekspor = new Set(namaDiekspor);

    for (const stmt of daftarPernyataan) {
      if (stmt.jenis === JenisNodeAST.DEKLARASI_VARIABEL) {
        const v = stmt as NodeDeklarasiVariabel;
        if (
          !v.nama.startsWith('_') &&
          !simbolTerpakai.has(v.nama) &&
          !diekspor.has(v.nama) &&
          !parameterDiabaikan.has(v.nama)
        ) {
          this.tambahDiagnostik(
            KodeAturanLinter.VARIABEL_TIDAK_DIGUNAKAN,
            `Variabel '${v.nama}' dideklarasikan, tetapi tidak pernah digunakan.`,
            'Variabel dibuat namun nilainya tidak pernah dibaca dalam lingkup yang sesuai.',
            `Gunakan nilai '${v.nama}' atau hapus deklarasi variabel ini jika tidak diperlukan.`,
            v.posisi
          );
        }
      } else if (stmt.jenis === JenisNodeAST.DEKLARASI_TETAP) {
        const t = stmt as NodeDeklarasiTetap;
        if (
          !t.nama.startsWith('_') &&
          !simbolTerpakai.has(t.nama) &&
          !diekspor.has(t.nama) &&
          !parameterDiabaikan.has(t.nama)
        ) {
          this.tambahDiagnostik(
            KodeAturanLinter.VARIABEL_TIDAK_DIGUNAKAN,
            `Konstanta '${t.nama}' dideklarasikan, tetapi tidak pernah digunakan.`,
            'Konstanta dibuat namun nilainya tidak pernah dibaca.',
            `Gunakan nilai '${t.nama}' atau hapus konstanta ini jika tidak diperlukan.`,
            t.posisi
          );
        }
      }
    }
  }

  private periksaKodeTakTerjangkauDalamDaftar(daftar: PernyataanAST[]): void {
    let ditemukanPenghenti = false;
    let namaPenghenti = '';

    for (const stmt of daftar) {
      if (ditemukanPenghenti) {
        this.tambahDiagnostik(
          KodeAturanLinter.KODE_TAK_TERJANGKAU,
          `Kode tidak akan pernah dieksekusi karena berada setelah instruksi '${namaPenghenti}'.`,
          `Aliran kendali program telah dialihkan atau dihentikan oleh '${namaPenghenti}' sebelumnya.`,
          `Pindahkan atau hapus kode setelah '${namaPenghenti}'.`,
          stmt.posisi
        );
        break; // laporkan baris pertama yang tak terjangkau
      }

      if (stmt.jenis === JenisNodeAST.INSTRUKSI_KEMBALIKAN) {
        ditemukanPenghenti = true;
        namaPenghenti = 'kembalikan';
      } else if (stmt.jenis === JenisNodeAST.INSTRUKSI_HENTIKAN) {
        ditemukanPenghenti = true;
        namaPenghenti = 'hentikan';
      } else if (stmt.jenis === JenisNodeAST.INSTRUKSI_LANJUTKAN) {
        ditemukanPenghenti = true;
        namaPenghenti = 'lanjutkan';
      }

      // Rekursif untuk blok dalam jika / perulangan
      if (stmt.jenis === JenisNodeAST.PERCABANGAN_JIKA) {
        const jika = stmt as any;
        this.periksaKodeTakTerjangkauDalamDaftar(jika.cabangMaka || []);
        if (jika.cabangSelain) {
          this.periksaKodeTakTerjangkauDalamDaftar(jika.cabangSelain);
        }
      } else if (stmt.jenis === JenisNodeAST.PERULANGAN_SELAMA || stmt.jenis === JenisNodeAST.PERULANGAN_UNTUK) {
        const loop = stmt as any;
        this.periksaKodeTakTerjangkauDalamDaftar(loop.tubuh || []);
      }
    }
  }

  private periksaPerbandinganIdentik(program: NodeProgram): void {
    const periksaEkspresi = (expr: EkspresiAST): void => {
      if (!expr) return;

      if (expr.jenis === JenisNodeAST.EKSPRESI_BINER) {
        const b = expr as NodeEkspresiBiner;
        if (b.operator === '==' || b.operator === '!=') {
          if (this.apakahEkspresiIdentik(b.kiri, b.kanan)) {
            const hasilPrediksi = b.operator === '==' ? 'benar' : 'salah';
            this.tambahDiagnostik(
              KodeAturanLinter.PERBANDINGAN_IDENTIK,
              `Perbandingan '${b.operator}' antara dua ekspresi identik selalu menghasilkan '${hasilPrediksi}'.`,
              'Sisi kiri dan kanan perbandingan memiliki nilai yang persis sama.',
              'Periksa apakah salah satu sisi seharusnya membandingkan variabel atau nilai yang berbeda.',
              b.posisi
            );
          }
        }
        periksaEkspresi(b.kiri);
        periksaEkspresi(b.kanan);
        return;
      }

      if (expr.jenis === JenisNodeAST.EKSPRESI_UNARI) {
        periksaEkspresi((expr as any).argumen);
        return;
      }

      if (expr.jenis === JenisNodeAST.EKSPRESI_PENGELOMPOKAN) {
        periksaEkspresi((expr as any).ekspresi);
        return;
      }

      if (expr.jenis === JenisNodeAST.PEMANGGILAN_FUNGSI) {
        const f = expr as any;
        if (f.target) periksaEkspresi(f.target);
        for (const a of f.argumen || []) periksaEkspresi(a);
        return;
      }

      if (expr.jenis === JenisNodeAST.LITERAL_DAFTAR) {
        for (const e of (expr as any).elemen || []) periksaEkspresi(e);
        return;
      }

      if (expr.jenis === JenisNodeAST.LITERAL_PETA) {
        for (const p of (expr as any).pasangan || []) periksaEkspresi(p.nilai);
        return;
      }
    };

    const jelajahiPernyataan = (stmt: PernyataanAST): void => {
      if (!stmt) return;
      switch (stmt.jenis) {
        case JenisNodeAST.DEKLARASI_VARIABEL:
        case JenisNodeAST.DEKLARASI_TETAP:
          periksaEkspresi((stmt as any).nilaiAwal);
          break;
        case JenisNodeAST.PENUGASAN:
          periksaEkspresi((stmt as any).nilai);
          break;
        case JenisNodeAST.PENUGASAN_INDEKS:
          periksaEkspresi((stmt as any).koleksi);
          periksaEkspresi((stmt as any).indeks);
          periksaEkspresi((stmt as any).nilai);
          break;
        case JenisNodeAST.PERNYATAAN_EKSPRESI:
          periksaEkspresi((stmt as any).ekspresi);
          break;
        case JenisNodeAST.INSTRUKSI_KEMBALIKAN:
          if ((stmt as any).nilai) periksaEkspresi((stmt as any).nilai);
          break;
        case JenisNodeAST.PERCABANGAN_JIKA: {
          const j = stmt as any;
          periksaEkspresi(j.kondisi);
          for (const s of j.cabangMaka || []) jelajahiPernyataan(s);
          for (const s of j.cabangSelain || []) jelajahiPernyataan(s);
          break;
        }
        case JenisNodeAST.PERULANGAN_SELAMA: {
          const sel = stmt as any;
          periksaEkspresi(sel.kondisi);
          for (const s of sel.tubuh || []) jelajahiPernyataan(s);
          break;
        }
        case JenisNodeAST.PERULANGAN_UNTUK: {
          const unt = stmt as any;
          periksaEkspresi(unt.nilaiAwal);
          periksaEkspresi(unt.nilaiAkhir);
          for (const s of unt.tubuh || []) jelajahiPernyataan(s);
          break;
        }
      }
    };

    for (const stmt of program.tubuhUtama) {
      jelajahiPernyataan(stmt);
    }
    for (const fn of program.daftarFungsi) {
      for (const stmt of fn.tubuh) {
        jelajahiPernyataan(stmt);
      }
    }
  }

  private apakahEkspresiIdentik(a: EkspresiAST, b: EkspresiAST): boolean {
    if (!a || !b) return false;
    if (a.jenis !== b.jenis) return false;

    if (a.jenis === JenisNodeAST.PENGIDENTIFIKASI && b.jenis === JenisNodeAST.PENGIDENTIFIKASI) {
      return (a as any).nama === (b as any).nama;
    }

    if (a.jenis === JenisNodeAST.LITERAL && b.jenis === JenisNodeAST.LITERAL) {
      return (a as any).nilaiTerurai === (b as any).nilaiTerurai;
    }

    return false;
  }

  private kumpulkanSimbolTerpakai(program: NodeProgram, hasil: Set<string>): void {
    for (const stmt of program.tubuhUtama) {
      this.kumpulkanSimbolTerpakaiPernyataan(stmt, hasil);
    }
    for (const fn of program.daftarFungsi) {
      for (const stmt of fn.tubuh) {
        this.kumpulkanSimbolTerpakaiPernyataan(stmt, hasil);
      }
    }
  }

  private kumpulkanSimbolTerpakaiPernyataan(stmt: PernyataanAST, hasil: Set<string>): void {
    if (!stmt) return;
    switch (stmt.jenis) {
      case JenisNodeAST.DEKLARASI_VARIABEL:
      case JenisNodeAST.DEKLARASI_TETAP:
        this.kumpulkanSimbolTerpakaiEkspresi((stmt as any).nilaiAwal, hasil);
        break;
      case JenisNodeAST.PENUGASAN:
        hasil.add((stmt as any).target);
        this.kumpulkanSimbolTerpakaiEkspresi((stmt as any).nilai, hasil);
        break;
      case JenisNodeAST.PENUGASAN_INDEKS:
        this.kumpulkanSimbolTerpakaiEkspresi((stmt as any).koleksi, hasil);
        this.kumpulkanSimbolTerpakaiEkspresi((stmt as any).indeks, hasil);
        this.kumpulkanSimbolTerpakaiEkspresi((stmt as any).nilai, hasil);
        break;
      case JenisNodeAST.PERNYATAAN_EKSPRESI:
        this.kumpulkanSimbolTerpakaiEkspresi((stmt as any).ekspresi, hasil);
        break;
      case JenisNodeAST.INSTRUKSI_KEMBALIKAN:
        if ((stmt as any).nilai) {
          this.kumpulkanSimbolTerpakaiEkspresi((stmt as any).nilai, hasil);
        }
        break;
      case JenisNodeAST.PERCABANGAN_JIKA: {
        const j = stmt as any;
        this.kumpulkanSimbolTerpakaiEkspresi(j.kondisi, hasil);
        for (const s of j.cabangMaka || []) this.kumpulkanSimbolTerpakaiPernyataan(s, hasil);
        for (const s of j.cabangSelain || []) this.kumpulkanSimbolTerpakaiPernyataan(s, hasil);
        break;
      }
      case JenisNodeAST.PERULANGAN_SELAMA: {
        const sel = stmt as any;
        this.kumpulkanSimbolTerpakaiEkspresi(sel.kondisi, hasil);
        for (const s of sel.tubuh || []) this.kumpulkanSimbolTerpakaiPernyataan(s, hasil);
        break;
      }
      case JenisNodeAST.PERULANGAN_UNTUK: {
        const unt = stmt as any;
        this.kumpulkanSimbolTerpakaiEkspresi(unt.nilaiAwal, hasil);
        this.kumpulkanSimbolTerpakaiEkspresi(unt.nilaiAkhir, hasil);
        for (const s of unt.tubuh || []) this.kumpulkanSimbolTerpakaiPernyataan(s, hasil);
        break;
      }
    }
  }

  private kumpulkanSimbolTerpakaiEkspresi(expr: EkspresiAST, hasil: Set<string>): void {
    if (!expr) return;
    switch (expr.jenis) {
      case JenisNodeAST.PENGIDENTIFIKASI:
        hasil.add((expr as any).nama);
        break;
      case JenisNodeAST.PEMANGGILAN_FUNGSI: {
        const fn = expr as any;
        hasil.add(fn.namaFungsi);
        if (fn.target) this.kumpulkanSimbolTerpakaiEkspresi(fn.target, hasil);
        for (const a of fn.argumen || []) this.kumpulkanSimbolTerpakaiEkspresi(a, hasil);
        break;
      }
      case JenisNodeAST.AKSES_ANGGOTA:
        this.kumpulkanSimbolTerpakaiEkspresi((expr as any).target, hasil);
        break;
      case JenisNodeAST.AKSES_INDEKS:
        this.kumpulkanSimbolTerpakaiEkspresi((expr as any).koleksi, hasil);
        this.kumpulkanSimbolTerpakaiEkspresi((expr as any).indeks, hasil);
        break;
      case JenisNodeAST.EKSPRESI_BINER:
        this.kumpulkanSimbolTerpakaiEkspresi((expr as any).kiri, hasil);
        this.kumpulkanSimbolTerpakaiEkspresi((expr as any).kanan, hasil);
        break;
      case JenisNodeAST.EKSPRESI_UNARI:
        this.kumpulkanSimbolTerpakaiEkspresi((expr as any).argumen, hasil);
        break;
      case JenisNodeAST.EKSPRESI_PENGELOMPOKAN:
        this.kumpulkanSimbolTerpakaiEkspresi((expr as any).ekspresi, hasil);
        break;
      case JenisNodeAST.LITERAL_DAFTAR:
        for (const el of (expr as any).elemen || []) this.kumpulkanSimbolTerpakaiEkspresi(el, hasil);
        break;
      case JenisNodeAST.LITERAL_PETA:
        for (const p of (expr as any).pasangan || []) this.kumpulkanSimbolTerpakaiEkspresi(p.nilai, hasil);
        break;
    }
  }

  private tambahDiagnostik(
    kode: KodeAturanLinter,
    pesan: string,
    penyebab: string,
    saran: string,
    posisi?: { awal: { baris: number; kolom: number }; akhir: { baris: number; kolom: number } }
  ): void {
    const baris = posisi?.awal?.baris ?? 1;
    const kolom = posisi?.awal?.kolom ?? 1;
    const cuplikan = this.kodeSumber
      ? buatCuplikanSumber(this.kodeSumber, baris, kolom, posisi?.akhir?.kolom)
      : undefined;

    this.daftarDiagnostik.push({
      tingkat: TingkatDiagnostik.PERINGATAN,
      kategori: KategoriDiagnostik.LINTER,
      kode,
      pesan,
      penyebabRinci: penyebab,
      saran,
      lokasi: {
        berkas: this.namaBerkas,
        baris,
        kolom,
      },
      potonganKode: cuplikan,
    });
  }
}
