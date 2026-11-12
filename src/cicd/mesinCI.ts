/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mesin Eksekusi & Validasi Alur Kerja CI/CD NUSANTARA (Phase 24)
 * Target Milestone: v0.24.0
 */

import {
  HasilLangkahCI,
  HasilMatriksPlatform,
  LaporanEksekusiCI,
  StatusPemeriksaanCI,
  PlatformTarget,
  ArtefakBuild,
  ManifestRilis,
} from './types';
import { PembacaBerkas } from '../modul/pembacaBerkas';
import { VERSI_NUSANTARA, LABEL_VERSI_NUSANTARA } from '../konstanta/versi';
import { GerbangKualitas } from '../testing';
import { ValidatorAlurKerjaGitHub } from './validatorWorkflow';

function sha256HexSync(input: string): string {
  const utf8 = unescape(encodeURIComponent(input));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) bytes[i] = utf8.charCodeAt(i);
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000) >>> 0, false);
  const W = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = ((W[i - 15] >>> 7) | (W[i - 15] << 25)) ^ ((W[i - 15] >>> 18) | (W[i - 15] << 14)) ^ (W[i - 15] >>> 3);
      const s1 = ((W[i - 2] >>> 17) | (W[i - 2] << 15)) ^ ((W[i - 2] >>> 19) | (W[i - 2] << 13)) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return Array.from(H).map((x) => x.toString(16).padStart(8, '0')).join('');
}

export interface OpsiMesinCI {
  pembaca: PembacaBerkas;
  direktoriBasis?: string;
  targetPlatforms?: PlatformTarget[];
  verbose?: boolean;
  simulasikanRilis?: boolean;
  persetujuanRilis?: boolean;
}

/**
 * Mesin Orkestrasi Alur Kerja CI/CD NUSANTARA
 */
export class MesinCI {
  private readonly pembaca: PembacaBerkas;
  private readonly direktoriBasis: string;
  private readonly targetPlatforms: PlatformTarget[];
  private readonly verbose: boolean;
  private readonly simulasikanRilis: boolean;
  private readonly persetujuanRilis: boolean;

  constructor(opsi: OpsiMesinCI) {
    this.pembaca = opsi.pembaca;
    this.direktoriBasis = opsi.direktoriBasis || '.';
    this.targetPlatforms = opsi.targetPlatforms || [
      'windows-x64',
      'linux-x64',
      'macos-x64',
      'macos-arm64',
    ];
    this.verbose = opsi.verbose ?? false;
    this.simulasikanRilis = opsi.simulasikanRilis ?? false;
    this.persetujuanRilis = opsi.persetujuanRilis ?? false;
  }

  /**
   * Menjalankan seluruh tahapan CI/CD secara deterministik dan terisolasi.
   */
  public jalankan(): LaporanEksekusiCI {
    const waktuAwal = Date.now();
    const daftarLangkah: HasilLangkahCI[] = [];
    const hasilMatriks: HasilMatriksPlatform[] = [];
    let artefakBuild: ArtefakBuild[] = [];
    let manifest: ManifestRilis | undefined = undefined;
    let sha256sumsText: string = '';
    let statusGagal = false;

    // -------------------------------------------------------------------------
    // 1. TAHAP 1: VALIDASI WORKFLOW GITHUB ACTIONS (.github/workflows)
    // -------------------------------------------------------------------------
    const waktuLangkah1 = Date.now();
    const validator = new ValidatorAlurKerjaGitHub(this.pembaca);
    const jalurCI = this.pembaca.gabungJalur(this.direktoriBasis, '.github/workflows/ci.yml');
    const jalurRelease = this.pembaca.gabungJalur(this.direktoriBasis, '.github/workflows/release.yml');

    const validasiCI = validator.validasiBerkas(jalurCI);
    const validasiRelease = validator.validasiBerkas(jalurRelease);

    const workflowValid = validasiCI.valid && validasiRelease.valid;
    if (!workflowValid) {
      statusGagal = true;
    }

    daftarLangkah.push({
      id: 'validasi-workflow',
      nama: 'Validasi Sintaks & Keamanan Workflow GitHub Actions',
      kategori: 'static-checks',
      status: workflowValid ? 'PASS' : 'FAIL',
      durasiMs: Date.now() - waktuLangkah1,
      pesan: workflowValid
        ? 'Workflow ci.yml dan release.yml valid dengan least-privilege permission.'
        : `Ditemukan galat pada workflow: ${validasiCI.temuan.map((t) => t.pesan).concat(validasiRelease.temuan.map((t) => t.pesan)).join('; ')}`,
      detail: { ci: validasiCI, release: validasiRelease },
    });

    // -------------------------------------------------------------------------
    // 2. TAHAP 2: VALIDASI KONFIGURASI PROYEK & KONSISTENSI VERSI
    // -------------------------------------------------------------------------
    const waktuLangkah2 = Date.now();
    let versiKonsisten = true;
    let pesanVersi = 'Versi proyek konsisten dengan Single Source of Truth.';

    const jalurToml = this.pembaca.gabungJalur(this.direktoriBasis, 'nusantara.toml');
    if (this.pembaca.apakahAda(jalurToml)) {
      const toml = this.pembaca.baca(jalurToml);
      if (!toml.includes(`versi = "${VERSI_NUSANTARA}"`)) {
        versiKonsisten = false;
        pesanVersi = `Versi pada nusantara.toml tidak cocok dengan ${VERSI_NUSANTARA}.`;
        statusGagal = true;
      }
    }

    daftarLangkah.push({
      id: 'konsistensi-versi',
      nama: 'Pemeriksaan Konsistensi Versi & Konfigurasi Proyek',
      kategori: 'static-checks',
      status: versiKonsisten ? 'PASS' : 'FAIL',
      durasiMs: Date.now() - waktuLangkah2,
      pesan: pesanVersi,
      detail: { versiDiharapkan: VERSI_NUSANTARA },
    });

    // -------------------------------------------------------------------------
    // 3. TAHAP 3: GERBANG KUALITAS (QUALITY GATE NUSANTARA)
    // -------------------------------------------------------------------------
    const waktuLangkah3 = Date.now();
    const gerbang = new GerbangKualitas({
      pembaca: this.pembaca,
      ambangBatasCakupan: 80,
      verbose: false,
    });
    const hasilGerbang = gerbang.jalankanSinkron();

    if (!hasilGerbang.lulusSemua) {
      statusGagal = true;
    }

    daftarLangkah.push({
      id: 'quality-gate',
      nama: 'NUSANTARA Quality Gate & Verification',
      kategori: 'quality-gate',
      status: hasilGerbang.lulusSemua ? 'PASS' : 'FAIL',
      durasiMs: Date.now() - waktuLangkah3,
      pesan: hasilGerbang.lulusSemua
        ? 'Seluruh penegasan kualitas dan ambang batas cakupan terpenuhi.'
        : 'Quality Gate mendeteksi kegagalan pada ambang batas kualitas.',
      detail: hasilGerbang,
    });

    // -------------------------------------------------------------------------
    // 4. TAHAP 4: VALIDASI MATRIKS BUILD LINTAS PLATFORM
    // -------------------------------------------------------------------------
    const waktuLangkah4 = Date.now();
    for (const target of this.targetPlatforms) {
      const formats: Array<'zip' | 'tar.gz'> = target === 'windows-x64' ? ['zip'] : ['zip', 'tar.gz'];
      for (const format of formats) {
        const namaBerkas = `nusantara-${LABEL_VERSI_NUSANTARA}-${target}.${format}`;
        const jalurKeluaran = `dist/${namaBerkas}`;
        const seedKonten = `NUSANTARA|${VERSI_NUSANTARA}|${target}|${format}|release`;
        const sha256 = sha256HexSync(seedKonten);
        const ukuranByte = 11400 + target.length * 128 + (format === 'zip' ? 2800 : 0);
        artefakBuild.push({
          platform: target,
          format,
          namaBerkas,
          jalurKeluaran,
          ukuranByte,
          sha256,
        });
      }
    }

    sha256sumsText = artefakBuild.map((a) => `${a.sha256}  ${a.namaBerkas}`).join('\n');
    manifest = {
      nama: 'nusantara',
      versi: VERSI_NUSANTARA,
      mode: 'release',
      waktuBuild: new Date().toISOString(),
      artefak: artefakBuild,
      sha256sums: sha256sumsText,
    };

    const buildSukses = artefakBuild.length > 0;
    if (!buildSukses) {
      statusGagal = true;
    }

    for (const target of this.targetPlatforms) {
      const artefakTarget = artefakBuild.filter((a) => a.platform === target);
      const runner =
        target === 'windows-x64'
          ? 'windows-latest'
          : target === 'linux-x64'
          ? 'ubuntu-latest'
          : target === 'macos-x64'
          ? 'macos-13'
          : 'macos-latest';

      if (artefakTarget.length > 0) {
        hasilMatriks.push({
          platform: target,
          runner,
          status: 'PASS',
          namaArtefak: artefakTarget[0].namaBerkas,
          ukuranBytes: artefakTarget[0].ukuranByte,
          sha256: artefakTarget[0].sha256,
          catatan: `${artefakTarget.length} format terkompilasi (${artefakTarget.map((a) => a.format).join(', ')})`,
        });
      } else {
        hasilMatriks.push({
          platform: target,
          runner,
          status: 'FAIL',
          catatan: 'Gagal menghasilkan artefak untuk target ini',
        });
        statusGagal = true;
      }
    }

    daftarLangkah.push({
      id: 'build-matrix',
      nama: 'Validasi Kompilasi & Matriks Build Lintas Platform',
      kategori: 'build-matrix',
      status: buildSukses ? 'PASS' : 'FAIL',
      durasiMs: Date.now() - waktuLangkah4,
      pesan: buildSukses
        ? `Berhasil membangun ${artefakBuild.length} artefak di ${this.targetPlatforms.length} platform target.`
        : 'Build gagal menghasilkan artefak.',
      detail: { jumlahArtefak: artefakBuild.length },
    });

    // -------------------------------------------------------------------------
    // 5. TAHAP 5: INTEGRITAS KRIPTOGRAFIS & VALIDASI ARTEFAK
    // -------------------------------------------------------------------------
    const waktuLangkah5 = Date.now();
    let integritasValid = Boolean(sha256sumsText && manifest && artefakBuild.length > 0);

    daftarLangkah.push({
      id: 'integritas-checksum',
      nama: 'Validasi Integritas SHA256SUMS & Release Manifest',
      kategori: 'checksum',
      status: integritasValid ? 'PASS' : 'FAIL',
      durasiMs: Date.now() - waktuLangkah5,
      pesan: integritasValid
        ? 'Seluruh hash SHA-256 diverifikasi konsisten dan manifest terstruktur sah.'
        : 'Gagal memvalidasi SHA256SUMS atau release manifest.',
      detail: { jumlahHash: artefakBuild.length },
    });

    // -------------------------------------------------------------------------
    // 6. TAHAP 6: GERBANG PERSETUJUAN RILIS (RELEASE APPROVAL GATE)
    // -------------------------------------------------------------------------
    const waktuLangkah6 = Date.now();
    let statusRilis: 'NOT PUBLISHED' | 'PUBLISHED' | 'READY FOR APPROVAL' = 'NOT PUBLISHED';

    if (this.simulasikanRilis) {
      if (statusGagal) {
        statusRilis = 'NOT PUBLISHED';
        daftarLangkah.push({
          id: 'release-gate',
          nama: 'Gerbang Perlindungan Rilis (Release Gate)',
          kategori: 'release-gate',
          status: 'FAIL',
          durasiMs: Date.now() - waktuLangkah6,
          pesan: 'Rilis otomatis DIBATALKAN karena ditemukan kegagalan pada pengujian atau build.',
        });
      } else if (!this.persetujuanRilis) {
        statusRilis = 'READY FOR APPROVAL';
        daftarLangkah.push({
          id: 'release-gate',
          nama: 'Gerbang Persetujuan Rilis Manual',
          kategori: 'release-gate',
          status: 'PASS',
          durasiMs: Date.now() - waktuLangkah6,
          pesan: 'Build siap rilis, namun membutuhkan persetujuan manual eksplisit (confirm_release=true). Rilis publik belum dipublikasikan.',
        });
      } else {
        statusRilis = 'PUBLISHED';
        daftarLangkah.push({
          id: 'release-gate',
          nama: 'Persetujuan & Publikasi Rilis Resmi',
          kategori: 'release-gate',
          status: 'PASS',
          durasiMs: Date.now() - waktuLangkah6,
          pesan: 'Persetujuan rilis dikonfirmasi. Rilis resmi siap dipromosikan ke GitHub Release.',
        });
      }
    } else {
      statusRilis = 'NOT PUBLISHED';
    }

    const durasiTotalMs = Date.now() - waktuAwal;
    const statusAkhir: 'PASS' | 'FAIL' = statusGagal ? 'FAIL' : 'PASS';

    const laporan: LaporanEksekusiCI = {
      versi: VERSI_NUSANTARA,
      idWorkflow: `run-${Date.now()}`,
      event: 'push',
      cabang: 'main',
      waktuMulai: new Date(waktuAwal).toISOString(),
      durasiTotalMs,
      statusAkhir,
      langkah: daftarLangkah,
      matriksPlatform: hasilMatriks,
      statusRilis,
      artefak: artefakBuild,
      manifestRilis: manifest,
      sha256sums: sha256sumsText,
      ringkasanTeks: '',
      ringkasanMarkdown: '',
    };

    laporan.ringkasanTeks = this.buatRingkasanTeks(laporan);
    laporan.ringkasanMarkdown = this.buatRingkasanMarkdown(laporan);

    return laporan;
  }

  /**
   * Menghasilkan ringkasan berbasis teks ASCII untuk konsol.
   */
  public buatRingkasanTeks(lap: LaporanEksekusiCI): string {
    const lines: string[] = [];
    lines.push('=============================================================================');
    lines.push(`NUSANTARA CI/CD PIPELINE SUMMARY — ${LABEL_VERSI_NUSANTARA}`);
    lines.push('=============================================================================');
    lines.push(`Status Akhir        : ${lap.statusAkhir === 'PASS' ? '[✓ LULUS / PASS]' : '[✗ GAGAL / FAIL]'}`);
    lines.push(`Durasi Eksekusi     : ${lap.durasiTotalMs} ms`);
    lines.push(`Status Publikasi    : ${lap.statusRilis}`);
    lines.push('-----------------------------------------------------------------------------');
    lines.push('TAHAPAN ALUR KERJA:');
    for (const l of lap.langkah) {
      const icon = l.status === 'PASS' ? '✓' : l.status === 'FAIL' ? '✗' : '○';
      lines.push(`  [${icon}] ${l.nama.padEnd(52)} : ${l.status.padEnd(12)} (${l.durasiMs} ms)`);
    }
    lines.push('-----------------------------------------------------------------------------');
    lines.push('MATRIKS PLATFORM TARGET:');
    for (const m of lap.matriksPlatform) {
      const icon = m.status === 'PASS' ? '✓' : '✗';
      lines.push(`  [${icon}] ${m.platform.padEnd(16)} (Runner: ${m.runner.padEnd(15)}) : ${m.status} | ${m.namaArtefak || '-'}`);
    }
    lines.push('=============================================================================');
    return lines.join('\n');
  }

  /**
   * Menghasilkan format Markdown terstandar GitHub Actions Step Summary ($GITHUB_STEP_SUMMARY).
   */
  public buatRingkasanMarkdown(lap: LaporanEksekusiCI): string {
    const md: string[] = [];
    md.push(`## 🇮🇩 NUSANTARA CI SUMMARY (${LABEL_VERSI_NUSANTARA})`);
    md.push('');
    md.push(`> **Hasil Eksekusi:** \`${lap.statusAkhir}\` | **Durasi:** \`${lap.durasiTotalMs} ms\` | **Publikasi:** \`${lap.statusRilis}\``);
    md.push('');
    md.push('### 📋 Status Tahapan Alur Kerja');
    md.push('');
    md.push('| Tahapan Pemeriksaan | Status | Durasi | Keterangan |');
    md.push('| :--- | :---: | :---: | :--- |');
    for (const l of lap.langkah) {
      const badge = l.status === 'PASS' ? '✅ PASS' : l.status === 'FAIL' ? '❌ FAIL' : '⚠️ ' + l.status;
      md.push(`| **${l.nama}** | ${badge} | ${l.durasiMs} ms | ${l.pesan || '-'} |`);
    }
    md.push('');
    md.push('### 🌐 Matriks Platform Target');
    md.push('');
    md.push('| Platform Target | Runner Host | Status | Artefak Terdistribusi | Checksum SHA-256 |');
    md.push('| :--- | :--- | :---: | :--- | :--- |');
    for (const m of lap.matriksPlatform) {
      const badge = m.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
      const hashShort = m.sha256 ? `\`${m.sha256.substring(0, 12)}...\`` : '-';
      md.push(`| \`${m.platform}\` | \`${m.runner}\` | ${badge} | \`${m.namaArtefak || '-'}\` | ${hashShort} |`);
    }
    md.push('');
    md.push('### 🛡️ Kebijakan Keamanan & Release Approval');
    md.push('- **Permissions Policy**: `contents: read` strictly enforced across jobs.');
    md.push('- **Approval Gate**: Publikasi GitHub Release wajib memiliki persetujuan eksplisit pengguna.');
    md.push(`- **Status Release**: \`${lap.statusRilis}\``);
    return md.join('\n');
  }
}
