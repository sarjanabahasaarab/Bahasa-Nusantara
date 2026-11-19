/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * NUSANTARA Phase 40 — Android APK builder backed by the Android Gradle Plugin.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { ArtefakHasilDistribusi, KonfigurasiDistribusiLengkap, TipeBuildAndroid } from '../types';
import { AndroidManifestManager } from './AndroidManifestManager';
import { AndroidSigningManager } from './AndroidSigning';

export interface HasilBuildAPK {
  sukses: boolean;
  tipeBuild: TipeBuildAndroid;
  artefak?: ArtefakHasilDistribusi;
  pesan: string;
  daftarPeringatan: string[];
  daftarGalat: string[];
}

export class APKBuilder {
  public static bangunAPK(konfig: KonfigurasiDistribusiLengkap, tipe: TipeBuildAndroid = 'debug'): HasilBuildAPK {
    const daftarPeringatan: string[] = [];
    const daftarGalat: string[] = [];
    const cekManifes = AndroidManifestManager.validasiManifes(konfig);
    if (!cekManifes.valid) return { sukses: false, tipeBuild: tipe, pesan: 'Validasi AndroidManifest gagal.', daftarPeringatan, daftarGalat: cekManifes.masalah };

    const root = process.cwd();
    const projectDir = process.env.NUSANTARA_ANDROID_PROJECT_DIR || path.join(root, 'native', 'android');
    const gradle = process.env.GRADLE_BIN || 'gradle';
    const variant = tipe === 'release' ? 'Release' : 'Debug';
    const output = path.join(projectDir, 'app', 'build', 'outputs', 'apk', tipe, 'app-' + tipe + '.apk');

    try {
      if (!fs.existsSync(path.join(projectDir, 'settings.gradle')) || !fs.existsSync(path.join(projectDir, 'app', 'build.gradle'))) {
        throw new Error('Proyek Android Gradle native tidak ditemukan: ' + projectDir);
      }
      if (tipe === 'release') {
        const ks = konfig.android.signing;
        const storePassword = ks.storePasswordEnv ? process.env[ks.storePasswordEnv] : undefined;
        const keyPassword = ks.keyPasswordEnv ? process.env[ks.keyPasswordEnv] : undefined;
        if (!ks.keystorePath || !ks.keyAlias || !storePassword || !keyPassword) {
          throw new Error('Build release memerlukan keystore, alias, dan password melalui environment; build tidak boleh diklaim signed tanpa kredensial nyata.');
        }
        process.env.NUSANTARA_ANDROID_KEYSTORE = path.resolve(ks.keystorePath);
        process.env.NUSANTARA_ANDROID_KEY_ALIAS = ks.keyAlias;
        process.env.NUSANTARA_ANDROID_STORE_PASSWORD = storePassword;
        process.env.NUSANTARA_ANDROID_KEY_PASSWORD = keyPassword;
      }
      execFileSync(gradle, ['--no-daemon', '-p', projectDir, ':app:assemble' + variant, '-PapplicationId=' + konfig.aplikasi.id], { stdio: 'pipe', timeout: 12 * 60 * 1000, env: process.env });
      if (!fs.existsSync(output)) throw new Error('Gradle selesai tetapi APK output tidak ditemukan: ' + output);
      const listing = execFileSync('unzip', ['-Z1', output], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      if (!listing.split(/\r?\n/).includes('classes.dex') || !listing.split(/\r?\n/).includes('AndroidManifest.xml')) {
        throw new Error('APK bukan paket Android native yang valid: classes.dex atau AndroidManifest.xml tidak ditemukan.');
      }
      const bytes = fs.readFileSync(output);
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      const artefak: ArtefakHasilDistribusi = {
        platform: 'android', format: 'apk', tipeBuild: tipe,
        namaBerkas: path.basename(output), jalurLokal: output,
        ukuranBytes: bytes.length, sha256,
        apakahDitandatangani: tipe === 'debug' || Boolean(process.env.NUSANTARA_ANDROID_KEYSTORE),
        skemaSignature: tipe === 'debug' ? 'Android debug keystore' : 'Gradle release signing',
        waktuDibuat: new Date().toISOString(),
      };
      return { sukses: true, tipeBuild: tipe, artefak, pesan: 'APK native Gradle berhasil dibuat dan struktur DEX diverifikasi.', daftarPeringatan, daftarGalat };
    } catch (err: any) {
      daftarGalat.push(String(err?.message || err));
      return { sukses: false, tipeBuild: tipe, pesan: 'Build APK native gagal atau toolchain tidak tersedia. Tidak ada APK sintetis yang dibuat.', daftarPeringatan, daftarGalat };
    }
  }
}
