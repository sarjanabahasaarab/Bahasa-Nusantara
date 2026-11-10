/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengujian Sistem Build, Distribusi, & Rilis Multiplatform NUSANTARA (Phase 23)
 */

import {
  MesinBuild,
  PLATFORM_SEMUA,
  normalisasiJalur,
  gabungJalur,
  dapatkanDirektori,
  dapatkanNamaBerkas,
  PengemasArsip,
  PenataRilis,
} from '../../src/build';
import { PembacaBerkasMemori } from '../../src/modul/pembacaBerkas';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(nama: string, fn: () => void): void {
  totalUji++;
  try {
    fn();
    totalLulus++;
    console.log(`  [✓ LULUS] ${nama}`);
  } catch (err: any) {
    totalGagal++;
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`    ${err?.message || err}`);
  }
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) throw new Error(pesan);
}

function samaDengan(aktual: any, ekspektasi: any, pesan: string): void {
  if (aktual !== ekspektasi) {
    throw new Error(`${pesan}: didapat ${JSON.stringify(aktual)}, diharapkan ${JSON.stringify(ekspektasi)}`);
  }
}

console.log('======================================================================');
console.log('   NUSANTARA QUALITY GATE — SUITE 19: BUILD & DISTRIBUSI (PHASE 23)   ');
console.log('======================================================================');

uji('1. Utilitas Jalur Portabel (normalisasi, gabung, direktori)', () => {
  samaDengan(normalisasiJalur('a/b/../c'), 'a/c', 'Normalisasi jalur bertingkat');
  samaDengan(gabungJalur('src', 'build', 'types.ts'), 'src/build/types.ts', 'Gabung jalur multi-bagian');
  samaDengan(dapatkanDirektori('src/build/types.ts'), 'src/build', 'Dapatkan direktori induk');
  samaDengan(dapatkanNamaBerkas('src/build/types.ts'), 'types.ts', 'Dapatkan nama berkas');
});

uji('2. Matriks Platform Lengkap (6 target platform resmi)', () => {
  samaDengan(PLATFORM_SEMUA.length, 6, 'Harus mencakup 6 target resmi');
  pastikan(PLATFORM_SEMUA.includes('linux-x64'), 'Mendukung linux-x64');
  pastikan(PLATFORM_SEMUA.includes('windows-x64'), 'Mendukung windows-x64');
  pastikan(PLATFORM_SEMUA.includes('macos-arm64'), 'Mendukung macos-arm64');
});

uji('3. Pengemas Arsip & Perhitungan Hash Checksum', () => {
  const hash = PengemasArsip.hitungHashSederhana('uji coba hash');
  samaDengan(hash.length, 64, 'Hash SHA-256 harus 64 karakter heksadesimal');
  const artefak = PengemasArsip.buatArtefak('0.48.0', 'linux-x64');
  pastikan(artefak.namaBerkas.includes('linux-x64'), 'Nama arsip harus memuat target');
});

uji('4. Penata Rilis & Manifest Checksum', () => {
  const artefak = [PengemasArsip.buatArtefak('0.48.0', 'linux-x64')];
  const manifest = PenataRilis.susunManifest('release', ['linux-x64'], artefak);
  samaDengan(manifest.mode, 'release', 'Mode rilis harus sesuai');
  const textSum = PenataRilis.buatTeksChecksum(artefak);
  pastikan(textSum.includes(artefak[0].sha256), 'SHA256SUMS harus memuat hash artefak');
});

uji('5. Mesin Build Pipeline & Pembersihan (Clean)', () => {
  const mem = new PembacaBerkasMemori();
  const mesin = new MesinBuild(mem);
  const hasilBersih = mesin.bersihkan();
  pastikan(hasilBersih.sukses, 'Pembersihan harus berhasil');

  const hasilBuild = mesin.bangun({ mode: 'release' });
  pastikan(hasilBuild.sukses, 'Proses bangun harus berhasil');
  samaDengan(hasilBuild.artefak.length, 6, 'Harus menghasilkan 6 artefak distribusi');
});

console.log('======================================================================');
console.log(`HASIL PENGUJIAN BUILD: ${totalLulus} LULUS, ${totalGagal} GAGAL (Total: ${totalUji})`);
console.log('======================================================================');

if (totalGagal > 0) process.exit(1);
