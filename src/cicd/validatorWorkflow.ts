/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validator Keamanan & Sintaks Alur Kerja GitHub Actions NUSANTARA (Phase 24)
 */

import { HasilValidasiWorkflow, TemuanAuditKeamananCI } from './types';
import { PembacaBerkas } from '../modul/pembacaBerkas';

/**
 * Memeriksa berkas YAML alur kerja GitHub Actions untuk memastikan:
 * 1. Struktur deklarasi valid.
 * 2. Menerapkan Least Privilege Permissions (`contents: read`).
 * 3. Tidak ada rahasia (secrets/token) yang dibocorkan atau dicetak ke log.
 * 4. Pengendalian Concurrency aman.
 * 5. Gerbang persetujuan rilis manual tidak dapat dilewati secara diam-diam.
 * 6. Ketergantungan antar-job (`needs`) mencegah promosi build yang gagal.
 */
export class ValidatorAlurKerjaGitHub {
  private readonly pembaca: PembacaBerkas;

  constructor(pembaca: PembacaBerkas) {
    this.pembaca = pembaca;
  }

  /**
   * Memvalidasi berkas alur kerja tertentu (misal: .github/workflows/ci.yml).
   */
  public validasiBerkas(jalurBerkas: string): HasilValidasiWorkflow {
    if (!this.pembaca.apakahAda(jalurBerkas)) {
      return {
        namaBerkas: jalurBerkas,
        valid: false,
        namaWorkflow: '',
        daftarTrigger: [],
        leastPrivilegeTercapai: false,
        adaRahasiaBocor: false,
        concurrencyAman: false,
        persetujuanRilisAman: false,
        daftarJob: [],
        temuan: [
          {
            tingkat: 'kritis',
            pesan: `Berkas alur kerja '${jalurBerkas}' tidak ditemukan di repositori.`,
          },
        ],
      };
    }

    const konten = this.pembaca.baca(jalurBerkas);
    return this.validasiKonten(jalurBerkas, konten);
  }

  /**
   * Memvalidasi teks YAML alur kerja.
   */
  public validasiKonten(namaBerkas: string, konten: string): HasilValidasiWorkflow {
    const temuan: TemuanAuditKeamananCI[] = [];
    const baris = konten.split(/\r?\n/);

    // 1. Ekstrak Nama Workflow
    let namaWorkflow = '';
    const barisName = baris.find((b) => /^\s*name\s*:\s*(.+)$/.test(b));
    if (barisName) {
      const match = barisName.match(/^\s*name\s*:\s*(.+)$/);
      if (match) namaWorkflow = match[1].trim().replace(/^['"]|['"]$/g, '');
    } else {
      temuan.push({
        tingkat: 'peringatan',
        pesan: 'Alur kerja tidak memiliki atribut name teratas.',
      });
    }

    // 2. Ekstrak Trigger (on:)
    const daftarTrigger: string[] = [];
    if (/push\s*:/m.test(konten)) daftarTrigger.push('push');
    if (/pull_request\s*:/m.test(konten)) daftarTrigger.push('pull_request');
    if (/workflow_dispatch\s*:/m.test(konten)) daftarTrigger.push('workflow_dispatch');
    if (/release\s*:/m.test(konten)) daftarTrigger.push('release');

    // 3. Audit Least Privilege Permissions
    let leastPrivilegeTercapai = false;
    // Cari blok permissions di level atas
    const blokPermissionRoot = /permissions\s*:\s*\n\s+contents\s*:\s*read/m.test(konten);
    if (blokPermissionRoot) {
      leastPrivilegeTercapai = true;
    } else {
      temuan.push({
        tingkat: 'kritis',
        pesan: 'Root permissions tidak menggunakan least privilege (wajib "permissions: contents: read").',
      });
    }

    // Periksa apakah ada permission tulis yang tidak aman di root
    if (/permissions\s*:\s*write-all/m.test(konten) || /permissions\s*:\s*\n\s+contents\s*:\s*write/m.test(konten.replace(/publish-release[\s\S]*/, ''))) {
      temuan.push({
        tingkat: 'kritis',
        pesan: 'Terdeteksi permission write pada level root atau di luar job publikasi khusus.',
      });
      leastPrivilegeTercapai = false;
    }

    // 4. Audit Kebocoran Rahasia (Secrets Audit)
    let adaRahasiaBocor = false;
    const polaRahasiaKeras = /(ghp_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{40,}|BEGIN PRIVATE KEY|AKIA[0-9A-Z]{16})/i;
    if (polaRahasiaKeras.test(konten)) {
      adaRahasiaBocor = true;
      temuan.push({
        tingkat: 'kritis',
        pesan: 'Ditemukan token atau kunci privat yang di-hardcode di dalam berkas alur kerja!',
      });
    }

    // Pastikan tidak ada echo ${{ secrets.* }}
    if (/echo\s+.*?\$\{\{\s*secrets\./i.test(konten)) {
      adaRahasiaBocor = true;
      temuan.push({
        tingkat: 'kritis',
        pesan: 'Ditemukan perintah pencetakan rahasia (echo secrets) yang berisiko mengekspos credential ke log build.',
      });
    }

    // 5. Audit Concurrency Control
    let concurrencyAman = false;
    if (/concurrency\s*:/m.test(konten)) {
      concurrencyAman = true;
      // Jika release, pastikan cancel-in-progress adalah false
      if (namaBerkas.includes('release') && /cancel-in-progress\s*:\s*true/m.test(konten)) {
        temuan.push({
          tingkat: 'peringatan',
          pesan: 'Alur kerja rilis sebaiknya tidak membatalkan proses yang sedang berlangsung (cancel-in-progress harus false).',
        });
        concurrencyAman = false;
      }
    } else {
      temuan.push({
        tingkat: 'peringatan',
        pesan: 'Alur kerja tidak memiliki concurrency control untuk mencegah eksekusi ganda yang berlebih.',
      });
    }

    // 6. Audit Persetujuan Rilis (Release Approval Gate)
    let persetujuanRilisAman = true;
    if (daftarTrigger.includes('workflow_dispatch') && namaBerkas.includes('release')) {
      const adaKonfirmasiInput = /confirm_release\s*:/m.test(konten);
      const adaVerifikasiPersetujuan = /confirm_release.*?!=.*?"true"|confirm_release.*?==.*?"true"/m.test(konten);
      if (!adaKonfirmasiInput || !adaVerifikasiPersetujuan) {
        persetujuanRilisAman = false;
        temuan.push({
          tingkat: 'kritis',
          pesan: 'Alur kerja rilis harus mewajibkan persetujuan manual eksplisit (confirm_release) sebelum mengeksekusi publikasi.',
        });
      }
    }

    // 7. Parsing Job-job Utama
    const daftarJob = this.ekstrakDaftarJob(konten);

    // Verifikasi ketergantungan publish-release
    const jobPublish = daftarJob.find((j) => j.id === 'publish-release' || j.id === 'publish');
    if (jobPublish) {
      if (jobPublish.needs.length === 0) {
        temuan.push({
          tingkat: 'kritis',
          pesan: 'Job rilis (publish) tidak bergantung pada job pengujian/build (needs kosong), berisiko mempublikasikan rilis dari build yang gagal!',
        });
      }
    }

    const valid = temuan.filter((t) => t.tingkat === 'kritis').length === 0;

    return {
      namaBerkas,
      valid,
      namaWorkflow,
      daftarTrigger,
      leastPrivilegeTercapai,
      adaRahasiaBocor,
      concurrencyAman,
      persetujuanRilisAman,
      daftarJob,
      temuan,
    };
  }

  private ekstrakDaftarJob(konten: string): {
    id: string;
    nama: string;
    needs: string[];
    runsOn?: string;
    jumlahLangkah: number;
    matrix?: Record<string, any[]>;
  }[] {
    const jobs: any[] = [];
    const baris = konten.split(/\r?\n/);
    let diDalamJobs = false;
    let jobSaatIni: any = null;

    for (let i = 0; i < baris.length; i++) {
      const b = baris[i];
      if (/^jobs\s*:/.test(b)) {
        diDalamJobs = true;
        continue;
      }

      if (diDalamJobs) {
        // Job level 1 (indent 2 spasi: misal '  static-checks:')
        const matchJobId = b.match(/^  ([a-zA-Z0-9_-]+)\s*:/);
        if (matchJobId) {
          if (jobSaatIni) jobs.push(jobSaatIni);
          jobSaatIni = {
            id: matchJobId[1],
            nama: matchJobId[1],
            needs: [],
            runsOn: undefined,
            jumlahLangkah: 0,
          };
          continue;
        }

        if (jobSaatIni) {
          // Nama
          const matchName = b.match(/^\s+name\s*:\s*(.+)$/);
          if (matchName) {
            jobSaatIni.nama = matchName[1].trim().replace(/^['"]|['"]$/g, '');
          }

          // runs-on
          const matchRunsOn = b.match(/^\s+runs-on\s*:\s*(.+)$/);
          if (matchRunsOn) {
            jobSaatIni.runsOn = matchRunsOn[1].trim();
          }

          // needs
          const matchNeeds = b.match(/^\s+needs\s*:\s*(.+)$/);
          if (matchNeeds) {
            const rawNeeds = matchNeeds[1].trim();
            if (rawNeeds.startsWith('[') && rawNeeds.endsWith(']')) {
              jobSaatIni.needs = rawNeeds
                .slice(1, -1)
                .split(',')
                .map((n) => n.trim().replace(/^['"]|['"]$/g, ''));
            } else {
              jobSaatIni.needs = [rawNeeds.replace(/^['"]|['"]$/g, '')];
            }
          }

          // langkah
          if (/^\s+- name\s*:/.test(b) || /^\s+- uses\s*:/.test(b)) {
            jobSaatIni.jumlahLangkah++;
          }
        }
      }
    }

    if (jobSaatIni) jobs.push(jobSaatIni);
    return jobs;
  }
}
