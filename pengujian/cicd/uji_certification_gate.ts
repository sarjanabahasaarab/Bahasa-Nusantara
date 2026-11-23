/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengujian Regresi Gerbang Sertifikasi Terpusat & Integritas Artefak NUSANTARA (Phase 23.16)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import {
  evaluasiGerbangSertifikasi,
  muatDanEvaluasiDariDisk,
  validasiIntegritasBundelArtefak,
  EvidenceJobCI,
} from '../../src/cicd';
import { Phase23AggregationResult } from '../../src/build/types';
import { DESKTOP_CANONICAL_TARGETS } from '../../src/build/target-matrix';

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
    console.error(`            ${err?.message || err}`);
  }
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) throw new Error(pesan);
}

function buatBundelDummy(root: string): void {
  fs.mkdirSync(path.join(root, 'sub'), { recursive: true });
  const fileBuf = Buffer.from('NUSANTARA_TEST_PAYLOAD_OK', 'utf-8');
  const apkBuf = Buffer.from('PK\x03\x04_STRUCTURAL_NO_DEX', 'binary');
  fs.writeFileSync(path.join(root, 'sub', 'sample.txt'), fileBuf);
  fs.writeFileSync(path.join(root, 'sub', 'app.apk'), apkBuf);

  const sha1 = crypto.createHash('sha256').update(fileBuf).digest('hex');
  const sha2 = crypto.createHash('sha256').update(apkBuf).digest('hex');

  fs.writeFileSync(
    path.join(root, 'SHA256SUMS'),
    `${sha1}  sub/sample.txt\n${sha2}  sub/app.apk\n`,
    'utf-8'
  );
  fs.writeFileSync(
    path.join(root, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        totalArtefak: 2,
        artefak: [
          {
            nama: 'sample.txt',
            jalurRelatif: 'sub/sample.txt',
            ukuranByte: fileBuf.byteLength,
            sha256: sha1,
            jenisArtefak: 'test-txt',
            kategoriBuild: 'runtime-output',
            nativeBinary: false,
            statusValidasi: 'OK',
          },
          {
            nama: 'app.apk',
            jalurRelatif: 'sub/app.apk',
            ukuranByte: apkBuf.byteLength,
            sha256: sha2,
            jenisArtefak: 'structural-pkzip-apk-container',
            kategoriBuild: 'structural',
            nativeBinary: false,
            statusValidasi: 'VERIFIED_STRUCTURAL_PKZIP_CRC32',
          },
        ],
      },
      null,
      2
    ),
    'utf-8'
  );
}

function buatPhase23PassSummary(): Phase23AggregationResult {
  const targets: any = {};
  for (const t of DESKTOP_CANONICAL_TARGETS) {
    targets[t] = {
      schemaVersion: '2.0',
      phase: 'Phase 23',
      target: t,
      targetTriple: t,
      hostOS: 'linux',
      hostArchitecture: 'x86_64',
      compiler: 'clang',
      compilerVersion: '18.1',
      linker: 'lld',
      linkerVersion: '18.1',
      executionMode: 'native',
      verificationStatus: 'PASS',
    };
  }
  return {
    overallStatus: 'CERTIFIED',
    exitCode: 0,
    counts: { totalRequired: 6, pass: 6, notVerified: 0, fail: 0, missing: 0, corrupt: 0 },
    targets,
    findings: [],
    markdownReport: '# OK',
  };
}

function buatJobEvidencesFullPass(commitSha = 'deadbeef1234', workflowRunId = '999'): EvidenceJobCI[] {
  const nowIso = new Date().toISOString();
  return [
    {
      jobId: 'phase36-linux-xvfb',
      phase: '36',
      runner: 'ubuntu-latest',
      os: 'Linux',
      arch: 'x64',
      status: 'PASS',
      unitTestStatus: 'PASS',
      commitSha,
      workflowRunId,
      evidenceScope: 'ci-workflow',
      generatedAt: nowIso,
      isNativeHardware: true,
      displayMode: 'desktop-hardware',
    },
    {
      jobId: 'phase36-windows',
      phase: '36',
      runner: 'windows-latest',
      os: 'Windows',
      arch: 'x64',
      status: 'PASS',
      unitTestStatus: 'PASS',
      isNativeHardware: false,
      displayMode: 'win32-desktop',
    },
    {
      jobId: 'phase36-macos',
      phase: '36',
      runner: 'macos-latest',
      os: 'macOS',
      arch: 'arm64',
      status: 'PASS',
      unitTestStatus: 'PASS',
      isNativeHardware: false,
      displayMode: 'cocoa-desktop',
    },
    {
      jobId: 'phase37-42-android-sdk',
      phase: '37,38,40,41',
      runner: 'ubuntu-latest',
      os: 'Linux',
      arch: 'x64',
      status: 'PASS',
      unitTestStatus: 'PASS',
      details: {
        apkCompiledWithDex: true,
        aabBuiltWithBundletool: true,
        apksignerVerified: true,
        emulatorBooted: true,
        ephemeralKeystoreSigned: true,
        physicalDeviceHardwareVerified: true,
      },
    },
    {
      jobId: 'phase37-42-apple',
      phase: '37,38,40,41',
      runner: 'macos-latest',
      os: 'macOS',
      arch: 'arm64',
      status: 'PASS',
      unitTestStatus: 'PASS',
      details: {
        machOCompiled: true,
        xcarchiveBuilt: true,
        ipaProduced: true,
        simulatorLaunched: true,
        adHocOrDevSigned: true,
        physicalDeviceHardwareVerified: true,
      },
    },
    {
      jobId: 'phase39-42-tls-ota',
      phase: '39,42',
      runner: 'ubuntu-latest',
      os: 'Linux',
      arch: 'x64',
      status: 'PASS',
      unitTestStatus: 'PASS',
      commitSha,
      workflowRunId,
      evidenceScope: 'ci-workflow',
      generatedAt: nowIso,
      details: {
        tlsLoopbackStatus: 'PASS',
        otaRegressionStatus: 'PASS',
        nativeSpkiPinningVerified: true,
        playCoreAndStoreKitVerified: true,
      },
    },
  ];
}

console.log('======================================================================');
console.log('  PENGUJIAN GERBANG SERTIFIKASI TERPUSAT & INTEGRITAS ARTEFAK (23.16)');
console.log('======================================================================\n');

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'nusa-cert-gate-test-'));

try {
  uji('1. Validasi artifacts/demo-terpadu/ nyata di disk lulus ketat', () => {
    const res = validasiIntegritasBundelArtefak(path.resolve('artifacts/demo-terpadu'), {
      strictStructuralSeparation: true,
      minimumArtifacts: 20,
    });
    pastikan(res.valid, `Temuan tak terduga: ${res.temuan.map((t) => t.pesan).join('; ')}`);
    pastikan(res.totalManifest === 20 && res.totalDisk === 20, 'Harus 20 artefak di manifest & disk');
    pastikan(res.jumlahNativeBinary === 0 && res.jumlahStruktural === 4, 'Klasifikasi struktural vs native harus tepat');
  });

  uji('2. Menolak path traversal (../) di manifest.json dan SHA256SUMS', () => {
    const dir = path.join(tmpBase, 'traversal');
    buatBundelDummy(dir);
    const mf = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf-8'));
    mf.artefak[0].jalurRelatif = '../../etc/passwd';
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(mf), 'utf-8');
    const res = validasiIntegritasBundelArtefak(dir);
    pastikan(!res.valid, 'Harus menolak path traversal');
    pastikan(res.temuan.some((t) => t.kode === 'PATH_TRAVERSAL'), 'Kode temuan harus PATH_TRAVERSAL');
  });

  uji('3. Menolak berkas yatim/basi (orphan file) dan perusakan ukuran/hash', () => {
    const dir = path.join(tmpBase, 'orphan-tamper');
    buatBundelDummy(dir);
    fs.writeFileSync(path.join(dir, 'stale-orphan.bin'), 'trash');
    const resOrphan = validasiIntegritasBundelArtefak(dir);
    pastikan(!resOrphan.valid && resOrphan.temuan.some((t) => t.kode === 'BERKAS_YATIM'), 'Harus mendeteksi BERKAS_YATIM');

    fs.rmSync(path.join(dir, 'stale-orphan.bin'));
    fs.appendFileSync(path.join(dir, 'sub', 'sample.txt'), '_TAMPER');
    const resTamper = validasiIntegritasBundelArtefak(dir);
    pastikan(
      !resTamper.valid &&
        resTamper.temuan.some((t) => t.kode === 'UKURAN_TIDAK_COCOK') &&
        resTamper.temuan.some((t) => t.kode === 'SHA256_TIDAK_COCOK'),
      'Harus mendeteksi ukuran dan hash tidak cocok'
    );
  });

  uji('4. Menolak klaim nativeBinary=true palsu pada kontainer APK struktural tanpa classes.dex', () => {
    const dir = path.join(tmpBase, 'fake-native');
    buatBundelDummy(dir);
    const mf = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf-8'));
    mf.artefak[1].nativeBinary = true;
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(mf), 'utf-8');
    const res = validasiIntegritasBundelArtefak(dir, { strictStructuralSeparation: true });
    pastikan(!res.valid && res.temuan.some((t) => t.kode === 'KLAIM_NATIVE_PALSU'), 'Harus menolak KLAIM_NATIVE_PALSU');
  });

  uji('5. Gerbang terpusat CERTIFIED (exitCode=0) HANYA jika seluruh 8 fase PASS', () => {
    const demoDir = path.join(tmpBase, 'demo-ok');
    buatBundelDummy(demoDir);
    const lap = evaluasiGerbangSertifikasi({
      commitSha: 'deadbeef1234',
      workflowRunId: '999',
      runner: 'ubuntu-latest',
      phase23Summary: buatPhase23PassSummary(),
      demoBundleDir: demoDir,
      jobEvidences: buatJobEvidencesFullPass(),
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS' },
    });
    pastikan(lap.overallStatus === 'PASS' && lap.certificationVerdict === 'CERTIFIED', `Harus CERTIFIED, dapat ${lap.certificationVerdict}`);
    pastikan(lap.gatePassed === true && lap.exitCode === 0, 'Harus gatePassed=true & exitCode=0');
    pastikan(lap.counts.pass === 8 && lap.counts.notVerified === 0 && lap.counts.fail === 0, 'Seluruh 8 fase harus PASS');
  });

  uji('6. NOT_VERIFIED, SKIPPED, dan PARTIAL TIDAK PERNAH lulus gate (exitCode=1)', () => {
    const demoDir = path.join(tmpBase, 'demo-partial');
    buatBundelDummy(demoDir);
    const jobs = buatJobEvidencesFullPass();
    // Buat Android job hanya punya structural APK (tanpa classes.dex / emulator)
    jobs[3].details!.apkCompiledWithDex = false;
    jobs[3].details!.physicalDeviceHardwareVerified = false;
    jobs[4].details!.physicalDeviceHardwareVerified = false;
    // Buat Phase 36 hanya Xvfb virtual (bukan physical display)
    jobs[0].isNativeHardware = false;

    const lap = evaluasiGerbangSertifikasi({
      // Fixture ini menguji status fase, bukan validasi provenance; samakan metadata
      // dengan evidence sintetis agar tidak memakai GITHUB_SHA/GITHUB_RUN_ID runner.
      commitSha: 'deadbeef1234',
      workflowRunId: '999',
      phase23Summary: buatPhase23PassSummary(),
      demoBundleDir: demoDir,
      jobEvidences: jobs,
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS' },
    });
    pastikan(lap.overallStatus === 'PARTIAL' && lap.certificationVerdict === 'PARTIAL', `Harus PARTIAL, dapat ${lap.overallStatus}; counts=${JSON.stringify(lap.counts)}; fase=${JSON.stringify(Object.fromEntries(Object.entries(lap.phases).map(([id, p]) => [id, p.status])))}; blockers=${lap.blockers.join(' | ')}`);
    pastikan(lap.gatePassed === false && lap.exitCode === 1, 'PARTIAL dilarang lulus gate!');
    pastikan(lap.phases['36'].status === 'NOT_VERIFIED', 'Xvfb virtual harus menjaga Phase 36 tidak mengklaim physical hardware PASS');
    pastikan(lap.phases['37'].status === 'NOT_VERIFIED' && lap.phases['40'].status === 'NOT_VERIFIED', 'APK struktural tidak boleh meluluskan Phase 37/40');
  });

  uji('7. FAIL dan BLOCKED langsung menggagalkan gate', () => {
    const lapFail = evaluasiGerbangSertifikasi({
      commitSha: 'deadbeef1234',
      workflowRunId: '999',
      phase23Summary: buatPhase23PassSummary(),
      jobEvidences: buatJobEvidencesFullPass().map((j) =>
        j.jobId === 'phase39-42-tls-ota' ? { ...j, status: 'FAIL' } : j
      ),
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS' },
    });
    pastikan(lapFail.overallStatus === 'FAIL' && lapFail.exitCode === 1 && !lapFail.gatePassed, 'Status FAIL harus gagal');

    const lapBlocked = evaluasiGerbangSertifikasi({
      commitSha: 'deadbeef1234',
      workflowRunId: '999',
      phase23Summary: buatPhase23PassSummary(),
      jobEvidences: buatJobEvidencesFullPass(),
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS', releaseTagPolicyBlocked: true },
    });
    pastikan(lapBlocked.overallStatus === 'BLOCKED' && lapBlocked.exitCode === 1 && !lapBlocked.gatePassed, `Status BLOCKED harus gagal; dapat ${lapBlocked.overallStatus}; counts=${JSON.stringify(lapBlocked.counts)}; fase=${JSON.stringify(Object.fromEntries(Object.entries(lapBlocked.phases).map(([id, p]) => [id, p.status])))}; blockers=${lapBlocked.blockers.join(' | ')}`);
  });

  uji('8. Evaluasi snapshot nyata di disk (artifacts/phase23 + artifacts/demo-terpadu) jujur berstatus PARTIAL', () => {
    const { report, corruptEvidenceFiles } = muatDanEvaluasiDariDisk({
      phase23EvidenceDir: path.resolve('artifacts/phase23/evidence'),
      demoBundleDir: path.resolve('artifacts/demo-terpadu'),
    });
    pastikan(corruptEvidenceFiles.length === 0, 'Tidak boleh ada berkas evidence rusak');
    pastikan(report.overallStatus === 'PARTIAL' && report.exitCode === 1, 'Kondisi lokal tanpa SDK/emulator harus jujur PARTIAL (exitCode=1)');
    pastikan(report.artifactReferences[0]?.verified === true, 'Referensi artefak demo terpadu harus terverifikasi valid');
    pastikan(Boolean(report.toolchainVersions.node), 'Versi node harus terdeteksi di toolchainVersions');
  });

  uji('9. Status SKIPPED pada job wajib tidak pernah dihitung PASS & selalu gagalkan gate', () => {
    const demoDir = path.join(tmpBase, 'demo-skipped');
    buatBundelDummy(demoDir);
    const jobs = buatJobEvidencesFullPass().map((j) =>
      j.jobId === 'phase39-42-tls-ota'
        ? { ...j, status: 'SKIPPED' as const, unitTestStatus: 'SKIPPED' as const }
        : j
    );
    const lap = evaluasiGerbangSertifikasi({
      commitSha: 'deadbeef1234',
      workflowRunId: '999',
      phase23Summary: buatPhase23PassSummary(),
      demoBundleDir: demoDir,
      jobEvidences: jobs,
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS' },
    });
    pastikan(lap.gatePassed === false && lap.exitCode === 1, 'SKIPPED tidak boleh meluluskan gate');
    pastikan(lap.phases['39'].status === 'SKIPPED' && lap.phases['42'].status === 'SKIPPED', 'Phase 39 & 42 harus berstatus SKIPPED');
    pastikan(lap.counts.skipped === 2 && lap.counts.pass < 8, 'Counts skipped harus tercatat akurat');
  });

  uji('10. Provenance check: menolak commit SHA berbeda, run ID berbeda, artefak kedaluwarsa, & snapshot lokal pada mode CI', () => {
    const demoDir = path.join(tmpBase, 'demo-provenance');
    buatBundelDummy(demoDir);

    const p23 = buatPhase23PassSummary();
    for (const k of Object.keys(p23.targets) as Array<keyof typeof p23.targets>) {
      if (p23.targets[k]) p23.targets[k]!.generatedAt = new Date().toISOString();
    }

    // Mismatch commitSha
    const jobsMismatchSha = buatJobEvidencesFullPass('old-commit-sha', '999');
    const lapSha = evaluasiGerbangSertifikasi({
      commitSha: 'new-commit-sha',
      workflowRunId: '999',
      requireCiProvenance: true,
      phase23Summary: p23,
      demoBundleDir: demoDir,
      jobEvidences: jobsMismatchSha,
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS' },
    });
    pastikan(lapSha.overallStatus === 'FAIL' && lapSha.exitCode === 1, 'Harus menolak bukti dari commit SHA berbeda');

    // Stale evidence (> maxEvidenceAgeMs)
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const jobsStale = buatJobEvidencesFullPass('new-commit-sha', '999').map((j) => ({
      ...j,
      commitSha: 'new-commit-sha',
      workflowRunId: '999',
      generatedAt: staleDate,
    }));
    const lapStale = evaluasiGerbangSertifikasi({
      commitSha: 'new-commit-sha',
      workflowRunId: '999',
      requireCiProvenance: true,
      maxEvidenceAgeMs: 24 * 60 * 60 * 1000,
      phase23Summary: p23,
      demoBundleDir: demoDir,
      jobEvidences: jobsStale,
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS' },
    });
    pastikan(lapStale.overallStatus === 'FAIL' && lapStale.exitCode === 1, 'Harus menolak artefak lama di luar batas kesegaran');

    // Local snapshot cannot impersonate CI run
    const lapLocal = evaluasiGerbangSertifikasi({
      requireCiProvenance: true,
      phase23Summary: p23,
      demoBundleDir: demoDir,
      jobEvidences: buatJobEvidencesFullPass(),
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS' },
    });
    pastikan(lapLocal.overallStatus === 'FAIL' && lapLocal.exitCode === 1, 'Snapshot lokal tanpa commitSha/runId CI tidak boleh lolos mode CI provenance');
  });

  uji('11. Bukti Android APK/AAB dan iOS Simulator lulus hanya untuk cakupan CI, bukan hardware/store', () => {
    const demoDir = path.join(tmpBase, 'demo-simulator-only');
    buatBundelDummy(demoDir);
    const jobs = buatJobEvidencesFullPass();

    // Linux Xvfb bukan monitor fisik.
    jobs[0].isNativeHardware = false;

    // Android APK/AAB dan emulator valid, tetapi bukan perangkat ponsel fisik.
    jobs[3].details!.physicalDeviceHardwareVerified = false;

    // iOS Mach-O dan Simulator valid; tidak ada archive/IPA atau device signing.
    jobs[4].details!.physicalDeviceHardwareVerified = false;
    jobs[4].details!.xcarchiveBuilt = false;
    jobs[4].details!.ipaProduced = false;
    jobs[4].details!.adHocOrDevSigned = false;

    // Loopback TLS dan OTA regression pass; native SPKI/store integration tetap belum diverifikasi.
    jobs[5].details!.nativeSpkiPinningVerified = false;
    jobs[5].details!.playCoreAndStoreKitVerified = false;

    const lap = evaluasiGerbangSertifikasi({
      commitSha: 'deadbeef1234',
      workflowRunId: '999',
      phase23Summary: buatPhase23PassSummary(),
      demoBundleDir: demoDir,
      jobEvidences: jobs,
      testSuiteStatuses: { staticChecks: 'PASS', testSuite: 'PASS', qualityGate: 'PASS' },
    });

    pastikan(lap.phases['37'].status === 'PASS', 'APK/emulator dan Mach-O/Simulator yang tervalidasi harus meluluskan Phase 37');
    pastikan(lap.phases['38'].status === 'NOT_VERIFIED', 'Simulator tidak boleh mengklaim sensor perangkat fisik');
    pastikan(lap.phases['40'].status === 'NOT_VERIFIED', 'Tanpa .ipa nyata, Phase 40 harus tetap NOT_VERIFIED');
    const android40 = lap.phases['40'].criteria.find((c) => c.id === 'p40-android-dex-aab-apksigner');
    const ios40 = lap.phases['40'].criteria.find((c) => c.id === 'p40-ios-xcarchive-macho-ipa');
    const signing41 = lap.phases['41'].criteria.find((c) => c.id === 'p41-ephemeral-signing-sandbox');
    pastikan(Boolean(android40?.catatan?.includes('apkCompiledWithDex=')), 'Diagnostik Android harus menampilkan bukti DEX/AAB/apksigner aktual');
    pastikan(Boolean(ios40?.catatan?.includes('xcarchiveBuilt=') && ios40.catatan?.includes('ipaProduced=')), 'Diagnostik iOS harus membedakan Simulator .app dari archive/IPA');
    pastikan(Boolean(signing41?.catatan?.includes('apksignerVerified=') && signing41.catatan?.includes('adHocOrDevSigned=')), 'Diagnostik signing harus melaporkan bukti kedua platform secara terpisah');
    pastikan(lap.phases['41'].status === 'NOT_VERIFIED', 'Tanpa iOS device signing, Phase 41 harus tetap NOT_VERIFIED');
    pastikan(lap.phases['39'].status === 'NOT_VERIFIED', 'Tanpa native SPKI, Phase 39 harus tetap NOT_VERIFIED');
    pastikan(lap.phases['42'].status === 'NOT_VERIFIED', 'Tanpa Play Core/StoreKit, Phase 42 harus tetap NOT_VERIFIED');
    pastikan(lap.overallStatus === 'PARTIAL' && lap.exitCode === 1, 'Bukti simulator saja tidak boleh membuat seluruh gate CERTIFIED');
  });
} finally {
  fs.rmSync(tmpBase, { recursive: true, force: true });
}

console.log('\n======================================================================');
console.log(`  HASIL UJI CERTIFICATION GATE: ${totalLulus}/${totalUji} LULUS (${totalGagal} GAGAL)`);
console.log('======================================================================\n');

if (totalGagal > 0) process.exit(1);
