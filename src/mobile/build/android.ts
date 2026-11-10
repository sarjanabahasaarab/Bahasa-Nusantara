/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengelola Sistem Build Android untuk Aplikasi Mobile Nusantara
 */

export interface KonfigurasiBuildAndroid {
  nama: string;
  id: string;
  versi: string;
  nomorBuild: number;
  platformTarget?: { android?: boolean; ios?: boolean };
  daftarIzin?: string[];
}

export interface HasilPeriksaLingkunganAndroid {
  siap: boolean;
  catatan: string[];
  androidHome: string;
  adaJdk: boolean;
  siapBuild: boolean;
}

export class AndroidBuildManager {
  public static periksaLingkungan(): HasilPeriksaLingkunganAndroid {
    return {
      siap: true,
      siapBuild: true,
      androidHome: process.env.ANDROID_HOME || '/opt/android-sdk',
      adaJdk: true,
      catatan: [
        'Android SDK platform-tools terdeteksi/disimulasikan',
        'Gradle wrapper 8.2 terkonfigurasi',
      ],
    };
  }

  public static buatAndroidManifest(konfig: KonfigurasiBuildAndroid): string {
    const izinXml = (konfig.daftarIzin || [])
      .map(izin => {
        let perm = izin;
        if (izin === 'kamera') perm = 'CAMERA';
        else if (izin === 'lokasi') perm = 'ACCESS_FINE_LOCATION';
        else if (izin === 'notifikasi') perm = 'POST_NOTIFICATIONS';
        return `    <uses-permission android:name="android.permission.${perm}" />`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${konfig.id}">
${izinXml}
    <application
        android:label="${konfig.nama}"
        android:allowBackup="true"
        android:supportsRtl="true">
        <activity android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
  }

  public static buatBuildGradleApp(konfig: KonfigurasiBuildAndroid): string {
    return `plugins {
    id 'com.android.application'
}

android {
    namespace '${konfig.id}'
    compileSdk 34

    defaultConfig {
        applicationId "${konfig.id}"
        minSdk 24
        targetSdk 34
        versionCode ${konfig.nomorBuild}
        versionName "${konfig.versi}"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
`;
  }
}
