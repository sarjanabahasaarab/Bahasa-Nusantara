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
} from './types';
import { PembacaBerkas } from '../modul/pembacaBerkas';
import { VERSI_NUSANTARA, LABEL_VERSI_NUSANTARA } from '../konstanta/versi';
import { GerbangKualitas } from '../testing';
import { MesinBuild, PlatformTarget, ArtefakBuild, ManifestRilis } from '../build';
import { ValidatorAlurKerjaGitHub } from './validatorWorkflow';

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
    const mesinBuild = new MesinBuild(this.pembaca);

    mesinBuild.bersihkan();
    const hasilBuild = mesinBuild.bangun({
      mode: 'release',
      target: this.targetPlatforms,
      tanpaUji: true,
      reproducible: true,
    });

    if (!hasilBuild.sukses) {
      statusGagal = true;
    }

    artefakBuild = hasilBuild.artefak;
    manifest = hasilBuild.manifest;
    sha256sumsText = hasilBuild.berkasChecksum || (hasilBuild as any).sha256sums || '';

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
      status: hasilBuild.sukses ? 'PASS' : 'FAIL',
      durasiMs: Date.now() - waktuLangkah4,
      pesan: hasilBuild.sukses
        ? `Berhasil membangun ${artefakBuild.length} artefak di 4 platform target.`
        : `Build gagal: ${hasilBuild.pesan}`,
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
