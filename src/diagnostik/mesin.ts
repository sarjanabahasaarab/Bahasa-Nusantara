/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Diagnostik,
  TingkatDiagnostik,
  KategoriDiagnostik,
  LokasiSumberKaya,
  BingkaiJejak,
  KonteksEksekusi,
  GalatNusantara,
} from './jenis';
import { KodeGalat, METADATA_KODE_GALAT } from './kode';
import { buatCuplikanSumber } from './cuplikan';
import { cariSaranTerdekat, buatPesanSaran } from './saran';
import { formatDiagnostik, formatDiagnostikKeJSON, OpsiRenderer } from './renderer';
import { PosisiSumber } from '../lexer/posisi';
import { GalatLexer, JenisGalatLexer } from '../lexer/galat';
import { GalatParser, JenisGalatParser } from '../parser/galat';
import { GalatTipe, JenisGalatTipe } from '../tipe/galatTipe';
import { GalatRuntime, JenisGalatRuntime, BingkaiTumpukan } from '../interpreter/galat';
import { GalatModul, JenisGalatModul } from '../modul/galatModul';
import { GalatKeamananPaket } from '../paket/keamanan';
import { GalatManifest } from '../paket/manifest';
import { GalatBerkasKunci } from '../paket/lockfile';
import { GalatKetergantunganMelingkar, GalatKonflikVersi } from '../paket/graph';

/**
 * Opsi ekstraksi diagnostik dari galat eksekusi.
 */
export interface OpsiEkstraksiDiagnostik {
  kodeSumber?: string;
  namaBerkas?: string;
  kandidatSimbol?: string[];
  konteks?: KonteksEksekusi;
  modeDebug?: boolean;
}

/**
 * Hasil eksekusi terstruktur yang memuat hasil nilai dan diagnostik komprehensif.
 */
export interface HasilDiagnostik<T = any> {
  sukses: boolean;
  nilai?: T;
  diagnostik: Diagnostik[];
  galatUtama?: Diagnostik;
  pesanFormat?: string;
  pesanJSON?: string;
}

/**
 * Deteksi informasi paket dari jalur modul atau berkas.
 */
export function deteksiKonteksPaket(jalur?: string): { namaPaket?: string; versiPaket?: string } | undefined {
  if (!jalur) return undefined;
  const polaPaket = /(?:\.nusantara\/paket|katalog_paket|paket)\/([^/]+)/;
  const match = jalur.match(polaPaket);
  if (match) {
    return { namaPaket: match[1] };
  }
  return undefined;
}

/**
 * Mesin Diagnostik & Error Engine Terpadu Bahasa NUSANTARA (Phase 18).
 * Menjembatani seluruh fase kompilator & runtime ke dalam sistem error modern berstandar industri.
 */
export class MesinDiagnostik {
  private readonly daftarSimbolUmum: string[] = [
    'tampilkan',
    'masukan',
    'panjang',
    'program',
    'mulai',
    'selesai',
    'fungsi',
    'variabel',
    'tetap',
    'jika',
    'maka',
    'lainnya',
    'selama',
    'untuk',
    'dalam',
    'kembalikan',
    'hentikan',
    'lanjutkan',
    'gunakan',
    'sebagai',
    'ekspor',
    'impor',
    'dari',
    'bilangan',
    'desimal',
    'teks',
    'karakter',
    'logika',
    'daftar',
    'peta',
    'kosong',
    'benar',
    'salah',
    'dan',
    'atau',
    'bukan',
  ];

  /**
   * Mengubah error apa pun (internal, parser, lexer, runtime, tipe, modul, paket)
   * menjadi representasi Diagnostik resmi Bahasa NUSANTARA.
   */
  public ubahKeDiagnostik(galat: unknown, opsi: OpsiEkstraksiDiagnostik = {}): Diagnostik {
    if (galat instanceof GalatNusantara) {
      return this.sempurnakanDiagnostik(galat.diagnostik, opsi);
    }

    if (galat instanceof GalatLexer) {
      return this.dariGalatLexer(galat, opsi);
    }

    if (galat instanceof GalatParser) {
      return this.dariGalatParser(galat, opsi);
    }

    if (galat instanceof GalatTipe) {
      return this.dariGalatTipe(galat, opsi);
    }

    if (galat instanceof GalatRuntime) {
      return this.dariGalatRuntime(galat, opsi);
    }

    if (galat instanceof GalatModul) {
      return this.dariGalatModul(galat, opsi);
    }

    // Galat Paket (Phase 16)
    if (
      galat instanceof GalatKeamananPaket ||
      galat instanceof GalatManifest ||
      galat instanceof GalatBerkasKunci ||
      galat instanceof GalatKetergantunganMelingkar ||
      galat instanceof GalatKonflikVersi
    ) {
      return this.dariGalatPaket(galat, opsi);
    }

    // Fallback galat umum atau internal
    return this.dariGalatUmum(galat, opsi);
  }

  /**
   * Menghasilkan teks laporan kesalahan Bahasa Indonesia dengan pemformatan elegan.
   */
  public formatGalat(
    galat: unknown,
    opsiFormat: OpsiRenderer & OpsiEkstraksiDiagnostik = {}
  ): string {
    const diag = this.ubahKeDiagnostik(galat, opsiFormat);
    return formatDiagnostik(diag, opsiFormat);
  }

  /**
   * Menghasilkan representasi JSON dari kesalahan untuk integrasi IDE atau otomasi.
   */
  public formatGalatKeJSON(
    galat: unknown,
    opsi: OpsiEkstraksiDiagnostik = {}
  ): string {
    const diag = this.ubahKeDiagnostik(galat, opsi);
    return formatDiagnostikKeJSON(diag);
  }

  // ===========================================================================
  // HANDLER SPESIFIK TAHAPAN KOMPILATOR & RUNTIME
  // ===========================================================================

  private dariGalatLexer(galat: GalatLexer, opsi: OpsiEkstraksiDiagnostik): Diagnostik {
    let kode = KodeGalat.LEX_KARAKTER_TAK_DIKENAL;
    switch (galat.jenis) {
      case JenisGalatLexer.TEKS_TIDAK_DITUTUP:
        kode = KodeGalat.LEX_TEKS_TIDAK_DITUTUP;
        break;
      case JenisGalatLexer.KARAKTER_TIDAK_DITUTUP:
        kode = KodeGalat.LEX_KARAKTER_TIDAK_DITUTUP;
        break;
      case JenisGalatLexer.ANGKA_TIDAK_VALID:
        kode = KodeGalat.LEX_ANGKA_TIDAK_VALID;
        break;
      case JenisGalatLexer.URUTAN_LOLOS_TIDAK_VALID:
        kode = KodeGalat.LEX_URUTAN_LOLOS_TIDAK_VALID;
        break;
      default:
        kode = KodeGalat.LEX_KARAKTER_TAK_DIKENAL;
        break;
    }

    const lokasi: LokasiSumberKaya = {
      berkas: opsi.namaBerkas,
      baris: galat.posisi.baris,
      kolom: galat.posisi.kolom,
      panjang: 1,
      posisiAwal: galat.posisi,
    };

    const potongan = opsi.kodeSumber
      ? buatCuplikanSumber(opsi.kodeSumber, lokasi.baris, lokasi.kolom, 1)
      : undefined;

    return {
      tingkat: TingkatDiagnostik.KESALAHAN,
      kategori: KategoriDiagnostik.LEXER,
      kode,
      pesan: galat.message.replace(/^\[Galat Leksikal\]\s*/, ''),
      lokasi,
      potonganKode: potongan,
      saran: METADATA_KODE_GALAT[kode]?.saranStandar,
      konteks: opsi.konteks,
      waktu: new Date(),
    };
  }

  private dariGalatParser(galat: GalatParser, opsi: OpsiEkstraksiDiagnostik): Diagnostik {
    let kode = KodeGalat.PAR_TOKEN_TAK_TERDUGA;
    switch (galat.jenis) {
      case JenisGalatParser.EKSPRESI_TIDAK_LENGKAP:
        kode = KodeGalat.PAR_EKSPRESI_TIDAK_LENGKAP;
        break;
      case JenisGalatParser.PERNYATAAN_TIDAK_VALID:
        kode = KodeGalat.PAR_PERNYATAAN_TIDAK_VALID;
        break;
      case JenisGalatParser.BLOK_TIDAK_DITUTUP:
        kode = KodeGalat.PAR_BLOK_TIDAK_DITUTUP;
        break;
      case JenisGalatParser.STRUKTUR_PROGRAM_TIDAK_VALID:
        kode = KodeGalat.PAR_STRUKTUR_TIDAK_VALID;
        break;
      default:
        kode = KodeGalat.PAR_TOKEN_TAK_TERDUGA;
        break;
    }

    const token = galat.tokenDitemukan;
    const tokenVal = token ? String(token.nilai ?? '') : '';
    const panjang = Math.max(1, tokenVal.length);

    const lokasi: LokasiSumberKaya = {
      berkas: opsi.namaBerkas,
      baris: galat.baris,
      kolom: galat.kolom,
      panjang,
      posisiAwal: token?.posisi?.awal,
      posisiAkhir: token?.posisi?.akhir,
    };

    const potongan = opsi.kodeSumber
      ? buatCuplikanSumber(opsi.kodeSumber, lokasi.baris, lokasi.kolom, panjang)
      : undefined;

    // Saran typo kata kunci jika token adalah identifier tak terduga
    let saran = METADATA_KODE_GALAT[kode]?.saranStandar;
    if (token && token.jenis === 'IDENTIFIER') {
      const kataKunci = [
        'program', 'mulai', 'selesai', 'fungsi', 'variabel', 'tetap',
        'jika', 'maka', 'lainnya', 'selama', 'untuk', 'dalam',
        'kembalikan', 'hentikan', 'lanjutkan', 'gunakan', 'sebagai',
        'ekspor', 'impor', 'dari', 'tampilkan', 'masukan'
      ];
      const rekomendasi = cariSaranTerdekat(token.nilai, kataKunci);
      if (rekomendasi) {
        saran = `Mungkin kata kunci yang Anda maksud adalah '${rekomendasi}'?`;
      }
    }

    let pesanBersih = galat.message.replace(/^Kesalahan sintaks pada .*?: /, '');

    return {
      tingkat: TingkatDiagnostik.KESALAHAN,
      kategori: KategoriDiagnostik.PARSER,
      kode,
      pesan: pesanBersih,
      lokasi,
      potonganKode: potongan,
      saran,
      konteks: opsi.konteks,
      waktu: new Date(),
    };
  }

  private dariGalatTipe(galat: GalatTipe, opsi: OpsiEkstraksiDiagnostik): Diagnostik {
    let kode = KodeGalat.TYP_KETIDAKCOCOKAN_TIPE;
    let kategori = KategoriDiagnostik.TIPE;

    switch (galat.jenis) {
      case JenisGalatTipe.TIPE_TIDAK_DIKENAL:
        kode = KodeGalat.TYP_TIPE_TIDAK_DIKENAL;
        break;
      case JenisGalatTipe.OPERATOR_TIDAK_DIDUKUNG:
        kode = KodeGalat.TYP_OPERATOR_TIDAK_DIDUKUNG;
        break;
      case JenisGalatTipe.DEKLARASI_GANDA:
        kode = KodeGalat.TYP_DEKLARASI_GANDA;
        break;
      case JenisGalatTipe.MODIFIKASI_TETAP:
        kode = KodeGalat.TYP_MODIFIKASI_TETAP;
        break;
      case JenisGalatTipe.ARGUMEN_TIDAK_SESUAI:
        kode = KodeGalat.TYP_ARGUMEN_TIDAK_SESUAI;
        break;
      case JenisGalatTipe.KEMBALIAN_TIDAK_SESUAI:
        kode = KodeGalat.TYP_KEMBALIAN_TIDAK_SESUAI;
        break;
      case JenisGalatTipe.VARIABEL_BELUM_DIDEKLARASIKAN:
        kode = KodeGalat.NAM_VARIABEL_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.NAMA;
        break;
      case JenisGalatTipe.FUNGSI_TIDAK_DITEMUKAN:
        kode = KodeGalat.NAM_FUNGSI_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.NAMA;
        break;
      case JenisGalatTipe.MODUL_TIDAK_DITEMUKAN:
        kode = KodeGalat.MOD_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.MODUL;
        break;
      case JenisGalatTipe.ANGGOTA_MODUL_TIDAK_DITEMUKAN:
        kode = KodeGalat.MOD_ANGGOTA_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.MODUL;
        break;
      case JenisGalatTipe.ANGGOTA_INTERNAL_TERLINDUNGI:
        kode = KodeGalat.MOD_ANGGOTA_TERLINDUNGI;
        kategori = KategoriDiagnostik.MODUL;
        break;
      case JenisGalatTipe.TIPE_BUKAN_KOLEKSI:
        kode = KodeGalat.IDX_BUKAN_KOLEKSI;
        kategori = KategoriDiagnostik.INDEKS;
        break;
      default:
        kode = KodeGalat.TYP_KETIDAKCOCOKAN_TIPE;
        break;
    }

    const lokasi: LokasiSumberKaya | undefined = galat.posisi
      ? {
          berkas: opsi.namaBerkas,
          baris: galat.posisi.baris,
          kolom: galat.posisi.kolom,
          panjang: 1,
          posisiAwal: galat.posisi,
        }
      : undefined;

    const potongan = (lokasi && opsi.kodeSumber)
      ? buatCuplikanSumber(opsi.kodeSumber, lokasi.baris, lokasi.kolom, 1)
      : undefined;

    let pesanBersih = galat.message.replace(/^Kesalahan tipe(?: pada .*?)?: /, '');

    // Cek saran jika variabel atau fungsi tidak ditemukan
    let saran = METADATA_KODE_GALAT[kode]?.saranStandar;
    if (kategori === KategoriDiagnostik.NAMA && opsi.kandidatSimbol) {
      const match = pesanBersih.match(/['"]([^'"]+)['"]/);
      if (match) {
        const namaDicari = match[1];
        const pesanSaran = buatPesanSaran(namaDicari, opsi.kandidatSimbol);
        if (pesanSaran) {
          saran = pesanSaran;
        }
      }
    }

    return {
      tingkat: TingkatDiagnostik.KESALAHAN,
      kategori,
      kode,
      pesan: pesanBersih,
      lokasi,
      potonganKode: potongan,
      saran,
      konteks: opsi.konteks,
      waktu: new Date(),
    };
  }

  private dariGalatRuntime(galat: GalatRuntime, opsi: OpsiEkstraksiDiagnostik): Diagnostik {
    let kode = KodeGalat.RUN_OPERASI_TIDAK_VALID;
    let kategori = KategoriDiagnostik.RUNTIME;

    switch (galat.jenis) {
      case JenisGalatRuntime.PEMBAGIAN_NOL:
        kode = KodeGalat.RUN_PEMBAGIAN_NOL;
        break;
      case JenisGalatRuntime.BATAS_ITERASI_TERLAMPAUI:
        kode = KodeGalat.RUN_BATAS_ITERASI_TERLAMPAUI;
        break;
      case JenisGalatRuntime.KENDALI_DI_LUAR_KONTEKS:
        kode = KodeGalat.RUN_KENDALI_DI_LUAR_KONTEKS;
        break;
      case JenisGalatRuntime.KONSTANTA_DIUBAH:
        kode = KodeGalat.RUN_KONSTANTA_DIUBAH;
        break;
      case JenisGalatRuntime.BATAS_INDEKS_TERLAMPAUI:
        kode = KodeGalat.IDX_BATAS_TERLAMPAUI;
        kategori = KategoriDiagnostik.INDEKS;
        break;
      case JenisGalatRuntime.KUNCI_TIDAK_DITEMUKAN:
        kode = KodeGalat.IDX_KUNCI_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.INDEKS;
        break;
      case JenisGalatRuntime.TIPE_BUKAN_KOLEKSI:
        kode = KodeGalat.IDX_BUKAN_KOLEKSI;
        kategori = KategoriDiagnostik.INDEKS;
        break;
      case JenisGalatRuntime.VARIABEL_TIDAK_DITEMUKAN:
        kode = KodeGalat.NAM_VARIABEL_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.NAMA;
        break;
      case JenisGalatRuntime.FUNGSI_TIDAK_DITEMUKAN:
        kode = KodeGalat.NAM_FUNGSI_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.NAMA;
        break;
      case JenisGalatRuntime.MODUL_TIDAK_DITEMUKAN:
        kode = KodeGalat.MOD_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.MODUL;
        break;
      case JenisGalatRuntime.KETERGANTUNGAN_MELINGKAR:
        kode = KodeGalat.MOD_KETERGANTUNGAN_MELINGKAR;
        kategori = KategoriDiagnostik.MODUL;
        break;
      case JenisGalatRuntime.ANGGOTA_MODUL_TIDAK_DITEMUKAN:
        kode = KodeGalat.MOD_ANGGOTA_TIDAK_DITEMUKAN;
        kategori = KategoriDiagnostik.MODUL;
        break;
      case JenisGalatRuntime.JALUR_MODUL_TIDAK_AMAN:
        kode = KodeGalat.MOD_JALUR_TIDAK_AMAN;
        kategori = KategoriDiagnostik.MODUL;
        break;
      default:
        kode = KodeGalat.RUN_OPERASI_TIDAK_VALID;
        break;
    }

    // Ekstraksi Jejak Tumpukan (Stack Trace)
    const jejakTumpukan: BingkaiJejak[] = galat.jejakTumpukan.map((b: BingkaiTumpukan) => {
      const paketInfo = deteksiKonteksPaket(b.namaModul || (b as any).berkas);
      return {
        namaFungsi: b.namaKonteks.replace(/^fungsi\s+/, ''),
        namaModul: b.namaModul,
        namaPaket: paketInfo?.namaPaket || (b as any).namaPaket,
        versiPaket: (b as any).versiPaket,
        berkas: (b as any).berkas || opsi.namaBerkas,
        lokasi: b.posisi
          ? {
              berkas: (b as any).berkas || opsi.namaBerkas,
              baris: b.posisi.baris,
              kolom: b.posisi.kolom,
              posisiAwal: b.posisi,
            }
          : undefined,
      };
    });

    const lokasi: LokasiSumberKaya | undefined = galat.posisi
      ? {
          berkas: opsi.namaBerkas,
          baris: galat.posisi.baris,
          kolom: galat.posisi.kolom,
          panjang: 1,
          posisiAwal: galat.posisi,
        }
      : undefined;

    const potongan = (lokasi && opsi.kodeSumber)
      ? buatCuplikanSumber(opsi.kodeSumber, lokasi.baris, lokasi.kolom, 1)
      : undefined;

    // Bersihkan pesan error dari template teks lama
    let pesan = galat.message;
    pesan = pesan.replace(/^Kesalahan runtime:\s*/, '');
    pesan = pesan.replace(/^(?:Modul: .*?\n)?(?:Baris: \d+\nKolom: \d+\n\n)?/, '');
    pesan = pesan.replace(/^pada baris \d+, kolom \d+: /, '');

    const paketInfo = deteksiKonteksPaket(galat.namaModul);
    const konteks: KonteksEksekusi = {
      ...opsi.konteks,
      namaModul: galat.namaModul || opsi.konteks?.namaModul,
      namaPaket: paketInfo?.namaPaket || opsi.konteks?.namaPaket,
      berkas: opsi.namaBerkas,
    };
    let saran = METADATA_KODE_GALAT[kode]?.saranStandar;
    if (kategori === KategoriDiagnostik.NAMA && opsi.kandidatSimbol) {
      const match = pesan.match(/['"]([^'"]+)['"]/);
      if (match) {
        const namaDicari = match[1];
        const pesanSaran = buatPesanSaran(namaDicari, opsi.kandidatSimbol);
        if (pesanSaran) {
          saran = pesanSaran;
        }
      }
    }

    return {
      tingkat: TingkatDiagnostik.KESALAHAN,
      kategori,
      kode,
      pesan: pesan.trim(),
      lokasi,
      potonganKode: potongan,
      saran,
      konteks,
      jejakTumpukan,
      waktu: new Date(),
    };
  }

  private dariGalatModul(galat: GalatModul, opsi: OpsiEkstraksiDiagnostik): Diagnostik {
    let kode = KodeGalat.MOD_TIDAK_DITEMUKAN;
    switch (galat.jenis) {
      case JenisGalatModul.KETERGANTUNGAN_MELINGKAR:
        kode = KodeGalat.MOD_KETERGANTUNGAN_MELINGKAR;
        break;
      case JenisGalatModul.NAMA_MODUL_TIDAK_VALID:
      case JenisGalatModul.JALUR_TIDAK_AMAN:
        kode = KodeGalat.MOD_JALUR_TIDAK_AMAN;
        break;
      case JenisGalatModul.ANGGOTA_TIDAK_DITEMUKAN:
        kode = KodeGalat.MOD_ANGGOTA_TIDAK_DITEMUKAN;
        break;
      case JenisGalatModul.ANGGOTA_INTERNAL_TERLINDUNGI:
        kode = KodeGalat.MOD_ANGGOTA_TERLINDUNGI;
        break;
      case JenisGalatModul.MODUL_RUSAK:
        kode = KodeGalat.MOD_BERKAS_RUSAK;
        break;
      default:
        kode = KodeGalat.MOD_TIDAK_DITEMUKAN;
        break;
    }

    const lokasi: LokasiSumberKaya | undefined = galat.posisi
      ? {
          berkas: opsi.namaBerkas,
          baris: galat.posisi.baris,
          kolom: galat.posisi.kolom,
          posisiAwal: galat.posisi,
        }
      : undefined;

    let pesan = galat.message.replace(/^Kesalahan modul(?: pada .*?)?:\n/, '');

    return {
      tingkat: TingkatDiagnostik.KESALAHAN,
      kategori: KategoriDiagnostik.MODUL,
      kode,
      pesan: pesan.trim(),
      lokasi,
      saran: METADATA_KODE_GALAT[kode]?.saranStandar,
      konteks: {
        ...opsi.konteks,
        namaModul: galat.namaModul,
      },
      metadata: galat.jalurDependensi ? { jalurDependensi: galat.jalurDependensi } : undefined,
      waktu: new Date(),
    };
  }

  private dariGalatPaket(galat: any, opsi: OpsiEkstraksiDiagnostik): Diagnostik {
    let kode = KodeGalat.PKG_TIDAK_DITEMUKAN;
    if (galat instanceof GalatKeamananPaket) {
      kode = KodeGalat.PKG_NAMA_TIDAK_VALID;
    } else if (galat instanceof GalatManifest) {
      kode = KodeGalat.PKG_MANIFEST_RUSAK;
    } else if (galat instanceof GalatBerkasKunci) {
      kode = galat.message.includes('integritas')
        ? KodeGalat.PKG_INTEGRITAS_GAGAL
        : KodeGalat.PKG_BERKAS_KUNCI_RUSAK;
    } else if (galat instanceof GalatKetergantunganMelingkar) {
      kode = KodeGalat.PKG_KETERGANTUNGAN_MELINGKAR;
    } else if (galat instanceof GalatKonflikVersi) {
      kode = KodeGalat.PKG_KONFLIK_VERSI;
    }

    return {
      tingkat: TingkatDiagnostik.KESALAHAN,
      kategori: KategoriDiagnostik.PAKET,
      kode,
      pesan: galat.message || String(galat),
      saran: METADATA_KODE_GALAT[kode]?.saranStandar,
      konteks: opsi.konteks,
      waktu: new Date(),
    };
  }

  private dariGalatUmum(galat: unknown, opsi: OpsiEkstraksiDiagnostik): Diagnostik {
    const pesan = galat instanceof Error ? galat.message : String(galat);

    // Deteksi cerdas kategori berbasis isi pesan
    let kode = KodeGalat.INT_KESALAHAN_SISTEM;
    let kategori = KategoriDiagnostik.INTERNAL;

    if (pesan.includes('pembagian dengan nol') || pesan.includes('dibagi dengan 0')) {
      kode = KodeGalat.RUN_PEMBAGIAN_NOL;
      kategori = KategoriDiagnostik.RUNTIME;
    } else if (pesan.includes('indeks') || pesan.includes('luar batas')) {
      kode = KodeGalat.IDX_BATAS_TERLAMPAUI;
      kategori = KategoriDiagnostik.INDEKS;
    } else if (pesan.includes('berkas') && (pesan.includes('tidak ditemukan') || pesan.includes('tidak ada'))) {
      kode = KodeGalat.FILE_TIDAK_DITEMUKAN;
      kategori = KategoriDiagnostik.BERKAS;
    } else if (pesan.includes('sandbox') || pesan.includes('traversal')) {
      kode = KodeGalat.FILE_PELANGGARAN_SANDBOX;
      kategori = KategoriDiagnostik.BERKAS;
    } else if (pesan.includes('konversi')) {
      kode = KodeGalat.CON_GAGAL_BILANGAN;
      kategori = KategoriDiagnostik.KONVERSI;
    }

    return {
      tingkat: TingkatDiagnostik.FATAL,
      kategori,
      kode,
      pesan,
      saran: METADATA_KODE_GALAT[kode]?.saranStandar,
      konteks: opsi.konteks,
      metadata: opsi.modeDebug && galat instanceof Error && galat.stack ? { hostStack: galat.stack } : undefined,
      waktu: new Date(),
    };
  }

  private sempurnakanDiagnostik(diag: Diagnostik, opsi: OpsiEkstraksiDiagnostik): Diagnostik {
    // Lengkapi snippet jika kode sumber disediakan
    let potongan = diag.potonganKode;
    if (!potongan && diag.lokasi && opsi.kodeSumber) {
      potongan = buatCuplikanSumber(
        opsi.kodeSumber,
        diag.lokasi.baris,
        diag.lokasi.kolom,
        diag.lokasi.panjang || 1
      );
    }

    // Lengkapi nama berkas jika belum terisi
    let lokasi = diag.lokasi;
    if (lokasi && !lokasi.berkas && opsi.namaBerkas) {
      lokasi = { ...lokasi, berkas: opsi.namaBerkas };
    }

    return {
      ...diag,
      lokasi,
      potonganKode: potongan,
      konteks: diag.konteks || opsi.konteks,
    };
  }
}

/**
 * Singleton instans mesin diagnostik default untuk kemudahan akses global.
 */
export const mesinDiagnostikDefault = new MesinDiagnostik();
