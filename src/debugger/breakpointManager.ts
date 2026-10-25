/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengelola Titik Henti (Breakpoint Manager) Bahasa NUSANTARA (Phase 25)
 */

import { NodeProgram, PernyataanAST, JenisNodeAST, NodeDeklarasiFungsi, NodePercabanganJika, NodePerulanganSelama, NodePerulanganUntuk } from '../parser/ast';
import { Breakpoint, HasilValidasiBreakpoint } from './types';

/**
 * Mengelola pendaftaran, validasi lokasi source, evaluasi kondisi, dan siklus hidup breakpoint.
 */
export class PengelolaBreakpoint {
  private idBerikutnya = 1;
  private readonly daftarBreakpoint = new Map<number, Breakpoint>();
  private readonly indeksBerkasBaris = new Map<string, number>(); // "berkas:baris" -> id

  /**
   * Mengumpulkan semua nomor baris pernyataan yang dapat dieksekusi (executable lines) dari AST.
   */
  public static temukanBarisTereksekusi(program: NodeProgram): Set<number> {
    const baris = new Set<number>();

    const telusuriPernyataan = (stmt: PernyataanAST) => {
      if (!stmt || !stmt.posisi || !stmt.posisi.awal) return;
      baris.add(stmt.posisi.awal.baris);

      switch (stmt.jenis) {
        case JenisNodeAST.PERCABANGAN_JIKA: {
          const s = stmt as NodePercabanganJika;
          if (s.cabangMaka && Array.isArray(s.cabangMaka)) {
            for (const anak of s.cabangMaka) telusuriPernyataan(anak);
          }
          if (s.cabangSelain && Array.isArray(s.cabangSelain)) {
            for (const anak of s.cabangSelain) telusuriPernyataan(anak);
          }
          break;
        }
        case JenisNodeAST.PERULANGAN_SELAMA: {
          const s = stmt as NodePerulanganSelama;
          if (s.tubuh && Array.isArray(s.tubuh)) {
            for (const anak of s.tubuh) telusuriPernyataan(anak);
          }
          break;
        }
        case JenisNodeAST.PERULANGAN_UNTUK: {
          const s = stmt as NodePerulanganUntuk;
          if (s.tubuh && Array.isArray(s.tubuh)) {
            for (const anak of s.tubuh) telusuriPernyataan(anak);
          }
          break;
        }
        case JenisNodeAST.PERNYATAAN_BLOK: {
          const s = stmt as any;
          if (s.daftarPernyataan && Array.isArray(s.daftarPernyataan)) {
            for (const anak of s.daftarPernyataan) telusuriPernyataan(anak);
          }
          break;
        }
      }
    };

    // 1. Telusuri deklarasi fungsi
    if (program.daftarFungsi) {
      for (const fn of program.daftarFungsi) {
        if (fn.posisi?.awal) baris.add(fn.posisi.awal.baris);
        if (fn.tubuh) {
          for (const stmt of fn.tubuh) telusuriPernyataan(stmt);
        }
      }
    }

    // 2. Telusuri tubuh utama program
    if (program.tubuhUtama) {
      for (const stmt of program.tubuhUtama) {
        telusuriPernyataan(stmt);
      }
    }

    return baris;
  }

  /**
   * Memvalidasi apakah baris yang diminta dapat menerima breakpoint berdasarkan baris executable.
   */
  public validasiLokasi(
    berkas: string,
    baris: number,
    barisTereksekusi?: Set<number>
  ): HasilValidasiBreakpoint {
    if (!barisTereksekusi || barisTereksekusi.size === 0) {
      // Jika AST belum tersedia untuk berkas tersebut, anggap valid secara awal
      return {
        valid: true,
        pesan: `Breakpoint terpasang pada baris ${baris}.`,
      };
    }

    if (barisTereksekusi.has(baris)) {
      return {
        valid: true,
        pesan: `Breakpoint valid pada baris ${baris}.`,
      };
    }

    // Cari baris terdekat yang dapat dieksekusi (diutamakan baris setelahnya)
    const daftarTerurut = Array.from(barisTereksekusi).sort((a, b) => a - b);
    let barisTerdekat: number | undefined;

    for (const b of daftarTerurut) {
      if (b >= baris) {
        barisTerdekat = b;
        break;
      }
    }

    if (barisTerdekat === undefined && daftarTerurut.length > 0) {
      barisTerdekat = daftarTerurut[daftarTerurut.length - 1];
    }

    return {
      valid: false,
      pesan: `Breakpoint tidak dapat ditempatkan pada lokasi tersebut.${
        barisTerdekat !== undefined
          ? ` Baris terdekat yang dapat dieksekusi adalah baris ${barisTerdekat}.`
          : ''
      }`,
      barisDiusulkan: barisTerdekat,
    };
  }

  /**
   * Menambahkan breakpoint baru.
   */
  public tambahBreakpoint(
    berkas: string,
    baris: number,
    opsi?: {
      kolom?: number;
      kondisi?: string;
      sementara?: boolean;
      barisTereksekusi?: Set<number>;
    }
  ): { breakpoint: Breakpoint; validasi: HasilValidasiBreakpoint } {
    const validasi = this.validasiLokasi(berkas, baris, opsi?.barisTereksekusi);
    const barisFinal = validasi.valid ? baris : validasi.barisDiusulkan ?? baris;

    const kunci = this.buatKunci(berkas, barisFinal);
    const idLama = this.indeksBerkasBaris.get(kunci);
    if (idLama !== undefined && this.daftarBreakpoint.has(idLama)) {
      const bpLama = this.daftarBreakpoint.get(idLama)!;
      bpLama.kondisi = opsi?.kondisi;
      bpLama.sementara = opsi?.sementara ?? bpLama.sementara;
      bpLama.aktif = true;
      validasi.breakpoint = bpLama;
      return { breakpoint: bpLama, validasi };
    }

    const bp: Breakpoint = {
      id: this.idBerikutnya++,
      berkas,
      baris: barisFinal,
      kolom: opsi?.kolom,
      kondisi: opsi?.kondisi,
      jumlahHit: 0,
      aktif: true,
      sementara: opsi?.sementara,
    };

    this.daftarBreakpoint.set(bp.id, bp);
    this.indeksBerkasBaris.set(kunci, bp.id);
    validasi.breakpoint = bp;
    return { breakpoint: bp, validasi };
  }

  /**
   * Menghapus breakpoint berdasarkan ID.
   */
  public hapusBreakpoint(id: number): boolean {
    const bp = this.daftarBreakpoint.get(id);
    if (!bp) return false;
    this.indeksBerkasBaris.delete(this.buatKunci(bp.berkas, bp.baris));
    return this.daftarBreakpoint.delete(id);
  }

  /**
   * Mengambil breakpoint aktif pada berkas dan baris tertentu jika ada.
   */
  public temukanBreakpoint(berkas: string, baris: number): Breakpoint | undefined {
    // Normalisasi pencocokan berkas (mendukung path relatif/absolut atau nama berkas saja)
    for (const bp of this.daftarBreakpoint.values()) {
      if (!bp.aktif) continue;
      if (bp.baris === baris) {
        if (
          bp.berkas === berkas ||
          bp.berkas.endsWith('/' + berkas) ||
          berkas.endsWith('/' + bp.berkas) ||
          bp.berkas.split('/').pop() === berkas.split('/').pop()
        ) {
          return bp;
        }
      }
    }
    return undefined;
  }

  /**
   * Mengubah status aktif/non-aktif breakpoint.
   */
  public setelAktif(id: number, aktif: boolean): boolean {
    const bp = this.daftarBreakpoint.get(id);
    if (!bp) return false;
    bp.aktif = aktif;
    return true;
  }

  /**
   * Mendapatkan seluruh breakpoint yang terdaftar.
   */
  public dapatkanSemua(): Breakpoint[] {
    return Array.from(this.daftarBreakpoint.values()).sort((a, b) => a.id - b.id);
  }

  /**
   * Mengambil breakpoint berdasarkan ID.
   */
  public dapatkanBerdasarkanId(id: number): Breakpoint | undefined {
    return this.daftarBreakpoint.get(id);
  }

  /**
   * Mengosongkan seluruh breakpoint.
   */
  public bersihkan(): void {
    this.daftarBreakpoint.clear();
    this.indeksBerkasBaris.clear();
  }

  private buatKunci(berkas: string, baris: number): string {
    return `${berkas}:${baris}`;
  }
}
