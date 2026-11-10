/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rangkaian Pengujian Resmi Mesin Build & Distribusi Multi-Platform NUSANTARA
 */

import {
  KonfigurasiBuild,
  PengemasArsip,
  PenataRilis,
  MesinBuild,
  PLATFORM_SEMUA,
  normalisasiJalur,
  gabungJalur,
  direktoriDari,
  namaBerkas,
  ArtefakBuild,
} from '../../src/build';
import { PembacaBerkasMemori } from '../../src/modul/pembacaBerkas';
import { VERSI_NUSANTARA } from '../../src/konstanta/versi';

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
    console.error(`            ${err.message}`);
  }
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) throw new Error(`Penegasan gagal: ${pesan}`);
}

console.log('=============================================================================');
console.log('PENGUJIAN MESIN BUILD & DISTRIBUSI MULTI-PLATFORM BAHASA NUSANTARA');
console.log(`Versi Bahasa: v${VERSI_NUSANTARA}`);
console.log('=============================================================================\n');

// 1. Jalur Helper
uji('1.1 Normalisasi dan manipulasi jalur berkas build', () => {
  const norm = normalisasiJalur('dist\\bin\\nusantara.exe');
  pastikan(norm === 'dist/bin/nusantara.exe', 'Pemisah Windows harus dinormalisasi ke slash');

  const gabung = gabungJalur('dist', 'arsip', 'nusantara.tar.gz');
  pastikan(gabung === 'dist/arsip/nusantara.tar.gz', 'Gabung jalur harus menggabungkan segmen dengan benar');

  pastikan(direktoriDari('dist/bin/nusantara') === 'dist/bin', 'direktoriDari harus mengekstrak direktori');
  pastikan(namaBerkas('dist/bin/nusantara.exe') === 'nusantara.exe', 'namaBerkas harus mengekstrak nama berkas');
});

// 2. Konfigurasi Build & Target Platform
uji('2.1 Validasi target platform dan deteksi ekstensi', () => {
  pastikan(PLATFORM_SEMUA.length >= 5, 'Harus mendukung minimal 5 target platform');
  pastikan(Boolean(KonfigurasiBuild.validasiTarget('linux-x64')), 'linux-x64 harus valid');
  pastikan(Boolean(KonfigurasiBuild.validasiTarget('windows-x64')), 'windows-x64 harus valid');
  pastikan(Boolean(KonfigurasiBuild.validasiTarget('darwin-arm64')), 'darwin-arm64 harus valid');
  pastikan(!KonfigurasiBuild.validasiTarget('android-unknown'), 'Target tidak dikenal harus ditolak');

  pastikan(KonfigurasiBuild.dapatkanFormatBiner('windows-x64') === '.exe', 'Windows harus memakai format biner .exe');
  pastikan(KonfigurasiBuild.dapatkanFormatBiner('linux-x64') === '', 'Linux tidak memerlukan ekstensi biner');

  pastikan(KonfigurasiBuild.dapatkanFormatArsip('windows-x64') === 'zip', 'Windows menggunakan arsip zip');
  pastikan(KonfigurasiBuild.dapatkanFormatArsip('linux-x64') === 'tar.gz', 'Linux menggunakan arsip tar.gz');
  pastikan(KonfigurasiBuild.dapatkanFormatArsip('macos-arm64') === 'tar.gz', 'macOS menggunakan arsip tar.gz');
});

// 3. Pengemas Arsip & Checksum
uji('3.1 Pembuatan hash checksum SHA-256 dan pengemasan biner', () => {
  const data = 'Konten artefak biner Nusantara';
  const hash1 = PengemasArsip.hitungHashSederhana(data);
  const hash2 = PengemasArsip.hitungHashSederhana(data);
  pastikan(typeof hash1 === 'string' && hash1.length === 64, 'Hash harus string heksadesimal 64 karakter');
  pastikan(hash1 === hash2, 'Hash harus deterministik untuk input yang sama');

  const hasilZip = PengemasArsip.kemasZip('nusantara.zip', { 'nusantara.exe': data });
  pastikan(typeof hasilZip === 'string' && hasilZip.length > 0, 'kemasZip harus menghasilkan string arsip');

  const hasilTar = PengemasArsip.kemasTarGz('nusantara.tar.gz', { 'bin/nusantara': data });
  pastikan(typeof hasilTar === 'string' && hasilTar.length > 0, 'kemasTarGz harus menghasilkan string arsip');
});

// 4. Penata Rilis
uji('4.1 Penataan manifest rilis dan berkas checksum', () => {
  const artefak: ArtefakBuild[] = [
    {
      namaBerkas: 'nusantara-v1.0.0-linux-x64.tar.gz',
      jalur: 'dist/nusantara-v1.0.0-linux-x64.tar.gz',
      platform: 'linux-x64',
      format: 'tar.gz',
      ukuranByte: 1024,
      sha256: PengemasArsip.hitungHashSederhana('dummy-1'),
      tipe: 'arsip',
    },
    {
      namaBerkas: 'nusantara-v1.0.0-windows-x64.zip',
      jalur: 'dist/nusantara-v1.0.0-windows-x64.zip',
      platform: 'windows-x64',
      format: 'zip',
      ukuranByte: 2048,
      sha256: PengemasArsip.hitungHashSederhana('dummy-2'),
      tipe: 'arsip',
    },
  ];

  const manifest = PenataRilis.buatManifestRilis('1.0.0', 'release', artefak);
  pastikan(manifest.versi === '1.0.0', 'Manifest harus mencatat versi dengan benar');
  pastikan(manifest.mode === 'release', 'Manifest harus mencatat mode release');
  pastikan(manifest.artefak.length === 2, 'Manifest harus mencatat 2 artefak');
  pastikan(Boolean(manifest.waktuDibuat), 'Manifest harus memiliki timestamp');

  const teksChecksum = PenataRilis.buatTeksChecksum(artefak);
  pastikan(teksChecksum.includes(artefak[0].sha256), 'Teks checksum harus memuat hash artefak');
  pastikan(teksChecksum.includes('nusantara-v1.0.0-linux-x64.tar.gz'), 'Teks checksum harus memuat nama berkas');
});

// 5. Mesin Build Eksekusi
uji('5.1 Eksekusi MesinBuild dengan Pembaca Memori', () => {
  const pembaca = new PembacaBerkasMemori({
    'src/index.ts': 'console.log("Nusantara");',
  });

  const logPesan: string[] = [];
  const mesin = new MesinBuild(pembaca, {
    log: (p) => logPesan.push(p),
    error: (e) => console.error(e),
  });

  const hasilBuild = mesin.bangun({
    mode: 'release',
    target: ['linux-x64', 'windows-x64'],
    verifikasiUji: false,
    verbose: false,
  });

  pastikan(hasilBuild.sukses, 'Build multi-target harus berhasil');
  pastikan(hasilBuild.artefak.length === 2, 'Harus menghasilkan 2 artefak');
  pastikan(hasilBuild.manifest !== undefined, 'Harus menyertakan manifest rilis');
  pastikan(hasilBuild.tahap === 'selesai', 'Tahap harus selesai');
  pastikan(Array.isArray(hasilBuild.validasi), 'Validasi harus array');

  const hasilBersih = mesin.bersihkan();
  pastikan(hasilBersih.sukses, 'Pembersihan direktori build harus sukses');
});

console.log('\n=============================================================================');
console.log(`TOTAL PENGUJIAN: ${totalUji}`);
console.log(`LULUS          : ${totalLulus}`);
console.log(`GAGAL          : ${totalGagal}`);
console.log('=============================================================================');

if (totalGagal > 0) {
  process.exit(1);
}
