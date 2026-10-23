/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Diagnostik, TingkatDiagnostik, BingkaiJejak } from './jenis';
import { KodeGalat, METADATA_KODE_GALAT } from './kode';
import { formatCuplikanTeks } from './cuplikan';

export interface OpsiRenderer {
  warna?: boolean;
  modeDebug?: boolean;
  tampilkanJejak?: boolean;
  lebarTerminal?: number;
}

// Deteksi apakah warna didukung dan diizinkan oleh sistem host (NO_COLOR standard)
export function apakahWarnaDiizinkan(opsiWarna?: boolean): boolean {
  if (opsiWarna !== undefined) return opsiWarna;
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NO_COLOR !== undefined) return false;
    if (process.env.NODE_ENV === 'test') return false;
  }
  return false;
}

// Kode ANSI sederhana tanpa dependensi luar
const ANSI = {
  reset: '\x1b[0m',
  tebal: '\x1b[1m',
  redup: '\x1b[2m',
  merah: '\x1b[31m',
  kuning: '\x1b[33m',
  hijau: '\x1b[32m',
  biru: '\x1b[34m',
  sian: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Format satu objek Diagnostik menjadi teks standar Bahasa Indonesia yang elegan.
 */
export function formatDiagnostik(
  diag: Diagnostik,
  opsi: OpsiRenderer = {}
): string {
  const pakaiWarna = apakahWarnaDiizinkan(opsi.warna);
  const pewarna = (teks: string, kode: string) => (pakaiWarna ? `${kode}${teks}${ANSI.reset}` : teks);

  const barisOutput: string[] = [];

  // 1. Header Tingkat & Kode Galat
  const meta = METADATA_KODE_GALAT[diag.kode as KodeGalat];
  const judulResmi = meta?.judul || diag.kategori;
  const kataTingkat = diag.tingkat === TingkatDiagnostik.PERINGATAN ? 'Peringatan' : 'Kesalahan';
  const labelKategori = `${kataTingkat} ${meta?.kategori.toLowerCase() || diag.kategori.toLowerCase()}`;

  const header = `${labelKategori} [${diag.kode}]: ${judulResmi}`;
  const warnaHeader =
    diag.tingkat === TingkatDiagnostik.PERINGATAN
      ? `${ANSI.tebal}${ANSI.kuning}`
      : `${ANSI.tebal}${ANSI.merah}`;
  barisOutput.push(pewarna(header, warnaHeader));

  // 2. Lokasi Sumber
  if (diag.lokasi) {
    const berkas = diag.lokasi.berkas ? `${diag.lokasi.berkas}:` : '';
    const posStr = `${berkas}${diag.lokasi.baris}:${diag.lokasi.kolom}`;
    barisOutput.push(pewarna(`  Lokasi: ${posStr}`, ANSI.redup));
  }

  // 3. Konteks Modul / Paket jika ada
  if (diag.konteks) {
    const bagianKonteks: string[] = [];
    if (diag.konteks.namaPaket) {
      const v = diag.konteks.versiPaket ? ` v${diag.konteks.versiPaket}` : '';
      bagianKonteks.push(`Paket: ${diag.konteks.namaPaket}${v}`);
    }
    if (diag.konteks.namaModul) {
      bagianKonteks.push(`Modul: ${diag.konteks.namaModul}`);
    }
    if (diag.konteks.namaFungsi) {
      bagianKonteks.push(`Fungsi: ${diag.konteks.namaFungsi}()`);
    }
    if (bagianKonteks.length > 0) {
      barisOutput.push(pewarna(`  Konteks: ${bagianKonteks.join(' | ')}`, ANSI.sian));
    }
  }

  barisOutput.push('');

  // 4. Potongan Kode Sumber (Source Snippet)
  if (diag.potonganKode) {
    const cuplikanFormat = formatCuplikanTeks(diag.potonganKode);
    barisOutput.push(cuplikanFormat);
    barisOutput.push('');
  }

  // 5. Pesan Utama Masalah
  barisOutput.push(`  Masalah:`);
  barisOutput.push(`    ${diag.pesan}`);

  // 6. Penyebab Rinci jika ada
  if (diag.penyebabRinci) {
    barisOutput.push(`  Penyebab:`);
    barisOutput.push(`    ${diag.penyebabRinci}`);
  }

  // 7. Saran Perbaikan jika ada
  const saranFinal = diag.saran || meta?.saranStandar;
  if (saranFinal) {
    barisOutput.push('');
    barisOutput.push(pewarna(`  Saran:`, `${ANSI.tebal}${ANSI.hijau}`));
    barisOutput.push(pewarna(`    ${saranFinal}`, ANSI.hijau));
  }

  // 8. Jejak Tumpukan (Stack Trace)
  const jejak = diag.jejakTumpukan;
  if (jejak && jejak.length > 0 && (opsi.tampilkanJejak || opsi.modeDebug)) {
    barisOutput.push('');
    barisOutput.push(pewarna(`  Jejak Pemanggilan (Stack Trace):`, `${ANSI.tebal}${ANSI.biru}`));
    for (let i = 0; i < jejak.length; i++) {
      const frame = jejak[i];
      const urutan = `${i + 1}.`;
      const lokasi = frame.lokasi
        ? ` — ${frame.lokasi.berkas || 'program'}:${frame.lokasi.baris}:${frame.lokasi.kolom}`
        : '';
      const modul = frame.namaModul ? ` [modul: ${frame.namaModul}]` : '';
      const paket = frame.namaPaket ? ` (paket: ${frame.namaPaket})` : '';
      barisOutput.push(`    ${urutan.padEnd(3)} ${frame.namaFungsi}()${modul}${paket}${lokasi}`);
    }
  }

  // 9. Rantai Galat (Error Chain) jika ada
  if (diag.penyebabAsal) {
    barisOutput.push('');
    barisOutput.push(pewarna(`  Disebabkan oleh:`, `${ANSI.tebal}${ANSI.kuning}`));
    const rantaiFormat = formatDiagnostik(diag.penyebabAsal, {
      ...opsi,
      modeDebug: false,
      tampilkanJejak: false,
    });
    // Indentasi rantai penyebab
    const barisRantai = rantaiFormat.split('\n').map(b => `    ${b}`).join('\n');
    barisOutput.push(barisRantai);
  }

  // 10. Mode Debug Tambahan (metadata & AST detail)
  if (opsi.modeDebug && diag.metadata) {
    barisOutput.push('');
    barisOutput.push(pewarna(`  [Informasi Debug]:`, `${ANSI.redup}${ANSI.sian}`));
    for (const [k, v] of Object.entries(diag.metadata)) {
      barisOutput.push(pewarna(`    ${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`, ANSI.redup));
    }
  }

  return barisOutput.join('\n');
}

/**
 * Format diagnostik menjadi representasi JSON terstruktur untuk otomasi CLI / IDE.
 */
export function formatDiagnostikKeJSON(diag: Diagnostik): string {
  return JSON.stringify(
    {
      tingkat: diag.tingkat,
      kategori: diag.kategori,
      kode: diag.kode,
      pesan: diag.pesan,
      penyebabRinci: diag.penyebabRinci,
      lokasi: diag.lokasi,
      potonganKode: diag.potonganKode,
      saran: diag.saran,
      konteks: diag.konteks,
      jejakTumpukan: diag.jejakTumpukan,
      penyebabAsal: diag.penyebabAsal ? JSON.parse(formatDiagnostikKeJSON(diag.penyebabAsal)) : undefined,
      metadata: diag.metadata,
      waktu: diag.waktu || new Date(),
    },
    null,
    2
  );
}
