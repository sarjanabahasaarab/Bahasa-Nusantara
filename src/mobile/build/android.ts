/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37
 * Manajer Build & Pembuatan Manifes Android
 */

import { KonfigurasiAplikasiMobile } from '../types';

export interface StatusLingkunganAndroid {
  androidHome?: string;
  adaJdk: boolean;
  siapBuild: boolean;
  catatan: string[];
}

export class AndroidBuildManager {
  public static periksaLingkungan(): StatusLingkunganAndroid {
    const androidHome = typeof process !== 'undefined' && process.env
      ? (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT)
      : undefined;
    const javaHome = typeof process !== 'undefined' && process.env
      ? process.env.JAVA_HOME
      : undefined;
    const adaJdk = Boolean(javaHome);
    const siapBuild = Boolean(androidHome && adaJdk);

    const catatan: string[] = [];
    if (!androidHome) {
      catatan.push('Variabel lingkungan ANDROID_HOME belum diatur.');
    } else {
      catatan.push(`Android SDK terdeteksi di: ${androidHome}`);
    }

    if (!adaJdk) {
      catatan.push('Java JDK belum terdeteksi pada JAVA_HOME.');
    } else {
      catatan.push(`Java JDK terdeteksi di: ${javaHome}`);
    }

    if (!siapBuild) {
      catatan.push('Mendukung mode pratinjau desktop & persiapan struktur proyek.');
    } else {
      catatan.push('Lingkungan siap untuk kompilasi biner native Android (APK/AAB).');
    }

    return {
      androidHome,
      adaJdk,
      siapBuild,
      catatan,
    };
  }

  public static buatAndroidManifest(konfig: KonfigurasiAplikasiMobile): string {
    const izinMap: Record<string, string[]> = {
      kamera: ['android.permission.CAMERA'],
      lokasi: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      lokasi_latar: ['android.permission.ACCESS_BACKGROUND_LOCATION'],
      notifikasi: ['android.permission.POST_NOTIFICATIONS'],
      foto_media: ['android.permission.READ_MEDIA_IMAGES'],
      mikrofon: ['android.permission.RECORD_AUDIO'],
      bluetooth: [
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_CONNECT',
      ],
      penyimpanan: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
      internet: ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'],
      sensor: ['android.permission.BODY_SENSORS'],
    };

    const izinTag: string[] = [];
    const daftarIzin = konfig.daftarIzin || [];
    for (const izin of daftarIzin) {
      const androidPerms = izinMap[izin] || [];
      for (const p of androidPerms) {
        if (!izinTag.includes(p)) {
          izinTag.push(p);
        }
      }
    }

    const xmlIzin = izinTag
      .map((perm) => `    <uses-permission android:name="${perm}" />`)
      .join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${konfig.id}">

${xmlIzin || '    <uses-permission android:name="android.permission.INTERNET" />'}

    <application
        android:allowBackup="true"
        android:label="${konfig.nama}"
        android:supportsRtl="true"
        android:theme="@style/Theme.NusantaraApp">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
  }

  public static buatBuildGradleApp(konfig: KonfigurasiAplikasiMobile): string {
    const minSdk = konfig.versiMinPlatform?.androidMinSdk || 24;
    const targetSdk = konfig.versiMinPlatform?.androidTargetSdk || 34;

    return `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace '${konfig.id}'
    compileSdk 34

    defaultConfig {
        applicationId "${konfig.id}"
        minSdk ${minSdk}
        targetSdk ${targetSdk}
        versionCode ${konfig.nomorBuild || 1}
        versionName "${konfig.versi || '1.0.0'}"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
}
`;
  }
}
