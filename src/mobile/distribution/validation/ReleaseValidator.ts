/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Pemeriksa Kesiapan Rilis Mobile Terpadu (Release Validator)
 */

import {
  ItemChecklistRilis,
  KonfigurasiDistribusiLengkap,
  LaporanValidasiRilis,
} from '../types';
import { AndroidDistributionConfig } from '../config/AndroidConfig';
import { IOSDistributionConfig } from '../config/IOSConfig';
import { AndroidSigningManager } from '../android/AndroidSigning';
import { CodeSigningManager } from '../ios/CodeSigningManager';
import { IOSDistributionManager } from '../ios/IOSBuildManager';
import { AndroidDistributionManager } from '../android/AndroidBuildManager';
import { VersionManager } from '../core/VersionManager';

export class ReleaseValidator {
  public static periksaKesiapanRilis(konfig: KonfigurasiDistribusiLengkap): LaporanValidasiRilis {
    const checklist: ItemChecklistRilis[] = [];
    const masalahAndroid: string[] = [];
    const masalahIOS: string[] = [];

    // ==========================================
    // 1. KATEGORI: ANDROID CHECKS
    // ==========================================
    // 1.1 Application ID / Package Name
    const pkgCheck = AndroidDistributionConfig.validasiPackageName(konfig.aplikasi.id);
    if (pkgCheck.valid) {
      checklist.push({
        id: 'android-package-id',
        kategori: 'android',
        judul: 'Format Application ID / Package Name Android',
        status: 'lulus',
        pesan: `Application ID '${konfig.aplikasi.id}' sah.`,
        wajib: true,
      });
    } else {
      checklist.push({
        id: 'android-package-id',
        kategori: 'android',
        judul: 'Format Application ID / Package Name Android',
        status: 'gagal',
        pesan: pkgCheck.pesan || 'Package name tidak valid.',
        wajib: true,
      });
      masalahAndroid.push(pkgCheck.pesan || 'Package name tidak valid.');
    }

    // 1.2 Android Version Code
    const vcCheck = AndroidDistributionConfig.validasiVersionCode(konfig.aplikasi.kodeVersiAndroid);
    if (vcCheck.valid) {
      checklist.push({
        id: 'android-version-code',
        kategori: 'android',
        judul: 'Android Version Code (versionCode)',
        status: 'lulus',
        pesan: `versionCode: ${konfig.aplikasi.kodeVersiAndroid} sah.`,
        wajib: true,
      });
    } else {
      checklist.push({
        id: 'android-version-code',
        kategori: 'android',
        judul: 'Android Version Code (versionCode)',
        status: 'gagal',
        pesan: vcCheck.pesan || 'versionCode tidak valid.',
        wajib: true,
      });
      masalahAndroid.push(vcCheck.pesan || 'versionCode tidak valid.');
    }

    // 1.3 Target SDK Level
    const sdkCheck = AndroidDistributionConfig.validasiTargetSdk(konfig.android.targetSdk);
    if (sdkCheck.valid && !sdkCheck.pesan) {
      checklist.push({
        id: 'android-target-sdk',
        kategori: 'android',
        judul: 'Target SDK Android (Google Play Policy)',
        status: 'lulus',
        pesan: `targetSdkVersion: ${konfig.android.targetSdk} memenuhi standar rilis Google Play.`,
        wajib: true,
      });
    } else if (sdkCheck.pesan) {
      checklist.push({
        id: 'android-target-sdk',
        kategori: 'android',
        judul: 'Target SDK Android (Google Play Policy)',
        status: 'peringatan',
        pesan: sdkCheck.pesan,
        wajib: false,
      });
    } else {
      checklist.push({
        id: 'android-target-sdk',
        kategori: 'android',
        judul: 'Target SDK Android (Google Play Policy)',
        status: 'gagal',
        pesan: sdkCheck.pesan || 'Target SDK di bawah batas minimum.',
        wajib: true,
      });
      masalahAndroid.push(sdkCheck.pesan || 'Target SDK tidak sah.');
    }

    // 1.4 Android Signing Config
    const signAndroid = AndroidSigningManager.validasiSigning(
      konfig.android.signing,
      konfig.lingkungan === 'production'
    );
    if (signAndroid.valid) {
      checklist.push({
        id: 'android-signing',
        kategori: 'android',
        judul: 'Penandatanganan Keystore Rilis Android',
        status: 'lulus',
        pesan: `Keystore terkonfigurasi dengan skema signature: ${signAndroid.skemaAktif.join(', ')}.`,
        wajib: true,
      });
    } else {
      checklist.push({
        id: 'android-signing',
        kategori: 'android',
        judul: 'Penandatanganan Keystore Rilis Android',
        status: konfig.lingkungan === 'production' ? 'gagal' : 'peringatan',
        pesan: signAndroid.daftarGalat.join('; ') || 'Keystore belum dikonfigurasi.',
        wajib: konfig.lingkungan === 'production',
      });
      if (konfig.lingkungan === 'production') {
        masalahAndroid.push(...signAndroid.daftarGalat);
      }
    }

    // ==========================================
    // 2. KATEGORI: IOS CHECKS
    // ==========================================
    // 2.1 Bundle Identifier
    const bundleCheck = IOSDistributionConfig.validasiBundleIdentifier(konfig.ios.bundleId);
    if (bundleCheck.valid) {
      checklist.push({
        id: 'ios-bundle-id',
        kategori: 'ios',
        judul: 'Format iOS Bundle Identifier (reverse-DNS)',
        status: 'lulus',
        pesan: `Bundle ID '${konfig.ios.bundleId}' sah.`,
        wajib: true,
      });
    } else {
      checklist.push({
        id: 'ios-bundle-id',
        kategori: 'ios',
        judul: 'Format iOS Bundle Identifier (reverse-DNS)',
        status: 'gagal',
        pesan: bundleCheck.pesan || 'Bundle ID tidak valid.',
        wajib: true,
      });
      masalahIOS.push(bundleCheck.pesan || 'Bundle ID tidak valid.');
    }

    // 2.2 iOS Build Number
    const bnCheck = IOSDistributionConfig.validasiBuildNumber(konfig.aplikasi.nomorBuild);
    if (bnCheck.valid) {
      checklist.push({
        id: 'ios-build-number',
        kategori: 'ios',
        judul: 'iOS Build Number (CFBundleVersion)',
        status: 'lulus',
        pesan: `CFBundleVersion: ${konfig.aplikasi.nomorBuild} sah.`,
        wajib: true,
      });
    } else {
      checklist.push({
        id: 'ios-build-number',
        kategori: 'ios',
        judul: 'iOS Build Number (CFBundleVersion)',
        status: 'gagal',
        pesan: bnCheck.pesan || 'Build number tidak valid.',
        wajib: true,
      });
      masalahIOS.push(bnCheck.pesan || 'Build number tidak valid.');
    }

    // 2.3 Lingkungan Host Xcode macOS
    const envIOS = IOSDistributionManager.periksaLingkungan();
    if (envIOS.apakahMacOS && envIOS.adaXcode) {
      checklist.push({
        id: 'ios-environment',
        kategori: 'ios',
        judul: 'Lingkungan Host Kompilasi Xcode macOS',
        status: 'lulus',
        pesan: 'Host macOS terdeteksi dengan Apple Xcode siap digunakan.',
        wajib: true,
      });
    } else {
      const pesanLingkungan = `Host saat ini adalah '${typeof process !== 'undefined' ? process.platform : 'browser'}'. Ekspor archive native iOS memerlukan macOS dengan Xcode.`;
      checklist.push({
        id: 'ios-environment',
        kategori: 'ios',
        judul: 'Lingkungan Host Kompilasi Xcode macOS',
        status: konfig.lingkungan === 'production' ? 'gagal' : 'peringatan',
        pesan: pesanLingkungan,
        // Wajib untuk kesiapan rilis lintas platform: warning di staging tetap berarti iOS belum siap.
        wajib: true,
      });
      masalahIOS.push(pesanLingkungan);
    }

    // 2.4 iOS Code Signing Config
    const signIOS = CodeSigningManager.validasiCodeSigning(
      konfig.ios.signing,
      konfig.lingkungan === 'production'
    );
    if (signIOS.valid) {
      checklist.push({
        id: 'ios-signing',
        kategori: 'ios',
        judul: 'Konfigurasi Apple Code Signing',
        status: 'lulus',
        pesan: `Identitas signing: '${konfig.ios.signing.identitasSigning || 'Apple Distribution'}'.`,
        wajib: true,
      });
    } else {
      checklist.push({
        id: 'ios-signing',
        kategori: 'ios',
        judul: 'Konfigurasi Apple Code Signing',
        status: konfig.lingkungan === 'production' ? 'gagal' : 'peringatan',
        pesan: signIOS.daftarGalat.join('; ') || 'Identitas signing Apple belum ditentukan.',
        wajib: konfig.lingkungan === 'production',
      });
      if (konfig.lingkungan === 'production') {
        masalahIOS.push(...signIOS.daftarGalat);
      }
    }

    // ==========================================
    // 3. KATEGORI: KEAMANAN & SEMVER
    // ==========================================
    const semverCheck = VersionManager.periksaSemver(konfig.aplikasi.versi);
    if (semverCheck.valid) {
      checklist.push({
        id: 'app-semver',
        kategori: 'metadata',
        judul: 'Format Versi Aplikasi Semantik (SemVer)',
        status: 'lulus',
        pesan: `Versi '${konfig.aplikasi.versi}' sah.`,
        wajib: true,
      });
    } else {
      checklist.push({
        id: 'app-semver',
        kategori: 'metadata',
        judul: 'Format Versi Aplikasi Semantik (SemVer)',
        status: 'gagal',
        pesan: semverCheck.pesan || 'Format versi tidak valid.',
        wajib: true,
      });
      masalahAndroid.push('Format versi aplikasi tidak valid.');
      masalahIOS.push('Format versi aplikasi tidak valid.');
    }

    // 3.2 Audit Hardcoded Secrets
    const jsonStr = JSON.stringify(konfig);
    const adaPasswordPlain = /"(?:password|storePassword|keyPassword|privateKey|apiSecret|clientSecret)"\s*:\s*"[^"]+"/i.test(jsonStr);
    if (!adaPasswordPlain) {
      checklist.push({
        id: 'sec-no-hardcoded-pass',
        kategori: 'keamanan',
        judul: 'Audit Bebas Kata Sandi Hardcoded',
        status: 'lulus',
        pesan: 'Tidak ditemukan kata sandi plaintext dalam konfigurasi distribusi.',
        wajib: true,
      });
    } else {
      checklist.push({
        id: 'sec-no-hardcoded-pass',
        kategori: 'keamanan',
        judul: 'Audit Bebas Kata Sandi Hardcoded',
        status: 'gagal',
        pesan: 'Ditemukan kata sandi sensitif dalam konfigurasi JSON. Gunakan variabel lingkungan!',
        wajib: true,
      });
      masalahAndroid.push('Kredensial sensitif terdeteksi dalam konfigurasi.');
      masalahIOS.push('Kredensial sensitif terdeteksi dalam konfigurasi.');
    }

    // 3.3 Kebijakan Privasi URL untuk Rilis Produksi
    if (konfig.metadataPublikasi?.kebijakanPrivasiUrl) {
      checklist.push({
        id: 'meta-privacy-url',
        kategori: 'metadata',
        judul: 'URL Kebijakan Privasi Aplikasi',
        status: 'lulus',
        pesan: `URL: ${konfig.metadataPublikasi.kebijakanPrivasiUrl}`,
        wajib: konfig.lingkungan === 'production',
      });
    } else {
      checklist.push({
        id: 'meta-privacy-url',
        kategori: 'metadata',
        judul: 'URL Kebijakan Privasi Aplikasi',
        status: konfig.lingkungan === 'production' ? 'gagal' : 'peringatan',
        pesan: 'Google Play & Apple App Store mewajibkan URL Kebijakan Privasi aktif.',
        wajib: konfig.lingkungan === 'production',
      });
      if (konfig.lingkungan === 'production') {
        masalahAndroid.push('URL Kebijakan Privasi belum diisi.');
        masalahIOS.push('URL Kebijakan Privasi belum diisi.');
      }
    }

    const totalPemeriksaan = checklist.length;
    const totalLulus = checklist.filter((c) => c.status === 'lulus').length;
    const totalPeringatan = checklist.filter((c) => c.status === 'peringatan').length;
    const totalGagal = checklist.filter((c) => c.status === 'gagal').length;

    // Peringatan pada pemeriksaan wajib tidak boleh menghasilkan status SIAP DIRILIS.
    const siapRilis = checklist.every((item) => !item.wajib || item.status === 'lulus');

    return {
      waktuPemeriksaan: new Date().toISOString(),
      lingkungan: konfig.lingkungan,
      siapRilis,
      totalPemeriksaan,
      totalLulus,
      totalPeringatan,
      totalGagal,
      ringkasanAndroid: {
        siap: masalahAndroid.length === 0,
        masalah: masalahAndroid,
      },
      ringkasanIOS: {
        siap: masalahIOS.length === 0,
        masalah: masalahIOS,
      },
      checklist,
    };
  }

  public static formatLaporanTeks(laporan: LaporanValidasiRilis): string {
    const garis = '='.repeat(60);
    const subgaris = '-'.repeat(60);

    const barisChecklist = laporan.checklist
      .map((item) => {
        const simbol =
          item.status === 'lulus'
            ? '[✓]'
            : item.status === 'peringatan'
            ? '[!]'
            : '[✗]';
        return `  ${simbol} ${item.judul}\n      ${item.pesan}`;
      })
      .join('\n');

    const statusKesimpulan = laporan.siapRilis
      ? 'SIAP DIRILIS (Semua kriteria wajib terpenuhi)'
      : 'BELUM SIAP (Terdapat kriteria wajib yang gagal)';

    return `${garis}
HASIL VALIDASI KESIAPAN RILIS MOBILE (NUSANTARA)
Waktu Pemeriksaan: ${laporan.waktuPemeriksaan}
Lingkungan       : ${laporan.lingkungan.toUpperCase()}
Total Pengujian  : ${laporan.totalPemeriksaan} (Lulus: ${laporan.totalLulus}, Peringatan: ${laporan.totalPeringatan}, Gagal: ${laporan.totalGagal})
${garis}

DAFTAR PEMERIKSAAN KELAYAKAN:
${barisChecklist}

${subgaris}
RINGKASAN PLATFORM:
- Android: ${laporan.ringkasanAndroid.siap ? 'SIAP' : `BELUM SIAP (${laporan.ringkasanAndroid.masalah.length} masalah)`}
- iOS    : ${laporan.ringkasanIOS.siap ? 'SIAP' : `BELUM SIAP (${laporan.ringkasanIOS.masalah.length} masalah)`}

KESIMPULAN:
${statusKesimpulan}
${garis}`;
  }
}
