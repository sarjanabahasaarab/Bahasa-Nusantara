/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Browser-hosted official NUSANTARA interpreter entry for Android WebView.
 * The native host receives only bounded source and bounded textual output.
 */
import { Interpreter } from "../../../src/interpreter/interpreter";
import { OutputWriter } from "../../../src/interpreter/outputWriter";
import { PembacaBerkasMemori } from "../../../src/modul/pembacaBerkas";

export interface HasilRuntimeAndroid {
  berhasil: boolean;
  keluaran: string[];
  galat?: string;
  durasiMs: number;
}

const BATAS_SUMBER = 256 * 1024;
const BATAS_BARIS_OUTPUT = 1000;
const BATAS_KARAKTER_OUTPUT = 256 * 1024;
const PENANDA_OUTPUT_DIPOTONG = "[Keluaran dibatasi oleh runtime Android]";

/**
 * Writer yang membatasi memori saat output dibuat, bukan setelah program selesai.
 * Ini mencegah program membanjiri heap WebView dengan ribuan baris keluaran.
 */
export class PenulisOutputAndroidTerbatas implements OutputWriter {
  private readonly baris: string[] = [];
  private totalKarakter = 0;
  private dipotong = false;

  public tulisBaris(teks: string): void {
    if (this.dipotong) return;
    if (this.baris.length >= BATAS_BARIS_OUTPUT || this.totalKarakter >= BATAS_KARAKTER_OUTPUT) {
      this.tambahkanPenanda();
      return;
    }

    const nilai = String(teks);
    const sisa = BATAS_KARAKTER_OUTPUT - this.totalKarakter;
    const aman = nilai.slice(0, sisa);
    this.baris.push(aman);
    this.totalKarakter += aman.length;

    if (aman.length < nilai.length ||
        this.baris.length >= BATAS_BARIS_OUTPUT ||
        this.totalKarakter >= BATAS_KARAKTER_OUTPUT) {
      this.tambahkanPenanda();
    }
  }

  private tambahkanPenanda(): void {
    if (this.dipotong) return;
    this.dipotong = true;
    const ruangBaris = this.baris.length < BATAS_BARIS_OUTPUT;
    const ruangKarakter = BATAS_KARAKTER_OUTPUT - this.totalKarakter;
    if (ruangBaris && ruangKarakter > 0) {
      const penanda = PENANDA_OUTPUT_DIPOTONG.slice(0, ruangKarakter);
      this.baris.push(penanda);
      this.totalKarakter += penanda.length;
    }
  }

  public dapatkanSeluruhTeks(): string[] {
    return [...this.baris];
  }

  public bersihkan(): void {
    this.baris.length = 0;
    this.totalKarakter = 0;
    this.dipotong = false;
  }
}

export function jalankanKodeAndroid(sumber: string): HasilRuntimeAndroid {
  const mulai = Date.now();
  if (typeof sumber !== "string" || sumber.length === 0) {
    return { berhasil: false, keluaran: [], galat: "Kode sumber kosong.", durasiMs: 0 };
  }
  if (sumber.length > BATAS_SUMBER) {
    return { berhasil: false, keluaran: [], galat: "Ukuran kode melebihi batas 256 KiB.", durasiMs: 0 };
  }

  const buffer = new PenulisOutputAndroidTerbatas();
  try {
    const pembaca = new PembacaBerkasMemori({}, "/proyek");
    const interpreter = new Interpreter(buffer, {
      pembacaBerkas: pembaca,
      direktoriBasis: "/proyek",
      maksimalIterasiPerulangan: 10000,
      batasWaktuEksekusiMs: 3000,
      envOverrides: {},
      argumenCLI: [],
    });
    interpreter.jalankanKode(sumber, "/proyek");

    return {
      berhasil: true,
      keluaran: buffer.dapatkanSeluruhTeks(),
      durasiMs: Date.now() - mulai,
    };
  } catch (error) {
    const pesan = error instanceof Error ? error.message : String(error);
    return { berhasil: false, keluaran: [], galat: pesan.slice(0, 4000), durasiMs: Date.now() - mulai };
  }
}

declare global {
  interface Window {
    NusantaraMobileRuntime?: {
      siap: boolean;
      versi: string;
      jalankan: (sumber: string) => HasilRuntimeAndroid;
    };
  }
}

if (typeof window !== "undefined") {
  window.NusantaraMobileRuntime = {
    siap: true,
    versi: "0.50.0",
    jalankan: jalankanKodeAndroid,
  };
}
