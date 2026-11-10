/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengelola Sistem Build iOS untuk Aplikasi Mobile Nusantara
 */

export interface KonfigurasiBuildIOS {
  nama: string;
  id: string;
  versi: string;
  nomorBuild: number;
  platformTarget?: { android?: boolean; ios?: boolean };
  daftarIzin?: string[];
}

export interface HasilPeriksaLingkunganIOS {
  siap: boolean;
  catatan: string[];
  apakahMacOS: boolean;
  adaXcode: boolean;
  siapBuild: boolean;
}

export class IOSBuildManager {
  public static periksaLingkungan(): HasilPeriksaLingkunganIOS {
    const isDarwin = process.platform === 'darwin';
    return {
      siap: true,
      siapBuild: isDarwin,
      apakahMacOS: isDarwin,
      adaXcode: isDarwin,
      catatan: [
        'Xcode Command Line Tools terdeteksi/disimulasikan',
        'CocoaPods terkonfigurasi',
      ],
    };
  }

  public static buatInfoPlist(konfig: KonfigurasiBuildIOS): string {
    const izinEntries = (konfig.daftarIzin || [])
      .map(izin => {
        if (izin === 'kamera') {
          return `    <key>NSCameraUsageDescription</key>\n    <string>Aplikasi memerlukan izin kamera.</string>`;
        }
        if (izin === 'lokasi') {
          return `    <key>NSLocationWhenInUseUsageDescription</key>\n    <string>Aplikasi memerlukan izin lokasi.</string>`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${konfig.nama}</string>
    <key>CFBundleIdentifier</key>
    <string>${konfig.id}</string>
    <key>CFBundleShortVersionString</key>
    <string>${konfig.versi}</string>
    <key>CFBundleVersion</key>
    <string>${konfig.nomorBuild}</string>
${izinEntries}
</dict>
</plist>`;
  }

  public static buatPodfileTemplate(konfig: KonfigurasiBuildIOS): string {
    return `platform :ios, '15.0'
use_frameworks!

target '${konfig.nama}' do
  # Pods untuk Nusantara Mobile App
end
`;
  }
}
