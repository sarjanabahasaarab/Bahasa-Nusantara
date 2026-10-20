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
  NodeInstruksiHentikan,
  NodeInstruksiLanjutkan,
  NodePernyataanEkspresi,
  NodeDeklarasiFungsi,
  NodeLiteral,
  NodeLiteralDaftar,
  NodeLiteralPeta,
  NodePengidentifikasi,
  NodeEkspresiUnari,
  NodeEkspresiBiner,
  NodeEkspresiPengelompokan,
  NodePemanggilanFungsi,
  NodeAksesIndeks,
  NodeAksesAnggota,
} from '../parser/ast';
import { NamaTipe, apakahTipeSah } from './jenisTipe';
import { GalatTipe, JenisGalatTipe, buatGalatKetidakcocokanTipe } from './galatTipe';
import { apakahKompatibel, tentukanTipeOperasiBiner } from './kompatibilitas';
import type { CatatanModul } from '../modul/jenisModul';

interface InfoSimbol {
  nama: string;
  tipe: NamaTipe;
  tetap: boolean;
}

interface InfoFungsi {
  nama: string;
  parameter: Array<{ nama: string; tipe: NamaTipe }>;
  tipeKembalian: NamaTipe;
}

/**
 * Lingkup Tabel Simbol untuk Analisis Semantik & Pengetikan Statis.
 */
class LingkupTipe {
  private simbol = new Map<string, InfoSimbol>();
  public readonly induk?: LingkupTipe;

  constructor(induk?: LingkupTipe) {
    this.induk = induk;
  }

  public definisikan(info: InfoSimbol, posisi?: any): void {
    if (this.simbol.has(info.nama)) {
      throw new GalatTipe(
        JenisGalatTipe.DEKLARASI_GANDA,
        `Variabel '${info.nama}' sudah dideklarasikan pada lingkup (scope) ini.`,
        posisi
      );
    }
    this.simbol.set(info.nama, info);
  }

  public ambil(nama: string): InfoSimbol | undefined {
    if (this.simbol.has(nama)) return this.simbol.get(nama);
    if (this.induk) return this.induk.ambil(nama);
    return undefined;
  }
}

/**
 * Pemeriksa Tipe & Analisis Semantik Bahasa NUSANTARA (Phase 9).
 */
export class PemeriksaTipe {
  private lingkupSaatIni: LingkupTipe;
  private readonly tabelFungsi = new Map<string, InfoFungsi>();
  private readonly tabelModul = new Map<string, CatatanModul>();
  private readonly daftarGalat: GalatTipe[] = [];
  private readonly pemuatModul?: any;
  private fungsiAktifSaatIni?: InfoFungsi;
  private kedalamanPerulangan: number = 0;

  constructor(pemuatModul?: any) {
    this.lingkupSaatIni = new LingkupTipe();
    this.pemuatModul = pemuatModul;
    this.daftarkanFungsiBawaan();
  }

  private daftarkanFungsiBawaan(): void {
    // tampilkan(...apapun)
    this.tabelFungsi.set('tampilkan', {
      nama: 'tampilkan',
      parameter: [],
      tipeKembalian: NamaTipe.KOSONG,
    });
    this.tabelFungsi.set('panjang', {
      nama: 'panjang',
      parameter: [{ nama: 'koleksi', tipe: NamaTipe.APAPUN }],
      tipeKembalian: NamaTipe.BILANGAN,
    });
  }

  public daftarkanModul(nama: string, modul: CatatanModul): void {
    this.tabelModul.set(nama, modul);
    this.lingkupSaatIni.definisikan({
      nama,
      tipe: NamaTipe.MODUL,
      tetap: true,
    });
  }

  public periksa(program: NodeProgram, direktoriBasis?: string): GalatTipe[] {
    this.daftarGalat.length = 0;
    this.kedalamanPerulangan = 0;

    // 0. Proses impor modul jika ada
    if (program.daftarImpor && program.daftarImpor.length > 0) {
      for (const imp of program.daftarImpor) {
        if (this.pemuatModul) {
          try {
            const catatan: CatatanModul = this.pemuatModul.muatModul(
              imp.sumberModul,
              direktoriBasis,
              imp.posisi?.awal
            );
            const kunciNamespace = imp.aliasModul || catatan.nama;
            this.daftarkanModul(kunciNamespace, catatan);

            // Jika terdapat destrukturisasi impor: impor { tambah } dari matematika
            if (imp.itemImpor && imp.itemImpor.length > 0) {
              for (const item of imp.itemImpor) {
                const infoSimbol = catatan.simbolEkspor.get(item.nama);
                if (!infoSimbol) {
                  if (catatan.simbolInternal.has(item.nama)) {
                    this.daftarGalat.push(
                      new GalatTipe(
                        JenisGalatTipe.ANGGOTA_INTERNAL_TERLINDUNGI,
                        `Simbol '${item.nama}' bersifat internal pada modul '${catatan.nama}' dan tidak diekspor.`,
                        item.posisi.awal
                      )
                    );
                  } else {
                    this.daftarGalat.push(
                      new GalatTipe(
                        JenisGalatTipe.ANGGOTA_MODUL_TIDAK_DITEMUKAN,
                        `Simbol '${item.nama}' tidak ditemukan pada ekspor modul '${catatan.nama}'.`,
                        item.posisi.awal
                      )
                    );
                  }
                  continue;
                }

                const namaTerikat = item.alias || item.nama;
                if (infoSimbol.kategori === 'fungsi') {
                  this.tabelFungsi.set(namaTerikat, {
                    nama: namaTerikat,
                    parameter: (infoSimbol.parameter || []).map(p => ({
                      nama: p.nama,
                      tipe: (p.tipe as NamaTipe) || NamaTipe.APAPUN,
                    })),
                    tipeKembalian: (infoSimbol.tipeKembalian as NamaTipe) || NamaTipe.KOSONG,
                  });
                } else {
                  this.lingkupSaatIni.definisikan({
                    nama: namaTerikat,
                    tipe: (infoSimbol.tipeData as NamaTipe) || NamaTipe.APAPUN,
                    tetap: !!infoSimbol.tetap,
                  }, item.posisi.awal);
                }
              }
            }
          } catch (err: any) {
            this.daftarGalat.push(
              new GalatTipe(
                JenisGalatTipe.MODUL_TIDAK_DITEMUKAN,
                err.message,
                imp.posisi?.awal
              )
            );
          }
        }
      }
    }

    // 1. Daftarkan tanda tangan seluruh deklarasi fungsi
    for (const fn of program.daftarFungsi) {
      if (fn.nama === 'tampilkan' || fn.nama === 'panjang') {
        this.daftarGalat.push(
          new GalatTipe(
            JenisGalatTipe.DEKLARASI_GANDA,
            `Nama fungsi '${fn.nama}' sudah digunakan oleh fungsi bawaan resmi NUSANTARA.`,
            fn.posisi.awal
          )
        );
        continue;
      }

      if (this.tabelFungsi.has(fn.nama)) {
        this.daftarGalat.push(
          new GalatTipe(
            JenisGalatTipe.DEKLARASI_GANDA,
            `Fungsi '${fn.nama}' dideklarasikan lebih dari satu kali.`,
            fn.posisi.awal
          )
        );
        continue;
      }

      if (fn.tipeKembalian && !apakahTipeSah(fn.tipeKembalian)) {
        this.daftarGalat.push(
          new GalatTipe(
            JenisGalatTipe.TIPE_TIDAK_DIKENAL,
            `Tipe kembalian '${fn.tipeKembalian}' pada fungsi '${fn.nama}' tidak dikenal.`,
            fn.posisi.awal
          )
        );
      }

      const paramSet = new Set<string>();
      const params: Array<{ nama: string; tipe: NamaTipe }> = [];
      for (const p of fn.parameter) {
        if (paramSet.has(p.nama)) {
          this.daftarGalat.push(
            new GalatTipe(
              JenisGalatTipe.DEKLARASI_GANDA,
              `Parameter '${p.nama}' dideklarasikan ganda pada fungsi '${fn.nama}'.`,
              p.posisi.awal
            )
          );
        }
        paramSet.add(p.nama);

        if (!apakahTipeSah(p.tipeData)) {
          this.daftarGalat.push(
            new GalatTipe(
              JenisGalatTipe.TIPE_TIDAK_DIKENAL,
              `Tipe parameter '${p.tipeData}' untuk '${p.nama}' pada fungsi '${fn.nama}' tidak dikenal.`,
              p.posisi.awal
            )
          );
        }
        params.push({ nama: p.nama, tipe: p.tipeData as NamaTipe });
      }

      this.tabelFungsi.set(fn.nama, {
        nama: fn.nama,
        parameter: params,
        tipeKembalian: (fn.tipeKembalian as NamaTipe) || NamaTipe.KOSONG,
      });
    }

    // 2. Periksa tubuh setiap fungsi
    for (const fn of program.daftarFungsi) {
      this.periksaDeklarasiFungsi(fn);
    }

    // 3. Periksa tubuh program utama
    for (const stmt of program.tubuhUtama) {
      try {
        this.periksaPernyataan(stmt);
      } catch (e: any) {
        if (e instanceof GalatTipe) {
          this.daftarGalat.push(e);
        } else {
          throw e;
        }
      }
    }

    return this.daftarGalat;
  }

  private mempunyaiInstruksiKembalikan(pernyataan: PernyataanAST[]): boolean {
    for (const st of pernyataan) {
      if (st.jenis === JenisNodeAST.INSTRUKSI_KEMBALIKAN) return true;
      if (st.jenis === JenisNodeAST.PERCABANGAN_JIKA) {
        const j = st as NodePercabanganJika;
        if (this.mempunyaiInstruksiKembalikan(j.cabangMaka)) return true;
        if (j.cabangSelain && this.mempunyaiInstruksiKembalikan(j.cabangSelain)) return true;
      }
      if (st.jenis === JenisNodeAST.PERULANGAN_SELAMA) {
        if (this.mempunyaiInstruksiKembalikan((st as NodePerulanganSelama).tubuh)) return true;
      }
      if (st.jenis === JenisNodeAST.PERULANGAN_UNTUK) {
        if (this.mempunyaiInstruksiKembalikan((st as NodePerulanganUntuk).tubuh)) return true;
      }
    }
    return false;
  }

  private periksaDeklarasiFungsi(fn: NodeDeklarasiFungsi): void {
    const infoFn = this.tabelFungsi.get(fn.nama);
    if (!infoFn) return;

    const simpanFungsiAktif = this.fungsiAktifSaatIni;
    this.fungsiAktifSaatIni = infoFn;

    const lingkupFungsi = new LingkupTipe(this.lingkupSaatIni);
    const simpanLingkup = this.lingkupSaatIni;
    this.lingkupSaatIni = lingkupFungsi;

    try {
      for (const p of infoFn.parameter) {
        lingkupFungsi.definisikan({
          nama: p.nama,
          tipe: p.tipe,
          tetap: false,
        });
      }

      for (const st of fn.tubuh) {
        this.periksaPernyataan(st);
      }

      if (infoFn.tipeKembalian !== NamaTipe.KOSONG && !this.mempunyaiInstruksiKembalikan(fn.tubuh)) {
        this.daftarGalat.push(
          new GalatTipe(
            JenisGalatTipe.KEMBALIAN_TIDAK_SESUAI,
            `Fungsi '${fn.nama}' harus mengembalikan ${infoFn.tipeKembalian}, tetapi tidak mengembalikan nilai.`,
            fn.posisi.awal,
            infoFn.tipeKembalian,
            NamaTipe.KOSONG
          )
        );
      }
    } catch (e: any) {
      if (e instanceof GalatTipe) {
        this.daftarGalat.push(e);
      } else {
        throw e;
      }
    } finally {
      this.lingkupSaatIni = simpanLingkup;
      this.fungsiAktifSaatIni = simpanFungsiAktif;
    }
  }

  private periksaPernyataan(stmt: PernyataanAST): void {
    switch (stmt.jenis) {
      case JenisNodeAST.DEKLARASI_VARIABEL: {
        const s = stmt as NodeDeklarasiVariabel;
        if (!apakahTipeSah(s.tipeData)) {
          throw new GalatTipe(
            JenisGalatTipe.TIPE_TIDAK_DIKENAL,
            `Tipe data '${s.tipeData}' pada deklarasi variabel '${s.nama}' tidak sah.`,
            s.posisi.awal
          );
        }

        const tipeNilai = this.periksaEkspresi(s.nilaiAwal);
        if (!apakahKompatibel(s.tipeData, tipeNilai)) {
          throw buatGalatKetidakcocokanTipe(
            `Deklarasi variabel '${s.nama}'`,
            s.tipeData,
            tipeNilai,
            s.nilaiAwal.posisi.awal
          );
        }

        this.lingkupSaatIni.definisikan(
          { nama: s.nama, tipe: s.tipeData as NamaTipe, tetap: false },
          s.posisi.awal
        );
        break;
      }

      case JenisNodeAST.DEKLARASI_TETAP: {
        const s = stmt as NodeDeklarasiTetap;
        if (!apakahTipeSah(s.tipeData)) {
          throw new GalatTipe(
            JenisGalatTipe.TIPE_TIDAK_DIKENAL,
            `Tipe data '${s.tipeData}' pada deklarasi tetap '${s.nama}' tidak sah.`,
            s.posisi.awal
          );
        }

        const tipeNilai = this.periksaEkspresi(s.nilaiAwal);
        if (!apakahKompatibel(s.tipeData, tipeNilai)) {
          throw buatGalatKetidakcocokanTipe(
            `Deklarasi konstanta tetap '${s.nama}'`,
            s.tipeData,
            tipeNilai,
            s.nilaiAwal.posisi.awal
          );
        }

        this.lingkupSaatIni.definisikan(
          { nama: s.nama, tipe: s.tipeData as NamaTipe, tetap: true },
          s.posisi.awal
        );
        break;
      }

      case JenisNodeAST.PENUGASAN: {
        const s = stmt as NodePenugasan;
        const tipeBaru = this.periksaEkspresi(s.nilai);
        const simbol = this.lingkupSaatIni.ambil(s.target);

        if (!simbol) {
          // Variabel tidak terdefinisi ditangani oleh runtime / interpreter
          break;
        }

        if (simbol.tetap) {
          throw new GalatTipe(
            JenisGalatTipe.MODIFIKASI_TETAP,
            `Konstanta '${s.target}' bersifat tetap dan tidak dapat diubah.`,
            s.posisi.awal
          );
        }

        if (!apakahKompatibel(simbol.tipe, tipeBaru)) {
          throw buatGalatKetidakcocokanTipe(
            `Penugasan ke variabel '${s.target}'`,
            simbol.tipe,
            tipeBaru,
            s.nilai.posisi.awal
          );
        }
        break;
      }

      case JenisNodeAST.PENUGASAN_INDEKS: {
        const s = stmt as NodePenugasanIndeks;
        if (s.koleksi.jenis === JenisNodeAST.PENGIDENTIFIKASI) {
          const id = (s.koleksi as NodePengidentifikasi).nama;
          const simbol = this.lingkupSaatIni.ambil(id);
          if (simbol && simbol.tetap) {
            throw new GalatTipe(
              JenisGalatTipe.MODIFIKASI_TETAP,
              `Koleksi '${id}' bersifat tetap dan elemennya tidak dapat diubah nilainya.`,
              s.posisi.awal
            );
          }
        }

        const tipeKoleksi = this.periksaEkspresi(s.koleksi);
        const tipeIndeks = this.periksaEkspresi(s.indeks);
        this.periksaEkspresi(s.nilai);

        if (tipeKoleksi === NamaTipe.DAFTAR) {
          if (tipeIndeks !== NamaTipe.BILANGAN && tipeIndeks !== NamaTipe.APAPUN) {
            throw new GalatTipe(
              JenisGalatTipe.INDEKS_TIDAK_SESUAI,
              `Indeks daftar harus bertipe bilangan bulat, tetapi ditemukan '${tipeIndeks}'.`,
              s.indeks.posisi.awal,
              NamaTipe.BILANGAN,
              tipeIndeks
            );
          }
        } else if (tipeKoleksi === NamaTipe.PETA) {
          if (tipeIndeks !== NamaTipe.TEKS && tipeIndeks !== NamaTipe.APAPUN) {
            throw new GalatTipe(
              JenisGalatTipe.INDEKS_TIDAK_SESUAI,
              `Kunci peta harus bertipe teks, tetapi ditemukan '${tipeIndeks}'.`,
              s.indeks.posisi.awal,
              NamaTipe.TEKS,
              tipeIndeks
            );
          }
        } else if (tipeKoleksi !== NamaTipe.APAPUN) {
          throw new GalatTipe(
            JenisGalatTipe.TIPE_BUKAN_KOLEKSI,
            `Operasi penugasan indeks tidak didukung pada tipe '${tipeKoleksi}'.`,
            s.koleksi.posisi.awal
          );
        }
        break;
      }

      case JenisNodeAST.PERCABANGAN_JIKA: {
        const s = stmt as NodePercabanganJika;
        this.validasiVariabelKondisi(s.kondisi);
        const tipeKondisi = this.periksaEkspresi(s.kondisi);
        if (tipeKondisi !== NamaTipe.LOGIKA && tipeKondisi !== NamaTipe.APAPUN) {
          throw new GalatTipe(
            JenisGalatTipe.KETIDAKCOCOKAN_TIPE,
            `Kondisi percabangan 'jika' harus menghasilkan nilai logika, tetapi ditemukan '${tipeKondisi}'.`,
            s.kondisi.posisi.awal,
            NamaTipe.LOGIKA,
            tipeKondisi
          );
        }

        const lingkupMaka = new LingkupTipe(this.lingkupSaatIni);
        this.jalankanDalamLingkup(lingkupMaka, () => {
          for (const st of s.cabangMaka) this.periksaPernyataan(st);
        });

        if (s.cabangSelain) {
          const lingkupSelain = new LingkupTipe(this.lingkupSaatIni);
          this.jalankanDalamLingkup(lingkupSelain, () => {
            for (const st of s.cabangSelain!) this.periksaPernyataan(st);
          });
        }
        break;
      }

      case JenisNodeAST.PERULANGAN_SELAMA: {
        const s = stmt as NodePerulanganSelama;
        this.validasiVariabelKondisi(s.kondisi);
        const tipeKondisi = this.periksaEkspresi(s.kondisi);
        if (tipeKondisi !== NamaTipe.LOGIKA && tipeKondisi !== NamaTipe.APAPUN) {
          throw new GalatTipe(
            JenisGalatTipe.KETIDAKCOCOKAN_TIPE,
            `Kondisi perulangan 'selama' harus menghasilkan nilai logika, tetapi ditemukan '${tipeKondisi}'.`,
            s.kondisi.posisi.awal,
            NamaTipe.LOGIKA,
            tipeKondisi
          );
        }

        const lingkupLoop = new LingkupTipe(this.lingkupSaatIni);
        this.kedalamanPerulangan++;
        try {
          this.jalankanDalamLingkup(lingkupLoop, () => {
            for (const st of s.tubuh) this.periksaPernyataan(st);
          });
        } finally {
          this.kedalamanPerulangan--;
        }
        break;
      }

      case JenisNodeAST.PERULANGAN_UNTUK: {
        const s = stmt as NodePerulanganUntuk;
        this.validasiVariabelKondisi(s.nilaiAwal);
        this.validasiVariabelKondisi(s.nilaiAkhir);
        const tipeAwal = this.periksaEkspresi(s.nilaiAwal);
        const tipeAkhir = this.periksaEkspresi(s.nilaiAkhir);

        if (tipeAwal !== NamaTipe.BILANGAN && tipeAwal !== NamaTipe.APAPUN) {
          throw new GalatTipe(
            JenisGalatTipe.KETIDAKCOCOKAN_TIPE,
            `Batas awal perulangan 'untuk' ('dari') harus bertipe bilangan bulat, tetapi ditemukan '${tipeAwal}'.`,
            s.nilaiAwal.posisi.awal,
            NamaTipe.BILANGAN,
            tipeAwal
          );
        }

        if (tipeAkhir !== NamaTipe.BILANGAN && tipeAkhir !== NamaTipe.APAPUN) {
          throw new GalatTipe(
            JenisGalatTipe.KETIDAKCOCOKAN_TIPE,
            `Batas akhir perulangan 'untuk' ('sampai') harus bertipe bilangan bulat, tetapi ditemukan '${tipeAkhir}'.`,
            s.nilaiAkhir.posisi.awal,
            NamaTipe.BILANGAN,
            tipeAkhir
          );
        }

        const lingkupUntuk = new LingkupTipe(this.lingkupSaatIni);
        lingkupUntuk.definisikan({
          nama: s.variabelPenghitung,
          tipe: NamaTipe.BILANGAN,
          tetap: false,
        });

        this.kedalamanPerulangan++;
        try {
          this.jalankanDalamLingkup(lingkupUntuk, () => {
            for (const st of s.tubuh) this.periksaPernyataan(st);
          });
        } finally {
          this.kedalamanPerulangan--;
        }
        break;
      }

      case JenisNodeAST.INSTRUKSI_HENTIKAN: {
        const s = stmt as NodeInstruksiHentikan;
        if (this.kedalamanPerulangan === 0) {
          throw new GalatTipe(
            JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS,
            "Instruksi 'hentikan' hanya dapat digunakan di dalam blok perulangan.",
            s.posisi.awal
          );
        }
        break;
      }

      case JenisNodeAST.INSTRUKSI_LANJUTKAN: {
        const s = stmt as NodeInstruksiLanjutkan;
        if (this.kedalamanPerulangan === 0) {
          throw new GalatTipe(
            JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS,
            "Instruksi 'lanjutkan' hanya dapat digunakan di dalam blok perulangan.",
            s.posisi.awal
          );
        }
        break;
      }

      case JenisNodeAST.INSTRUKSI_KEMBALIKAN: {
        const s = stmt as NodeInstruksiKembalikan;
        if (!this.fungsiAktifSaatIni) {
          throw new GalatTipe(
            JenisGalatTipe.KENDALI_DI_LUAR_KONTEKS,
            "Instruksi 'kembalikan' hanya dapat digunakan di dalam blok fungsi.",
            s.posisi.awal
          );
        }

        const tipeAktual = s.nilai ? this.periksaEkspresi(s.nilai) : NamaTipe.KOSONG;
        const tipeTarget = this.fungsiAktifSaatIni.tipeKembalian;

        if (tipeTarget !== NamaTipe.KOSONG && (!s.nilai || tipeAktual === NamaTipe.KOSONG)) {
          throw new GalatTipe(
            JenisGalatTipe.KEMBALIAN_TIDAK_SESUAI,
            `Fungsi '${this.fungsiAktifSaatIni.nama}' harus mengembalikan ${tipeTarget}, tetapi tidak mengembalikan nilai.`,
            s.posisi.awal,
            tipeTarget,
            NamaTipe.KOSONG
          );
        }

        if (!apakahKompatibel(tipeTarget, tipeAktual)) {
          throw new GalatTipe(
            JenisGalatTipe.KEMBALIAN_TIDAK_SESUAI,
            `Fungsi '${this.fungsiAktifSaatIni.nama}' harus mengembalikan tipe '${tipeTarget}', namun mengembalikan tipe '${tipeAktual}'.`,
            s.posisi.awal,
            tipeTarget,
            tipeAktual
          );
        }
        break;
      }

      case JenisNodeAST.PERNYATAAN_EKSPRESI: {
        this.periksaEkspresi((stmt as NodePernyataanEkspresi).ekspresi);
        break;
      }

      case JenisNodeAST.PERNYATAAN_BLOK: {
        const lingkupBlok = new LingkupTipe(this.lingkupSaatIni);
        this.jalankanDalamLingkup(lingkupBlok, () => {
          for (const st of (stmt as any).daftarPernyataan) {
            this.periksaPernyataan(st);
          }
        });
        break;
      }
    }
  }

  private validasiVariabelKondisi(expr: EkspresiAST): void {
    switch (expr.jenis) {
      case JenisNodeAST.PENGIDENTIFIKASI: {
        const id = expr as NodePengidentifikasi;
        const simbol = this.lingkupSaatIni.ambil(id.nama);
        if (!simbol) {
          throw new GalatTipe(
            JenisGalatTipe.VARIABEL_BELUM_DIDEKLARASIKAN,
            `Variabel '${id.nama}' pada kondisi percabangan belum dideklarasikan.`,
            id.posisi.awal
          );
        }
        break;
      }
      case JenisNodeAST.EKSPRESI_BINER: {
        const b = expr as NodeEkspresiBiner;
        this.validasiVariabelKondisi(b.kiri);
        this.validasiVariabelKondisi(b.kanan);
        break;
      }
      case JenisNodeAST.EKSPRESI_UNARI: {
        const u = expr as NodeEkspresiUnari;
        this.validasiVariabelKondisi(u.argumen);
        break;
      }
      case JenisNodeAST.EKSPRESI_PENGELOMPOKAN: {
        const p = expr as NodeEkspresiPengelompokan;
        this.validasiVariabelKondisi(p.ekspresi);
        break;
      }
      case JenisNodeAST.PEMANGGILAN_FUNGSI: {
        const fn = expr as NodePemanggilanFungsi;
        for (const arg of fn.argumen) {
          this.validasiVariabelKondisi(arg);
        }
        break;
      }
    }
  }

  private jalankanDalamLingkup(lingkupBaru: LingkupTipe, aksi: () => void): void {
    const simpan = this.lingkupSaatIni;
    this.lingkupSaatIni = lingkupBaru;
    try {
      aksi();
    } finally {
      this.lingkupSaatIni = simpan;
    }
  }

  public periksaEkspresi(expr: EkspresiAST): NamaTipe {
    switch (expr.jenis) {
      case JenisNodeAST.LITERAL: {
        const l = expr as NodeLiteral;
        switch (l.tipeLiteral) {
          case 'bilangan':
            return NamaTipe.BILANGAN;
          case 'desimal':
            return NamaTipe.DESIMAL;
          case 'teks':
            return NamaTipe.TEKS;
          case 'karakter':
            return NamaTipe.KARAKTER;
          case 'logika':
            return NamaTipe.LOGIKA;
          case 'kosong':
            return NamaTipe.KOSONG;
        }
        return NamaTipe.APAPUN;
      }

      case JenisNodeAST.PENGIDENTIFIKASI: {
        const id = expr as NodePengidentifikasi;
        const simbol = this.lingkupSaatIni.ambil(id.nama);
        if (simbol) return simbol.tipe;
        return NamaTipe.APAPUN; // Jika belum dikenal, biarkan runtime menangani undefined variable
      }

      case JenisNodeAST.EKSPRESI_PENGELOMPOKAN: {
        return this.periksaEkspresi((expr as NodeEkspresiPengelompokan).ekspresi);
      }

      case JenisNodeAST.EKSPRESI_UNARI: {
        const u = expr as NodeEkspresiUnari;
        const tipeArg = this.periksaEkspresi(u.argumen);

        if (u.operator === '-') {
          if (tipeArg === NamaTipe.BILANGAN || tipeArg === NamaTipe.DESIMAL || tipeArg === NamaTipe.APAPUN) {
            return tipeArg;
          }
          throw new GalatTipe(
            JenisGalatTipe.OPERATOR_TIDAK_DIDUKUNG,
            `Operator unari '-' membutuhkan operan bertipe bilangan atau desimal, tetapi ditemukan '${tipeArg}'.`,
            u.posisi.awal
          );
        }

        if (u.operator === 'tidak') {
          if (tipeArg === NamaTipe.LOGIKA || tipeArg === NamaTipe.APAPUN) {
            return NamaTipe.LOGIKA;
          }
          throw new GalatTipe(
            JenisGalatTipe.OPERATOR_TIDAK_DIDUKUNG,
            `Operator unari 'tidak' membutuhkan operan bertipe logika, tetapi ditemukan '${tipeArg}'.`,
            u.posisi.awal
          );
        }
        return NamaTipe.APAPUN;
      }

      case JenisNodeAST.EKSPRESI_BINER: {
        const b = expr as NodeEkspresiBiner;
        const tipeKiri = this.periksaEkspresi(b.kiri);
        const tipeKanan = this.periksaEkspresi(b.kanan);

        if (tipeKiri === NamaTipe.APAPUN || tipeKanan === NamaTipe.APAPUN) {
          return NamaTipe.APAPUN;
        }

        const hasilOperasi = tentukanTipeOperasiBiner(b.operator, tipeKiri, tipeKanan);
        if (!hasilOperasi) {
          if (b.operator === 'dan' || b.operator === 'atau') {
            throw new GalatTipe(
              JenisGalatTipe.OPERATOR_TIDAK_DIDUKUNG,
              `Operator '${b.operator}' membutuhkan operan bertipe logika, tetapi ditemukan '${tipeKiri}' dan '${tipeKanan}'.`,
              b.posisi.awal
            );
          }
          throw new GalatTipe(
            JenisGalatTipe.OPERATOR_TIDAK_DIDUKUNG,
            `Operasi '${b.operator}' tidak didukung antara tipe '${tipeKiri}' dan '${tipeKanan}'.`,
            b.posisi.awal
          );
        }

        return hasilOperasi;
      }

      case JenisNodeAST.PEMANGGILAN_FUNGSI: {
        const c = expr as NodePemanggilanFungsi;

        // Pemanggilan fungsi anggota modul (misal: matematika.tambah(10, 20))
        if (c.target) {
          if (c.target.jenis === JenisNodeAST.PENGIDENTIFIKASI) {
            const targetModul = (c.target as NodePengidentifikasi).nama;
            const catatanModul = this.tabelModul.get(targetModul);
            if (!catatanModul) {
              throw new GalatTipe(
                JenisGalatTipe.MODUL_TIDAK_DITEMUKAN,
                `Modul '${targetModul}' belum diimpor atau tidak ditemukan.`,
                c.target.posisi.awal
              );
            }

            const simbol = catatanModul.simbolEkspor.get(c.namaFungsi);
            if (!simbol) {
              if (catatanModul.simbolInternal.has(c.namaFungsi)) {
                throw new GalatTipe(
                  JenisGalatTipe.ANGGOTA_INTERNAL_TERLINDUNGI,
                  `Fungsi '${c.namaFungsi}' bersifat internal pada modul '${targetModul}' dan tidak diekspor.`,
                  c.posisi.awal
                );
              }
              throw new GalatTipe(
                JenisGalatTipe.ANGGOTA_MODUL_TIDAK_DITEMUKAN,
                `Fungsi atau anggota '${c.namaFungsi}' tidak ditemukan pada modul '${targetModul}'.`,
                c.posisi.awal
              );
            }

            const params = simbol.parameter || [];
            if (c.argumen.length !== params.length) {
              throw new GalatTipe(
                JenisGalatTipe.ARGUMEN_TIDAK_SESUAI,
                `Fungsi '${targetModul}.${c.namaFungsi}' membutuhkan ${params.length} argumen, tetapi menerima ${c.argumen.length}.`,
                c.posisi.awal
              );
            }

            for (let i = 0; i < c.argumen.length; i++) {
              const tipeArg = this.periksaEkspresi(c.argumen[i]);
              const param = params[i];
              if (!apakahKompatibel(param.tipe, tipeArg)) {
                const urutan = ['pertama', 'kedua', 'ketiga', 'keempat', 'kelima'][i] || `ke-${i + 1}`;
                throw new GalatTipe(
                  JenisGalatTipe.KETIDAKCOCOKAN_TIPE,
                  `argumen ${urutan} pada '${targetModul}.${c.namaFungsi}' harus bertipe ${param.tipe}`,
                  c.argumen[i].posisi.awal,
                  param.tipe,
                  tipeArg
                );
              }
            }

            return (simbol.tipeKembalian as NamaTipe) || NamaTipe.KOSONG;
          }
        }

        const infoFn = this.tabelFungsi.get(c.namaFungsi);

        if (!infoFn) {
          throw new GalatTipe(
            JenisGalatTipe.FUNGSI_TIDAK_DITEMUKAN,
            `Fungsi '${c.namaFungsi}' tidak ditemukan atau belum dideklarasikan.`,
            c.posisi.awal
          );
        }

        // Khusus fungsi bawaan tampilkan(...) yang variadik
        if (c.namaFungsi === 'tampilkan') {
          for (const arg of c.argumen) {
            this.periksaEkspresi(arg);
          }
          return NamaTipe.KOSONG;
        }

        // Khusus fungsi bawaan panjang(...)
        if (c.namaFungsi === 'panjang') {
          if (c.argumen.length !== 1) {
            throw new GalatTipe(
              JenisGalatTipe.ARGUMEN_TIDAK_SESUAI,
              `Fungsi 'panjang' membutuhkan 1 argumen, tetapi menerima ${c.argumen.length}.`,
              c.posisi.awal
            );
          }
          const tipeArg = this.periksaEkspresi(c.argumen[0]);
          if (
            tipeArg !== NamaTipe.DAFTAR &&
            tipeArg !== NamaTipe.PETA &&
            tipeArg !== NamaTipe.TEKS &&
            tipeArg !== NamaTipe.APAPUN
          ) {
            throw new GalatTipe(
              JenisGalatTipe.KETIDAKCOCOKAN_TIPE,
              `Fungsi 'panjang' hanya menerima daftar, peta, atau teks, tetapi menerima '${tipeArg}'.`,
              c.argumen[0].posisi.awal,
              NamaTipe.DAFTAR,
              tipeArg
            );
          }
          return NamaTipe.BILANGAN;
        }

        if (c.argumen.length !== infoFn.parameter.length) {
          throw new GalatTipe(
            JenisGalatTipe.ARGUMEN_TIDAK_SESUAI,
            `Fungsi '${c.namaFungsi}' membutuhkan ${infoFn.parameter.length} argumen, tetapi menerima ${c.argumen.length}.`,
            c.posisi.awal
          );
        }

        for (let i = 0; i < c.argumen.length; i++) {
          const tipeArg = this.periksaEkspresi(c.argumen[i]);
          const param = infoFn.parameter[i];
          if (!apakahKompatibel(param.tipe, tipeArg)) {
            throw buatGalatKetidakcocokanTipe(
              `Parameter '${param.nama}' pada pemanggilan '${c.namaFungsi}'`,
              param.tipe,
              tipeArg,
              c.argumen[i].posisi.awal
            );
          }
        }

        return infoFn.tipeKembalian;
      }

      case JenisNodeAST.AKSES_ANGGOTA: {
        const a = expr as NodeAksesAnggota;
        if (a.target.jenis === JenisNodeAST.PENGIDENTIFIKASI) {
          const targetModul = (a.target as NodePengidentifikasi).nama;
          const catatanModul = this.tabelModul.get(targetModul);
          if (catatanModul) {
            const simbol = catatanModul.simbolEkspor.get(a.anggota);
            if (!simbol) {
              if (catatanModul.simbolInternal.has(a.anggota)) {
                throw new GalatTipe(
                  JenisGalatTipe.ANGGOTA_INTERNAL_TERLINDUNGI,
                  `Anggota '${a.anggota}' bersifat internal pada modul '${targetModul}' dan tidak dapat diakses dari luar.`,
                  a.posisi.awal
                );
              }
              throw new GalatTipe(
                JenisGalatTipe.ANGGOTA_MODUL_TIDAK_DITEMUKAN,
                `Anggota '${a.anggota}' tidak ditemukan pada modul '${targetModul}'.`,
                a.posisi.awal
              );
            }
            return (simbol.tipeData as NamaTipe) || NamaTipe.APAPUN;
          }
        }
        return NamaTipe.APAPUN;
      }

      case JenisNodeAST.LITERAL_DAFTAR: {
        const d = expr as NodeLiteralDaftar;
        for (const el of d.elemen) {
          this.periksaEkspresi(el);
        }
        return NamaTipe.DAFTAR;
      }

      case JenisNodeAST.LITERAL_PETA: {
        const p = expr as NodeLiteralPeta;
        for (const pas of p.pasangan) {
          this.periksaEkspresi(pas.nilai);
        }
        return NamaTipe.PETA;
      }

      case JenisNodeAST.AKSES_INDEKS: {
        const a = expr as NodeAksesIndeks;
        const tipeKoleksi = this.periksaEkspresi(a.koleksi);
        const tipeIndeks = this.periksaEkspresi(a.indeks);

        if (tipeKoleksi === NamaTipe.DAFTAR) {
          if (tipeIndeks !== NamaTipe.BILANGAN && tipeIndeks !== NamaTipe.APAPUN) {
            throw new GalatTipe(
              JenisGalatTipe.INDEKS_TIDAK_SESUAI,
              `Indeks daftar harus bertipe bilangan bulat, tetapi ditemukan '${tipeIndeks}'.`,
              a.indeks.posisi.awal,
              NamaTipe.BILANGAN,
              tipeIndeks
            );
          }
          return NamaTipe.APAPUN;
        }

        if (tipeKoleksi === NamaTipe.PETA) {
          if (tipeIndeks !== NamaTipe.TEKS && tipeIndeks !== NamaTipe.APAPUN) {
            throw new GalatTipe(
              JenisGalatTipe.INDEKS_TIDAK_SESUAI,
              `Kunci peta harus bertipe teks, tetapi ditemukan '${tipeIndeks}'.`,
              a.indeks.posisi.awal,
              NamaTipe.TEKS,
              tipeIndeks
            );
          }
          return NamaTipe.APAPUN;
        }

        if (tipeKoleksi !== NamaTipe.APAPUN) {
          throw new GalatTipe(
            JenisGalatTipe.TIPE_BUKAN_KOLEKSI,
            `Operasi pengindeksan tidak didukung pada tipe '${tipeKoleksi}'.`,
            a.koleksi.posisi.awal
          );
        }

        return NamaTipe.APAPUN;
      }
    }

    return NamaTipe.APAPUN;
  }
}
