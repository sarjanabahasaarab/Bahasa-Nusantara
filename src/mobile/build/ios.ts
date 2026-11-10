/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Manajer Build & Pembuatan Manifes iOS
 */

import { KonfigurasiAplikasiMobile } from '../types';

export interface StatusLingkunganIOS {
  apakahMacOS: boolean;
  adaXcode: boolean;
  siapBuild: boolean;
  catatan: string[];
}

export class IOSBuildManager {
  public static periksaLingkungan(): StatusLingkunganIOS {
    const apakahMacOS = typeof process !== 'undefined' && process.platform === 'darwin';
    const adaXcode = false;
    const siapBuild = apakahMacOS && adaXcode;

    const catatan: string[] = [];
    if (!apakahMacOS) {
      catatan.push('Host bukan macOS (hanya mendukung simulator dan export bundle).');
    } else {
      catatan.push('Host adalah macOS.');
    }

    if (!adaXcode) {
      catatan.push('Xcode command line tools belum terdeteksi.');
    } else {
      catatan.push('Xcode command line tools tersedia.');
    }

    return {
      apakahMacOS,
      adaXcode,
      siapBuild,
      catatan,
    };
  }

  public static buatInfoPlist(konfig: KonfigurasiAplikasiMobile): string {
    const izinDeskripsi: Record<string, { key: string; pesan: string }> = {
      kamera: {
        key: 'NSCameraUsageDescription',
        pesan: 'Aplikasi ini membutuhkan akses kamera untuk mengambil gambar dan video.',
      },
      lokasi: {
        key: 'NSLocationWhenInUseUsageDescription',
        pesan: 'Aplikasi ini membutuhkan akses lokasi saat digunakan.',
      },
      lokasi_latar: {
        key: 'NSLocationAlwaysAndWhenInUseUsageDescription',
        pesan: 'Aplikasi ini membutuhkan akses lokasi di latar belakang.',
      },
      foto_media: {
        key: 'NSPhotoLibraryUsageDescription',
        pesan: 'Aplikasi ini membutuhkan akses galeri foto.',
      },
      mikrofon: {
        key: 'NSMicrophoneUsageDescription',
        pesan: 'Aplikasi ini membutuhkan akses mikrofon untuk rekaman suara.',
      },
      bluetooth: {
        key: 'NSBluetoothAlwaysUsageDescription',
        pesan: 'Aplikasi ini membutuhkan akses Bluetooth.',
      },
    };

    const entriIzin: string[] = [];
    const daftarIzin = konfig.daftarIzin || [];
    for (const izin of daftarIzin) {
      const item = izinDeskripsi[izin];
      if (item) {
        entriIzin.push(`\t<key>${item.key}</key>\n\t<string>${item.pesan}</string>`);
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleDevelopmentRegion</key>
\t<string>id</string>
\t<key>CFBundleExecutable</key>
\t<string>$(EXECUTABLE_NAME)</string>
\t<key>CFBundleIdentifier</key>
\t<string>${konfig.id}</string>
\t<key>CFBundleInfoDictionaryVersion</key>
\t<string>6.0</string>
\t<key>CFBundleName</key>
\t<string>${konfig.nama}</string>
\t<key>CFBundlePackageType</key>
\t<string>APPL</string>
\t<key>CFBundleShortVersionString</key>
\t<string>${konfig.versi || '1.0.0'}</string>
\t<key>CFBundleVersion</key>
\t<string>${konfig.nomorBuild || 1}</string>
\t<key>LSRequiresIPhoneOS</key>
\t<true/>
\t<key>UILaunchStoryboardName</key>
\t<string>LaunchScreen</string>
\t<key>UIRequiredDeviceCapabilities</key>
\t<array>
\t\t<string>arm64</string>
\t</array>
\t<key>UISupportedInterfaceOrientations</key>
\t<array>
\t\t<string>UIInterfaceOrientationPortrait</string>
\t</array>
${entriIzin.length > 0 ? '\t' + entriIzin.join('\n\t') : ''}
</dict>
</plist>`;
  }

  public static buatPodfileTemplate(konfig: KonfigurasiAplikasiMobile): string {
    const deploymentTarget = konfig.versiMinPlatform?.iosDeploymentTarget || '15.0';

    return `platform :ios, '${deploymentTarget}'

target '${konfig.nama.replace(/[^a-zA-Z0-9_]/g, '')}' do
  use_frameworks!

  # Pod dependensi resmi Nusantara Mobile Framework
end
`;
  }
}
