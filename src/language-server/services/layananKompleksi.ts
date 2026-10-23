/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TABEL_KATA_KUNCI } from '../../lexer/keyword';
import { KATALOG_MODUL_STANDAR } from '../../stdlib';
import {
  NodeProgram,
  NodeDeklarasiFungsi,
  NodeDeklarasiVariabel,
  NodeDeklarasiTetap,
  PernyataanAST,
  JenisNodeAST,
} from '../../parser/ast';
import { DokumenTeks } from '../documents/manajerDokumen';
import {
  ItemKompleksiLSP,
  JenisKompleksiLSP,
  PosisiLSP,
  FormatTeksSisipanLSP,
  DaftarKompleksiLSP,
} from '../protocol/types';

/**
 * Daftar Tipe Data Resmi untuk Autocomplete.
 */
const DAFTAR_TIPE_AUTOCOMPLETE = [
  { nama: 'teks', detail: 'Tipe data teks / untaian karakter (string)' },
  { nama: 'bilangan', detail: 'Tipe data integer 64-bit bulat' },
  { nama: 'desimal', detail: 'Tipe data numerik berkoma (float 64-bit)' },
  { nama: 'logika', detail: 'Tipe data boolean (benar | salah)' },
  { nama: 'karakter', detail: 'Tipe data karakter tunggal' },
  { nama: 'daftar', detail: 'Struktur data list berindeks dinamis' },
  { nama: 'peta', detail: 'Struktur data asosiatif pasangan kunci-nilai' },
  { nama: 'kosong', detail: 'Tipe data khusus tanpa nilai / null' },
];

/**
 * Fungsi Bawaan Bahasa Resmi NUSANTARA.
 */
const DAFTAR_FUNGSI_BAWAAN = [
  {
    nama: 'tampilkan',
    snippet: 'tampilkan(${1:nilai})',
    detail: 'fungsi bawaan: mencetak nilai ke konsol standar',
  },
  {
    nama: 'masukan',
    snippet: 'masukan(${1:"Prompt: "})',
    detail: 'fungsi bawaan: membaca input teks dari pengguna',
  },
  {
    nama: 'panjang',
    snippet: 'panjang(${1:koleksi})',
    detail: 'fungsi bawaan: menghitung jumlah elemen daftar, peta, atau panjang teks',
  },
];

/**
 * Layanan Autocomplete & Completion Bahasa NUSANTARA.
 */
export class LayananKompleksi {
  /**
   * Menghasilkan daftar rekomendasi completion berdasarkan posisi kursor.
   */
  public dapatkanKompleksi(
    dokumen: DokumenTeks,
    posisi: PosisiLSP,
    program?: NodeProgram
  ): DaftarKompleksiLSP {
    const barisTeks = this.ambilBarisTeks(dokumen.konten, posisi.line);
    const teksSebelumKursor = barisTeks.substring(0, posisi.character);

    // 1. Cek apakah pengguna mengetik akses anggota titik: <modul>.
    const cocokanAksesTitik = teksSebelumKursor.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.\s*([a-zA-Z0-9_]*)$/);
    if (cocokanAksesTitik) {
      const namaTarget = cocokanAksesTitik[1];
      const awalanAnggota = cocokanAksesTitik[2] || '';
      return {
        isIncomplete: false,
        items: this.dapatkanKompleksiAnggotaModul(namaTarget, awalanAnggota, program),
      };
    }

    // 2. Cek apakah pengguna sedang mengetik impor modul: gunakan "..."
    if (/gunakan\s+["']?([a-zA-Z0-9_]*)$/.test(teksSebelumKursor)) {
      return {
        isIncomplete: false,
        items: this.dapatkanKompleksiModulStandar(),
      };
    }

    // Ekstrak kata yang sedang diketik sebelum kursor
    const cocokanKata = teksSebelumKursor.match(/([a-zA-Z0-9_]+)$/);
    const kataAwalan = cocokanKata ? cocokanKata[1] : '';

    const hasil: ItemKompleksiLSP[] = [];

    // 3. Tambahkan Kata Kunci Resmi
    for (const [kata] of Object.entries(TABEL_KATA_KUNCI)) {
      if (!kataAwalan || kata.toLowerCase().startsWith(kataAwalan.toLowerCase())) {
        hasil.push({
          label: kata,
          kind: JenisKompleksiLSP.Keyword,
          detail: `kata kunci resmi: ${kata}`,
          sortText: `3_${kata}`,
        });
      }
    }

    // 4. Tambahkan Tipe Data Resmi
    for (const tipe of DAFTAR_TIPE_AUTOCOMPLETE) {
      if (!kataAwalan || tipe.nama.toLowerCase().startsWith(kataAwalan.toLowerCase())) {
        hasil.push({
          label: tipe.nama,
          kind: JenisKompleksiLSP.Class,
          detail: tipe.detail,
          sortText: `4_${tipe.nama}`,
        });
      }
    }

    // 5. Tambahkan Fungsi Bawaan
    for (const fn of DAFTAR_FUNGSI_BAWAAN) {
      if (!kataAwalan || fn.nama.toLowerCase().startsWith(kataAwalan.toLowerCase())) {
        hasil.push({
          label: fn.nama,
          kind: JenisKompleksiLSP.Function,
          detail: fn.detail,
          insertText: fn.snippet,
          insertTextFormat: FormatTeksSisipanLSP.Snippet,
          sortText: `2_${fn.nama}`,
        });
      }
    }

    // 6. Tambahkan Simbol dari AST Dokumen Aktif
    if (program) {
      const simbolLokal = this.ekstrakSimbolDariAST(program, posisi);
      for (const item of simbolLokal) {
        if (!kataAwalan || item.label.toLowerCase().startsWith(kataAwalan.toLowerCase())) {
          hasil.push(item);
        }
      }
    }

    // 7. Tambahkan Modul Standar Terdaftar
    for (const [namaModul, meta] of Object.entries(KATALOG_MODUL_STANDAR)) {
      if (!kataAwalan || namaModul.toLowerCase().startsWith(kataAwalan.toLowerCase())) {
        hasil.push({
          label: namaModul,
          kind: JenisKompleksiLSP.Module,
          detail: `Modul Standar: ${namaModul}`,
          documentation: meta.deskripsi,
          sortText: `5_${namaModul}`,
        });
      }
    }

    return {
      isIncomplete: false,
      items: hasil,
    };
  }

  /**
   * Rekomendasi anggota fungsi / konstanta untuk modul standar atau user modul.
   */
  private dapatkanKompleksiAnggotaModul(
    namaTarget: string,
    awalan: string,
    program?: NodeProgram
  ): ItemKompleksiLSP[] {
    const hasil: ItemKompleksiLSP[] = [];

    // Cari alias modul di daftar impor jika ada
    let namaAsliModul = namaTarget;
    if (program && program.daftarImpor) {
      for (const imp of program.daftarImpor) {
        if (imp.aliasModul === namaTarget) {
          namaAsliModul = imp.sumberModul;
          break;
        }
      }
    }

    // Cek katalog standard library
    const metaModul = KATALOG_MODUL_STANDAR[namaAsliModul];
    if (metaModul) {
      for (const [namaSimbol, info] of metaModul.simbolEkspor.entries()) {
        if (!awalan || namaSimbol.toLowerCase().startsWith(awalan.toLowerCase())) {
          const isFungsi = info.kategori === 'fungsi' || (info as any).jenis === 'fungsi';
          let snippet = namaSimbol;
          if (isFungsi && info.parameter) {
            const params = info.parameter.map((p, idx) => `\${${idx + 1}:${p.nama}}`).join(', ');
            snippet = `${namaSimbol}(${params})`;
          }

          hasil.push({
            label: namaSimbol,
            kind: isFungsi ? JenisKompleksiLSP.Method : JenisKompleksiLSP.Constant,
            detail: `${namaTarget}.${namaSimbol}: ${info.tipeKembalian || info.tipeData || 'sembarang'}`,
            documentation: (info as any).deskripsi || `Anggota ekspor modul ${namaAsliModul} (${info.kategori})`,
            insertText: snippet,
            insertTextFormat: isFungsi ? FormatTeksSisipanLSP.Snippet : FormatTeksSisipanLSP.PlainText,
            sortText: `1_${namaSimbol}`,
          });
        }
      }
    }

    return hasil;
  }

  /**
   * Rekomendasi daftar nama modul standar resmi.
   */
  private dapatkanKompleksiModulStandar(): ItemKompleksiLSP[] {
    return Object.entries(KATALOG_MODUL_STANDAR).map(([nama, meta]) => ({
      label: `"${nama}"`,
      kind: JenisKompleksiLSP.Module,
      detail: `Modul Standar Resmi: ${nama}`,
      documentation: meta.deskripsi,
      insertText: `"${nama}"`,
    }));
  }

  /**
   * Mengekstrak simbol lokal dari AST (fungsi, variabel, parameter).
   */
  private ekstrakSimbolDariAST(program: NodeProgram, posisi: PosisiLSP): ItemKompleksiLSP[] {
    const hasil: ItemKompleksiLSP[] = [];
    const namaSudahAda = new Set<string>();

    // Tambahkan fungsi-fungsi yang dideklarasikan di program
    if (program.daftarFungsi) {
      for (const fn of program.daftarFungsi) {
        if (!namaSudahAda.has(fn.nama)) {
          namaSudahAda.add(fn.nama);
          const paramsDoc = fn.parameter.map(p => `${p.nama}: ${p.tipeData}`).join(', ');
          const paramsSnippet = fn.parameter.map((p, idx) => `\${${idx + 1}:${p.nama}}`).join(', ');

          hasil.push({
            label: fn.nama,
            kind: JenisKompleksiLSP.Function,
            detail: `fungsi ${fn.nama}(${paramsDoc}): ${fn.tipeKembalian || 'kosong'}`,
            insertText: `${fn.nama}(${paramsSnippet})`,
            insertTextFormat: FormatTeksSisipanLSP.Snippet,
            sortText: `1_${fn.nama}`,
          });
        }

        // Jika kursor berada di dalam fungsi ini, sertakan parameternya
        if (this.apakahPosisiDiDalamRentang(posisi, fn.posisi)) {
          for (const param of fn.parameter) {
            if (!namaSudahAda.has(param.nama)) {
              namaSudahAda.add(param.nama);
              hasil.push({
                label: param.nama,
                kind: JenisKompleksiLSP.Variable,
                detail: `parameter: ${param.nama} (${param.tipeData})`,
                sortText: `0_${param.nama}`,
              });
            }
          }

          // Ekstrak variabel lokal di tubuh fungsi
          this.ekstrakVariabelDariPernyataan(fn.tubuh, hasil, namaSudahAda);
        }
      }
    }

    // Tambahkan variabel tingkat program / tubuh utama
    if (program.tubuhUtama) {
      this.ekstrakVariabelDariPernyataan(program.tubuhUtama, hasil, namaSudahAda);
    }

    return hasil;
  }

  /**
   * Mengumpulkan deklarasi variabel dari kumpulan pernyataan.
   */
  private ekstrakVariabelDariPernyataan(
    daftarPernyataan: PernyataanAST[],
    hasil: ItemKompleksiLSP[],
    namaSudahAda: Set<string>
  ): void {
    for (const stmt of daftarPernyataan) {
      if (stmt.jenis === JenisNodeAST.DEKLARASI_VARIABEL) {
        const v = stmt as NodeDeklarasiVariabel;
        if (!namaSudahAda.has(v.nama)) {
          namaSudahAda.add(v.nama);
          hasil.push({
            label: v.nama,
            kind: JenisKompleksiLSP.Variable,
            detail: `variabel: ${v.nama} (${v.tipeData})`,
            sortText: `1_${v.nama}`,
          });
        }
      } else if (stmt.jenis === JenisNodeAST.DEKLARASI_TETAP) {
        const t = stmt as NodeDeklarasiTetap;
        if (!namaSudahAda.has(t.nama)) {
          namaSudahAda.add(t.nama);
          hasil.push({
            label: t.nama,
            kind: JenisKompleksiLSP.Constant,
            detail: `tetap (konstanta): ${t.nama} (${t.tipeData})`,
            sortText: `1_${t.nama}`,
          });
        }
      }
    }
  }

  private ambilBarisTeks(konten: string, nomorBaris: number): string {
    const baris = konten.split('\n');
    return baris[nomorBaris] || '';
  }

  private apakahPosisiDiDalamRentang(posisi: PosisiLSP, rentang: any): boolean {
    if (!rentang || !rentang.awal || !rentang.akhir) return false;
    const barisKursor = posisi.line + 1; // Konversi ke 1-indexed
    return barisKursor >= rentang.awal.baris && barisKursor <= rentang.akhir.baris;
  }
}
