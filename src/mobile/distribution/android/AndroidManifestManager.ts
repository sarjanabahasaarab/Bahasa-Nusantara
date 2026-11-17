/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 40
 * Pengelola dan Generator AndroidManifest.xml Resmi
 */

import { KonfigurasiDistribusiLengkap } from '../types';
import { AndroidDistributionConfig } from '../config/AndroidConfig';

function escapeXmlAttr(nilai: string): string {
  return String(nilai || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class AndroidManifestManager {
  public static validasiManifes(konfig: KonfigurasiDistribusiLengkap): { valid: boolean; masalah: string[] } {
    const masalah: string[] = [];

    const pkgCheck = AndroidDistributionConfig.validasiPackageName(konfig.aplikasi.id);
    if (!pkgCheck.valid && pkgCheck.pesan) {
      masalah.push(pkgCheck.pesan);
    }

    if (!konfig.aplikasi.nama || konfig.aplikasi.nama.trim().length === 0) {
      masalah.push('Nama aplikasi tidak boleh kosong dalam manifes.');
    }

    if (konfig.android.minSdk > konfig.android.targetSdk) {
      masalah.push(`minSdkVersion (${konfig.android.minSdk}) tidak boleh lebih besar dari targetSdkVersion (${konfig.android.targetSdk}).`);
    }

    return {
      valid: masalah.length === 0,
      masalah,
    };
  }

  public static buatXmlManifes(konfig: KonfigurasiDistribusiLengkap): string {
    const izinList = konfig.android.izin || ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'];
    const usesPermissions = izinList.map((iz) => `    <uses-permission android:name="${escapeXmlAttr(iz)}" />`).join('\n');

    const fiturList = konfig.android.fiturHardware || [];
    const usesFeatures = fiturList.length > 0
      ? '\n' + fiturList.map((f) => `    <uses-feature android:name="${escapeXmlAttr(f)}" android:required="false" />`).join('\n')
      : '';

    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${escapeXmlAttr(konfig.aplikasi.id)}"
    android:versionCode="${Number(konfig.aplikasi.kodeVersiAndroid)}"
    android:versionName="${escapeXmlAttr(konfig.aplikasi.versi)}">

${usesPermissions}${usesFeatures}

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${escapeXmlAttr(konfig.aplikasi.nama)}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.NusantaraMobile">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <meta-data
            android:name="id.nusantara.framework.VERSION"
            android:value="v0.40.0" />
    </application>
</manifest>`;
  }
}
