/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Pengujian Komprehensif Mobile App Distribution & Publishing
 * Target Versi Bahasa: v0.40.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import {
  DistributionManager,
  AndroidDistributionManager,
  IOSDistributionManager,
  VersionManager,
  AssetValidator,
  IconManager,
  SplashManager,
  AndroidSigningManager,
  CodeSigningManager,
  ProvisioningManager,
  AndroidManifestManager,
  APKBuilder,
  AABBuilder,
  ArchiveManager,
  BuildValidator,
  SigningValidator,
  ReleaseValidator,
  BuildReportGenerator,
  ReleaseReportGenerator,
  MobileCLI,
} from '../../src/mobile';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function pastikan(kondisi: boolean, pesan: string): void {
  totalUji++;
  if (!kondisi) {
    totalGagal++;
    console.error(`  [✗ GAGAL] ${pesan}`);
    throw new Error(`Penegasan Gagal: ${pesan}`);
  } else {
    totalLulus++;
    console.log(`  [✓ LULUS] ${pesan}`);
  }
}

function samaDengan<T>(nilaiAktual: T, nilaiHarapan: T, pesan: string): void {
  totalUji++;
  if (nilaiAktual !== nilaiHarapan) {
    totalGagal++;
    console.error(`  [✗ GAGAL] ${pesan} (Diharapkan: ${nilaiHarapan}, Ditemukan: ${nilaiAktual})`);
    throw new Error(`Nilai tidak cocok: diharapkan '${nilaiHarapan}', ditemukan '${nilaiAktual}'`);
  } else {
    totalLulus++;
    console.log(`  [✓ LULUS] ${pesan}`);
  }
}

function uji(nama: string, fn: () => void): void {
  try {
    fn();
  } catch (err: any) {
    console.error(`Kesalahan pada uji: "${nama}": ${err.message}`);
  }
}

async function jalankanSemuaUji(): Promise<void> {
  console.log('======================================================================');
  console.log('PENGUJIAN KOMPREHENSIF FASE 40: NUSANTARA MOBILE DISTRIBUTION & PUBLISHING');
  console.log('Target Versi Bahasa: v0.40.0 (Fase 40)');
  console.log('======================================================================');

  const distMgr = DistributionManager.dapatkanInstance();
  const konfig = distMgr.dapatkanKonfigurasi();

  // ---------------------------------------------------------------------------
  // [1] Konfigurasi Proyek & Validasi ID/Nama
  // ---------------------------------------------------------------------------
  console.log('\n[1] Konfigurasi Proyek & Validasi ID/Nama');
  uji('1.1 Validasi format Package Name Android & Bundle Identifier iOS', () => {
    const pkgSah = AndroidDistributionManager.periksaLingkungan();
    pastikan(pkgSah !== null, 'Pemeriksaan Android harus mengembalikan objek');

    const konfigValid = distMgr.dapatkanKonfigurasi();
    pastikan(Boolean(konfigValid.aplikasi.id), 'Application ID harus tersedia');
    samaDengan(konfigValid.android.targetSdk, 34, 'Target SDK bawaan harus 34');
    samaDengan(konfigValid.ios.deploymentTarget, '15.0', 'iOS deployment target bawaan harus 15.0');
  });

  uji('1.2 Penanganan Package Name Android yang tidak valid', () => {
    const cek1 = AndroidManifestManager.validasiManifes({
      ...konfig,
      aplikasi: { ...konfig.aplikasi, id: 'namatunggal' },
    });
    pastikan(!cek1.valid, 'Package name tanpa titik harus ditolak');

    const cek2 = AndroidManifestManager.validasiManifes({
      ...konfig,
      aplikasi: { ...konfig.aplikasi, id: 'android.aplikasi' },
    });
    pastikan(!cek2.valid, 'Package name dengan awalan android. harus ditolak');
  });

  // ---------------------------------------------------------------------------
  // [2] Pengelola Versi Semantik & Release Channel (VersionManager)
  // ---------------------------------------------------------------------------
  console.log('\n[2] Pengelola Versi Semantik & Release Channel (VersionManager)');
  uji('2.1 Penguraian format SemVer resmi', () => {
    const sem = VersionManager.periksaSemver('1.2.3');
    pastikan(sem.valid, 'Format 1.2.3 harus valid');
    samaDengan(sem.mayor, 1, 'Mayor harus 1');
    samaDengan(sem.minor, 2, 'Minor harus 2');
    samaDengan(sem.patch, 3, 'Patch harus 3');

    const semBeta = VersionManager.periksaSemver('2.0.0-beta.1');
    pastikan(semBeta.valid, 'Format 2.0.0-beta.1 harus valid');
    samaDengan(semBeta.labelPrerilis, 'beta.1', 'Label prerilis harus beta.1');
  });

  uji('2.2 Kenaikan versi otomatis (Patch, Minor, Mayor) & penyesuaian kode build', () => {
    const infoPatch = VersionManager.naikkanVersi('1.0.0', 1, 1, 'patch');
    samaDengan(infoPatch.versiSemantik, '1.0.1', 'Patch 1.0.0 -> 1.0.1');
    samaDengan(infoPatch.kodeVersiAndroid, 2, 'versionCode harus bertambah');
    samaDengan(infoPatch.nomorBuildIOS, 2, 'buildNumber harus bertambah');

    const infoMinor = VersionManager.naikkanVersi('1.0.1', 2, 2, 'minor');
    samaDengan(infoMinor.versiSemantik, '1.1.0', 'Minor 1.0.1 -> 1.1.0');

    const infoMayor = VersionManager.naikkanVersi('1.1.0', 3, 3, 'mayor');
    samaDengan(infoMayor.versiSemantik, '2.0.0', 'Mayor 1.1.0 -> 2.0.0');
  });

  uji('2.3 Pembuatan catatan rilis (Release Notes)', () => {
    const info = VersionManager.naikkanVersi('1.0.0', 1, 1, 'patch');
    const notes = VersionManager.buatCatatanRilis('Aplikasi Demo', info, ['Fitur Dark Mode'], ['Perbaikan crash']);
    pastikan(notes.includes('CATATAN RILIS APLIKASI: APLIKASI DEMO'), 'Harus memuat judul catatan');
    pastikan(notes.includes('Fitur Dark Mode'), 'Harus menyertakan fitur baru');
    pastikan(notes.includes('Perbaikan crash'), 'Harus menyertakan daftar bugfix');
  });

  // ---------------------------------------------------------------------------
  // [3] Android App Signing & Keamanan
  // ---------------------------------------------------------------------------
  console.log('\n[3] Android App Signing & Keamanan');
  uji('3.1 Validasi konfigurasi signing release', () => {
    const res = AndroidSigningManager.validasiSigning({
      keystorePath: 'keystore/release.keystore',
      keyAlias: 'nusantara_release',
      skemaSigning: ['v2', 'v3'],
    }, false);

    pastikan(res.adaAlias, 'Alias harus terdeteksi');
    samaDengan(res.skemaAktif.includes('v2'), true, 'Skema v2 harus aktif');
    pastikan(Boolean(res.sidikJariSha256), 'Sidik jari SHA-256 harus dihasilkan');
  });

  uji('3.2 Peringatan saat variabel lingkungan sandi keystore belum diatur', () => {
    const res = AndroidSigningManager.validasiSigning({
      keystorePath: 'keystore/release.keystore',
      keyAlias: 'nusantara_release',
    }, true);

    pastikan(res.pesanPeringatan.length > 0, 'Harus memberikan peringatan environment password');
  });

  uji('3.3 Pembuatan panduan keytool aman tanpa plaintext secret', () => {
    const panduan = AndroidSigningManager.buatPanduanKeytool('kunci_alias', 'rilis.keystore');
    pastikan(panduan.includes('keytool -genkey'), 'Harus memuat perintah keytool resmi');
    pastikan(panduan.includes('.gitignore'), 'Harus mengingatkan penambahan ke .gitignore');
  });

  // ---------------------------------------------------------------------------
  // [4] Android Build (APK & AAB Builders)
  // ---------------------------------------------------------------------------
  console.log('\n[4] Android Build (APK & AAB Builders)');
  uji('4.1 Pembuatan APK Debug & Release dengan validasi artefak', () => {
    const hasilAPK = APKBuilder.bangunAPK(konfig, 'debug');
    pastikan(hasilAPK.sukses, 'Build APK Debug harus sukses');
    pastikan(Boolean(hasilAPK.artefak), 'Artefak APK harus dihasilkan');
    samaDengan(hasilAPK.artefak?.platform, 'android', 'Platform harus android');
    samaDengan(hasilAPK.artefak?.format, 'apk', 'Format harus apk');
    pastikan(hasilAPK.artefak!.ukuranBytes > 0, 'Ukuran berkas APK harus > 0');
    samaDengan(hasilAPK.artefak!.sha256.length, 64, 'SHA-256 harus 64 karakter heksadesimal');

    const validasiBiner = BuildValidator.validasiArtefak(hasilAPK.artefak!);
    pastikan(validasiBiner.valid, 'Biner APK harus lolos validasi integritas');
  });

  uji('4.2 Pembuatan Android App Bundle (.aab) untuk Google Play', () => {
    const hasilAAB = AABBuilder.bangunAAB(konfig, true);
    pastikan(hasilAAB.sukses, 'Build AAB harus sukses');
    pastikan(Boolean(hasilAAB.artefak), 'Artefak AAB harus dihasilkan');
    samaDengan(hasilAAB.artefak?.format, 'aab', 'Format harus aab');
    pastikan(hasilAAB.artefak!.ukuranBytes > 0, 'Ukuran berkas AAB harus > 0');
  });

  // ---------------------------------------------------------------------------
  // [5] Apple iOS Distribution & Archive Preparation
  // ---------------------------------------------------------------------------
  console.log('\n[5] Apple iOS Distribution & Archive Preparation');
  uji('5.1 Pemeriksaan lingkungan host iOS & Xcode', () => {
    const env = IOSDistributionManager.periksaLingkungan();
    pastikan(env !== null, 'Pemeriksaan iOS harus mengembalikan info lingkungan');
    pastikan(Array.isArray(env.catatan), 'Catatan iOS harus berupa array');
  });

  uji('5.2 Validasi Code Signing & ExportOptions.plist iOS', () => {
    const cekSigning = CodeSigningManager.validasiCodeSigning(konfig.ios.signing, false);
    pastikan(cekSigning.bundleIdValid, 'Bundle ID harus valid');

    const plist = CodeSigningManager.buatExportOptionsPlist(konfig.ios.signing);
    pastikan(plist.includes('<key>method</key>'), 'ExportOptions harus memuat method');
    pastikan(plist.includes('<string>app-store</string>'), 'Metode ekspor harus app-store');
  });

  uji('5.3 Persiapan struktur iOS Archive (.xcarchive)', () => {
    const hasilArchive = ArchiveManager.siapkanArchive(konfig);
    pastikan(hasilArchive.sukses, 'Persiapan archive iOS harus sukses');
    pastikan(Boolean(hasilArchive.artefak), 'Artefak archive harus ada');
    samaDengan(hasilArchive.artefak?.format, 'xcarchive', 'Format harus xcarchive');
    pastikan(hasilArchive.siapTestFlight, 'Harus memenuhi kriteria kesiapan TestFlight');
  });

  uji('5.4 Daftar checklist persiapan Apple App Store', () => {
    const checklist = IOSDistributionManager.dapatkanChecklistAppStore();
    pastikan(checklist.length >= 10, 'Checklist App Store harus memuat minimal 10 item');
    pastikan(checklist.some((c) => c.item.includes('URL Kebijakan Privasi')), 'Harus menyertakan privasi');
  });

  // ---------------------------------------------------------------------------
  // [6] Pengelola Aset Mobile (Icon & Splash Screen)
  // ---------------------------------------------------------------------------
  console.log('\n[6] Pengelola Aset Mobile (Icon & Splash Screen)');
  uji('6.1 Spesifikasi dimensi ikon Android adaptive dan iOS', () => {
    const daftarIkon = IconManager.dapatkanDaftarKebutuhanIkon();
    pastikan(daftarIkon.length >= 8, 'Harus ada minimal 8 spesifikasi ikon resmi');

    const playStoreIcon = daftarIkon.find((i) => i.nama === 'android-playstore');
    pastikan(Boolean(playStoreIcon), 'Ikon Google Play Store harus ada');
    samaDengan(playStoreIcon?.lebar, 512, 'Lebar ikon Play Store harus 512');

    const appStoreIcon = daftarIkon.find((i) => i.nama === 'ios-appstore');
    pastikan(Boolean(appStoreIcon), 'Ikon App Store harus ada');
    samaDengan(appStoreIcon?.lebar, 1024, 'Lebar ikon App Store harus 1024');
  });

  uji('6.2 Validasi aspek rasio ikon dan ukuran batas', () => {
    const cekRasio = AssetValidator.validasiDimensi(512, 512, 'ikon');
    pastikan(cekRasio.valid, 'Dimensi 512x512 harus sah untuk ikon');

    const cekGagal = AssetValidator.validasiDimensi(512, 300, 'ikon');
    pastikan(!cekGagal.valid, 'Aspek rasio non-persegi harus ditolak untuk ikon');
  });

  uji('6.3 Pembuatan template XML Android 12+ SplashScreen & iOS LaunchScreen', () => {
    const xmlSplash = SplashManager.buatXmlAndroidSplashScreen({ warnaLatar: '#0F172A' });
    pastikan(xmlSplash.includes('Theme.SplashScreen'), 'Harus memuat style Theme.SplashScreen');
    pastikan(xmlSplash.includes('#0F172A'), 'Harus menyertakan warna latar');

    const storyboard = SplashManager.buatStoryboardIOSLaunchScreen();
    pastikan(storyboard.includes('launchScreen="YES"'), 'Storyboard harus berupa launch screen');
  });

  // ---------------------------------------------------------------------------
  // [7] Release Validator & Laporan Rilis
  // ---------------------------------------------------------------------------
  console.log('\n[7] Release Validator & Laporan Rilis');
  uji('7.1 Evaluasi checklist pra-rilis ReleaseValidator', () => {
    const val = ReleaseValidator.periksaKesiapanRilis(konfig);
    pastikan(val.totalPemeriksaan >= 8, 'Harus ada minimal 8 item pemeriksaan rilis');
    pastikan(val.totalLulus > 0, 'Harus ada pemeriksaan yang lulus');

    const teksLaporan = ReleaseValidator.formatLaporanTeks(val);
    pastikan(teksLaporan.includes('HASIL VALIDASI KESIAPAN RILIS MOBILE'), 'Harus memuat header teks laporan');
  });

  uji('7.2 Pembuatan berkas build-report.json dan release-report.md', () => {
    const val = ReleaseValidator.periksaKesiapanRilis(konfig);
    const md = ReleaseReportGenerator.buatLaporanMarkdown(konfig, val, []);
    pastikan(md.includes('# Laporan Rilis & Distribusi Aplikasi Mobile'), 'Header markdown harus cocok');
    pastikan(md.includes('Google Play Store'), 'Harus menyertakan panduan Play Store');
    pastikan(md.includes('Apple App Store'), 'Harus menyertakan panduan App Store');

    const jalurMd = ReleaseReportGenerator.simpanLaporanMarkdown(md);
    pastikan(fs.existsSync(jalurMd), 'Berkas release-report.md harus tersimpan di disk');

    const repBuild = BuildReportGenerator.buatLaporan('keduanya', 'release', 'production', true, 'Sukses', []);
    const jalurJson = BuildReportGenerator.simpanLaporanKeFile(repBuild);
    pastikan(fs.existsSync(jalurJson), 'Berkas build-report.json harus tersimpan di disk');
  });

  // ---------------------------------------------------------------------------
  // [8] Keamanan & Audit Kredensial Sensitif
  // ---------------------------------------------------------------------------
  console.log('\n[8] Keamanan & Audit Kredensial Sensitif');
  uji('8.1 Deteksi kebocoran kata sandi plaintext', () => {
    const cekAman = SigningValidator.periksaKeamananKredensial('keyAlias="nusantara"');
    pastikan(cekAman.aman, 'Konten tanpa password harus aman');

    const cekBocor = SigningValidator.periksaKeamananKredensial('storePassword="rahasiaSuperKuat123"');
    pastikan(!cekBocor.aman, 'Pola storePassword plaintext harus terdeteksi');
  });

  // ---------------------------------------------------------------------------
  // [9] Integrasi CLI Nusantara Mobile Distribusi
  // ---------------------------------------------------------------------------
  console.log('\n[9] Integrasi CLI Nusantara Mobile Distribusi');
  uji('9.1 Eksekusi nusantara mobile distribusi periksa & konfigurasi', () => {
    const statusPeriksa = MobileCLI.jalankan(['distribusi', 'periksa']);
    samaDengan(statusPeriksa, 0, 'distribusi periksa harus keluar kode 0');

    const statusKonfig = MobileCLI.jalankan(['distribusi', 'konfigurasi']);
    samaDengan(statusKonfig, 0, 'distribusi konfigurasi harus keluar kode 0');

    const statusUbah = MobileCLI.jalankan(['distribusi', 'konfigurasi', 'staging']);
    samaDengan(statusUbah, 0, 'distribusi konfigurasi staging harus keluar kode 0');
  });

  uji('9.2 Eksekusi nusantara mobile distribusi android & ios', () => {
    const statusAPK = MobileCLI.jalankan(['distribusi', 'android', 'debug']);
    samaDengan(statusAPK, 0, 'distribusi android debug harus keluar kode 0');

    const statusAAB = MobileCLI.jalankan(['distribusi', 'android', 'aab']);
    samaDengan(statusAAB, 0, 'distribusi android aab harus keluar kode 0');

    const statusIOS = MobileCLI.jalankan(['distribusi', 'ios', 'periksa']);
    samaDengan(statusIOS, 0, 'distribusi ios periksa harus keluar kode 0');

    const statusArchive = MobileCLI.jalankan(['distribusi', 'ios', 'archive']);
    samaDengan(statusArchive, 0, 'distribusi ios archive harus keluar kode 0');
  });

  uji('9.3 Eksekusi nusantara mobile distribusi versi & aset & rilis', () => {
    const statusVersi = MobileCLI.jalankan(['distribusi', 'versi', 'tampil']);
    samaDengan(statusVersi, 0, 'distribusi versi tampil harus keluar kode 0');

    const statusAset = MobileCLI.jalankan(['distribusi', 'aset', 'periksa']);
    pastikan(statusAset === 0 || statusAset === 1, 'distribusi aset harus keluar status terdefinisi');

    const statusChecklist = MobileCLI.jalankan(['distribusi', 'rilis', 'checklist']);
    samaDengan(statusChecklist, 0, 'distribusi rilis checklist harus keluar kode 0');
  });

  // ---------------------------------------------------------------------------
  // [10] Eksekusi Program .nusantara (Standard Library std:mobile)
  // ---------------------------------------------------------------------------
  console.log('\n[10] Eksekusi Program .nusantara (Standard Library std:mobile)');
  uji('10.1 Eksekusi skrip contoh/mobile/distribution_demo/src/main.nusantara', () => {
    const berkas = path.join(process.cwd(), 'contoh/mobile/distribution_demo/src/main.nusantara');
    const kode = fs.readFileSync(berkas, 'utf-8');
    const buf = new PenulisOutputBuffer();
    const interp = new Interpreter(buf);
    interp.jalankanKode(kode);

    const out = buf.dapatkanSeluruhTeks().join('\n');
    pastikan(out.includes('Aplikasi demonstrasi distribusi mobile berhasil dijalankan.'), 'Program .nusantara harus selesai');
    pastikan(out.includes('Application ID     : id.nusantara.aplikasi'), 'Harus menampilkan application ID');
  });

  // ---------------------------------------------------------------------------
  // [11] Validasi Arsip PKZIP Nyata pada APK & AAB + Deteksi Binary SDK
  // ---------------------------------------------------------------------------
  console.log('\n[11] Validasi Integritas Arsip PKZIP & Deteksi Toolchain SDK Nyata');
  uji('11.1 Berkas .apk dan .aab memiliki header PKZIP + Central Directory sah & lulus python3 zipfile.testzip()', () => {
    const mgr = DistributionManager.dapatkanInstance();
    const cfg = mgr.dapatkanKonfigurasi();
    const resApk = AndroidDistributionManager.bangunDebugAPK(cfg);
    const resAab = AndroidDistributionManager.bangunReleaseAAB(cfg);
    pastikan(resApk.sukses && Boolean(resApk.artefak?.jalurLokal), 'Build APK harus sukses');
    pastikan(resAab.sukses && Boolean(resAab.artefak?.jalurLokal), 'Build AAB harus sukses');

    const pyCheck = execFileSync(
      'python3',
      [
        '-c',
        `import sys, zipfile
for p in sys.argv[1:]:
    with zipfile.ZipFile(p, 'r') as zf:
        bad = zf.testzip()
        assert bad is None, f'Bad CRC: {bad}'
        names = zf.namelist()
        assert len(names) >= 3, names
print('ZIP_OK')`,
        resApk.artefak!.jalurLokal,
        resAab.artefak!.jalurLokal,
      ],
      { encoding: 'utf-8' }
    );
    pastikan(pyCheck.includes('ZIP_OK'), 'APK & AAB harus valid terhadap python3 zipfile CRC32 verification');

    const envAndroid = AndroidDistributionManager.periksaLingkungan();
    pastikan(typeof envAndroid.adaAapt2 === 'boolean' && typeof envAndroid.adaD8 === 'boolean', 'Probe biner SDK Android harus terisi');
  });

  console.log('\n======================================================================');
  console.log(`HASIL PENGUJIAN FASE 40: ${totalLulus}/${totalUji} LULUS`);
  if (totalGagal > 0) {
    console.error(`Terdapat ${totalGagal} pengujian GAGAL.`);
    process.exit(1);
  } else {
    console.log(`Semua pengujian Fase 40 BERHASIL 100%!\n`);
  }
}

jalankanSemuaUji().catch((err) => {
  console.error('Galat fatal dalam pengujian Fase 40:', err);
  process.exit(1);
});
