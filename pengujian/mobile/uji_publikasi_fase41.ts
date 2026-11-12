/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 41
 * Suite Pengujian Komprehensif Mobile App Store Integration & Automated Release
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import {
  PublishingManager,
  GooglePlayClient,
  PlayTrackManager,
  PlayValidation,
  PlayReleaseManager,
  AppStoreConnectClient,
  TestFlightManager,
  IOSValidation,
  AppStoreReleaseManager,
  AppMetadataManager,
  StoreListingManager,
  LocalizationManager,
  ScreenshotManager,
  ReleaseNotesManager,
  SecretProvider,
  CredentialValidator,
  CredentialManager,
  ApprovalGate,
  ReleasePipeline,
  RollbackPlanner,
  ComplianceValidator,
  ReleaseReadiness,
  StoreValidator,
  PublishingHistoryManager,
  PublishingReportGenerator,
  StoreRegistry,
} from '../../src/mobile/publishing';
import { MobileCLI } from '../../src/mobile/cli/mobile_cli';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { Parser } from '../../src/parser/parser';
import { Lexer } from '../../src/lexer/lexer';

let totalUji = 0;
let ujiLulus = 0;

function pastikan(kondisi: boolean, pesan: string): void {
  totalUji++;
  if (!kondisi) {
    console.error(`  [✗ GAGAL] ${pesan}`);
    throw new Error(`Uji gagal: ${pesan}`);
  }
  ujiLulus++;
  console.log(`  [✓ LULUS] ${pesan}`);
}

async function jalankanSemuaPengujianFase41() {
  console.log('======================================================================');
  console.log('PENGUJIAN FASE 41 — MOBILE APP STORE INTEGRATION & AUTOMATED RELEASE');
  console.log('Target Versi: v0.41.0');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // [1] Keamanan Kredensial & Penyamaran Rahasia (Anti-Leak)
  // -------------------------------------------------------------------------
  console.log('[1] Keamanan Kredensial & Anti-Leak (SecretProvider & Validator)');
  {
    const maskedString = SecretProvider.samarkan('super-secret-key-12345');
    pastikan(maskedString.startsWith('su') && maskedString.endsWith('45'), 'String rahasia harus disamarkan tengahnya');
    pastikan(!maskedString.includes('secret'), 'Kata kunci rahasia tidak boleh muncul dalam string tersamar');

    const emailMasked = SecretProvider.samarkanEmail('play-deployer@my-cloud-project.iam.gserviceaccount.com');
    pastikan(emailMasked.includes('pl***r@my-cloud-project.iam.gserviceaccount.com'), 'Email service account harus disamarkan');

    const rawPem = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----';
    const pemMasked = SecretProvider.samarkan(rawPem);
    pastikan(pemMasked.includes('[KUNCI PRIVAT DISEMIRINGKAN / DIRAHASIAKAN]'), 'Kunci PEM harus disensor total');

    const logWithBearer = 'Sending request to API with Authorization: Bearer eyJhbGciOiJFUzI1NiIsImtp...';
    const logClean = SecretProvider.bersihkanLogDariRahasia(logWithBearer);
    pastikan(logClean.includes('Bearer [TOKEN_DIRAHASIAKAN]'), 'Bearer token harus disaring dari log');

    // Validasi Service Account Google
    const validSa = CredentialValidator.validasiServiceAccountGoogle({
      type: 'service_account',
      project_id: 'nusantara-mobile-prod',
      client_email: 'deployer@nusantara-mobile-prod.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nABC123\n-----END PRIVATE KEY-----',
    });
    pastikan(validSa.valid, 'Service account valid harus dinyatakan valid');

    const invalidSa = CredentialValidator.validasiServiceAccountGoogle({
      type: 'user_account',
      client_email: 'bukan-email-sah',
    });
    pastikan(!invalidSa.valid && invalidSa.daftarGalat.length >= 2, 'Service account tidak sah harus ditolak');

    // Validasi Kredensial App Store Connect
    const validAsc = CredentialValidator.validasiAppStoreConnect(
      '57246542-96fe-1a63-e053-0824d011072a',
      '2X9R4HXF34',
      '-----BEGIN PRIVATE KEY-----\nEC_KEY\n-----END PRIVATE KEY-----'
    );
    pastikan(validAsc.valid, 'Kredensial App Store Connect lengkap harus valid');

    const invalidAsc = CredentialValidator.validasiAppStoreConnect('', 'KEY', '');
    pastikan(!invalidAsc.valid, 'Kredensial ASC kosong harus ditolak');

    // Anti-Hardcoded Secret Scanner
    const kodeBermasalah = 'const key = "-----BEGIN RSA PRIVATE KEY-----\\nSECRET";';
    const scanResult = CredentialValidator.periksaBebasHardcode(kodeBermasalah);
    pastikan(!scanResult.aman && scanResult.temuan.length > 0, 'Pemindai harus mendeteksi kunci privat yang di-hardcode');
  }

  // -------------------------------------------------------------------------
  // [2] Google Play Developer API & Track Management
  // -------------------------------------------------------------------------
  console.log('\n[2] Google Play Developer API & Track Management');
  {
    const client = new GooglePlayClient({
      applicationId: 'id.nusantara.aplikasi',
      packageName: 'id.nusantara.aplikasi',
      defaultTrack: 'internal',
      autoCommitEdit: false,
    });

    const statusKoneksi = await client.ujiKoneksi();
    pastikan(statusKoneksi.packageName === 'id.nusantara.aplikasi', 'Package name harus sesuai');
    pastikan(statusKoneksi.modeSandbox, 'Tanpa env resmi, client harus berjalan di Sandbox aman');

    const editRes = await client.buatEdit(true);
    pastikan(editRes.sukses && editRes.editId !== undefined, 'Pembuatan Edit API harus berhasil');

    const uploadRes = await client.unggahAAB(
      'dist/mobile/android/release/app.aab',
      1,
      'abc123sha256',
      1024 * 1024,
      'internal',
      true
    );
    pastikan(uploadRes.sukses && uploadRes.versionCode === 1, 'Upload AAB ke edit harus berhasil');

    // Validasi Kelayakan Play Store
    const valPlay = PlayValidation.validasiKelayakan({
      packageName: 'id.nusantara.aplikasi',
      versionCode: 2,
      targetSdk: 34,
      track: 'internal',
      versiLamaMaxCode: 1,
      namaBerkasAAB: 'app.aab',
    });
    pastikan(valPlay.valid, 'Validasi rilis Play Store sah harus lulus');

    const valPlayTargetSdkRendah = PlayValidation.validasiKelayakan({
      packageName: 'id.nusantara.aplikasi',
      versionCode: 3,
      targetSdk: 31, // Di bawah kebijakan minimal 34
      track: 'internal',
    });
    pastikan(!valPlayTargetSdkRendah.valid, 'Target SDK di bawah 34 harus ditolak untuk rilis Google Play baru');

    const valPlayVersionCodeTurun = PlayValidation.validasiKelayakan({
      packageName: 'id.nusantara.aplikasi',
      versionCode: 1,
      targetSdk: 34,
      track: 'internal',
      versiLamaMaxCode: 2,
    });
    pastikan(!valPlayVersionCodeTurun.valid, 'Version code tidak boleh turun atau sama dengan rilis sebelumnya');

    // Track Manager
    const trackMgr = new PlayTrackManager(client);
    const tracks = await trackMgr.dapatkanSemuaTrack();
    pastikan(tracks.length === 4, 'Harus ada 4 track resmi (internal, closed, open, production)');

    const resTrack = await trackMgr.tetapkanRilisTrack({
      track: 'internal',
      versionCode: 2,
      userFraction: 1.0,
    });
    pastikan(resTrack.sukses && resTrack.rilis.versionCodes.includes(2), 'Track internal harus memuat version code baru');

    const resPromo = await trackMgr.promosikanBuild('internal', 'closed', 2);
    pastikan(resPromo.sukses, 'Promosi build dari internal ke closed testing harus berhasil');
  }

  // -------------------------------------------------------------------------
  // [3] App Store Connect API & TestFlight Management
  // -------------------------------------------------------------------------
  console.log('\n[3] App Store Connect API & TestFlight Management');
  {
    const client = new AppStoreConnectClient({
      bundleId: 'id.nusantara.aplikasi',
      defaultChannel: 'testflight',
    });

    const statusAsc = await client.ujiKoneksi();
    pastikan(statusAsc.bundleId === 'id.nusantara.aplikasi', 'Bundle ID harus cocok');
    pastikan(statusAsc.modeSandbox, 'Tanpa kunci fisik, koneksi harus berjalan dalam mode sandbox aman');

    const jwtData = client.buatTokenJWTHeaderPayload();
    pastikan(jwtData.header.alg === 'ES256', 'Header JWT Apple harus menggunakan algoritma ES256');
    pastikan(jwtData.payload.aud === 'appstoreconnect-v1', 'Audience JWT harus appstoreconnect-v1');

    const uploadAsc = await client.unggahBuild(
      'dist/mobile/ios/archive/app.xcarchive',
      '1.0.0',
      1,
      2048 * 1024,
      'sha256ios',
      true
    );
    pastikan(uploadAsc.sukses, 'Upload build iOS ke App Store Connect harus sukses');

    // TestFlight Manager
    const tfMgr = new TestFlightManager(client);
    const resBeta = await tfMgr.siapkanRilisBeta({
      buildVersion: '1.0.0',
      buildNumber: 1,
      catatanBeta: { id: 'Mohon uji fitur autentikasi dan sinkronisasi data.' },
      aktifkanEksternal: true,
    });
    pastikan(resBeta.sukses, 'Persiapan rilis beta TestFlight harus sukses');
    pastikan(resBeta.infoBeta.statusProcessing === 'ready_for_testflight', 'Status processing TestFlight harus siap');
    pastikan(resBeta.infoBeta.grupPenguji.length >= 2, 'Grup penguji internal harus terdaftar');
    pastikan(Boolean(resBeta.infoBeta.tanggalKedaluwarsa), 'Tanggal kedaluwarsa 90 hari harus terhitung');

    // Validasi iOS
    const valIos = IOSValidation.validasiKelayakan({
      bundleId: 'id.nusantara.aplikasi',
      version: '1.0.0',
      buildNumber: 1,
      deploymentTarget: '15.0',
      hasExportComplianceDeclaration: true,
    });
    pastikan(valIos.valid, 'Validasi rilis iOS sah harus lulus');

    const valIosInvalid = IOSValidation.validasiKelayakan({
      bundleId: 'invalid_bundle_name',
      version: '1.0.0',
      buildNumber: 0,
    });
    pastikan(!valIosInvalid.valid, 'Bundle ID salah atau build number 0 harus ditolak');
  }

  // -------------------------------------------------------------------------
  // [4] Metadata Toko, Lokalisasi & Aset Grafis
  // -------------------------------------------------------------------------
  console.log('\n[4] Metadata Toko, Lokalisasi & Aset Grafis');
  {
    const defaultMeta = AppMetadataManager.buatDefaultMetadata();
    const valMeta = AppMetadataManager.validasiMetadata(defaultMeta);
    pastikan(valMeta.valid, 'Default metadata harus valid 100%');
    pastikan(valMeta.skorKelengkapan === 100, 'Skor kelengkapan metadata harus 100%');

    // Uji Batas Karakter Google Play (Nama maks 30, Deskripsi Singkat maks 80)
    const metaJudulPanjang = AppMetadataManager.buatDefaultMetadata();
    metaJudulPanjang.listingPerLocale.id.namaAplikasi = 'Nama Aplikasi Ini Sangat Panjang Melebihi Tiga Puluh Karakter Resmi';
    const valJudulPanjang = AppMetadataManager.validasiMetadata(metaJudulPanjang);
    pastikan(!valJudulPanjang.valid, 'Nama aplikasi melebihi 30 karakter harus ditolak');

    // Uji Lokalisasi
    const daftarBahasa = LocalizationManager.dapatkanDaftarBahasa();
    pastikan(daftarBahasa.length >= 7, 'Harus mendukung minimal 7 bahasa (id, en, ms, ar, ja, zh, es)');

    const kelengkapan = LocalizationManager.validasiKelengkapan(defaultMeta.listingPerLocale, ['id', 'en']);
    pastikan(kelengkapan.bahasaHilang.includes('en'), 'Harus mendeteksi bahasa wajib yang belum diterjemahkan');

    // Fallback translation
    const fallbackEn = LocalizationManager.buatListingFallback(defaultMeta.listingPerLocale.id, 'en');
    pastikan(fallbackEn.locale === 'en', 'Fallback locale harus en');

    // Uji Aset Screenshot & Ikon
    const mockAset = ScreenshotManager.buatMockDaftarAset();
    const valAset = ScreenshotManager.validasiSemuaAset(mockAset);
    pastikan(valAset.valid, 'Kumpulan mock aset standar harus valid');
    pastikan(valAset.asetValid === mockAset.length, 'Seluruh aset mock harus terverifikasi');

    // Aset ukuran salah
    const asetIkonSalah: any = {
      tipe: 'ikon_aplikasi',
      platform: 'android',
      locale: 'id',
      jalurBerkas: 'aset/ikon/ikon-salah.png',
      lebar: 300, // Harus 512
      tinggi: 300,
      ukuranKb: 100,
      format: 'png',
    };
    const valAsetSalah = ScreenshotManager.validasiBerkasAset(asetIkonSalah);
    pastikan(!valAsetSalah.valid, 'Ikon non-512x512 harus ditolak');

    // Release Notes Generator
    const notesChangelog = ReleaseNotesManager.buatDraftCatatanRilis(
      '1.0.0',
      1,
      'changelog',
      '## [1.0.0] - 2026-11-02\n- Fitur baru: Kompilasi AAB otomatis\n- Peningkatan: Kecepatan startup aplikasi\n- Perbaikan: Masalah memori pada cache'
    );
    pastikan(notesChangelog.valid, 'Catatan rilis dari changelog harus valid');
    pastikan(notesChangelog.karakterPerLocale['id'] <= 500, 'Catatan rilis tidak boleh melebihi 500 karakter');

    const notesGit = ReleaseNotesManager.buatDraftCatatanRilis(
      '1.0.0',
      1,
      'git',
      'feat: integrasi Google Play API\nfix: perbaiki token kedaluwarsa\nchore: internal refactor'
    );
    pastikan(notesGit.kontenPerLocale['id'].includes('Fitur baru'), 'Pesan commit konvensional harus diformat rapi');
    pastikan(!notesGit.kontenPerLocale['id'].includes('chore: internal refactor'), 'Commit internal harus disaring');
  }

  // -------------------------------------------------------------------------
  // [5] Release Pipeline Otomatis (11 Tahap) & Gerbang Persetujuan (Approval Gate)
  // -------------------------------------------------------------------------
  console.log('\n[5] Release Pipeline Otomatis & Approval Gate');
  {
    const approvalGate = ApprovalGate.dapatkanInstance();

    // Buat permintaan persetujuan
    const req = approvalGate.buatPermintaan({
      tipeAksi: 'luncurkan_rilis_produksi',
      namaAplikasi: 'Aplikasi Nusantara',
      platform: 'android',
      versi: '1.0.0',
      versionCodeAtauBuild: 1,
      trackAtauChannel: 'production',
      berkasBinary: 'app.aab',
      ukuranBinaryKb: 1500,
      sha256Binary: 'sha256test',
      tujuanDistribusi: 'Google Play Store Production',
      dampakTindakan: 'Aplikasi akan tersedia untuk seluruh pengguna publik di Play Store.',
      akunTokoTujuan: 'nu***@nusantara.dev',
    });

    pastikan(req.status === 'menunggu', 'Status permintaan baru harus menunggu');
    pastikan(approvalGate.dapatkanAntreanMenunggu().length >= 1, 'Antrean persetujuan harus mencatat permintaan');

    const ringkasanTeks = approvalGate.formatRingkasanTeks(req);
    pastikan(ringkasanTeks.includes('PERSETUJUAN PUBLIKASI RILIS'), 'Ringkasan persetujuan harus memuat teks header');

    // Tolak permintaan pertama
    const okTolak = approvalGate.tolak(req.id, 'Uji coba penolakan rilis.');
    pastikan(okTolak, 'Penolakan rilis harus berhasil dicatat');

    // Pipeline Eksekusi
    const pipeline = new ReleasePipeline();
    const resPipeAuto = await pipeline.jalankan({
      platform: 'keduanya',
      otomatisSetujuiNonProduksi: true,
      modeSimulasi: true,
    });
    pastikan(resPipeAuto.totalTahap === 11, 'Pipeline harus memiliki 11 tahap');
    pastikan(resPipeAuto.sukses, 'Pipeline dengan auto-approve non-produksi harus berhasil');
    pastikan(resPipeAuto.tahapSelesai === 11, 'Seluruh 11 tahap harus selesai');

    // Pipeline dengan mode Hanya-Validasi
    const pipelineValOnly = new ReleasePipeline();
    const resValOnly = await pipelineValOnly.jalankan({
      platform: 'keduanya',
      hanyaValidasi: true,
    });
    pastikan(resValOnly.sukses, 'Pipeline hanya-validasi harus sukses');
    const tahapUpload = resValOnly.daftarTahap.find((t) => t.tahap === 'upload_toko');
    pastikan(tahapUpload?.status === 'skipped', 'Tahap upload toko harus dilewati pada mode validasi');

    // Rollback Planner
    const planRollback = RollbackPlanner.susunRencanaRollback({
      platform: 'android',
      versiBermasalah: '1.0.0',
      versionCodeBermasalah: 10,
      versiStabilSebelumnya: '0.9.0',
      trackAtauChannel: 'production',
    });
    pastikan(planRollback.versionCodeBaruWajib === 11, 'Versi baru rollback wajib menaikkan version code');
    pastikan(!planRollback.dapatDitarikLangsung, 'Harus menyatakan secara jujur toko aplikasi tidak bisa downgrade langsung');
    pastikan(planRollback.prosedurPemulihan.length >= 5, 'Harus menyediakan prosedur pemulihan langkah demi langkah');
  }

  // -------------------------------------------------------------------------
  // [6] Kepatuhan Toko (Compliance) & Kesiapan Rilis
  // -------------------------------------------------------------------------
  console.log('\n[6] Kepatuhan Toko & Kesiapan Rilis');
  {
    const auditKepatuhan = ComplianceValidator.periksaKepatuhan({
      packageName: 'id.nusantara.aplikasi',
      targetSdk: 34,
      privacyPolicyUrl: 'https://nusantara.dev/privasi',
      hasAccountCreation: true,
      hasAccountDeletionMechanism: true,
      declaredPermissions: ['android.permission.INTERNET'],
    });

    pastikan(auditKepatuhan.siapRilis, 'Audit kepatuhan penuh harus siap rilis');
    pastikan(auditKepatuhan.skorKepatuhan === 100, 'Skor kepatuhan harus 100%');

    // Kasus melanggar (tanpa URL privasi)
    const auditMelanggar = ComplianceValidator.periksaKepatuhan({
      packageName: 'id.nusantara.aplikasi',
      targetSdk: 34,
      privacyPolicyUrl: '', // Kosong
      hasAccountCreation: true,
      hasAccountDeletionMechanism: false,
      declaredPermissions: [],
    });
    pastikan(!auditMelanggar.siapRilis, 'Audit tanpa URL privasi harus berstatus tidak siap rilis');
    pastikan(auditMelanggar.melanggar >= 1, 'Harus ada pelanggaran yang dicatat');

    // Release Readiness
    const readiness = ReleaseReadiness.periksaKesiapan({
      apakahAdaBinaryAndroid: true,
      apakahAdaBinaryIOS: true,
      apakahSigningAndroidValid: true,
      apakahSigningIOSValid: true,
      apakahMetadataValid: true,
      laporanKepatuhan: auditKepatuhan,
    });
    pastikan(readiness.siapRilis, 'Kesiapan rilis harus SIAP');
    pastikan(readiness.statusPlatform.android === 'SIAP', 'Platform Android harus SIAP');
    pastikan(readiness.statusPlatform.ios === 'SIAP', 'Platform iOS harus SIAP');

    // Store Validator Facade
    const meta = AppMetadataManager.buatDefaultMetadata();
    const resKomprehensif = StoreValidator.validasiKomprehensif({
      metadata: meta,
      packageName: meta.aplikasiId,
      targetSdk: 34,
      apakahAdaAAB: true,
      apakahAdaArchiveIOS: true,
      apakahSigningAndroidValid: true,
      apakahSigningIOSValid: true,
    });
    pastikan(resKomprehensif.valid, 'Validasi komprehensif store validator harus valid');
  }

  // -------------------------------------------------------------------------
  // [7] Riwayat Audit & Laporan Publikasi
  // -------------------------------------------------------------------------
  console.log('\n[7] Riwayat Audit & Laporan Publikasi');
  {
    const historyMgr = PublishingHistoryManager.dapatkanInstance();
    historyMgr.bersihkanRiwayat();

    const entri = historyMgr.catatAksi({
      platform: 'android',
      versi: '1.0.0',
      versionCode: 1,
      trackAtauChannel: 'internal',
      status: 'sukses',
      aksi: 'UPLOAD_AAB_INTERNAL',
      namaBerkas: 'app.aab',
      sha256: 'abc123sha256',
      akunTarget: 'Google Play Internal',
      pesan: 'AAB berhasil diunggah ke track internal.',
      eksekutor: 'Test Runner',
      modeSandbox: true,
    });

    pastikan(entri.id.startsWith('pub_'), 'ID entri riwayat harus memiliki awalan pub_');
    pastikan(historyMgr.dapatkanRiwayat().length === 1, 'Riwayat harus mencatat 1 entri');

    // Laporan Publikasi
    const pub = PublishingManager.dapatkanInstance();
    const lap = pub.buatLaporanPublikasi();
    pastikan(lap.idLaporan.startsWith('lap_'), 'ID Laporan harus berawalan lap_');
    pastikan(lap.statusPublikasi === 'siap_diunggah', 'Status publikasi default harus siap_diunggah');

    const md = PublishingReportGenerator.formatKeMarkdown(lap);
    pastikan(md.includes('LAPORAN PUBLIKASI RILIS APLIKASI (NUSANTARA)'), 'Markdown laporan harus memuat judul resmi');
    pastikan(!md.includes('private_key') && !md.includes('password'), 'Laporan tidak boleh memuat kata sandi rahasia');
  }

  // -------------------------------------------------------------------------
  // [8] Integrasi CLI Nusantara Mobile Store
  // -------------------------------------------------------------------------
  console.log('\n[8] Integrasi CLI Nusantara Mobile Store');
  {
    // nusantara mobile store periksa
    const kodePeriksa = MobileCLI.jalankan(['store', 'periksa']);
    pastikan(kodePeriksa === 0, 'Perintah CLI "store periksa" harus keluar kode 0');

    // nusantara mobile store koneksi android & ios
    const kodeKoneksiAndroid = MobileCLI.jalankan(['store', 'koneksi', 'android']);
    pastikan(kodeKoneksiAndroid === 0, 'Perintah CLI "store koneksi android" harus keluar kode 0');

    const kodeKoneksiIos = MobileCLI.jalankan(['store', 'koneksi', 'ios']);
    pastikan(kodeKoneksiIos === 0, 'Perintah CLI "store koneksi ios" harus keluar kode 0');

    // nusantara mobile store android metadata, validasi, track
    const kodePlayMeta = MobileCLI.jalankan(['store', 'android', 'metadata']);
    pastikan(kodePlayMeta === 0, 'Perintah CLI "store android metadata" harus keluar kode 0');

    const kodePlayVal = MobileCLI.jalankan(['store', 'android', 'validasi']);
    pastikan(kodePlayVal === 0, 'Perintah CLI "store android validasi" harus keluar kode 0');

    const kodePlayTrack = MobileCLI.jalankan(['store', 'android', 'track']);
    pastikan(kodePlayTrack === 0, 'Perintah CLI "store android track" harus keluar kode 0');

    // nusantara mobile store android release production (tanpa --setujui harus ditolak)
    const kodePlayProdDitolak = MobileCLI.jalankan(['store', 'android', 'release', 'production']);
    pastikan(kodePlayProdDitolak === 1, 'Rilis production tanpa --setujui harus ditolak demi keamanan');

    // nusantara mobile store android release production (dengan --setujui harus berhasil)
    const kodePlayProdDisetujui = MobileCLI.jalankan(['store', 'android', 'release', 'production', '--setujui']);
    pastikan(kodePlayProdDisetujui === 0, 'Rilis production dengan --setujui harus berhasil disetujui');

    // nusantara mobile store ios metadata, validasi, testflight
    const kodeIosMeta = MobileCLI.jalankan(['store', 'ios', 'metadata']);
    pastikan(kodeIosMeta === 0, 'Perintah CLI "store ios metadata" harus keluar kode 0');

    const kodeIosVal = MobileCLI.jalankan(['store', 'ios', 'validasi']);
    pastikan(kodeIosVal === 0, 'Perintah CLI "store ios validasi" harus keluar kode 0');

    const kodeIosTf = MobileCLI.jalankan(['store', 'ios', 'testflight']);
    pastikan(kodeIosTf === 0, 'Perintah CLI "store ios testflight" harus keluar kode 0');

    // nusantara mobile store aset & release-notes
    const kodeAset = MobileCLI.jalankan(['store', 'aset']);
    pastikan(kodeAset === 0, 'Perintah CLI "store aset" harus keluar kode 0');

    const kodeNotes = MobileCLI.jalankan(['store', 'release-notes']);
    pastikan(kodeNotes === 0, 'Perintah CLI "store release-notes" harus keluar kode 0');

    // nusantara mobile store pipeline
    const kodePipePeriksa = MobileCLI.jalankan(['store', 'pipeline', 'periksa']);
    pastikan(kodePipePeriksa === 0, 'Perintah CLI "store pipeline periksa" harus keluar kode 0');

    const kodePipeRun = MobileCLI.jalankan(['store', 'pipeline', 'jalankan']);
    pastikan(kodePipeRun === 0, 'Perintah CLI "store pipeline jalankan" harus keluar kode 0');

    // nusantara mobile store history & laporan
    const kodeHistory = MobileCLI.jalankan(['store', 'history']);
    pastikan(kodeHistory === 0, 'Perintah CLI "store history" harus keluar kode 0');

    const kodeLaporan = MobileCLI.jalankan(['store', 'laporan']);
    pastikan(kodeLaporan === 0, 'Perintah CLI "store laporan" harus keluar kode 0');
  }

  // -------------------------------------------------------------------------
  // [9] Eksekusi Program .nusantara (Standard Library std:mobile)
  // -------------------------------------------------------------------------
  console.log('\n[9] Eksekusi Program .nusantara (Standard Library std:mobile Store Integration)');
  {
    const kodeSumber = `
      gunakan "std:mobile" sebagai seluler
      
      program UjiPublikasiToko
      mulai
        // 1. Periksa kesiapan rilis toko
        kesiapan : peta = seluler.periksaKesiapanTokoMobile()
        tampilkan("Status Toko:", kesiapan["valid"])
        tampilkan("Skor Kesiapan:", kesiapan["skorKesiapan"])
        
        // 2. Buat catatan rilis otomatis
        catatan : peta = seluler.buatCatatanRilisMobile("1.0.0", 1)
        tampilkan("Versi Catatan:", catatan["versi"])
        
        // 3. Buat laporan publikasi
        laporan : peta = seluler.buatLaporanPublikasiMobile()
        tampilkan("Laporan ID:", laporan["applicationId"])
        tampilkan("Status Laporan:", laporan["status"])
      selesai
    `;

    const bufferOutput = new PenulisOutputBuffer();
    const interpreter = new Interpreter(bufferOutput);
    interpreter.jalankanKode(kodeSumber);

    const output = bufferOutput.dapatkanSeluruhTeks().join('\n');
    pastikan(output.includes('Status Toko: true') || output.includes('Status Toko: benar'), 'Program .nusantara harus memeriksa kesiapan toko');
    pastikan(output.includes('Versi Catatan: 1.0.0'), 'Program .nusantara harus menghasilkan catatan rilis');
    pastikan(output.includes('Laporan ID: id.nusantara.aplikasi'), 'Program .nusantara harus menghasilkan laporan publikasi');
  }

  // -------------------------------------------------------------------------
  // [10] Integrasi Loopback HTTP REST + Tanda Tangan Kriptografis JWT Nyata
  // -------------------------------------------------------------------------
  console.log('\n[10] Loopback HTTP REST Store API & Tanda Tangan Kriptografis JWT (RS256/ES256)');
  {
    const rsaPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const rsaPubPem = rsaPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const rsaPrivPem = rsaPair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

    const ecPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const ecPubPem = ecPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const ecPrivPem = ecPair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

    const permintaanTercatat: string[] = [];
    const tmpAab = path.join(os.tmpdir(), `nusantara-p41-test-${Date.now()}.aab`);
    fs.writeFileSync(tmpAab, Buffer.from('PK\x03\x04AAB_TEST_PAYLOAD'));

    const server = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const bodyBuf = Buffer.concat(chunks);
        permintaanTercatat.push(`${req.method} ${urlPath}`);
        res.setHeader('Content-Type', 'application/json');

        // Google Play loopback endpoints
        if (req.method === 'POST' && urlPath === '/play/id.nusantara.test/edits') {
          const authHdr = String(req.headers['authorization'] || '');
          const token = authHdr.replace(/^Bearer\s+/, '');
          const parts = token.split('.');
          const okSig = parts.length === 3 && crypto.verify(
            'RSA-SHA256',
            Buffer.from(`${parts[0]}.${parts[1]}`),
            rsaPubPem,
            Buffer.from(parts[2], 'base64url')
          );
          if (!okSig) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: { message: 'Invalid RS256 JWT' } }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ id: 'edit_live_9001' }));
          return;
        }

        if (req.method === 'POST' && urlPath === '/play/id.nusantara.test/edits/edit_live_9001/bundles') {
          res.statusCode = 200;
          res.end(JSON.stringify({ versionCode: 42, size: bodyBuf.length }));
          return;
        }

        if (req.method === 'PUT' && urlPath === '/play/id.nusantara.test/edits/edit_live_9001/tracks/internal') {
          res.statusCode = 200;
          res.end(JSON.stringify({ track: 'internal' }));
          return;
        }

        if (req.method === 'GET' && urlPath === '/play/id.nusantara.test/edits/edit_live_9001/tracks/internal') {
          res.statusCode = 200;
          res.end(JSON.stringify({ track: 'internal', releases: [{ versionCodes: ['42'], status: 'inProgress' }] }));
          return;
        }

        if (req.method === 'POST' && urlPath === '/play/id.nusantara.test/edits/edit_live_9001:commit') {
          res.statusCode = 200;
          res.end(JSON.stringify({ committed: true }));
          return;
        }

        // App Store Connect loopback endpoints (verify ES256 ECDSA IEEE-P1363 JWT)
        if (urlPath.startsWith('/asc/')) {
          const authHdr = String(req.headers['authorization'] || '');
          const token = authHdr.replace(/^Bearer\s+/, '');
          const parts = token.split('.');
          const okEs256 = parts.length === 3 && crypto.verify(
            'sha256',
            Buffer.from(`${parts[0]}.${parts[1]}`),
            { key: ecPubPem, dsaEncoding: 'ieee-p1363' },
            Buffer.from(parts[2], 'base64url')
          );
          if (!okEs256) {
            res.statusCode = 401;
            res.end(JSON.stringify({ errors: [{ status: '401', title: 'Invalid ES256 JWT' }] }));
            return;
          }
          if (req.method === 'GET' && urlPath === '/asc/apps') {
            res.statusCode = 200;
            res.end(JSON.stringify({ data: [{ id: 'app_1', type: 'apps' }] }));
            return;
          }
          if (req.method === 'POST' && urlPath === '/asc/builds') {
            res.statusCode = 201;
            res.end(JSON.stringify({ accepted: true }));
            return;
          }
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not Found' }));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as any;

    try {
      const gp = new GooglePlayClient({
        applicationId: 'id.nusantara.test',
        packageName: 'id.nusantara.test',
        defaultTrack: 'internal',
        autoCommitEdit: false,
        endpointApi: `http://127.0.0.1:${addr.port}/play`,
        kunciPrivatPem: rsaPrivPem,
      });

      const edit = await gp.buatEdit(false);
      pastikan(edit.sukses && edit.editId === 'edit_live_9001', 'GooglePlayClient buatEdit HTTP + RS256 JWT harus berhasil');

      const expectedBytes = fs.statSync(tmpAab).size;
      const upload = await gp.unggahAAB(tmpAab, 42, 'abcsha256', expectedBytes, 'internal', false);
      pastikan(upload.sukses && !upload.modeSandbox && upload.ukuranBytes === expectedBytes, 'GooglePlayClient unggahAAB HTTP octet-stream harus berhasil');

      const track = await gp.dapatkanStatusTrack('internal', false);
      pastikan(track.versionCodes[0] === 42 && track.status === 'inProgress', 'GooglePlayClient GET track HTTP harus mencerminkan status server');

      const committed = await gp.commitEdit(false);
      pastikan(committed.sukses, 'GooglePlayClient commitEdit HTTP harus berhasil');

      const asc = new AppStoreConnectClient({
        bundleId: 'id.nusantara.test',
        defaultChannel: 'testflight',
        endpointApi: `http://127.0.0.1:${addr.port}/asc`,
        kunciPrivatPem: ecPrivPem,
      });

      const verifAsc = await asc.verifikasiAksesAPIHttp();
      pastikan(verifAsc.sukses && verifAsc.statusHTTP === 200, 'AppStoreConnectClient verifikasi ES256 JWT via HTTP GET /apps harus berhasil');

      const buildRes = await asc.unggahBuild('/tmp/app.ipa', '1.0.0', 42, 2048, 'sha256hex', false);
      pastikan(buildRes.sukses && !buildRes.modeSandbox, 'AppStoreConnectClient POST /builds via HTTP harus berhasil');
      pastikan(permintaanTercatat.includes('POST /play/id.nusantara.test/edits/edit_live_9001/bundles'), 'Server loopback harus menerima unggahan AAB nyata');
    } finally {
      if (fs.existsSync(tmpAab)) fs.unlinkSync(tmpAab);
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  console.log('\n======================================================================');
  console.log(`HASIL PENGUJIAN FASE 41: ${ujiLulus}/${totalUji} LULUS`);
  console.log('Semua pengujian Fase 41 BERHASIL 100%!');
  console.log('======================================================================\n');
}

jalankanSemuaPengujianFase41().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
