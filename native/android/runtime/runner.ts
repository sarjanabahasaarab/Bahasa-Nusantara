/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Browser-hosted official NUSANTARA interpreter entry for Android WebView.
 * The native host receives only bounded source and bounded textual output.
 */
import { Interpreter } from "../../../src/interpreter/interpreter";
import { PenulisOutputBuffer } from "../../../src/interpreter/outputWriter";
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

export function jalankanKodeAndroid(sumber: string): HasilRuntimeAndroid {
  const mulai = Date.now();
  if (typeof sumber !== "string" || sumber.length === 0) {
    return { berhasil: false, keluaran: [], galat: "Kode sumber kosong.", durasiMs: 0 };
  }
  if (sumber.length > BATAS_SUMBER) {
    return { berhasil: false, keluaran: [], galat: "Ukuran kode melebihi batas 256 KiB.", durasiMs: 0 };
  }

  const buffer = new PenulisOutputBuffer();
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

    const keluaran = buffer.dapatkanSeluruhTeks().slice(0, BATAS_BARIS_OUTPUT);
    let total = 0;
    const aman = keluaran.map((baris) => {
      const sisa = Math.max(0, BATAS_KARAKTER_OUTPUT - total);
      const potong = String(baris).slice(0, sisa);
      total += potong.length;
      return potong;
    });
    return { berhasil: true, keluaran: aman, durasiMs: Date.now() - mulai };
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
